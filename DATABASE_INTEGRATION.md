# Database Integration Guide

This document outlines the complete database integration for SpiceZify using Supabase.

## Database Schema

The following tables have been set up in Supabase:

### 1. `profiles`
- `user_id` (UUID, primary key)
- `email` (text)
- `display_name` (text) 
- `avatar_url` (text)
- `created_at`, `updated_at` (timestamptz)

### 2. `preferences` 
- `user_id` (UUID, primary key)
- `data` (JSONB) - stores user preferences like audioQuality, crossfade, etc.
- `updated_at` (timestamptz)

### 3. `conversations`
- `id` (UUID, primary key)
- `title` (text)
- `is_private` (boolean)
- `created_by` (UUID)
- `created_at`, `updated_at` (timestamptz)

### 4. `conversation_participants`
- `conversation_id` (UUID, foreign key)
- `user_id` (UUID)
- `role` (text: 'owner', 'member', etc.)
- `joined_at` (timestamptz)
- Primary key: (conversation_id, user_id)

### 5. `messages`
- `id` (UUID, primary key)
- `conversation_id` (UUID, foreign key)
- `sender_id` (UUID)
- `body` (text)
- `metadata` (JSONB)
- `created_at` (timestamptz)

## Type Definitions

All database types are defined in `src/renderer/src/types/database.ts`:
- `Profile`, `Preferences`, `Conversation`, `ConversationParticipant`, `Message`
- Join types: `ConversationWithParticipants`, `MessageWithSender`
- Input types: `CreateConversationInput`, `CreateMessageInput`, `UpdateProfileInput`

## Database Service Layer

The main database operations are in `src/renderer/src/lib/database.ts`:

### Profile Operations
- `createProfile(userId, profileData)` - Create user profile
- `getProfile(userId)` - Get user profile
- `updateProfile(userId, updates)` - Update profile
- `searchProfiles(query, limit)` - Search users by name/email

### Preferences Operations  
- `fetchUserPreferences(userId)` - Get user preferences
- `upsertUserPreferences(userId, prefs)` - Create/update preferences

### Conversation Operations
- `createConversation(userId, input)` - Create new conversation
- `getConversation(conversationId)` - Get conversation with participants
- `getUserConversations(userId)` - Get user's conversations
- `joinConversation(conversationId, userId)` - Join conversation
- `leaveConversation(conversationId, userId)` - Leave conversation

### Message Operations
- `createMessage(userId, input)` - Send message
- `getConversationMessages(conversationId, limit)` - Get messages
- `deleteMessage(messageId, userId)` - Delete own message

### Real-time Subscriptions
- `subscribeToConversationMessages(conversationId, onMessage, onError)` - Live message updates
- `subscribeToUserConversations(userId, onUpdate, onError)` - Live conversation updates

## State Management

### useConversationStore
Located in `src/renderer/src/stores/useConversationStore.ts`
- Manages conversations list and current conversation
- Actions: loadUserConversations, createConversation, joinConversation, etc.

### useMessageStore  
Located in `src/renderer/src/stores/useMessageStore.ts`
- Manages messages by conversation with real-time updates
- Actions: loadMessages, sendMessage, deleteMessage, subscribeToMessages, etc.

### Updated useAuthStore
- Now integrates with profile creation and preference loading
- Uses database service layer instead of direct Supabase calls

## Row Level Security (RLS) Policies

All tables have RLS enabled with the following policies:

- **profiles**: Public read access, owner-only write access
- **preferences**: Owner-only access (user_id = auth.uid())  
- **conversations**: Public conversations visible to all, private only to participants
- **conversation_participants**: Participants can view, users can join, owners can manage
- **messages**: Visible to conversation participants, sender/owner can modify

## Integration with Existing Code

### NowPlayingBar Component
- Updated to use database service layer for preferences persistence
- Dynamic import to avoid circular dependencies

### Auth Store
- Enhanced error handling for preference loading
- Ready for real Supabase auth integration

## Usage Examples

```typescript
// Create a conversation
const conversationId = await useConversationStore.getState().createConversation(
  userId, 
  "My Chat Room", 
  false // public
);

// Send a message
await useMessageStore.getState().sendMessage(
  conversationId,
  userId,
  "Hello everyone!"
);

// Subscribe to live messages  
useMessageStore.getState().subscribeToMessages(conversationId);

// Update user preferences
await upsertUserPreferences(userId, {
  audioQuality: 'high',
  crossfade: true,
  normalizeVolume: false
});
```

## Next Steps

1. **Authentication**: Replace mock auth with real Supabase Auth
2. **UI Components**: Create chat UI components using the stores
3. **Error Handling**: Add user-facing error messages and retry logic
4. **Optimization**: Add pagination for messages, conversation caching
5. **Features**: Add file attachments, message reactions, typing indicators

## Testing

To test the database connection:

1. Ensure your `.env` has valid Supabase credentials:
   ```
   VITE_SUPABASE_URL=your_project_url
   VITE_SUPABASE_ANON_KEY=your_anon_key
   ```

2. Run the app and check browser console for database operation logs

3. Test in browser console:
   ```javascript
   // Test conversation creation
   const { createConversation } = useConversationStore.getState();
   await createConversation('00000000-0000-0000-0000-000000000001', 'Test Chat');
   ```
