# SpiceZify Music Player - Complete Documentation

## 📑 Table of Contents

1. [Overview](#overview)
2. [Quick Start](#quick-start)
3. [Database Setup](#database-setup)
4. [Album System](#album-system)
5. [Duplicate Albums Fix](#duplicate-albums-fix)
6. [Architecture](#architecture)
7. [Development Guide](#development-guide)
8. [API Reference](#api-reference)
9. [Troubleshooting](#troubleshooting)
10. [Contributing](#contributing)

---

## 1. Overview {#overview}

SPiceZify is a beautiful, Spotify-inspired music player for local audio files with real-time collaborative features and advanced album management.

### ✨ Key Features

- **Local Music Library**: Scan and organize your music collection with automatic metadata extraction
- **Advanced Album System**: Complete album management with metadata, covers, and track relationships
- **Spotify-Style UI**: Clean, modern interface with dark theme and smooth animations
- **Real-time Play Together**: Synchronized listening sessions with friends
- **Smart Playlists**: Create dynamic playlists based on criteria
- **Gapless Playback**: Seamless audio transitions between tracks
- **Search & Discovery**: Fast, fuzzy search across your entire library
- **Chat Integration**: Real-time chat in listening rooms
- **Cross-platform**: Works on Windows, macOS, and Linux

### 🎵 Supported Audio Formats

- **MP3** - MPEG Audio Layer III
- **FLAC** - Free Lossless Audio Codec
- **M4A/MP4** - MPEG-4 Audio
- **OGG** - Ogg Vorbis
- **WAV** - Waveform Audio
- **AAC** - Advanced Audio Coding

---

## 2. Quick Start {#quick-start}

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

4. **Set up database**
   - Follow the [Database Setup](#database-setup) section below

5. **Start development**
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

---

## 3. Database Setup {#database-setup}

### ✅ Automated Setup Process

The duplicate albums fix has been **integrated** into the main database scripts! You only need to run **2 scripts**.

### 🚀 Setup Steps

#### **Step 1: Run Base Database Schema**
Execute `database_final.sql` in your Supabase SQL editor:

```sql
-- This creates the core tables: profiles, artists, tracks, etc.
-- AND includes the duplicate fix function
-- Copy and paste the entire content of database_final.sql
```

#### **Step 2: Run Albums Enhancement (with automatic duplicate fix)**
Execute `database_albums_enhancement.sql` in your Supabase SQL editor:

```sql
-- This creates the enhanced albums table with metadata support
-- AND automatically fixes any duplicate albums
-- Copy and paste the entire content of database_albums_enhancement.sql
```

### ✅ Verification

After running both scripts, you should see a message like:
```
fix_result: "Added normalized_name to artists. Added normalized_name to albums. Populated normalized names. Fixed duplicate artists. Fixed duplicate albums. Added artist unique constraint. Added album unique constraint. Created normalized indexes. Duplicate albums fix completed successfully!"
```

### 🗄️ Database Schema

#### Core Tables
- **`profiles`** - User profiles (`user_id`, `email`, `display_name`, `avatar_url`)
- **`artists`** - Music artists with normalized names
- **`albums`** - Music albums with enhanced metadata
- **`tracks`** - Individual songs with album relationships
- **`preferences`** - User settings stored as JSONB

#### Extended Tables
- **`conversations`** - Chat rooms (public/private)
- **`conversation_participants`** - Room membership management
- **`messages`** - Chat messages with metadata support
- **`album_favorites`** - User favorite albums
- **`album_plays`** - Album play history tracking

#### Key Features
- **UUID Primary Keys** for all entities
- **Row Level Security (RLS)** for multi-tenant support
- **Normalized Names** to prevent duplicates
- **Automatic Statistics** calculation with triggers
- **Performance Indexes** for fast queries

---

## 4. Album System {#album-system}

### 🎨 Complete Album Management

The SpiceZify album system provides a comprehensive solution for organizing and browsing your music collection.

#### Features Implemented

1. **Enhanced Albums Table**
   - Detailed metadata (description, genre, cover_url, total_duration)
   - Artist relationships and track counting
   - Automatic statistics updates via triggers
   - Multi-user support with RLS policies

2. **Album Page Component** (`src/renderer/src/pages/Album.tsx`)
   - Dynamic gradient backgrounds based on album covers
   - Album metadata display (artist, year, genre, description)
   - Complete track listing with playback controls
   - Integration with player system and queue management

3. **Library Views** (`src/renderer/src/pages/Library.tsx`)
   - Grid and list view modes for album browsing
   - Interactive album cards with hover effects
   - Seamless navigation to individual album pages
   - AlbumCover component integration

4. **Album Store Management** (`src/renderer/src/stores/useLibraryStore.ts`)
   - Album-specific state management
   - Loading and caching album data
   - Track listing and playback operations
   - Favorite album management

#### Album Interface

```typescript
interface Album {
  id: string;
  name: string;
  artist_id: string;
  artist_name?: string;
  description?: string;
  year?: number;
  genre?: string;
  cover_url?: string;
  total_tracks: number;
  total_duration: number;
  created_at: string;
}
```

#### Key Operations

```typescript
// Load album with tracks
const album = await loadAlbum(albumId);

// Get album tracks
const tracks = await getAlbumTracks(albumId);

// Play entire album
await playAlbum(albumId);

// Toggle album favorite
await toggleAlbumFavorite(albumId);
```

---

## 5. Duplicate Albums Fix {#duplicate-albums-fix}

### 🔧 Problem & Solution

#### Problem Identified
The SpiceZify music player was creating duplicate albums due to inconsistent naming and lack of normalization in the LibraryScanner. Albums with slight variations in capitalization, spacing, or formatting were being treated as separate entities.

#### Root Causes
1. **No Name Normalization**: Artist and album names weren't normalized before comparison
2. **Missing Database Constraints**: No unique constraints to prevent duplicates
3. **Scanner Logic**: LibraryScanner didn't check for existing albums with normalized names
4. **Database Schema**: Missing `normalized_name` columns for efficient comparison

### ✅ Complete Solution Implemented

#### 1. Database Schema Enhancement
- **Status**: ✅ Complete - Integrated into main database scripts
- **Features**:
  - Added `normalized_name` columns to both `artists` and `albums` tables
  - Unique constraints on normalized names to prevent future duplicates
  - Enhanced metadata support (description, genre, cover_url, total_duration)
  - Automatic statistics calculation with triggers
  - RLS policies for multi-user support

#### 2. Automatic Duplicate Cleanup
- **Status**: ✅ Complete - Runs automatically during database setup
- **Features**:
  - Sophisticated duplicate detection using temporary tables
  - Album consolidation preserving track relationships
  - Performance indexes for efficient queries
  - Transaction safety with rollback capability

#### 3. LibraryScanner Prevention
- **File**: `src/main/libraryScanner.ts`
- **Status**: ✅ Complete - Enhanced with normalization
- **Changes**:
  - Added normalized name logic: `name.trim().toUpperCase()`
  - Updated `getOrCreateArtist()` to use normalized names
  - Updated `getOrCreateAlbum()` to use normalized names
  - Fixed TypeScript type definitions for database queries
  - Prevents future duplicate creation during scanning

### 🔧 Technical Details

#### Normalization Logic
```typescript
const normalizedName = name.trim().toUpperCase();
```
- Removes leading/trailing whitespace
- Converts to uppercase for case-insensitive comparison
- Applied consistently in both cleanup script and scanner

#### Database Constraints
```sql
-- Unique constraint prevents future duplicates
UNIQUE(normalized_name, artist_id, user_id)
```

#### Before vs After

**Before Fix:**
- "Abbey Road", "abbey road", "Abbey road" → 3 separate albums
- "The Beatles", "Beatles", "THE BEATLES" → 3 separate artists
- Inconsistent album collections across library

**After Fix:**
- All variations consolidated into single canonical entries
- Normalized comparison prevents future duplicates
- Clean, organized album collections
- Improved user experience with proper album grouping

---

## 6. Architecture {#architecture}

### 🏗️ Project Structure

```
spicezify/
├── src/
│   ├── main/              # Electron main process
│   │   ├── index.ts       # App entry point
│   │   ├── ipc.ts         # IPC handlers
│   │   ├── db.ts          # SQLite database
│   │   ├── libraryScanner.ts # Music file scanner
│   │   ├── folderWatcher.ts  # File system watching
│   │   └── ...
│   ├── preload/           # Preload scripts
│   │   └── index.ts       # Context bridge
│   └── renderer/          # React UI
│       ├── src/
│       │   ├── components/    # UI Components
│       │   │   ├── AlbumCover.tsx
│       │   │   ├── FullscreenPlayer.tsx
│       │   │   ├── NowPlayingBar.tsx
│       │   │   └── ...
│       │   ├── pages/         # Page Components
│       │   │   ├── Album.tsx
│       │   │   ├── Library.tsx
│       │   │   ├── Home.tsx
│       │   │   └── ...
│       │   ├── stores/        # Zustand state
│       │   │   ├── useLibraryStore.ts
│       │   │   ├── usePlayerStore.ts
│       │   │   ├── useAuthStore.ts
│       │   │   └── ...
│       │   ├── lib/          # Utilities
│       │   │   ├── database.ts
│       │   │   └── supabase.ts
│       │   └── types/        # TypeScript types
│       │       └── database.ts
│       └── index.html
├── database_final.sql        # Main database schema
├── database_albums_enhancement.sql # Album system enhancement
└── docs/                    # Documentation
```

### 🔧 Key Technologies

- **Frontend**: React 18, TypeScript, Tailwind CSS, Framer Motion
- **Desktop**: Electron 29+, better-sqlite3, chokidar
- **Audio**: HTML5 Audio API, music-metadata, Media Session API
- **State Management**: Zustand
- **Real-time**: Socket.IO, Supabase Realtime
- **Authentication**: Supabase Auth
- **Database**: SQLite (local) + PostgreSQL (cloud via Supabase)

### 📊 Data Flow

1. **Music Scanning**: LibraryScanner reads local files → extracts metadata → stores in SQLite
2. **User Interface**: React components → Zustand stores → Electron IPC → Main process
3. **Audio Playback**: HTML5 Audio API → Media Session API → System integration
4. **Real-time Features**: Supabase Realtime → WebSocket → React state updates
5. **Database Sync**: Local SQLite ↔ Cloud PostgreSQL (for user data)

---

## 7. Development Guide {#development-guide}

### 🛠️ Development Setup

1. **Prerequisites**
   - Node.js 18+
   - Python 3.x (for native dependencies)
   - Git

2. **Environment Configuration**
   ```bash
   # Create .env file with:
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

3. **Database Setup**
   - Run database scripts in Supabase as described in [Database Setup](#database-setup)

4. **Development Commands**
   ```bash
   npm run dev          # Start development server
   npm run build        # Build for production
   npm run lint         # Run ESLint
   npm run type-check   # TypeScript checking
   ```

### 📁 Adding New Features

#### 1. Database Changes
```sql
-- Add new table in database_final.sql or database_albums_enhancement.sql
-- Update TypeScript types in src/renderer/src/types/database.ts
-- Add database operations in src/renderer/src/lib/database.ts
```

#### 2. UI Components
```typescript
// Create component in src/renderer/src/components/
// Use Tailwind CSS for styling
// Follow existing patterns for state management
```

#### 3. State Management
```typescript
// Add new store in src/renderer/src/stores/
// Use Zustand patterns
// Include TypeScript interfaces
```

### 🎯 Development Guidelines

- **TypeScript First**: Use TypeScript for all new code
- **Component Structure**: Keep components under 300 lines
- **State Management**: Use Zustand for global state
- **Styling**: Use Tailwind CSS with consistent design tokens
- **Error Handling**: Implement proper error boundaries and user feedback
- **Performance**: Use React.memo and useMemo for expensive operations
- **Testing**: Write tests for new features (when test setup is available)

---

## 8. API Reference {#api-reference}

### 🔌 Database Operations

#### Profile Operations
```typescript
// Create user profile
await createProfile(userId: string, profileData: Partial<Profile>): Promise<Profile>

// Get user profile  
await getProfile(userId: string): Promise<Profile | null>

// Update profile
await updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile>

// Search profiles
await searchProfiles(query: string, limit?: number): Promise<Profile[]>
```

#### Album Operations
```typescript
// Load album with metadata
await loadAlbum(albumId: string): Promise<Album | null>

// Get album tracks
await getAlbumTracks(albumId: string): Promise<Track[]>

// Play album
await playAlbum(albumId: string): Promise<void>

// Toggle album favorite
await toggleAlbumFavorite(albumId: string): Promise<void>
```

#### Conversation Operations
```typescript
// Create conversation
await createConversation(userId: string, input: CreateConversationInput): Promise<string>

// Get conversation with participants
await getConversation(conversationId: string): Promise<ConversationWithParticipants | null>

// Get user conversations
await getUserConversations(userId: string): Promise<ConversationWithParticipants[]>

// Send message
await createMessage(userId: string, input: CreateMessageInput): Promise<Message>
```

### 🎵 Player Controls

```typescript
// Player store actions
const { 
  play, 
  pause, 
  nextTrack, 
  previousTrack, 
  setVolume, 
  setCurrentTime,
  toggleShuffle,
  toggleRepeat,
  addToQueue,
  clearQueue
} = usePlayerStore();
```

### 📚 Library Management

```typescript
// Library store actions
const {
  loadAlbums,
  loadTracks,
  searchLibrary,
  scanLibrary,
  addMusicFolder,
  removeMusicFolder
} = useLibraryStore();
```

---

## 9. Troubleshooting {#troubleshooting}

### 🚨 Common Issues

#### Database Connection Issues

**Problem**: "relation 'artists' does not exist"
**Solution**: 
1. Ensure you've run `database_final.sql` first
2. Check that tables exist in Supabase dashboard
3. Verify you're using the correct schema (`public`)

**Problem**: "column does not exist" errors
**Solution**: 
1. Run `database_albums_enhancement.sql` to add missing columns
2. Check column names match your schema

#### Music Scanning Issues

**Problem**: No albums showing after scan
**Solution**:
1. Check that music files are in supported formats
2. Verify folder permissions allow reading
3. Check console for scanning errors
4. Run duplicate fix if seeing multiple entries

**Problem**: Duplicate albums appearing
**Solution**:
1. The duplicate fix should run automatically during database setup
2. If still seeing duplicates, manually call `SELECT public.fix_duplicate_albums()`
3. Restart the application after fixing

#### UI/Performance Issues

**Problem**: Slow album loading
**Solution**:
1. Check database indexes are created
2. Limit initial album load size
3. Enable pagination for large libraries

**Problem**: Audio not playing
**Solution**:
1. Check file permissions and formats
2. Verify HTML5 audio codec support
3. Check browser console for audio errors

### 🔍 Debug Information

#### Check Database Status
```sql
-- Check which tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;

-- Check for duplicate albums
SELECT normalized_name, COUNT(*) as count
FROM albums 
GROUP BY normalized_name, artist_id 
HAVING COUNT(*) > 1;
```

#### Check Application Logs
- **Main Process**: Check Electron developer tools
- **Renderer**: Check browser developer tools console
- **Database**: Check Supabase dashboard logs

### 📞 Getting Help

- 🐛 [Report Bug](https://github.com/Yugabharathi21/SpiceZify/issues)
- 💡 [Request Feature](https://github.com/Yugabharathi21/SpiceZify/issues)
- 💬 [Discussions](https://github.com/Yugabharathi21/SpiceZify/discussions)

---

## 10. Contributing {#contributing}

### 🤝 How to Contribute

1. **Fork the repository**
2. **Create a feature branch** (`git checkout -b feature/amazing-feature`)
3. **Commit your changes** (`git commit -m 'Add amazing feature'`)
4. **Push to the branch** (`git push origin feature/amazing-feature`)
5. **Open a Pull Request**

### 📋 Development Process

#### Before Contributing
- Check existing issues and discussions
- Follow the development guidelines above
- Ensure your changes don't break existing functionality
- Add tests for new features (when test infrastructure is available)

#### Code Standards
- **TypeScript**: Use strict TypeScript for type safety
- **ESLint + Prettier**: Follow existing code style
- **Components**: Keep components focused and under 300 lines
- **Documentation**: Update docs for new features
- **Commit Messages**: Use conventional commit format

#### Pull Request Process
1. Update documentation for any new features
2. Ensure TypeScript compilation passes
3. Test your changes thoroughly
4. Include screenshots for UI changes
5. Provide clear description of changes and reasoning

### 🎯 Areas for Contribution

- **UI/UX Improvements**: Enhanced visual design and user experience
- **Performance Optimizations**: Faster loading and smoother interactions
- **New Audio Formats**: Support for additional audio codecs
- **Mobile Responsiveness**: Better mobile/touch support
- **Accessibility**: Screen reader and keyboard navigation improvements
- **Testing**: Unit and integration test setup
- **Documentation**: Examples, tutorials, and API documentation

### 🏆 Recognition

Contributors are recognized in:
- GitHub contributor graphs
- Release notes for significant contributions
- Special thanks in documentation

---

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Inspired by Spotify's excellent user experience
- Built with the amazing Electron and React ecosystems
- Music metadata parsing by [music-metadata](https://github.com/borewit/music-metadata)
- Icons by [Lucide React](https://lucide.dev/)
- Database powered by [Supabase](https://supabase.com/)

---

**SPiceZify** - Made with ❤️ for music lovers who want to own their listening experience.

*Last updated: August 17, 2025*
