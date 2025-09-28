import io
import re
import requests
from flask import Flask, request, jsonify, Response, stream_with_context
from flask_cors import CORS
import aiotube
from yt_dlp import YoutubeDL
import threading
import time
import logging

# Configure logging for debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Simple in-memory cache for faster responses
search_cache = {}
CACHE_DURATION = 300  # 5 minutes

# Helper function to extract clean video ID
def extract_video_id(video_input):
    """Extract clean 11-character YouTube video ID from various input formats"""
    if not video_input:
        return None
    
    # If it's already a clean 11-character ID
    if re.match(r'^[a-zA-Z0-9_-]{11}$', str(video_input)):
        return video_input
    
    # Extract from various YouTube URL formats
    patterns = [
        r'(?:youtube\.com/watch\?v=|youtu\.be/|youtube\.com/embed/)([a-zA-Z0-9_-]{11})',
        r'v=([a-zA-Z0-9_-]{11})',
        r'/([a-zA-Z0-9_-]{11})$'
    ]
    
    for pattern in patterns:
        match = re.search(pattern, str(video_input))
        if match:
            return match.group(1)
    
    return str(video_input)[:11] if len(str(video_input)) >= 11 else video_input

# Helper function to check if video is embeddable
def is_embeddable(video_id):
    """Check if a YouTube video can be embedded"""
    try:
        video_id = extract_video_id(video_id)
        if not video_id:
            return False
            
        opts = {
            "quiet": True, 
            "skip_download": True,
            "no_warnings": True,
            "socket_timeout": 10
        }
        
        with YoutubeDL(opts) as ytdl:
            info = ytdl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            
            # Check multiple conditions for embedability
            is_live = info.get("is_live", False)
            is_embed_allowed = info.get("is_embed_allowed", True)
            age_restricted = info.get("age_limit", 0) > 0
            
            return not is_live and is_embed_allowed and not age_restricted
            
    except Exception as e:
        print(f"Error checking embed status for {video_id}: {e}")
        return False

def parse_duration_seconds(duration_str):
    """Parse duration from aiotube format to seconds"""
    if not duration_str:
        return 0
    
    # Handle different duration formats
    try:
        # If it's already in MM:SS or HH:MM:SS format
        if ':' in str(duration_str):
            parts = str(duration_str).split(':')
            if len(parts) == 2:  # MM:SS
                return int(parts[0]) * 60 + int(parts[1])
            elif len(parts) == 3:  # HH:MM:SS
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        
        # If it's just seconds
        return int(float(duration_str))
    except:
        return 0

def format_duration(seconds):
    """Format seconds to MM:SS or HH:MM:SS"""
    if seconds < 3600:  # Less than an hour
        minutes = seconds // 60
        secs = seconds % 60
        return f"{minutes}:{secs:02d}"
    else:  # More than an hour
        hours = seconds // 3600
        minutes = (seconds % 3600) // 60
        secs = seconds % 60
        return f"{hours}:{minutes:02d}:{secs:02d}"

def parse_title(full_title):
    """Parse YouTube title to extract artist and song name"""
    if not full_title:
        return {"title": "Unknown Title", "artist": "Unknown Artist"}
    
    # Remove common YouTube suffixes
    clean_title = full_title
    clean_title = re.sub(r'\s*\(Official.*?\)', '', clean_title, flags=re.IGNORECASE)
    clean_title = re.sub(r'\s*\[Official.*?\]', '', clean_title, flags=re.IGNORECASE)
    clean_title = re.sub(r'\s*- Official.*$', '', clean_title, flags=re.IGNORECASE)
    clean_title = re.sub(r'\s*\| Official.*$', '', clean_title, flags=re.IGNORECASE)
    clean_title = re.sub(r'\s*HD$', '', clean_title, flags=re.IGNORECASE)
    clean_title = re.sub(r'\s*4K$', '', clean_title, flags=re.IGNORECASE)
    clean_title = clean_title.strip()

    # Common patterns in YouTube music titles
    patterns = [
        r'^(.+?)\s*-\s*(.+?)$',  # Artist - Song
        r'^(.+?)\s*by\s*(.+?)$',  # Song by Artist
        r'^(.+?)\s*\|\s*(.+?)$',  # Artist | Song
        r'^(.+?)\s*:\s*(.+?)$',   # Artist: Song
    ]

    for pattern in patterns:
        match = re.match(pattern, clean_title, re.IGNORECASE)
        if match:
            part1 = match.group(1).strip()
            part2 = match.group(2).strip()
            
            # Heuristic: if first part looks like an artist name (shorter, common patterns)
            if len(part1) < len(part2) and 'feat' not in part1.lower() and 'ft.' not in part1.lower():
                return {"artist": part1, "title": part2}
            else:
                return {"artist": part2, "title": part1}

    # Fallback: use full title as song name
    return {"title": clean_title, "artist": ""}

