import { supabase } from './supabase';
import type {
  Profile,
  Preferences,
  Conversation,
  ConversationParticipant,
  ConversationWithParticipants,
  MessageWithSender,
  CreateConversationInput,
  CreateMessageInput,
  UpdateProfileInput,
} from '../types/database';

// Database response type
interface DbResponse<T> {
  data: T | null;
  error: string | null;
}

// ------------------------------------------------------------------
// Profile operations
// ------------------------------------------------------------------

export async function createProfile(userId: string, profileData: Partial<Profile>): Promise<DbResponse<Profile>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .insert({
        user_id: userId,
        ...profileData,
      })
      .select()
      .single();

    if (error) {
      console.error('[db] createProfile error', { userId, error });
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[db] createProfile exception', { userId, err });
    return { data: null, error: message };
  }
}

export async function getProfile(userId: string): Promise<DbResponse<Profile>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No rows returned - profile doesn't exist
        return { data: null, error: null };
      }
      console.error('[db] getProfile error', { userId, error });
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[db] getProfile exception', { userId, err });
    return { data: null, error: message };
  }
}

export async function updateProfile(userId: string, updates: UpdateProfileInput): Promise<DbResponse<Profile>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('[db] updateProfile error', { userId, updates, error });
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[db] updateProfile exception', { userId, updates, err });
    return { data: null, error: message };
  }
}

export async function searchProfiles(query: string, limit = 10): Promise<DbResponse<Profile[]>> {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
      .limit(limit);

    if (error) {
      console.error('[db] searchProfiles error', { query, error });
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[db] searchProfiles exception', { query, err });
    return { data: null, error: message };
  }
}

// ------------------------------------------------------------------
// Preferences operations (existing functions enhanced)
// ------------------------------------------------------------------

export async function fetchUserPreferences(userId: string): Promise<DbResponse<Record<string, unknown>>> {
  try {
    const { data, error } = await supabase
      .from('preferences')
      .select('data')
      .eq('user_id', userId)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No preferences found
        return { data: {}, error: null };
      }
      console.error('[db] fetchUserPreferences error', { userId, error });
      return { data: null, error: error.message };
    }

    return { data: data?.data || {}, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[db] fetchUserPreferences exception', { userId, err });
    return { data: null, error: message };
  }
}

