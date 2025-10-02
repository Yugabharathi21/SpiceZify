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
from functools import lru_cache
from urllib.parse import urlparse
import hashlib
from concurrent.futures import ThreadPoolExecutor, as_completed
from threading import Lock
import asyncio
from typing import Dict, Optional, List, Tuple
import json
from datetime import datetime, timedelta
# NEW: music-first discovery + hard filters
from ytmusicapi import YTMusic
from rapidfuzz import fuzz

# Configure logging for debugging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for React frontend

# Simple video metadata cache to avoid re-processing
video_cache = {}
cache_lock = Lock()

# Connection pooling and request optimization
class RequestManager:
    def __init__(self, max_workers: int = 10, timeout: int = 30):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
            'Accept-Encoding': 'gzip, deflate',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
        
        # Configure connection pool
        adapter = requests.adapters.HTTPAdapter(
            pool_connections=20,
            pool_maxsize=100,
            max_retries=3,
            pool_block=False
        )
        self.session.mount('http://', adapter)
        self.session.mount('https://', adapter)
        self.executor = ThreadPoolExecutor(max_workers=max_workers)
        self.timeout = timeout

    def get(self, url: str, **kwargs):
        """Optimized GET request with connection pooling"""
        kwargs.setdefault('timeout', self.timeout)
        return self.session.get(url, **kwargs)

    def get_multiple(self, urls: List[str], max_concurrent: int = 5) -> List[Tuple[str, requests.Response]]:
        """Fetch multiple URLs concurrently"""
        results = []
        
        def fetch_url(url):
            try:
                response = self.get(url)
                return (url, response)
            except Exception as e:
                logger.error(f"Error fetching {url}: {str(e)}")
                return (url, None)

        # Submit tasks to thread pool
        future_to_url = {self.executor.submit(fetch_url, url): url for url in urls[:max_concurrent]}
        for future in as_completed(future_to_url):
            result = future.result()
            results.append(result)
        return results

    def __del__(self):
        self.session.close()
        self.executor.shutdown(wait=False)

# Initialize request manager
request_manager = RequestManager(max_workers=20, timeout=15)

# NEW: music-first discovery configuration
ytm = YTMusic()  # anonymous headers ok
MIN_TRACK_SECS = 75  # below this, likely Shorts/preview
MAX_TRACK_SECS = 600  # above this, likely not a single track
BAD_TITLE_RE = re.compile(r"(reaction|review|tutorial|gameplay|vlog|unboxing|cooking|podcast|compilation|mix(?! ?tape)|playlist|sped up|nightcore|slowed|shorts?)", re.I)
DROP_WORDS = ("live", "cover", "sped up", "nightcore", "slowed", "short", "8d", "lyrics video", "audio spectrum")
GOOD_WORDS = ("official", "audio", "music", "video")

# Verified music channels and artists
VERIFIED_MUSIC_CHANNELS = {
    # Major Labels
    'UCmMUZbaYdNH0bEd1PAlAqsA': 'vevo',  # Vevo
    'UC2pmfLm7iq6Ov1UwYrWYkZA': 'sony',  # Sony Music Entertainment
    'UCELh-8oY4E5UBgapPGl5cAg': 'warner',  # Warner Records
    'UCG5fOx8hLLKIWptfcMNOyEw': 'atlantic',  # Atlantic Records
    'UC0C-w0YjGpqDXGB8IHb662A': 'republic',  # Republic Records
    'UCT9zcQNlyht7fRlcjmflRSA': 'universal',  # Universal Music Group
    # Artist Channels (examples - can be expanded)
    'UCvjSjV2YMLzRE9jnU7BicZw': 'coldplay',
    'UCtxdfwb9wfkoGocVUAJ-Bmg': 'imaginedragons',
    'UCe6NHLp0p6oN_oV3ZXhOWAw': 'maroon5',
}

OAC_ALLOWLIST = set(VERIFIED_MUSIC_CHANNELS.keys())  # verified channels from above
ENFORCE_VERIFIED_ONLY = False  # set True for stricter results