# Optimized search endpoint for SpiceZify
@app.route("/api/youtube/search")
def search():
    start_time = time.time()
    q = request.args.get("q", "")
    max_results = int(request.args.get("maxResults", 20))
    
    logger.info(f"🔍 Search request: '{q}' (maxResults: {max_results})")
    
    if not q:
        return jsonify({"error": "missing query"}), 400

    # Add music context to search
    search_query = f"{q} music" if "music" not in q.lower() else q
    logger.info(f"📝 Modified query: '{search_query}'")

    # Check cache first
    cache_key = f"{search_query}:{max_results}"
    current_time = time.time()
    
    if cache_key in search_cache:
        cached_data, cache_time = search_cache[cache_key]
        if current_time - cache_time < CACHE_DURATION:
            logger.info(f"🎯 Cache hit for '{search_query}' - returning cached results")
            return jsonify(cached_data)
    
    # Get video IDs first (fast operation)
    try:
        logger.info("🚀 Starting aiotube search...")
        search_start = time.time()
        # Reduce limit for faster processing
        ids = aiotube.Search.videos(search_query, limit=min(max_results + 2, 15))
        search_time = time.time() - search_start
        logger.info(f"✅ Aiotube search completed in {search_time:.2f}s, found {len(ids)} videos")
    except Exception as e:
        logger.error(f"❌ Search failed: {str(e)}")
        return jsonify({"error": "search failed", "details": str(e)}), 500

    # Process videos with better error handling
    results = []
    processing_start = time.time()
    
    for i, vid in enumerate(ids[:max_results]):
        try:
            video_start = time.time()
            logger.info(f"🎵 Processing video {i+1}/{min(len(ids), max_results)}: {vid}")
            
            # Clean the video ID first
            clean_id = extract_video_id(vid)
            if not clean_id:
                logger.warning(f"⚠️ Invalid video ID: {vid}")
                continue
                
            v = aiotube.Video(clean_id)
            meta = v.metadata  # dict with title, thumbnails, etc.
            
            video_time = time.time() - video_start
            logger.info(f"📊 Video metadata fetched in {video_time:.2f}s")
            
            # Get thumbnail URL - try multiple sources
            thumbnail_url = None
            if meta.get("thumbnail"):
                thumbnail_url = meta["thumbnail"]
            elif meta.get("thumbnails") and len(meta["thumbnails"]) > 0:
                thumbnails = meta["thumbnails"]
                if isinstance(thumbnails, list):
                    thumbnail_url = thumbnails[-1].get("url") if thumbnails[-1] else None
                elif isinstance(thumbnails, dict):
                    thumbnail_url = thumbnails.get("url")
            
            # Fallback thumbnail
            if not thumbnail_url:
                thumbnail_url = f"https://img.youtube.com/vi/{clean_id}/mqdefault.jpg"

            # Parse title to get artist and song name
            title_info = parse_title(meta.get("title", "Unknown Title"))
            
            # Parse duration
            duration_seconds = parse_duration_seconds(meta.get("duration", 0))
            duration_formatted = format_duration(duration_seconds)
            
            # Filter out videos that are too long (likely not music)
            if duration_seconds > 900:  # 15 minutes
                continue

            # Skip embeddable check for faster loading (optional feature)
            # embeddable = is_embeddable(clean_id)
            embeddable = True  # Assume embeddable for faster response

            results.append({
                "id": clean_id,
                "title": title_info["title"],
                "artist": title_info["artist"] or meta.get("uploader", "Unknown Artist"),
                "thumbnail": thumbnail_url,
                "duration": duration_formatted,
                "youtubeId": clean_id,
                "channelTitle": meta.get("uploader", "Unknown Channel"),
                "publishedAt": meta.get("upload_date", ""),
                "view_count": meta.get("view_count", ""),
                "embeddable": embeddable,
                "streamUrl": f"/api/youtube/audio/{clean_id}"  # Our streaming endpoint
            })
            
            logger.info(f"✅ Successfully processed: {title_info['title']} by {title_info['artist']}")
            
        except Exception as e:
            logger.error(f"❌ Error processing video {vid}: {str(e)}")
            # Add basic info even if metadata fails
            clean_id = extract_video_id(vid)
            if clean_id:
                results.append({
                    "id": clean_id,
                    "title": f"Video {clean_id}",
                    "artist": "Unknown Artist",
                    "thumbnail": f"https://img.youtube.com/vi/{clean_id}/mqdefault.jpg",
                    "duration": "0:00",
                    "youtubeId": clean_id,
                    "channelTitle": "Unknown Channel",
                    "publishedAt": "",
                    "view_count": "",
                    "embeddable": False,
                    "streamUrl": f"/api/youtube/audio/{clean_id}"
                })
            continue

    processing_time = time.time() - processing_start
    total_time = time.time() - start_time
    
    logger.info(f"🎯 Search completed: {len(results)} results in {total_time:.2f}s (processing: {processing_time:.2f}s)")
    
    # Cache the results
    response_data = {"query": q, "results": results, "count": len(results)}
    search_cache[cache_key] = (response_data, current_time)
    
    # Clean old cache entries (simple cleanup)
    if len(search_cache) > 50:  # Keep only 50 recent searches
        oldest_key = min(search_cache.keys(), key=lambda k: search_cache[k][1])
        del search_cache[oldest_key]
    
    return jsonify(response_data)

