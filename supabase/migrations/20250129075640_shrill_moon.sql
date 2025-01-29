/*
  # Fix Messages Table RLS Policies

  1. Changes
    - Drop existing policies and create new ones with proper security rules
    - Add policy for inserting messages by authenticated users
    - Ensure proper user_id validation

  2. Security
    - Enable RLS on messages table
    - Add policies for:
      - Reading messages (all users)
      - Inserting messages (authenticated users only)
*/

-- First ensure RLS is enabled
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'messages' 
        AND schemaname = 'public'
    ) THEN
        DROP POLICY IF EXISTS "Messages are viewable by everyone" ON messages;
        DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;
    END IF;
END $$;

-- Create new policies
CREATE POLICY "Messages are viewable by everyone" 
ON messages FOR SELECT 
USING (true);

CREATE POLICY "Users can insert their own messages" 
ON messages FOR INSERT 
TO authenticated 
WITH CHECK (
    auth.uid() = user_id
);