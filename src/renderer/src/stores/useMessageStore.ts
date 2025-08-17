import { create } from 'zustand';
import type { MessageWithSender } from '../types/database';
import * as db from '../lib/database';

interface MessageState {
  messagesByConversation: Record<string, MessageWithSender[]>;
  isLoading: boolean;
  error: string | null;
  unsubscribeFunctions: Record<string, () => void>;
  
  // Actions
  loadMessages: (conversationId: string) => Promise<void>;
  sendMessage: (conversationId: string, userId: string, body: string, metadata?: Record<string, unknown>) => Promise<void>;
  deleteMessage: (messageId: string, userId: string, conversationId: string) => Promise<void>;
  subscribeToMessages: (conversationId: string) => void;
  unsubscribeFromMessages: (conversationId: string) => void;
  clearMessages: (conversationId: string) => void;
  clearError: () => void;
}

export const useMessageStore = create<MessageState>()((set, get) => ({
  messagesByConversation: {},
  isLoading: false,
  error: null,
  unsubscribeFunctions: {},

  loadMessages: async (conversationId: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const response = await db.getConversationMessages(conversationId);
      
      if (response.error) {
        set({ error: response.error, isLoading: false });
        return;
      }

      const messages = response.data || [];
      // Sort messages by created_at ascending (oldest first)
      messages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

      set(state => ({
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: messages,
        },
        isLoading: false,
        error: null,
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load messages';
      set({ error: message, isLoading: false });
    }
  },

  sendMessage: async (conversationId: string, userId: string, body: string, metadata = {}) => {
    set({ error: null });
    
    try {
      const response = await db.createMessage(userId, {
        conversation_id: conversationId,
        body,
        metadata,
      });
      
      if (response.error) {
        set({ error: response.error });
        return;
      }

      // Message will be added via real-time subscription
      // But add optimistically for immediate UI update
      if (response.data) {
        set(state => ({
          messagesByConversation: {
            ...state.messagesByConversation,
            [conversationId]: [
              ...(state.messagesByConversation[conversationId] || []),
              response.data!,
            ],
          },
        }));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send message';
      set({ error: message });
    }
  },

  deleteMessage: async (messageId: string, userId: string, conversationId: string) => {
    set({ error: null });
    
    try {
      const response = await db.deleteMessage(messageId, userId);
      
      if (response.error) {
        set({ error: response.error });
        return;
      }

      // Remove message from local state
      set(state => ({
        messagesByConversation: {
          ...state.messagesByConversation,
          [conversationId]: (state.messagesByConversation[conversationId] || []).filter(
            msg => msg.id !== messageId
          ),
        },
      }));
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete message';
      set({ error: message });
    }
  },

  subscribeToMessages: (conversationId: string) => {
    const { unsubscribeFunctions } = get();
    
    // Don't subscribe if already subscribed
    if (unsubscribeFunctions[conversationId]) {
      return;
    }

    const unsubscribe = db.subscribeToConversationMessages(
      conversationId,
      (newMessage: MessageWithSender) => {
        set(state => {
          const currentMessages = state.messagesByConversation[conversationId] || [];
          
          // Check if message already exists (avoid duplicates)
          const messageExists = currentMessages.some(msg => msg.id === newMessage.id);
          if (messageExists) {
            return state;
          }

          // Insert message in chronological order
          const updatedMessages = [...currentMessages, newMessage].sort(
            (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );

          return {
            ...state,
            messagesByConversation: {
              ...state.messagesByConversation,
              [conversationId]: updatedMessages,
            },
          };
        });
      },
      (error: Error) => {
        console.error('Message subscription error:', error);
        set({ error: error.message });
      }
    );

    set(state => ({
      unsubscribeFunctions: {
        ...state.unsubscribeFunctions,
        [conversationId]: unsubscribe,
      },
    }));
  },

  unsubscribeFromMessages: (conversationId: string) => {
    const { unsubscribeFunctions } = get();
    const unsubscribe = unsubscribeFunctions[conversationId];
    
    if (unsubscribe) {
      unsubscribe();
      
      set(state => {
        const newUnsubscribeFunctions = { ...state.unsubscribeFunctions };
        delete newUnsubscribeFunctions[conversationId];
        
        return {
          unsubscribeFunctions: newUnsubscribeFunctions,
        };
      });
    }
  },

  clearMessages: (conversationId: string) => {
    set(state => {
      const newMessagesByConversation = { ...state.messagesByConversation };
      delete newMessagesByConversation[conversationId];
      
      return {
        messagesByConversation: newMessagesByConversation,
      };
    });
  },

  clearError: () => {
    set({ error: null });
  },
}));