# Get details for a specific video
@app.route("/api/youtube/video/<video_id>")
def get_video_details(video_id):
    try:
        clean_id = extract_video_id(video_id)
        if not clean_id:
            return jsonify({"error": "Invalid video ID"}), 400
            
        v = aiotube.Video(clean_id)
        meta = v.metadata
        
        # Get thumbnail URL
        thumbnail_url = meta.get("thumbnail") or f"https://img.youtube.com/vi/{clean_id}/mqdefault.jpg"
        
        # Parse title
        title_info = parse_title(meta.get("title", "Unknown Title"))
        
        # Parse duration
        duration_seconds = parse_duration_seconds(meta.get("duration", 0))
        duration_formatted = format_duration(duration_seconds)
        
        result = {
            "id": clean_id,
            "title": title_info["title"],
            "artist": title_info["artist"] or meta.get("uploader", "Unknown Artist"),
            "thumbnail": thumbnail_url,
            "duration": duration_formatted,
            "youtubeId": clean_id,
            "channelTitle": meta.get("uploader", "Unknown Channel"),
            "publishedAt": meta.get("upload_date", ""),
            "streamUrl": f"/api/youtube/audio/{clean_id}"
        }
        
        return jsonify(result)
        
    except Exception as e:
        return jsonify({"error": f"Failed to get video details: {str(e)}"}), 500

# Helper: use yt-dlp to get direct audio URL - optimized
def resolve_audio_url(video_id):
    ytdl_opts = {
        "quiet": True,
        "skip_download": True,
        "format": "bestaudio[ext=m4a]/bestaudio[ext=webm]/bestaudio/best[height<=480]/best",
        "no_warnings": True,
        "extractor_args": {"youtube": {"skip": ["dash", "hls"]}},
        "socket_timeout": 15,
    }
    try:
        logger.info(f"🎧 Using yt-dlp to extract audio for: {video_id}")
        with YoutubeDL(ytdl_opts) as ytdl:
            info = ytdl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            
            if not info:
                logger.error(f"❌ No video info retrieved for {video_id}")
                return None
            
            # Get the best audio format
            formats = info.get("formats", [])
            logger.info(f"📊 Found {len(formats)} formats for {video_id}")
            
            if not formats:
                url = info.get("url")
                logger.info(f"🔗 Using direct URL: {url[:100] if url else 'None'}...")
                return url
            
            # Prefer audio-only formats first
            audio_formats = [f for f in formats if f.get("acodec") != "none" and f.get("vcodec") == "none"]
            logger.info(f"🎵 Found {len(audio_formats)} audio-only formats")
            
            if audio_formats:
                # Get the best quality audio-only format
                best_audio = max(audio_formats, key=lambda x: x.get("abr", 0) or 0)
                url = best_audio.get("url")
                abr = best_audio.get("abr", 0)
                ext = best_audio.get("ext", "unknown")
                logger.info(f"✅ Selected audio format: {ext} @ {abr}kbps")
                return url
            
            # Fallback to any format with audio
            logger.info("🔄 Falling back to formats with audio")
            for f in reversed(formats):
                if f.get("acodec") != "none":
                    url = f.get("url")
                    logger.info(f"🎧 Using fallback format: {f.get('ext', 'unknown')}")
                    return url
                    
            url = info.get("url")
            logger.info(f"🔗 Using video info URL as last resort")
            return url
            
    except Exception as e:
        logger.error(f"❌ Error resolving audio URL for {video_id}: {str(e)}")
        return None

