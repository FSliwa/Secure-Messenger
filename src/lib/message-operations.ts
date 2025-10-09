// Enhanced Message Operations with Auto-Delete and Forwarding Control
import { supabase } from './supabase';

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  encrypted_content: string;
  encryption_metadata: Record<string, any>;
  sent_at: string;
  edited_at?: string;
  is_deleted: boolean;
  auto_delete_at?: string;
  forwarding_disabled: boolean;
}

export interface MessageCreate {
  conversation_id: string;
  sender_id: string;
  encrypted_content: string;
  encryption_metadata?: Record<string, any>;
  auto_delete_minutes?: number;
  forwarding_disabled?: boolean;
}

export interface MessageUpdate {
  encrypted_content?: string;
  encryption_metadata?: Record<string, any>;
  auto_delete_minutes?: number;
  forwarding_disabled?: boolean;
}

/**
 * Send a new message with enhanced features
 */
export async function sendMessage(messageData: MessageCreate): Promise<{
  success: boolean;
  message?: Message;
  error?: string;
}> {
  try {
    // Validate conversation exists and user is a participant
    const { data: participant, error: participantError } = await supabase
      .from('conversation_participants')
      .select('id')
      .eq('conversation_id', messageData.conversation_id)
      .eq('user_id', messageData.sender_id)
      .eq('is_active', true)
      .single();

    if (participantError || !participant) {
      return { 
        success: false, 
        error: 'You are not a member of this conversation or it does not exist' 
      };
    }

    // Calculate auto-delete timestamp if specified
    let autoDeleteAt: string | undefined;
    if (messageData.auto_delete_minutes && messageData.auto_delete_minutes > 0) {
      const deleteTime = new Date(Date.now() + messageData.auto_delete_minutes * 60 * 1000);
      autoDeleteAt = deleteTime.toISOString();
    }

    const insertData = {
      conversation_id: messageData.conversation_id,
      sender_id: messageData.sender_id,
      encrypted_content: messageData.encrypted_content,
      encryption_metadata: messageData.encryption_metadata || {},
      auto_delete_at: autoDeleteAt,
      forwarding_disabled: messageData.forwarding_disabled ?? true
    };

    const { data: message, error } = await supabase
      .from('messages')
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error('Failed to send message:', error);
      return { success: false, error: error.message };
    }

    return { success: true, message };
  } catch (error) {
    console.error('Message send error:', error);
    return { success: false, error: 'Failed to send message' };
  }
}

// Note: getMessages() removed - use getConversationMessages() from supabase.ts instead
// That version includes JOIN with users table for sender information

/**
 * Update a message (edit)
 */
export async function updateMessage(
  messageId: string,
  senderId: string,
  updates: MessageUpdate
): Promise<{ success: boolean; message?: Message; error?: string }> {
  try {
    // Calculate new auto-delete timestamp if specified
    let autoDeleteAt: string | undefined;
    if (updates.auto_delete_minutes !== undefined) {
      if (updates.auto_delete_minutes > 0) {
        const deleteTime = new Date(Date.now() + updates.auto_delete_minutes * 60 * 1000);
        autoDeleteAt = deleteTime.toISOString();
      } else {
        autoDeleteAt = undefined; // Remove auto-delete
      }
    }

    const updateData: any = {
      edited_at: new Date().toISOString()
    };

    if (updates.encrypted_content) {
      updateData.encrypted_content = updates.encrypted_content;
    }
    if (updates.encryption_metadata) {
      updateData.encryption_metadata = updates.encryption_metadata;
    }
    if (updates.auto_delete_minutes !== undefined) {
      updateData.auto_delete_at = autoDeleteAt;
    }
    if (updates.forwarding_disabled !== undefined) {
      updateData.forwarding_disabled = updates.forwarding_disabled;
    }

    const { data: message, error } = await supabase
      .from('messages')
      .update(updateData)
      .eq('id', messageId)
      .eq('sender_id', senderId) // Only sender can edit their own messages
      .eq('is_deleted', false) // Can't edit deleted messages
      .select()
      .single();

    if (error) {
      console.error('Failed to update message:', error);
      return { success: false, error: error.message };
    }

    return { success: true, message };
  } catch (error) {
    console.error('Message update error:', error);
    return { success: false, error: 'Failed to update message' };
  }
}

/**
 * Delete a message (soft delete)
 */
export async function deleteMessage(
  messageId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ 
        is_deleted: true,
        edited_at: new Date().toISOString()
      })
      .eq('id', messageId)
      .eq('sender_id', userId); // Only sender can delete their own messages

    if (error) {
      console.error('Failed to delete message:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Message delete error:', error);
    return { success: false, error: 'Failed to delete message' };
  }
}

/**
 * Check if message can be forwarded
 */
export async function canForwardMessage(messageId: string): Promise<{
  canForward: boolean;
  error?: string;
}> {
  try {
    const { data: message, error } = await supabase
      .from('messages')
      .select('forwarding_disabled, is_deleted')
      .eq('id', messageId)
      .single();

    if (error) {
      console.error('Failed to check forwarding permission:', error);
      return { canForward: false, error: error.message };
    }

    const canForward = !message.forwarding_disabled && !message.is_deleted;
    return { canForward };
  } catch (error) {
    console.error('Forward check error:', error);
    return { canForward: false, error: 'Failed to check forwarding permission' };
  }
}