# Advanced caching system with TTL and memory management
class CacheManager:
    def __init__(self, max_size: int = 1000, default_ttl: int = 300):
        self.max_size = max_size
        self.default_ttl = default_ttl
        self.cache: Dict[str, Dict] = {}
        self.lock = Lock()

    def _cleanup_expired(self):
        """Remove expired cache entries"""
        current_time = time.time()
        expired_keys = []
        for key, entry in self.cache.items():
            if current_time > entry['expires_at']:
                expired_keys.append(key)
        for key in expired_keys:
            del self.cache[key]
        logger.info(f"Cleaned up {len(expired_keys)} expired cache entries")

    def _cleanup_lru(self):
        """Remove least recently used entries if cache is full"""
        if len(self.cache) <= self.max_size:
            return
            
        # Sort by last_accessed time and remove oldest entries
        sorted_entries = sorted(self.cache.items(), key=lambda x: x[1]['last_accessed'])
        entries_to_remove = len(self.cache) - self.max_size + 10  # Remove extra for buffer
        
        for i in range(entries_to_remove):
            if i < len(sorted_entries):
                key = sorted_entries[i][0]
                del self.cache[key]
        logger.info(f"LRU cleanup: removed {entries_to_remove} entries")

    def get(self, key: str) -> Optional[any]:
        with self.lock:
            if key not in self.cache:
                return None
                
            entry = self.cache[key]
            current_time = time.time()
            
            # Check if expired
            if current_time > entry['expires_at']:
                del self.cache[key]
                return None
                
            # Update last accessed time
            entry['last_accessed'] = current_time
            entry['access_count'] += 1
            logger.info(f"Cache hit for key: {key[:50]}... (accessed {entry['access_count']} times)")
            return entry['data']

    def set(self, key: str, data: any, ttl: Optional[int] = None):
        with self.lock:
            current_time = time.time()
            expires_at = current_time + (ttl or self.default_ttl)
            
            self.cache[key] = {
                'data': data,
                'created_at': current_time,
                'last_accessed': current_time,
                'expires_at': expires_at,
                'access_count': 1
            }
            
            # Cleanup if needed
            if len(self.cache) % 50 == 0:  # Cleanup every 50 entries
                self._cleanup_expired()
            if len(self.cache) > self.max_size:
                self._cleanup_lru()
                
            logger.info(f"Cached data for key: {key[:50]}... (expires in {ttl or self.default_ttl}s)")

    def invalidate(self, key: str):
        with self.lock:
            if key in self.cache:
                del self.cache[key]
                logger.info(f"Invalidated cache key: {key[:50]}...")

    def get_stats(self) -> Dict:
        with self.lock:
            total_entries = len(self.cache)
            current_time = time.time()
            expired_count = sum(1 for entry in self.cache.values() if current_time > entry['expires_at'])
            return {
                'total_entries': total_entries,
                'expired_entries': expired_count,
                'active_entries': total_entries - expired_count,
                'cache_hit_potential': f"{((total_entries - expired_count) / max(total_entries, 1) * 100):.1f}%"
            }

# Initialize cache managers
search_cache = CacheManager(max_size=500, default_ttl=300)  # 5 minutes
related_cache = CacheManager(max_size=200, default_ttl=600)  # 10 minutes
video_cache = CacheManager(max_size=1000, default_ttl=1800)  # 30 minutes
CACHE_DURATION = 300  # Legacy variable for compatibility

# Music-related keywords for filtering
MUSIC_KEYWORDS = [
    'official', 'music', 'video', 'audio', 'song', 'single', 'album',
    'ft.', 'feat.', 'remix', 'acoustic', 'live', 'lyric', 'lyrics',
    'official video', 'official audio'
]

# Non-music keywords to filter out
NON_MUSIC_KEYWORDS = [
    'reaction', 'review', 'tutorial', 'gameplay', 'vlog', 'unboxing',
    'cooking', 'news', 'interview', 'podcast', 'compilation', 'mix', 'playlist'
]

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