export async function upsertUserPreferences(userId: string, prefs: Record<string, unknown>): Promise<DbResponse<Preferences>> {
  const payload = { user_id: userId, data: prefs };
  
  try {
    const { data, error } = await supabase
      .from('preferences')
      .upsert(payload, { onConflict: 'user_id' })
      .select()
      .single();

    if (error) {
      const supaErr = error as unknown as {
        message?: string;
        details?: string;
        hint?: string;
        code?: string;
        status?: number;
      };

      console.error('[db] upsertUserPreferences error', {
        payload,
        message: supaErr.message,
        details: supaErr.details,
        hint: supaErr.hint,
        code: supaErr.code,
        status: supaErr.status,
      });
      return { data: null, error: supaErr.message || 'Unknown error' };
    }

    console.debug('[db] upsertUserPreferences success', { payload, data });
    return { data, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[db] upsertUserPreferences exception', { payload, err });
    return { data: null, error: message };
  }
}

// ------------------------------------------------------------------
// Conversation operations
// ------------------------------------------------------------------

export async function createConversation(userId: string, input: CreateConversationInput): Promise<DbResponse<Conversation>> {
  try {
    // Create the conversation
    const { data: conversation, error: convError } = await supabase
      .from('conversations')
      .insert({
        title: input.title,
        is_private: input.is_private || false,
        created_by: userId,
      })
      .select()
      .single();

    if (convError) {
      console.error('[db] createConversation error', { userId, input, error: convError });
      return { data: null, error: convError.message };
    }

    // Add creator as participant
    const { error: partError } = await supabase
      .from('conversation_participants')
      .insert({
        conversation_id: conversation.id,
        user_id: userId,
        role: 'owner',
      });

    if (partError) {
      console.error('[db] createConversation participant error', { conversationId: conversation.id, error: partError });
      // Don't return error here - conversation was created successfully
    }

    return { data: conversation, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[db] createConversation exception', { userId, input, err });
    return { data: null, error: message };
  }
}

export async function getConversation(conversationId: string): Promise<DbResponse<ConversationWithParticipants>> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(*)
      `)
      .eq('id', conversationId)
      .single();

    if (error) {
      console.error('[db] getConversation error', { conversationId, error });
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[db] getConversation exception', { conversationId, err });
    return { data: null, error: message };
  }
}

export async function getUserConversations(userId: string): Promise<DbResponse<ConversationWithParticipants[]>> {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .select(`
        *,
        participants:conversation_participants(*)
      `)
      .or(`is_private.eq.false,id.in.(select conversation_id from conversation_participants where user_id.eq.${userId})`)
      .order('updated_at', { ascending: false });

    if (error) {
      console.error('[db] getUserConversations error', { userId, error });
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[db] getUserConversations exception', { userId, err });
    return { data: null, error: message };
  }
}

export async function joinConversation(conversationId: string, userId: string): Promise<DbResponse<ConversationParticipant>> {
  try {
    const { data, error } = await supabase
      .from('conversation_participants')
      .insert({
        conversation_id: conversationId,
        user_id: userId,
        role: 'member',
      })
      .select()
      .single();

    if (error) {
      console.error('[db] joinConversation error', { conversationId, userId, error });
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[db] joinConversation exception', { conversationId, userId, err });
    return { data: null, error: message };
  }
}

export async function leaveConversation(conversationId: string, userId: string): Promise<DbResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('conversation_participants')
      .delete()
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) {
      console.error('[db] leaveConversation error', { conversationId, userId, error });
      return { data: null, error: error.message };
    }

    return { data: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[db] leaveConversation exception', { conversationId, userId, err });
    return { data: null, error: message };
  }
}

// ------------------------------------------------------------------
// Message operations
// ------------------------------------------------------------------

export async function createMessage(userId: string, input: CreateMessageInput): Promise<DbResponse<MessageWithSender>> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .insert({
        conversation_id: input.conversation_id,
        sender_id: userId,
        body: input.body,
        metadata: input.metadata || {},
      })
      .select(`
        *,
        sender:profiles(*)
      `)
      .single();

    if (error) {
      console.error('[db] createMessage error', { userId, input, error });
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[db] createMessage exception', { userId, input, err });
    return { data: null, error: message };
  }
}

export async function getConversationMessages(conversationId: string, limit = 50): Promise<DbResponse<MessageWithSender[]>> {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        *,
        sender:profiles(*)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[db] getConversationMessages error', { conversationId, error });
      return { data: null, error: error.message };
    }

    return { data: data || [], error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[db] getConversationMessages exception', { conversationId, err });
    return { data: null, error: message };
  }
}

export async function deleteMessage(messageId: string, userId: string): Promise<DbResponse<boolean>> {
  try {
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('sender_id', userId); // Only allow sender to delete

    if (error) {
      console.error('[db] deleteMessage error', { messageId, userId, error });
      return { data: null, error: error.message };
    }

    return { data: true, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    console.error('[db] deleteMessage exception', { messageId, userId, err });
    return { data: null, error: message };
  }
}

// ------------------------------------------------------------------
// Real-time subscriptions
// ------------------------------------------------------------------

export function subscribeToConversationMessages(
  conversationId: string,
  onMessage: (message: MessageWithSender) => void,
  onError?: (error: Error) => void
) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      async (payload) => {
        try {
          // Fetch the complete message with sender info
          const { data, error } = await supabase
            .from('messages')
            .select(`
              *,
              sender:profiles(*)
            `)
            .eq('id', payload.new.id)
            .single();

          if (error) {
            console.error('[db] subscribeToConversationMessages fetch error', error);
            onError?.(new Error(error.message));
            return;
          }

          onMessage(data);
        } catch (err) {
          console.error('[db] subscribeToConversationMessages exception', err);
          onError?.(err instanceof Error ? err : new Error('Unknown error'));
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToUserConversations(
  userId: string,
  onConversationUpdate: (conversation: Conversation) => void,
  onError?: (error: Error) => void
) {
  const channel = supabase
    .channel(`user_conversations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
      },
      (payload) => {
        try {
          if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
            onConversationUpdate(payload.new as Conversation);
          }
        } catch (err) {
          console.error('[db] subscribeToUserConversations exception', err);
          onError?.(err instanceof Error ? err : new Error('Unknown error'));
        }
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
