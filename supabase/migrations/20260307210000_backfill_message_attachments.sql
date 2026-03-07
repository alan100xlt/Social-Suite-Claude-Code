-- Backfill media_url from raw API metadata for messages that have attachments
-- The inbox-sync edge function stored raw API responses in metadata.raw
-- Attachments are at metadata.raw.attachments[0].url
UPDATE inbox_messages
SET media_url = (metadata->'raw'->'attachments'->0->>'url'),
    content_type = 'image'
WHERE media_url IS NULL
  AND jsonb_array_length(COALESCE(metadata->'raw'->'attachments', '[]'::jsonb)) > 0
  AND metadata->'raw'->'attachments'->0->>'url' IS NOT NULL;

-- Update conversation last_message_at from raw message timestamps where they fell back to sync time
-- The API field is updatedTime, not lastMessageTime
-- This corrects conversations whose last_message_at was set to the sync execution time
