import { create } from 'zustand';
import type { 
  ConversationWithParticipants,
} from '../types/database';
import * as db from '../lib/database';

interface ConversationState {
  conversations: ConversationWithParticipants[];
  currentConversationId: string | null;
  isLoading: boolean;
  error: string | null;
  
  // Actions
  loadUserConversations: (userId: string) => Promise<void>;
  createConversation: (userId: string, title?: string, isPrivate?: boolean) => Promise<string | null>;
  joinConversation: (conversationId: string, userId: string) => Promise<void>;
  leaveConversation: (conversationId: string, userId: string) => Promise<void>;
  setCurrentConversation: (conversationId: string | null) => void;
  clearError: () => void;
}

export const useConversationStore = create<ConversationState>()((set, get) => ({
    conversations: [],
    currentConversationId: null,
    isLoading: false,
    error: null,

    loadUserConversations: async (userId: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const response = await db.getUserConversations(userId);
        
        if (response.error) {
          set({ error: response.error, isLoading: false });
          return;
        }

        set({ 
          conversations: response.data || [], 
          isLoading: false,
          error: null 
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load conversations';
        set({ error: message, isLoading: false });
      }
    },

    createConversation: async (userId: string, title?: string, isPrivate = false) => {
      set({ isLoading: true, error: null });
      
      try {
        const response = await db.createConversation(userId, { title, is_private: isPrivate });
        
        if (response.error) {
          set({ error: response.error, isLoading: false });
          return null;
        }

        if (response.data) {
          // Add to local state
          const conversationWithParticipants: ConversationWithParticipants = {
            ...response.data,
            participants: [{
              conversation_id: response.data.id,
              user_id: userId,
              role: 'owner',
              joined_at: new Date().toISOString(),
            }],
          };

          set(state => ({
            conversations: [conversationWithParticipants, ...state.conversations],
            isLoading: false,
            error: null,
          }));

          return response.data.id;
        }

        set({ isLoading: false });
        return null;
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to create conversation';
        set({ error: message, isLoading: false });
        return null;
      }
    },

    joinConversation: async (conversationId: string, userId: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const response = await db.joinConversation(conversationId, userId);
        
        if (response.error) {
          set({ error: response.error, isLoading: false });
          return;
        }

        // Reload conversations to get updated participant list
        const { loadUserConversations } = get();
        await loadUserConversations(userId);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to join conversation';
        set({ error: message, isLoading: false });
      }
    },

    leaveConversation: async (conversationId: string, userId: string) => {
      set({ isLoading: true, error: null });
      
      try {
        const response = await db.leaveConversation(conversationId, userId);
        
        if (response.error) {
          set({ error: response.error, isLoading: false });
          return;
        }

        // Remove conversation from local state
        set(state => ({
          conversations: state.conversations.filter(c => c.id !== conversationId),
          currentConversationId: state.currentConversationId === conversationId ? null : state.currentConversationId,
          isLoading: false,
          error: null,
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to leave conversation';
        set({ error: message, isLoading: false });
      }
    },

    setCurrentConversation: (conversationId: string | null) => {
      set({ currentConversationId: conversationId });
    },

    clearError: () => {
      set({ error: null });
    },
  }));