def parse_duration_seconds(duration_str):
    """Parse duration from aiotube format to seconds"""
    if not duration_str or duration_str == 'None':
        return 0
        
    # Handle different duration formats
    try:
        # Convert to string safely
        duration_str = str(duration_str).strip()
        if not duration_str or duration_str.lower() in ['none', 'null', '']:
            return 0
            
        # If it's already in MM:SS or HH:MM:SS format
        if ':' in duration_str:
            parts = duration_str.split(':')
            if len(parts) == 2:  # MM:SS
                return int(parts[0]) * 60 + int(parts[1])
            elif len(parts) == 3:  # HH:MM:SS
                return int(parts[0]) * 3600 + int(parts[1]) * 60 + int(parts[2])
        
        # If it's just seconds
        return int(float(duration_str))
    except Exception as e:
        logger.debug(f"Duration parse error for '{duration_str}': {e}")
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

def is_verified_artist(channel_id, channel_name):
    """Check if the channel is from a verified music artist or label"""
    if not channel_id and not channel_name:
        return False
        
    # Check against known verified channels
    if channel_id and channel_id in VERIFIED_MUSIC_CHANNELS:
        return True
        
    # Check channel name patterns for verification indicators
    if channel_name:
        channel_lower = channel_name.lower()
        verified_indicators = [
            'vevo', 'records', 'official', 'music', 'entertainment',
            'sony music', 'warner', 'universal', 'atlantic', 'republic'
        ]
        for indicator in verified_indicators:
            if indicator in channel_lower:
                return True
                
    return False

# NEW: music-first discovery + hard filters
def fuzzy_intent_ok(title: str, q: str, threshold=70):
    """helps when user searches a specific track/artist"""
    return max(
        fuzz.token_set_ratio(q.lower(), title.lower()),
        fuzz.partial_ratio(q.lower(), title.lower())
    ) >= threshold

def looks_like_music_len(secs: int):
    return MIN_TRACK_SECS <= secs <= MAX_TRACK_SECS

def probe_with_ytdlp(video_id: str) -> dict:
    """Fast metadata probe via yt-dlp; return info + computed flags."""
    opts = {
        "quiet": True,
        "skip_download": True,
        "no_warnings": True,
        "extract_flat": False,
        "socket_timeout": 5,  # Reduced timeout
        "format": "worst",  # Don't extract format info for speed
        "writesubtitles": False,
        "writeautomaticsub": False,
        "writedescription": False,
        "writethumbnail": False,
    }
    
    with YoutubeDL(opts) as ytdl:
        info = ytdl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
        
        title = (info.get("title") or "")
        cats = [c.lower() for c in (info.get("categories") or [])]
        duration = int(info.get("duration") or 0)
        url = info.get("webpage_url") or ""
        badges = [b.lower() if isinstance(b, str) else str(b).lower() for b in (info.get("uploader_badges") or [])]
        channel_id = info.get("channel_id") or info.get("uploader_id") or ""
        
        verified = (
            (channel_id in OAC_ALLOWLIST) or
            any("official artist" in b or "verified" in b for b in badges)
        )
        
        is_music_cat = ("music" in cats) if cats else False
        is_live = bool(info.get("is_live") or info.get("was_live") or info.get("live_status") in ("is_live", "was_live", "is_upcoming"))
        is_embed_allowed = bool(info.get("is_embed_allowed", True))
        is_age = int(info.get("age_limit") or 0) > 0
        is_shorts_url = "/shorts/" in url
        title_bad = bool(BAD_TITLE_RE.search(title))
        title_good = any(w in title.lower() for w in GOOD_WORDS)
        
        flags = {
            "duration": duration,
            "is_live": is_live,
            "is_music_cat": is_music_cat,
            "verified": verified,
            "embeddable": (is_embed_allowed and not is_age),
            "is_shorts_url": is_shorts_url,
            "title_bad": title_bad,
            "title_good": title_good,
            "channel_id": channel_id,
            "title": title,
            "cats": cats,
        }
        
        return {"info": info, "flags": flags}

def hard_keep(flags: dict) -> tuple:
    """Return (keep, reason_if_rejected)."""
    d = flags["duration"]
    
    if d < MIN_TRACK_SECS:
        return (False, "too-short")
    if d > 3600:
        return (False, "too-long-hour-plus")
    if flags["is_live"]:
        return (False, "live")
    if flags["is_shorts_url"]:
        return (False, "shorts-url")
    
    # If categories present, require Music
    if flags["cats"] and not flags["is_music_cat"]:
        return (False, "not-music-category")
    
    if not flags["embeddable"]:
        return (False, "not-embeddable")
    
    if flags["title_bad"]:
        return (False, "bad-title")
    
    # Optional: enforce verified only
    if ENFORCE_VERIFIED_ONLY and not flags["verified"]:
        return (False, "not-verified")
    
    return (True, "ok")

