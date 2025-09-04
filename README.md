# Spicezify - Spotify-inspired Music Streaming App

A full-stack MERN application that recreates the Spotify experience using YouTube as the music source. Features include user authentication, playlists, real-time listen-together rooms, and chat functionality.

## Features

### MVP Features ✅
- **User Authentication**: Complete JWT-based auth system with registration and login
- **YouTube Song Streaming**: Search and play music from YouTube (API integration pending)
- **Playlist Management**: Create, edit, and manage personal playlists
- **Like Songs**: Heart songs and view them in a dedicated liked songs page

### Secondary Features 🔄
- **Listen Together**: Real-time synchronized playback rooms with Socket.IO
- **Chat Feature**: In-room messaging for collaborative listening
- **Responsive Design**: Mobile and desktop optimized interface
- **Now Playing Info**: Rich player with song details and controls
- **Search Songs**: Advanced YouTube search integration

## Tech Stack

**Frontend:**
- React 18 with TypeScript
- TailwindCSS for styling
- React Router for navigation
- Context API for state management
- Heroicons for UI icons

**Backend:**
- Node.js with Express
- MongoDB with Mongoose
- Socket.IO for real-time features
- JWT authentication
- RESTful API design

## Getting Started

### Prerequisites
- Node.js (v16 or higher)
- MongoDB (local or Atlas)
- YouTube Data API key (for production)

### Installation

1. **Clone the repository**
   ```bash
   git clone <your-repo-url>
   cd spicezify
   ```

2. **Install dependencies**
   ```bash
   # Install frontend dependencies
   npm install

   # Install backend dependencies
   cd server
   npm install
   cd ..
   ```

3. **Environment Setup**
   ```bash
   # Copy environment file in server directory
   cp server/.env.example server/.env
   
   # Edit the .env file with your configuration:
   # - MongoDB connection string
   # - JWT secret key
   # - YouTube API key (optional for development)
   ```

4. **Start the development servers**
   ```bash
   # Start both frontend and backend
   npm run dev
   
   # Or start them separately:
   # Frontend (port 5173)
   npm run client
   
   # Backend (port 3001)
   npm run server
   ```

5. **Access the application**
   - Frontend: http://localhost:5173
   - Backend API: http://localhost:3001

## Project Structure

```
spicezify/
├── src/                      # Frontend React app
│   ├── components/           # Reusable UI components
│   ├── contexts/            # React Context providers
│   ├── pages/               # Page components
│   └── main.tsx            # App entry point
├── server/                  # Backend Express app
│   ├── models/             # Mongoose schemas
│   ├── routes/             # API route handlers
│   ├── middleware/         # Express middleware
│   └── server.js          # Server entry point
└── public/                 # Static assets
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login

### Songs
- `GET /api/songs/search?query=` - Search YouTube for songs
- `GET /api/songs/:id` - Get song details

### Playlists
- `GET /api/playlists` - Get user playlists
- `POST /api/playlists` - Create new playlist
- `POST /api/playlists/:id/songs` - Add song to playlist
- `DELETE /api/playlists/:id/songs/:songId` - Remove song from playlist

## Socket.IO Events

### Room Management
- `joinRoom(roomCode)` - Join a listen-together room
- `leaveRoom(roomCode)` - Leave a room

### Music Sync
- `playSong({ roomCode, song, currentTime })` - Sync song playback
- `pauseSong({ roomCode, currentTime })` - Sync pause

### Chat
- `sendMessage({ roomCode, message, username })` - Send chat message
- `messageReceived` - Receive chat message

## Work Tracker

The app includes a built-in work tracker accessible at `/work-tracker` that shows:
- Feature completion status
- Progress overview
- Task categorization (MVP, Secondary, Meta)

## Development Notes

### Mock Data
- YouTube API integration uses mock data during development
- Real API integration requires YouTube Data API v3 key
- Socket.IO rooms are fully functional for testing

### Authentication
- Uses JWT tokens stored in localStorage
- Includes protected routes and middleware
- Session management handled client-side

### Styling
- Spotify's official color palette implemented
- Dark theme throughout the interface
- Responsive design for all screen sizes
- Hover effects and smooth transitions

## Deployment

### Frontend
- Build: `npm run build`
- Deploy to Vercel, Netlify, or similar

### Backend
- Deploy to Heroku, Railway, or similar
- Set environment variables
- Ensure MongoDB Atlas connection

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - feel free to use this project for learning and development.

---

**Note**: This project is for educational purposes. Ensure compliance with YouTube's Terms of Service when implementing the API integration.