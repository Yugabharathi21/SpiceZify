export interface Profile {
  user_id: string;
  email?: string;
  display_name?: string;
  avatar_url?: string;
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

// Join types for queries with relationships
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

// Input types for mutations
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
