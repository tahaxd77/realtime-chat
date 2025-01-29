/*
  # Fix Messages Table Structure and RLS Policies

  1. Changes
    - Recreate messages table with proper structure
    - Set up correct RLS policies
    - Ensure proper column defaults and constraints

  2. Security
    - Enable RLS
    - Add policies for reading and inserting messages
    - Ensure proper user_id validation
*/

-- Drop existing policies
DROP POLICY IF EXISTS "Messages are viewable by everyone" ON messages;
DROP POLICY IF EXISTS "Users can insert their own messages" ON messages;

-- Recreate the messages table with proper structure
DROP TABLE IF EXISTS messages;
CREATE TABLE messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    content text NOT NULL,
    user_id uuid NOT NULL,
    username text NOT NULL,
    created_at timestamptz DEFAULT now(),
    CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users (id)
);

-- Enable RLS
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read messages
CREATE POLICY "Anyone can read messages"
    ON messages
    FOR SELECT
    USING (true);

-- Allow authenticated users to insert their own messages
CREATE POLICY "Authenticated users can insert their own messages"
    ON messages
    FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
    );