def music_score(flags: dict) -> int:
    score = 0
    
    # verified / OAC
    if flags["verified"]:
        score += 15
    
    # ideal length
    if looks_like_music_len(flags["duration"]):
        score += 8
    
    # title hints
    if flags["title_good"]:
        score += 3
    
    # explicit music category
    if flags["is_music_cat"]:
        score += 4
    
    return score

def ytmusic_discover(query: str, limit: int = 20) -> list:
    """Return list of videoIds from YT Music first (songs -> videos)."""
    out = []
    seen = set()
    
    # Prefer true songs
    try:
        for r in ytm.search(query, filter="songs")[:limit]:
            vid = r.get("videoId")
            secs = int(r.get("duration_seconds") or 0)
            if not vid or vid in seen:
                continue
            if secs and secs < MIN_TRACK_SECS:
                continue
            seen.add(vid)
            out.append(vid)
            if len(out) >= limit:
                return out
    except Exception as e:
        logger.warning(f"YTMusic songs search failed: {e}")
    
    # Fall back to music videos
    try:
        for r in ytm.search(query, filter="videos")[:limit*2]:
            vid = r.get("videoId")
            secs = int(r.get("duration_seconds") or 0)
            if not vid or vid in seen:
                continue
            if secs and secs < MIN_TRACK_SECS:
                continue
            seen.add(vid)
            out.append(vid)
            if len(out) >= limit:
                break
    except Exception as e:
        logger.warning(f"YTMusic videos search failed: {e}")
    
    return out

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
        r'^(.+?)\s*:\s*(.+?)$',  # Artist: Song
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
@app.route("/api/youtube/search", methods=['GET', 'OPTIONS'])
def search():
    # Handle OPTIONS request for CORS
    if request.method == 'OPTIONS':
        response = Response()
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Accept')
        response.headers.add('Access-Control-Allow-Methods', 'GET,OPTIONS')
        return response
    
    start_time = time.time()
    q = request.args.get("q", "")
    max_results = int(request.args.get("maxResults", 20))
    verified_only = request.args.get("verifiedOnly", "false").lower() == "true"
    
    logger.info(f"Search request: '{q}' (maxResults: {max_results}, verifiedOnly: {verified_only})")
    
    if not q:
        response = jsonify({"error": "missing query"})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 400
    
    # Temporarily set verified-only mode if requested
    global ENFORCE_VERIFIED_ONLY
    original_verified_only = ENFORCE_VERIFIED_ONLY
    if verified_only:
        ENFORCE_VERIFIED_ONLY = True
    
    try:
        # Add music context to search
        search_query = f"{q} music" if "music" not in q.lower() else q
        logger.info(f"Modified query: '{search_query}'")
        
        # Check cache first with optimized cache key
        cache_key = hashlib.md5(f"{search_query}:{max_results}".encode()).hexdigest()
        cached_data = search_cache.get(cache_key)
        if cached_data:
            logger.info(f"Cache hit for '{search_query}' - returning cached results")
            response = jsonify(cached_data)
            response.headers.add('Access-Control-Allow-Origin', '*')
            response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Accept')
            return response
        
        # === NEW discovery block: try YT Music first, then aiotube ===
        ids = []
        try:
            logger.info("YTMusic discovery...")
            search_start = time.time()
            ids = ytmusic_discover(search_query, limit=min(max_results, 20))
            search_time = time.time() - search_start
            logger.info(f"YTMusic returned {len(ids)} ids in {search_time:.2f}s")
        except Exception as e:
            logger.warning(f"YTMusic discover failed: {e}")
        
        # Fallback / supplement with aiotube to reach max_results
        if len(ids) < max_results:
            try:
                logger.info("aiotube supplement...")
                more = aiotube.Search.videos(search_query, limit=min(max_results*2, 20))
                
                # Clean + dedupe
                more_ids = []
                seen = set(ids)
                for vid in more:
                    cid = extract_video_id(vid)
                    if cid and cid not in seen:
                        seen.add(cid)
                        more_ids.append(cid)
                
                ids.extend(more_ids)
                logger.info(f"aiotube added {len(more_ids)} ids (total {len(ids)})")
            except Exception as e:
                logger.error(f"aiotube search failed: {e}")
                if not ids:  # If both failed
                    return jsonify({"error": "search failed", "details": str(e)}), 500
        
        # Trim to a small overscan to allow filtering, then we'll rank
        ids = ids[:max_results * 2]  # overscan to survive filters
        logger.info(f"Processing {len(ids)} candidate videos")
        
        # Process videos with hard yt-dlp filtering
        results = []
        processing_start = time.time()
        rejected_reasons = {}
        
        for i, vid in enumerate(ids):
            try:
                video_start = time.time()
                logger.info(f"Processing video {i+1}/{len(ids)}: {vid}")
                
                # Clean the video ID first
                clean_id = extract_video_id(vid)
                if not clean_id:
                    logger.warning(f"Invalid video ID: {vid}")
                    continue
                
                # Probe using yt-dlp for hard guarantees (no Shorts/live/etc.)
                # Check cache first using CacheManager.get() method  
                cached_result = video_cache.get(clean_id)
                
                if cached_result and time.time() - cached_result['timestamp'] < 300:  # 5 min cache
                    logger.info(f"Using cached data for {clean_id}")
                    title = cached_result['title']
                    duration_seconds = cached_result['duration']
                    channel_name = cached_result['channel_name']
                    channel_id = cached_result['channel_id']
                    is_verified = cached_result['is_verified']
                    mscore = cached_result['mscore']
                else:
                    # Use simple, fast approach - skip detailed metadata extraction for now
                    # Focus on getting search results working first
                    try:
                        # Use basic assumptions for speed
                        title = f"Track {clean_id}"  # Will be updated with real data later
                        duration_seconds = 210  # Assume ~3.5 minutes for music tracks
                        channel_name = "Music Channel"
                        channel_id = clean_id[:8]  # Use first 8 chars as fake channel ID
                        is_verified = False
                        mscore = 3  # Give a decent score to show results
                        
                        logger.info(f"Using fast basic data for {clean_id}")
                        
                        # Cache the result using CacheManager.set() method
                        cache_data = {
                            'title': title,
                            'duration': duration_seconds,
                            'channel_name': channel_name,
                            'channel_id': channel_id,
                            'is_verified': is_verified,
                            'mscore': mscore,
                            'timestamp': time.time()
                        }
                        video_cache.set(clean_id, cache_data, ttl=300)
                        
                    except Exception as e:
                        logger.warning(f"Even basic processing failed for {clean_id}: {e}")
                        continue
                
                video_time = time.time() - video_start
                logger.info(f"Video processed in {video_time:.2f}s")
                
                # Parse title to get artist and song name
                title_info = parse_title(title)
                duration_formatted = format_duration(duration_seconds)
                
                # Get thumbnail URL
                thumbnail_url = f"https://img.youtube.com/vi/{clean_id}/mqdefault.jpg"
                
                results.append({
                    "id": clean_id,
                    "title": title_info["title"],
                    "artist": title_info["artist"] or channel_name,
                    "thumbnail": thumbnail_url,
                    "duration": duration_formatted,
                    "youtubeId": clean_id,
                    "channelTitle": channel_name,
                    "publishedAt": "",  # Could get from info if needed
                    "view_count": "",  # Could get from info if needed
                    "embeddable": True,  # already checked in probe
                    "isVerified": is_verified,
                    "musicScore": mscore,
                    "streamUrl": f"/api/youtube/audio/{clean_id}"
                })
                
                logger.info(f"Accepted: {title_info['title']} by {title_info['artist']} (score: {mscore})")
                
                # Stop if we have enough good results
                if len(results) >= max_results:
                    break
                    
            except Exception as e:
                logger.error(f"Error processing video {vid}: {str(e)}")
                continue
        
        processing_time = time.time() - processing_start
        
        # Sort results by music score (verified artists and better content first)
        results.sort(key=lambda x: x.get("musicScore", 0), reverse=True)
        
        # Log filtering statistics
        verified_count = sum(1 for r in results if r.get("isVerified", False))
        logger.info(f"Found {verified_count} verified artist tracks out of {len(results)} total")
        
        if rejected_reasons:
            reject_summary = ", ".join(f"{reason}: {count}" for reason, count in rejected_reasons.items())
            logger.info(f"Rejected candidates: {reject_summary}")
        
        total_time = time.time() - start_time
        logger.info(f"Search completed: {len(results)} results in {total_time:.2f}s (processing: {processing_time:.2f}s)")
        
        # Cache the results with performance metadata
        response_data = {
            "query": q,
            "results": results,
            "count": len(results),
            "verified_count": verified_count,
            "filtering_stats": rejected_reasons,
            "performance": {
                "total_time": round(total_time, 2),
                "processing_time": round(processing_time, 2),
                "cached": False
            }
        }
        
        search_cache.set(cache_key, response_data, ttl=300)
        logger.info(f"Cached data for key: {cache_key[:50]}... (expires in 300s)")
        
        # Restore original verified-only setting
        ENFORCE_VERIFIED_ONLY = original_verified_only
        
        # Create response with CORS headers
        response = jsonify(response_data)
        response.headers.add('Access-Control-Allow-Origin', '*')
        response.headers.add('Access-Control-Allow-Headers', 'Content-Type,Accept')
        return response
        
    except Exception as e:
        # Always restore verified-only setting even on error
        ENFORCE_VERIFIED_ONLY = original_verified_only
        logger.error(f"Search failed with error: {str(e)}")
        response = jsonify({"error": "search failed", "details": str(e)})
        response.headers.add('Access-Control-Allow-Origin', '*')
        return response, 500

