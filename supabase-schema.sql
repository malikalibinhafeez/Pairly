-- ============================================
-- Private Chat App — Supabase Database Schema
-- ============================================
-- Run this SQL in your Supabase SQL Editor to set up
-- all tables, RLS policies, and storage configuration.
-- ============================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- 1. CREATE TABLES FIRST
-- ============================================

CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  email TEXT NOT NULL,
  connection_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user1_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user2_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  user1_deleted_at TIMESTAMPTZ,
  user2_deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  -- Ensure user1_id < user2_id to prevent duplicate chats
  CONSTRAINT chats_user_order CHECK (user1_id < user2_id),
  CONSTRAINT chats_unique_pair UNIQUE (user1_id, user2_id)
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES public.chats(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  message_type TEXT NOT NULL DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'video')),
  message TEXT,
  file_path TEXT,
  file_type TEXT,
  file_size BIGINT,
  seen BOOLEAN DEFAULT false NOT NULL,
  reactions JSONB DEFAULT '{}'::jsonb,
  deleted_for_everyone BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT now() NOT NULL
);

CREATE TABLE public.message_deletions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id UUID NOT NULL REFERENCES public.messages(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  deleted_at TIMESTAMPTZ DEFAULT now() NOT NULL,
  CONSTRAINT message_deletions_unique UNIQUE (message_id, user_id)
);

-- Indexes for performance
CREATE INDEX idx_messages_chat_id ON public.messages(chat_id);
CREATE INDEX idx_messages_created_at ON public.messages(chat_id, created_at);
CREATE INDEX idx_message_deletions_user ON public.message_deletions(user_id);
CREATE INDEX idx_message_deletions_message ON public.message_deletions(message_id);

-- ============================================
-- 2. ENABLE ROW LEVEL SECURITY
-- ============================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_deletions ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 3. RLS POLICIES FOR PROFILES
-- ============================================

-- Users can read their own profile
CREATE POLICY "Users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

-- Users can read the profile of their chat partner
CREATE POLICY "Users can read chat partner profile"
  ON public.profiles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE (user1_id = auth.uid() AND user2_id = profiles.id)
         OR (user2_id = auth.uid() AND user1_id = profiles.id)
    )
  );

-- Users can insert their own profile (during registration)
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- Users can update their own profile
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

-- Allow looking up a profile by connection_code (for connecting)
CREATE POLICY "Users can find profiles by connection code"
  ON public.profiles FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- ============================================
-- 4. RLS POLICIES FOR CHATS
-- ============================================

-- Users can see chats they participate in
CREATE POLICY "Users can read own chats"
  ON public.chats FOR SELECT
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can create chats where they are a participant
CREATE POLICY "Users can create chats"
  ON public.chats FOR INSERT
  WITH CHECK (auth.uid() = user1_id OR auth.uid() = user2_id);

-- Users can update their own deletion timestamp
CREATE POLICY "Users can update own chat deletion"
  ON public.chats FOR UPDATE
  USING (auth.uid() = user1_id OR auth.uid() = user2_id);

-- ============================================
-- 5. RLS POLICIES FOR MESSAGES
-- ============================================

-- Users can read messages from chats they participate in
CREATE POLICY "Users can read messages in own chats"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
        AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
    )
  );

-- Users can send messages to chats they participate in
CREATE POLICY "Users can send messages to own chats"
  ON public.messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id
    AND EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = messages.chat_id
        AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
    )
  );

-- Sender can update their own messages (for unsend/delete for everyone)
CREATE POLICY "Sender can unsend own messages"
  ON public.messages FOR UPDATE
  USING (auth.uid() = sender_id);

-- ============================================
-- 6. RLS POLICIES FOR MESSAGE_DELETIONS
-- ============================================

-- Users can read their own deletions
CREATE POLICY "Users can read own message deletions"
  ON public.message_deletions FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own deletions
CREATE POLICY "Users can create own message deletions"
  ON public.message_deletions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- ============================================
-- 7. ENABLE REALTIME
-- ============================================
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============================================
-- 8. STORAGE BUCKET & POLICIES
-- ============================================
-- Create a private storage bucket for chat media
INSERT INTO storage.buckets (id, name, public)
VALUES ('chat-media', 'chat-media', false)
ON CONFLICT (id) DO NOTHING;

-- Storage policy: Users can upload files to chats they participate in
CREATE POLICY "Users can upload to own chat media"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'chat-media'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = (string_to_array(name, '/'))[1]::uuid
        AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
    )
  );

-- Storage policy: Users can read files from chats they participate in
CREATE POLICY "Users can read own chat media"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'chat-media'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = (string_to_array(name, '/'))[1]::uuid
        AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
    )
  );

-- Storage policy: Users can delete files from chats they participate in (for unsend)
CREATE POLICY "Users can delete own chat media"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'chat-media'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.chats
      WHERE chats.id = (string_to_array(name, '/'))[1]::uuid
        AND (chats.user1_id = auth.uid() OR chats.user2_id = auth.uid())
    )
  );
