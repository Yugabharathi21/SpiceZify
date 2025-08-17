# SPiceZify - Electron Music Player

A beautiful, Spotify-inspired music player for local audio files with real-time collaborative features and advanced album management.

![SPiceZify Screenshot](docs/screenshot.png)

## ✨ Key Features

- **Advanced Album System**: Complete album management with metadata, covers, and duplicate prevention
- **Local Music Library**: Scan and organize your music collection with automatic metadata extraction
- **Spotify-Style UI**: Clean, modern interface with dark theme and smooth animations
- **Real-time Play Together**: Synchronized listening sessions with friends
- **Smart Playlists**: Create dynamic playlists based on criteria
- **Gapless Playback**: Seamless audio transitions between tracks
- **Search & Discovery**: Fast, fuzzy search across your entire library
- **Chat Integration**: Real-time chat in listening rooms
- **Cross-platform**: Works on Windows, macOS, and Linux

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Python 3.x (for native dependencies)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/Yugabharathi21/SpiceZify.git
   cd SpiceZify
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your Supabase credentials
   ```

4. **Set up database** (2 simple steps)
   - Go to your Supabase dashboard → SQL Editor
   - Run `database_final.sql` → Run `database_albums_enhancement.sql`
   - ✅ Automatic duplicate album fix included!

5. **Start development**
   ```bash
   npm run dev
   ```

## 📚 Complete Documentation

For comprehensive documentation including database setup, album system details, API reference, and troubleshooting, see:

**📖 [DOCUMENTATION.md](./DOCUMENTATION.md)**

This includes:
- 🚀 **Quick Start Guide** - Get up and running fast
- 🗄️ **Database Setup** - Automated 2-step process with duplicate fixing
- 🎨 **Album System** - Complete album management features
- 🔧 **Duplicate Albums Fix** - Automated prevention and cleanup
- 🏗️ **Architecture** - Technical details and project structure
- 🛠️ **Development Guide** - Contributing and development setup
- 🔌 **API Reference** - Complete API documentation
- 🚨 **Troubleshooting** - Common issues and solutions

## 🎵 Supported Audio Formats

- **MP3** - MPEG Audio Layer III
- **FLAC** - Free Lossless Audio Codec  
- **M4A/MP4** - MPEG-4 Audio
- **OGG** - Ogg Vorbis
- **WAV** - Waveform Audio
- **AAC** - Advanced Audio Coding

## 🏗️ Architecture Overview

```
spicezify/
├── src/
│   ├── main/           # Electron main process (file scanning, database)
│   ├── preload/        # Preload scripts (secure IPC bridge)
│   └── renderer/       # React UI (components, pages, stores)
├── database_final.sql  # Main database schema + duplicate fix
├── database_albums_enhancement.sql # Album system enhancement
└── DOCUMENTATION.md    # Complete documentation
```

## 🔧 Key Technologies

- **Frontend**: React 18, TypeScript, Tailwind CSS, Framer Motion
- **Desktop**: Electron 29+, better-sqlite3, music-metadata
- **State Management**: Zustand
- **Real-time**: Socket.IO, Supabase Realtime  
- **Database**: SQLite (local) + PostgreSQL (cloud via Supabase)

## ✅ What's New

- **🎨 Complete Album System**: Beautiful album pages with metadata and track management
- **🔧 Automatic Duplicate Fix**: No more duplicate albums - fixed automatically during setup
- **📚 Unified Documentation**: All guides consolidated into single comprehensive document
- **🚀 Simplified Setup**: Just 2 database scripts instead of multiple separate files
- **💾 Enhanced Database**: UUID-based schema with proper relationships and constraints

### Building for Production

```bash
# Build the app
npm run build:electron

# Build for specific platform
npm run build:electron -- --win
npm run build:electron -- --mac  
npm run build:electron -- --linux
```

## 🏗️ Architecture

```
spicezify/
├── src/
│   ├── main/           # Electron main process
│   │   ├── index.ts    # App entry point
│   │   ├── ipc.ts      # IPC handlers
│   │   ├── db.ts       # SQLite database
│   │   └── ...
│   ├── preload/        # Preload scripts
│   │   └── index.ts    # Context bridge
│   └── renderer/       # React UI
│       ├── src/
│       │   ├── components/
│       │   ├── pages/
│       │   ├── stores/  # Zustand state
│       │   └── ...
│       └── index.html
├── server/             # Socket.IO server
└── docs/               # Documentation
```

## 🎵 Supported Audio Formats

- **MP3** - MPEG Audio Layer III
- **FLAC** - Free Lossless Audio Codec
- **M4A/MP4** - MPEG-4 Audio
- **OGG** - Ogg Vorbis
- **WAV** - Waveform Audio
- **AAC** - Advanced Audio Coding

## 🔧 Configuration

### Music Library

1. Launch the app and sign in
2. Go to Settings → Library → Music Folders
3. Add your music directories
4. The app will automatically scan and index your files

### Play Together Setup

1. Create a room or join an existing one
2. Share the room link with friends
3. Host controls playback for all participants
4. Chat in real-time while listening

## 🛠️ Development

### Project Structure

- **Main Process**: Handles file system, database, and native APIs
- **Renderer Process**: React-based UI with modern components
- **Preload Scripts**: Secure IPC bridge between main and renderer
- **Real-time Server**: Socket.IO server for collaborative features

### Key Technologies

- **Frontend**: React 18, TypeScript, Tailwind CSS, Framer Motion
- **Desktop**: Electron 29+, better-sqlite3, chokidar
- **Audio**: HTML5 Audio API, music-metadata, Media Session API
- **State Management**: Zustand
- **Real-time**: Socket.IO, Supabase Realtime
- **Authentication**: Supabase Auth

### Database Schema

```sql
-- Local SQLite
tracks (id, path, title, artist_id, album_id, duration_ms, hash, ...)
albums (id, name, artist_id, year, cover_path, ...)
artists (id, name, ...)
playlists (id, name, user_id, is_smart, ...)
playlist_items (id, playlist_id, track_id, position)

-- Supabase (Cloud)
profiles (id, display_name, avatar_url, ...)
user_playlists (id, user_id, name, ...)
chat_messages (id, room_id, user_id, content, ...)
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Follow the guidelines in [DOCUMENTATION.md](./DOCUMENTATION.md#development-guide)
4. Submit a Pull Request

## 📞 Support

- 🐛 [Report Bug](https://github.com/Yugabharathi21/SpiceZify/issues)
- 💡 [Request Feature](https://github.com/Yugabharathi21/SpiceZify/issues)
- 💬 [Discussions](https://github.com/Yugabharathi21/SpiceZify/discussions)
- 📖 [Full Documentation](./DOCUMENTATION.md)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

---

**SPiceZify** - Made with ❤️ for music lovers who want to own their listening experience.

*For detailed setup instructions, API reference, and development guide, see [DOCUMENTATION.md](./DOCUMENTATION.md)*