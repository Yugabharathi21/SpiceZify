# Python Services

This directory contains the Python-based services for SpiceZify.

## Services

### YouTube Service (`youtube_service.py`)
- **Purpose**: Provides YouTube search and audio streaming functionality
- **Technology**: Flask web service using aiotube and yt-dlp
- **Port**: 5001
- **Dependencies**: See `requirements.txt`

## Setup

1. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```

2. Start the YouTube service:
   ```bash
   python youtube_service.py
   ```

## Dependencies

- **flask**: Web framework for REST API
- **flask-cors**: Cross-origin resource sharing support
- **requests**: HTTP client library
- **aiotube**: Fast YouTube metadata extraction
- **yt-dlp**: YouTube audio stream resolution

## API Endpoints

All endpoints are proxied through the Node.js backend at `/api/youtube/*`:

- `GET /api/youtube/search` - Search for YouTube videos
- `GET /api/youtube/video/{id}` - Get video details
- `GET /api/youtube/audio/{id}` - Stream audio for a video
- `GET /api/youtube/health` - Service health check

## Integration

This service is automatically started by the main application startup scripts and integrates with the Node.js backend via HTTP proxy middleware.