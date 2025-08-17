// ============================================================================
// DATABASE TYPES - SpiceZify Music Player
// ============================================================================

export interface Profile {
  user_id: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
  created_at: string;
  updated_at: string;
}

export interface Artist {
  id: string;
  name: string;
  normalized_name?: string;
  cover_url?: string;
  description?: string;
  total_albums: number;
  total_tracks: number;
  created_at: string;
  updated_at?: string;
  user_id: string;
}

export interface Album {
  id: string;
  name: string;
  normalized_name?: string;
  artist_id: string;
  artist_name?: string;
  description?: string;
  year?: number;
  genre?: string;
  cover_url?: string;
  cover_path?: string;
  total_tracks: number;
  total_duration: number;
  release_date?: string;
  record_label?: string;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface Track {
  id: string;
  path: string;
  title: string;
  artist_id: string;
  album_id?: string;
  track_number?: number;
  disc_number?: number;
  duration_ms: number;
  bitrate?: number;
  sample_rate?: number;
  year?: number;
  genre?: string;
  hash: string;
  created_at: string;
  updated_at: string;
}

export interface Preferences {
  user_id: string;
  data: Record<string, unknown>;
  updated_at: string;
}

export interface Conversation {
  id: string;
  title?: string;
  is_private: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  body?: string;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface ArtistFavorite {
  id: string;
  artist_id: string;
  user_id: string;
  created_at: string;
}

export interface AlbumFavorite {
  id: string;
  album_id: string;
  user_id: string;
  created_at: string;
}

export interface ArtistPlay {
  id: string;
  artist_id: string;
  user_id: string;
  played_at: string;
  play_count: number;
}

export interface AlbumPlay {
  id: string;
  album_id: string;
  user_id: string;
  played_at: string;
  play_count: number;
}

// ============================================================================
// JOIN TYPES
// ============================================================================

export interface ConversationWithParticipants extends Conversation {
  participants?: ConversationParticipant[];
}

export interface MessageWithSender extends Message {
  sender?: Profile;
}

export interface ConversationWithMessages extends Conversation {
  messages?: MessageWithSender[];
  participants?: ConversationParticipant[];
}

export interface ArtistWithStats extends Artist {
  album_count: number;
  track_count: number;
  favorite_count: number;
}

export interface AlbumWithArtist extends Album {
  artist: Artist;
}

export interface TrackWithDetails extends Track {
  artist: Artist;
  album?: Album;
}

export interface PopularTrack {
  id: string;
  title: string;
  duration_ms: number;
  album_name?: string;
}

export interface ArtistWithPopularTracks extends ArtistWithStats {
  popular_tracks: PopularTrack[];
}

// ============================================================================
// INPUT TYPES
// ============================================================================

export interface CreateConversationInput {
  title?: string;
  is_private?: boolean;
}

export interface CreateMessageInput {
  conversation_id: string;
  body?: string;
  metadata?: Record<string, unknown>;
}

export interface UpdateProfileInput {
  display_name?: string;
  avatar_url?: string;
}

export interface CreateArtistInput {
  name: string;
  cover_url?: string;
  description?: string;
}

export interface UpdateArtistInput {
  name?: string;
  cover_url?: string;
  description?: string;
}

export interface CreateAlbumInput {
  name: string;
  artist_id: string;
  description?: string;
  year?: number;
  genre?: string;
  cover_url?: string;
}

export interface UpdateAlbumInput {
  name?: string;
  description?: string;
  year?: number;
  genre?: string;
  cover_url?: string;
}