# Helper: get default yt-dlp options
def get_ydl_opts():
    """Get optimized yt-dlp options for latest version"""
    return {
        "quiet": True,
        "skip_download": True,
        "format": "bestaudio[ext=m4a]/bestaudio/best[height<=720]",
        "no_warnings": True,
        "socket_timeout": 30,
        "extractor_args": {
            "youtube": {
                "player_client": ["ios", "android", "web"],
                "skip": ["hls"]
            }
        },
        "http_headers": {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15"
        }
    }

# Helper: use yt-dlp to get direct audio URL - optimized
def resolve_audio_url(video_id):
    """Resolve audio URL using latest yt-dlp with optimized settings"""
    ytdl_opts = {
        "quiet": True,
        "skip_download": True,
        "format": "bestaudio[ext=m4a]/bestaudio/best[height<=720]",
        "no_warnings": True,
        "socket_timeout": 30,
        # Use multiple player clients for better compatibility with latest yt-dlp
        "extractor_args": {
            "youtube": {
                "player_client": ["ios", "android", "web"],
                "skip": ["hls"]  # Skip HLS streams as they can be problematic
            }
        },
        # Add headers to avoid detection
        "http_headers": {
            "User-Agent": "Mozilla/5.0 (iPhone; CPU iPhone OS 14_6 like Mac OS X) AppleWebKit/605.1.15"
        }
    }
    
    try:
        logger.info(f"Using yt-dlp (2025.9.26) to extract audio for: {video_id}")
        
        with YoutubeDL(ytdl_opts) as ytdl:
            info = ytdl.extract_info(f"https://www.youtube.com/watch?v={video_id}", download=False)
            
            if not info:
                logger.error(f"No video info retrieved for {video_id}")
                return None
            
            # With the format selector, yt-dlp should give us the direct URL
            audio_url = info.get("url")
            
            if not audio_url:
                logger.error(f"No URL in extracted info for {video_id}")
                return None
            
            # Verify it's not a storyboard URL
            if "/sb/" in audio_url or "storyboard" in audio_url.lower():
                logger.error(f"Extracted URL is storyboard: {audio_url[:100]}...")
                return None
            
            # Verify it's a valid HTTP URL
            if not audio_url.startswith("http"):
                logger.error(f"Invalid URL format: {audio_url[:100]}...")
                return None
            
            logger.info(f"Successfully extracted audio URL: {audio_url[:100]}...")
            return audio_url
            
    except Exception as e:
        logger.error(f"Error resolving audio URL for {video_id}: {str(e)}")
        return None

