-- ============================================================================
-- RPC Function: create_direct_message
-- ============================================================================
-- Atomically creates a 1-on-1 direct message conversation.
-- Prevents race conditions where two users create a DM at the same time.
--
-- 1. Checks if a DM between the two users already exists.
-- 2. If it exists, returns the existing conversation.
-- 3. If not, it creates a new conversation and adds both users
--    as participants within a single transaction.
-- ============================================================================

create or replace function create_direct_message(
  creator_id uuid,
  recipient_id uuid,
  access_code text
)
returns json -- returns a single json object of the conversation
language plpgsql
as $$
declare
  existing_conversation_id uuid;
  new_conversation conversations;
  result_json json;
begin
  -- Use a common table expression (CTE) to find an existing conversation
  -- This is more efficient than the previous client-side loops
  WITH existing_conv AS (
    SELECT cp1.conversation_id
    FROM conversation_participants AS cp1
    JOIN conversation_participants AS cp2 ON cp1.conversation_id = cp2.conversation_id
    JOIN conversations AS c ON c.id = cp1.conversation_id
    WHERE 
      cp1.user_id = creator_id AND
      cp2.user_id = recipient_id AND
      c.is_group = false
    LIMIT 1
  )
  SELECT conversation_id INTO existing_conversation_id FROM existing_conv;

  if existing_conversation_id is not null then
    -- Conversation exists, fetch it with all participant data and return as JSON
    -- This structure matches what the client-side expects
    SELECT row_to_json(c) INTO result_json
    FROM (
      SELECT
        *
      FROM conversations
      WHERE id = existing_conversation_id
    ) c;
    
    return result_json;
  else
    -- Conversation does not exist, create it atomically
    -- Use EXCEPTION block to handle potential race conditions if two users
    -- try to create at the exact same time.
    BEGIN
      INSERT INTO conversations (name, is_group, created_by, access_code)
      VALUES (null, false, creator_id, access_code)
      returning * into new_conversation;

      -- Add both participants
      INSERT INTO conversation_participants (conversation_id, user_id, is_active)
      VALUES 
        (new_conversation.id, creator_id, true),
        (new_conversation.id, recipient_id, true);

      -- Fetch the newly created conversation with all data and return as JSON
      SELECT row_to_json(c) INTO result_json
      FROM (
        SELECT
          *
        FROM conversations
        WHERE id = new_conversation.id
      ) c;

      return result_json;
      
    EXCEPTION
      -- If a unique constraint violation happens (rare race condition),
      -- it means the conversation was created in another transaction.
      -- Re-query for it to ensure the correct one is returned.
      WHEN unique_violation THEN
        WITH existing_conv AS (
          SELECT cp1.conversation_id
          FROM conversation_participants AS cp1
          JOIN conversation_participants AS cp2 ON cp1.conversation_id = cp2.conversation_id
          JOIN conversations AS c ON c.id = cp1.conversation_id
          WHERE 
            cp1.user_id = creator_id AND
            cp2.user_id = recipient_id AND
            c.is_group = false
          LIMIT 1
        )
        SELECT conversation_id INTO existing_conversation_id FROM existing_conv;

        SELECT row_to_json(c) INTO result_json
        FROM (
          SELECT
            *
          FROM conversations
          WHERE id = existing_conversation_id
        ) c;

        return result_json;
    END;
  end if;
end;
$$;

-- Verification
SELECT '✅ RPC function create_direct_message created/updated.' as status;
