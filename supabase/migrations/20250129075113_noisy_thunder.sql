/*
  # Chat Application Schema

  1. New Tables
    - `messages`
      - `id` (uuid, primary key)
      - `content` (text) - The message content
      - `user_id` (uuid) - Reference to auth.users
      - `created_at` (timestamp)
      - `username` (text) - Denormalized username for display

  2. Security
    - Enable RLS on messages table
    - Add policies for:
      - Anyone can read messages
      - Authenticated users can insert their own messages
*/

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content text NOT NULL,
  user_id uuid REFERENCES auth.users NOT NULL,
  created_at timestamptz DEFAULT now(),
  username text NOT NULL
);

ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read messages
CREATE POLICY "Messages are viewable by everyone" ON messages
  FOR SELECT USING (true);

-- Allow authenticated users to insert their own messages
CREATE POLICY "Users can insert their own messages" ON messages
  FOR INSERT WITH CHECK (
    auth.uid() = user_id
  );