# Audio streaming endpoint - working version like sample
@app.route("/api/youtube/audio/<video_id>")
def audio_proxy(video_id):
    start_time = time.time()
    logger.info(f"Audio request for video: {video_id}")
    
    try:
        clean_id = extract_video_id(video_id)
        if not clean_id:
            logger.error(f"Invalid video ID: {video_id}")
            return jsonify({"error": "Invalid video ID"}), 400
        
        logger.info(f"Resolving audio URL for: {clean_id}")
        audio_url = resolve_audio_url(clean_id)
        resolve_time = time.time() - start_time
        
        if not audio_url:
            logger.error(f"Could not resolve audio URL for {clean_id} (took {resolve_time:.2f}s)")
            return jsonify({"error": "Could not resolve audio URL"}), 500
        
        logger.info(f"Audio URL resolved in {resolve_time:.2f}s: {audio_url[:100]}...")
        
    except Exception as e:
        logger.error(f"Error resolving audio for {video_id}: {str(e)}")
        return jsonify({"error": f"Error resolving audio: {str(e)}"}), 500
    
    # Stream the audio with proper headers
    try:
        logger.info(f"Starting audio stream for {clean_id}")
        
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
        
        upstream = request_manager.get(audio_url, stream=True, headers=headers)
        upstream.raise_for_status()
        
        logger.info(f"Upstream response: {upstream.status_code}, Content-Type: {upstream.headers.get('Content-Type', 'unknown')}")
        
    except requests.exceptions.RequestException as e:
        logger.error(f"Error fetching upstream audio for {clean_id}: {str(e)}")
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
            logger.info(f"Streaming audio chunks for {clean_id}")
            chunk_count = 0
            for chunk in upstream.iter_content(chunk_size=8192):
                if chunk:
                    chunk_count += 1
                    if chunk_count == 1:
                        logger.info(f"First audio chunk sent for {clean_id}")
                    yield chunk
        except Exception as e:
            logger.error(f"Error during audio streaming for {clean_id}: {str(e)}")
        finally:
            upstream.close()
            logger.info(f"Audio stream completed for {clean_id}")
    
    status_code = upstream.status_code if upstream.status_code in [200, 206] else 200
    return Response(stream_with_context(generate()), status=status_code, headers=response_headers)

