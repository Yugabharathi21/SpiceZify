# SpiceZify Python YouTube Integration Setup

This guide will help you set up the new Python-based YouTube scraping and streaming service for SpiceZify.

## Overview

We've replaced the YouTube API with a Python Flask service that uses:
- **aiotube**: For fast YouTube search and metadata extraction
- **yt-dlp**: For getting direct audio stream URLs
- **Flask**: For providing REST API endpoints
- **Node.js proxy**: For seamless integration with the existing backend

## Prerequisites

1. **Python 3.8+** installed on your system
2. **Node.js 16+** for the existing backend
3. **pip** for Python package management

## Installation Steps

### 1. Install Python Dependencies

Navigate to the Python services directory and install the required Python packages:

```bash
cd server/python_services
pip install -r requirements.txt
```

The requirements.txt includes:
- flask==2.3.3
- flask-cors==4.0.0
- requests==2.31.0
- aiotube==0.3.0
- yt-dlp==2023.9.24

### 2. Install Node.js Dependencies

Install the new proxy middleware for the Node.js server:

```bash
npm install http-proxy-middleware@^2.0.6
```

### 3. Start the Services

You need to run both services:

#### Start the Python YouTube Service (Terminal 1):
```bash
cd server/python_services
python youtube_service.py
```

This will start the Python service on `http://localhost:5001`

#### Start the Node.js Backend (Terminal 2):
```bash
cd server
npm run dev
```

This will start the Node.js server on `http://localhost:3001`

#### Start the React Frontend (Terminal 3):
```bash
npm run dev
```

This will start the React app on `http://localhost:5173`

## API Endpoints

The Python service provides these endpoints (proxied through Node.js):

### Search
- **GET** `/api/youtube/search?q=query&maxResults=20`
- Returns array of YouTube videos with metadata

### Video Details
- **GET** `/api/youtube/video/{videoId}`
- Returns detailed information about a specific video

### Audio Stream
- **GET** `/api/youtube/audio/{videoId}`
- Returns proxied audio stream for direct playback

### Health Check
- **GET** `/api/youtube/health`
- Returns service status

## Features

### ✅ What's Working
- **Fast Search**: Uses aiotube for quick YouTube searches
- **Direct Audio Streaming**: No YouTube API limits
- **Metadata Extraction**: Title, artist, duration, thumbnails
- **Audio-Only Playback**: Uses HTML5 audio instead of YouTube iframes
- **CORS Support**: Proper cross-origin handling
- **Error Handling**: Graceful fallbacks and error messages

### 🔧 Architecture
- **Frontend**: React with TypeScript
- **Backend**: Node.js (Express) + Python (Flask)
- **Audio**: HTML5 Audio API with direct streaming
- **Search**: aiotube + yt-dlp integration

## Troubleshooting

### Python Service Issues
```bash
# Check if Python service is running
curl http://localhost:5001/api/youtube/health

# Install missing dependencies
pip install flask flask-cors aiotube yt-dlp requests
```

### Node.js Proxy Issues
```bash
# Install proxy middleware
npm install http-proxy-middleware

# Check if backend is running
curl http://localhost:3001/api/youtube/health
```

### Audio Playback Issues
- Ensure both Python and Node.js services are running
- Check browser console for CORS errors
- Verify the audio stream URL is accessible

## Performance Benefits

1. **No API Rate Limits**: Direct scraping eliminates YouTube API quotas
2. **Faster Search**: aiotube provides quicker results than API calls
3. **Better Audio Quality**: Direct access to audio streams
4. **Reduced Costs**: No need for YouTube API keys
5. **More Control**: Can customize search results and filtering

## Migration Notes

- **Old YouTube API calls** → **New Python service endpoints**
- **YouTube iframe player** → **HTML5 audio element**
- **API key authentication** → **Direct scraping (no auth needed)**
- **Limited API quotas** → **Unlimited searches**

## Development Tips

1. **Monitor Python Service**: Keep an eye on the Python terminal for errors
2. **Audio CORS**: The service handles CORS headers for audio streaming
3. **Error Fallbacks**: Mock data is provided when services are unavailable
4. **Browser Cache**: Audio URLs are cached for better performance

## Next Steps

1. Start all three services (Python, Node.js, React)
2. Test music search and playback
3. Verify room synchronization still works
4. Check that playlists and liked songs function correctly

The integration is now complete and should provide a much more robust and scalable music streaming experience!