/**
 * Get messages that are due for auto-deletion
 */
export async function getMessagesForAutoDeletion(): Promise<{
  messages: Message[];
  error?: string;
}> {
  try {
    const now = new Date().toISOString();
    
    const { data: messages, error } = await supabase
      .from('messages')
      .select('*')
      .not('auto_delete_at', 'is', null)
      .lte('auto_delete_at', now)
      .eq('is_deleted', false);

    if (error) {
      console.error('Failed to get messages for auto-deletion:', error);
      return { messages: [], error: error.message };
    }

    return { messages: messages || [] };
  } catch (error) {
    console.error('Auto-deletion query error:', error);
    return { messages: [], error: 'Failed to get messages for auto-deletion' };
  }
}

/**
 * Process auto-deletion of expired messages with batching
 */
export async function processAutoDeleteMessages(): Promise<{
  deletedCount: number;
  error?: string;
}> {
  try {
    const { messages, error: fetchError } = await getMessagesForAutoDeletion();
    
    if (fetchError) {
      return { deletedCount: 0, error: fetchError };
    }

    if (messages.length === 0) {
      return { deletedCount: 0 };
    }

    // Process in batches of 100 to prevent database overload
    const BATCH_SIZE = 100;
    let totalDeleted = 0;

    for (let i = 0; i < messages.length; i += BATCH_SIZE) {
      const batch = messages.slice(i, i + BATCH_SIZE);
      const batchIds = batch.map(m => m.id);

      const { error: deleteError } = await supabase
        .from('messages')
        .update({ 
          is_deleted: true,
          edited_at: new Date().toISOString() 
        })
        .in('id', batchIds);

      if (deleteError) {
        console.error(`Failed to auto-delete batch ${i / BATCH_SIZE + 1}:`, deleteError);
        // Continue with next batch even if one fails
        continue;
      }

      totalDeleted += batch.length;
    }

    return { deletedCount: totalDeleted };
  } catch (error) {
    console.error('Auto-deletion process error:', error);
    return { deletedCount: 0, error: 'Failed to process auto-deletion' };
  }
}

/**
 * Set auto-delete for existing message
 */
export async function setMessageAutoDelete(
  messageId: string,
  senderId: string,
  minutes: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const autoDeleteAt = minutes > 0 
      ? new Date(Date.now() + minutes * 60 * 1000).toISOString()
      : undefined;

    const { error } = await supabase
      .from('messages')
      .update({ 
        auto_delete_at: autoDeleteAt,
        edited_at: new Date().toISOString() 
      })
      .eq('id', messageId)
      .eq('sender_id', senderId)
      .eq('is_deleted', false);

    if (error) {
      console.error('Failed to set auto-delete:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Set auto-delete error:', error);
    return { success: false, error: 'Failed to set auto-delete' };
  }
}

/**
 * Toggle forwarding permission for message
 */
export async function toggleMessageForwarding(
  messageId: string,
  senderId: string,
  forwardingDisabled: boolean
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('messages')
      .update({ 
        forwarding_disabled: forwardingDisabled,
        edited_at: new Date().toISOString() 
      })
      .eq('id', messageId)
      .eq('sender_id', senderId)
      .eq('is_deleted', false);

    if (error) {
      console.error('Failed to toggle forwarding:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error) {
    console.error('Toggle forwarding error:', error);
    return { success: false, error: 'Failed to toggle forwarding' };
  }
}

/**
 * Get message statistics for conversation
 */
export async function getMessageStats(conversationId: string): Promise<{
  total: number;
  withAutoDelete: number;
  forwardingDisabled: number;
  deleted: number;
  edited: number;
  error?: string;
}> {
  try {
    const { data: messages, error } = await supabase
      .from('messages')
      .select('is_deleted, auto_delete_at, forwarding_disabled, edited_at')
      .eq('conversation_id', conversationId);

    if (error) {
      console.error('Failed to get message stats:', error);
      return {
        total: 0,
        withAutoDelete: 0,
        forwardingDisabled: 0,
        deleted: 0,
        edited: 0,
        error: error.message
      };
    }

    const stats = {
      total: messages?.length || 0,
      withAutoDelete: 0,
      forwardingDisabled: 0,
      deleted: 0,
      edited: 0
    };

    messages?.forEach(message => {
      if (message.auto_delete_at) stats.withAutoDelete++;
      if (message.forwarding_disabled) stats.forwardingDisabled++;
      if (message.is_deleted) stats.deleted++;
      if (message.edited_at) stats.edited++;
    });

    return stats;
  } catch (error) {
    console.error('Message stats error:', error);
    return {
      total: 0,
      withAutoDelete: 0,
      forwardingDisabled: 0,
      deleted: 0,
      edited: 0,
      error: 'Failed to get message stats'
    };
  }
}

/**
 * Schedule auto-deletion cleanup job
 */
export function scheduleAutoDeleteCleanup(): NodeJS.Timeout {
  // Run every 5 minutes
  return setInterval(async () => {
    try {
      const result = await processAutoDeleteMessages();
      if (result.deletedCount > 0) {
        console.log(`Auto-deleted ${result.deletedCount} expired messages`);
      }
      if (result.error) {
        console.error('Auto-deletion error:', result.error);
      }
    } catch (error) {
      console.error('Auto-deletion cleanup error:', error);
    }
  }, 5 * 60 * 1000); // 5 minutes
}