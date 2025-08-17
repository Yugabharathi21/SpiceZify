# SPiceZify - Electron Music Player

A beautiful, Spotify-inspired music player for local audio files with real-time collaborative features.

![SPiceZify Screenshot](docs/screenshot.png)

## ✨ Features

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
   git clone https://github.com/your-username/spicezify.git
   cd spicezify
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

4. **Start development**
   ```bash
   npm run dev
   ```

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
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Development Guidelines

- Use TypeScript for all new code
- Follow the existing code style (ESLint + Prettier)
- Write tests for new features
- Update documentation as needed
- Keep file sizes under 300 lines when possible

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Spotify's excellent user experience
- Built with the amazing Electron and React ecosystems
- Music metadata parsing by [music-metadata](https://github.com/borewit/music-metadata)
- Icons by [Lucide React](https://lucide.dev/)

## 📞 Support

- 🐛 [Report Bug](https://github.com/your-username/spicezify/issues)
- 💡 [Request Feature](https://github.com/your-username/spicezify/issues)
- 💬 [Discussions](https://github.com/your-username/spicezify/discussions)

---

**SPiceZify** - Made with ❤️ for music lovers who want to own their listening experience.