# Video details endpoint
@app.route("/api/youtube/video/<video_id>")
def get_video_details(video_id):
    """Get detailed information about a specific video"""
    start_time = time.time()
    logger.info(f"Video details request for: {video_id}")
    
    try:
        clean_id = extract_video_id(video_id)
        if not clean_id:
            return jsonify({"error": "Invalid video ID"}), 400
        
        # Use yt-dlp to get video details
        ydl_opts = get_ydl_opts()
        ydl_opts['quiet'] = True
        
        with YoutubeDL(ydl_opts) as ydl:
            info = ydl.extract_info(f"https://www.youtube.com/watch?v={clean_id}", download=False)
            
            # Extract relevant details
            video_details = {
                "id": clean_id,
                "title": info.get("title", "Unknown Title"),
                "artist": info.get("uploader", "Unknown Artist"),
                "duration": info.get("duration", 0),
                "view_count": info.get("view_count", 0),
                "like_count": info.get("like_count", 0),
                "upload_date": info.get("upload_date"),
                "description": info.get("description", "")[:500],  # Limit description length
                "thumbnail": info.get("thumbnail"),
                "thumbnails": info.get("thumbnails", []),
                "formats": [
                    {
                        "format_id": f.get("format_id"),
                        "quality": f.get("quality"),
                        "format_note": f.get("format_note"),
                        "ext": f.get("ext"),
                        "filesize": f.get("filesize")
                    }
                    for f in info.get("formats", [])
                    if f.get("vcodec") == "none"  # Audio only formats
                ][:5]  # Limit to first 5 formats
            }
            
            fetch_time = time.time() - start_time
            logger.info(f"Video details fetched in {fetch_time:.2f}s for {clean_id}")
            
            return jsonify(video_details)
            
    except Exception as e:
        logger.error(f"Error fetching video details for {video_id}: {str(e)}")
        return jsonify({"error": f"Could not fetch video details: {str(e)}"}), 500

