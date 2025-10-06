-- FIXED SCHEMA: Resolves infinite recursion in RLS policies
-- This schema fixes the conversation-related table policies that were causing infinite recursion

-- Drop existing policies that cause infinite recursion
DROP POLICY IF EXISTS "Users can access their conversation participation" ON conversation_participants;
DROP POLICY IF EXISTS "Users can access messages in their conversations" ON messages;
DROP POLICY IF EXISTS "Users can access message status" ON message_status;
DROP POLICY IF EXISTS "Users can access conversations they participate in" ON conversations;

-- Fixed RLS Policies for conversations
CREATE POLICY "Users can access conversations they participate in" ON conversations
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM conversation_participants 
      WHERE conversation_id = conversations.id AND user_id = auth.uid() AND is_active = true
    )
  );

-- Fixed RLS Policies for conversation_participants  
CREATE POLICY "Users can manage their own participation" ON conversation_participants
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Users can view participants in their conversations" ON conversation_participants  
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM conversation_participants cp2
      WHERE cp2.conversation_id = conversation_participants.conversation_id 
      AND cp2.user_id = auth.uid() 
      AND cp2.is_active = true
    )
  );

-- Fixed RLS Policies for messages
CREATE POLICY "Users can access messages in their conversations" ON messages
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM conversation_participants 
      WHERE conversation_id = messages.conversation_id 
      AND user_id = auth.uid() 
      AND is_active = true
    )
  );

-- Fixed RLS Policies for message_status
CREATE POLICY "Users can manage their own message status" ON message_status
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Message senders can view status of their messages" ON message_status
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM messages 
      WHERE id = message_status.message_id 
      AND sender_id = auth.uid()
    )
  );