# Audio streaming endpoint - working version like sample
@app.route("/api/youtube/audio/<video_id>")
def audio_proxy(video_id):
    start_time = time.time()
    logger.info(f"🎵 Audio request for video: {video_id}")
    
    try:
        clean_id = extract_video_id(video_id)
        if not clean_id:
            logger.error(f"❌ Invalid video ID: {video_id}")
            return jsonify({"error": "Invalid video ID"}), 400
            
        logger.info(f"🔍 Resolving audio URL for: {clean_id}")
        audio_url = resolve_audio_url(clean_id)
        resolve_time = time.time() - start_time
        
        if not audio_url:
            logger.error(f"❌ Could not resolve audio URL for {clean_id} (took {resolve_time:.2f}s)")
            return jsonify({"error": "Could not resolve audio URL"}), 500
            
        logger.info(f"✅ Audio URL resolved in {resolve_time:.2f}s: {audio_url[:100]}...")
        
    except Exception as e:
        logger.error(f"❌ Error resolving audio for {video_id}: {str(e)}")
        return jsonify({"error": f"Error resolving audio: {str(e)}"}), 500

    # Stream the audio with proper headers
    try:
        logger.info(f"🌊 Starting audio stream for {clean_id}")
        
        # Enhanced headers for better compatibility
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'audio/webm,audio/ogg,audio/wav,audio/*;q=0.9,application/ogg;q=0.7,video/*;q=0.6,*/*;q=0.5',
            'Accept-Language': 'en-US,en;q=0.5',
        }
        
        # Handle range requests
        range_header = request.headers.get('Range')
        if range_header:
            headers['Range'] = range_header
            
        upstream = requests.get(audio_url, stream=True, timeout=30, headers=headers)
        upstream.raise_for_status()
        
        logger.info(f"🎧 Upstream response: {upstream.status_code}, Content-Type: {upstream.headers.get('Content-Type', 'unknown')}")
        
    except requests.exceptions.RequestException as e:
        logger.error(f"❌ Error fetching upstream audio for {clean_id}: {str(e)}")
        return jsonify({"error": f"Error fetching upstream audio: {str(e)}"}), 502

    # Build response headers for proper audio streaming
    response_headers = {
        "Content-Type": upstream.headers.get("Content-Type", "audio/mpeg"),
        "Accept-Ranges": "bytes",
        "Cache-Control": "public, max-age=3600",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Range, Content-Type",
        "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS"
    }
    
    # Preserve important headers from upstream
    for header in ["Content-Length", "Content-Range", "Last-Modified", "ETag"]:
        if header in upstream.headers:
            response_headers[header] = upstream.headers[header]

    def generate():
        try:
            logger.info(f"🎵 Streaming audio chunks for {clean_id}")
            chunk_count = 0
            for chunk in upstream.iter_content(chunk_size=8192):
                if chunk:
                    chunk_count += 1
                    if chunk_count == 1:
                        logger.info(f"📦 First audio chunk sent for {clean_id}")
                    yield chunk
        except Exception as e:
            logger.error(f"❌ Error during audio streaming for {clean_id}: {str(e)}")
        finally:
            upstream.close()
            logger.info(f"🏁 Audio stream completed for {clean_id}")

    status_code = upstream.status_code if upstream.status_code in [200, 206] else 200
    return Response(stream_with_context(generate()), status=status_code, headers=response_headers)

# Health check endpoint
@app.route("/api/youtube/health")
def health():
    return jsonify({"status": "ok", "service": "SpiceZify YouTube Service"})

if __name__ == "__main__":
    print("Starting SpiceZify YouTube Service...")
    print("Make sure to install dependencies: pip install flask flask-cors aiotube yt-dlp requests")
    app.run(debug=True, port=5001, host='0.0.0.0')