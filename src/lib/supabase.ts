import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseKey);

// INDIVIDUAL TYPES FOR EXPORT COMPATIBILITY AND AUTOCOMPLETION
export interface ProfileRow {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  headline: string | null;
  bio: string | null;
  website: string | null;
  github_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProductRow {
  id: string;
  user_id: string;
  name: string;
  tagline: string;
  description: string;
  category: string;
  website_url: string | null;
  github_url: string | null;
  logo_url: string | null;
  screenshots: string[];
  banner_url: string | null;
  upvote_count: number;
  created_at: string;
}

export interface UpvoteRow {
  id: string;
  user_id: string;
  product_id: string;
  created_at: string;
}

export interface DiscussionRow {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  upvote_count: number;
  created_at: string;
}

export interface DiscussionUpvoteRow {
  id: string;
  user_id: string;
  discussion_id: string;
  created_at: string;
}

export interface CommentRow {
  id: string;
  user_id: string;
  product_id: string | null;
  discussion_id: string | null;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
}

export interface FollowRow {
  id: string;
  follower_id: string;
  followed_id: string;
  created_at: string;
}

export interface BookmarkRow {
  id: string;
  user_id: string;
  product_id: string | null;
  discussion_id: string | null;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'comment' | 'upvote' | 'follow' | 'reply';
  product_id: string | null;
  discussion_id: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

function createNoopSupabaseClient(): SupabaseClient<any> {
  return {
    auth: {
      signOut: async () => ({ data: null, error: { message: 'Supabase is not configured' } }),
      getSession: async () => ({ data: { session: null }, error: null }),
      onAuthStateChange: () => ({ data: { subscription: null }, error: null }),
      signInWithPassword: async () => ({ data: { user: null }, error: { message: 'Supabase is not configured' } }),
      signUp: async () => ({ data: { user: null }, error: { message: 'Supabase is not configured' } }),
      setSession: async () => ({ error: { message: 'Supabase is not configured' } }),
      signInWithIdToken: async () => ({ error: { message: 'Supabase is not configured' } })
    }
  } as unknown as SupabaseClient<any>;
}

// TYPING THE CLIENT WITH ANY TO BYPASS OVERLY STRICT LIBRARY RECURSION TYPING ISSUES
export const supabase: SupabaseClient<any> = isSupabaseConfigured
  ? createClient<any>(supabaseUrl, supabaseKey)
  : createNoopSupabaseClient();

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ProfileRow;
        Insert: Partial<ProfileRow> & { id: string; username: string };
        Update: Partial<ProfileRow>;
      };
      products: {
        Row: ProductRow;
        Insert: Partial<ProductRow> & { user_id: string; name: string; tagline: string; description: string; category: string };
        Update: Partial<ProductRow>;
      };
      upvotes: {
        Row: UpvoteRow;
        Insert: Partial<UpvoteRow> & { user_id: string; product_id: string };
        Update: Partial<UpvoteRow>;
      };
      discussions: {
        Row: DiscussionRow;
        Insert: Partial<DiscussionRow> & { user_id: string; title: string; content: string; category: string };
        Update: Partial<DiscussionRow>;
      };
      discussion_upvotes: {
        Row: DiscussionUpvoteRow;
        Insert: Partial<DiscussionUpvoteRow> & { user_id: string; discussion_id: string };
        Update: Partial<DiscussionUpvoteRow>;
      };
      comments: {
        Row: CommentRow;
        Insert: Partial<CommentRow> & { user_id: string; content: string };
        Update: Partial<CommentRow>;
      };
      follows: {
        Row: FollowRow;
        Insert: Partial<FollowRow> & { follower_id: string; followed_id: string };
        Update: Partial<FollowRow>;
      };
      bookmarks: {
        Row: BookmarkRow;
        Insert: Partial<BookmarkRow> & { user_id: string };
        Update: Partial<BookmarkRow>;
      };
      notifications: {
        Row: NotificationRow;
        Insert: Partial<NotificationRow> & { user_id: string; actor_id: string; type: 'comment' | 'upvote' | 'follow' | 'reply'; message: string };
        Update: Partial<NotificationRow>;
      };
    };
  };
};