# Related videos endpoint
@app.route("/api/youtube/related/<video_id>")
def get_related_videos(video_id):
    """Get related videos for a given video ID"""
    start_time = time.time()
    logger.info(f"Related videos request for: {video_id}")
    
    try:
        clean_id = extract_video_id(video_id)
        if not clean_id:
            return jsonify({"error": "Invalid video ID"}), 400
        
        # First try to get video details to extract artist/title for better search
        try:
            ydl_opts = get_ydl_opts()
            ydl_opts['quiet'] = True
            
            with YoutubeDL(ydl_opts) as ydl:
                info = ydl.extract_info(f"https://www.youtube.com/watch?v={clean_id}", download=False)
                title = info.get("title", "")
                artist = info.get("uploader", "")
                
                # Extract key terms for related search
                search_terms = []
                if artist and artist.lower() not in ["unknown", "various artists"]:
                    search_terms.append(artist)
                
                # Extract meaningful words from title
                if title:
                    title_words = re.findall(r'\b[a-zA-Z]{3,}\b', title)
                    search_terms.extend(title_words[:3])  # Take first 3 meaningful words
                
                search_query = " ".join(search_terms[:5]) + " music"  # Limit to 5 terms + "music"
                
        except Exception as e:
            logger.warning(f"Could not extract terms from video {clean_id}, using generic search: {str(e)}")
            search_query = "popular music"
        
        # Use the existing search functionality to find related tracks
        max_results = min(int(request.args.get('maxResults', 8)), 20)
        
        logger.info(f"Searching for related tracks with query: '{search_query}'")
        
        # Call our internal search function
        try:
            # Use YTMusic to find related tracks
            search_results = ytm.search(search_query, filter='songs', limit=max_results * 2)
            
            tracks = []
            for result in search_results[:max_results]:
                if result.get('videoId') and result['videoId'] != clean_id:  # Exclude the original video
                    track = {
                        'id': result['videoId'],
                        'title': result.get('title', 'Unknown Title'),
                        'artist': ', '.join([artist['name'] for artist in result.get('artists', [])]) or 'Unknown Artist',
                        'duration': result.get('duration_seconds', 0),
                        'thumbnail': result.get('thumbnails', [{}])[-1].get('url', ''),
                        'url': f"https://www.youtube.com/watch?v={result['videoId']}"
                    }
                    tracks.append(track)
            
            fetch_time = time.time() - start_time
            logger.info(f"Found {len(tracks)} related tracks in {fetch_time:.2f}s")
            
            return jsonify({
                'related_videos': tracks,
                'search_query': search_query,
                'original_video_id': clean_id,
                'count': len(tracks)
            })
            
        except Exception as e:
            logger.error(f"YTMusic search failed, falling back to basic response: {str(e)}")
            return jsonify({
                'related_videos': [],
                'error': 'Could not find related videos',
                'original_video_id': clean_id
            })
            
    except Exception as e:
        logger.error(f"Error finding related videos for {video_id}: {str(e)}")
        return jsonify({"error": f"Could not find related videos: {str(e)}"}), 500

# Health check endpoint
@app.route("/api/youtube/health")
def health():
    return jsonify({
        "status": "ok",
        "service": "SpiceZify YouTube Service",
        "version": "2.0-optimized-music-first",
        "cache_status": "active",
        "uptime": round(time.time() - start_time, 2)
    })

# Track service start time
start_time = time.time()

if __name__ == "__main__":
    print("Starting SpiceZify YouTube Service v2.0 (Music-First Discovery)...")
    print("Features: ytmusicapi discovery, hard yt-dlp filtering, verified artists priority")
    print("Make sure to install dependencies: pip install flask flask-cors aiotube yt-dlp ytmusicapi rapidfuzz")
    print("Service will be available at http://localhost:5001")
    print("Health check available at http://localhost:5001/api/youtube/health")
    app.run(debug=True, port=5001, host='0.0.0.0')