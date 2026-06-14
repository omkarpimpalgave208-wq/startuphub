-- SQL Migration to add UNIQUE constraint on (user_id, discussion_id) in the discussion_upvotes table (post likes)
-- Run this in your Supabase SQL Editor if it doesn't already exist.

ALTER TABLE public.discussion_upvotes
ADD CONSTRAINT discussion_upvotes_user_id_discussion_id_key UNIQUE (user_id, discussion_id);
