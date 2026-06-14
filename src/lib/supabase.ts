import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

console.log('SUPABASE URL:', supabaseUrl);
console.log('SUPABASE KEY EXISTS:', !!supabaseAnonKey);

if (!supabaseUrl || !supabaseAnonKey) {
  console.error("Missing Supabase environment variables");
}

// Fallback values to prevent SDK from throwing initialization error when env vars are missing
const fallbackUrl = 'https://placeholder-project.supabase.co';
const fallbackKey = 'dummy-anon-key';

export const supabase: SupabaseClient<Database> = createClient(
  supabaseUrl || fallbackUrl,
  supabaseAnonKey || fallbackKey,
  {
    auth: {
      persistSession: true,
      detectSessionInUrl: true,
      autoRefreshToken: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined
    }
  }
);

export default supabase;

// INDIVIDUAL TYPES FOR EXPORT COMPATIBILITY AND AUTOCOMPLETION
export interface ProfileRow {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  banner_url: string | null;
  banner_style: string | null;
  location: string | null;
  headline: string | null;
  bio: string | null;
  website: string | null;
  website_url: string | null;
  github_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  skills: string[];
  achievements: string[];
  experience: Array<{ role: string; company: string; period: string; description: string }>;
  college_name: string | null;
  studying_year: string | null;
  last_seen: string | null;
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
  banner_image_url: string | null;
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

export interface ConnectionRequestRow {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
}

export interface ConnectionRow {
  id: string;
  user_one_id: string;
  user_two_id: string;
  created_at: string;
}

export interface NotificationRow {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'comment' | 'upvote' | 'follow' | 'reply' | 'connect_request' | 'connect_accept' | 'message';
  product_id: string | null;
  discussion_id: string | null;
  conversation_id: string | null;
  message: string;
  read: boolean;
  created_at: string;
}

export interface ConversationRow {
  id: string;
  created_by: string;
  created_at: string;
}

export interface ConversationParticipantRow {
  id: string;
  conversation_id: string;
  user_id: string;
  created_at: string;
}

export interface MessageRow {
  id: string;
  conversation_id: string;
  sender_id: string;
  recipient_id?: string | null;
  content: string;
  is_read: boolean;
  created_at: string;
}

// TYPING THE CLIENT WITH ANY TO BYPASS OVERLY STRICT LIBRARY RECURSION TYPING ISSUES
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
      connection_requests: {
        Row: ConnectionRequestRow;
        Insert: Partial<ConnectionRequestRow> & { sender_id: string; receiver_id: string; status: 'pending' | 'accepted' | 'rejected' };
        Update: Partial<ConnectionRequestRow>;
      };
      connections: {
        Row: ConnectionRow;
        Insert: Partial<ConnectionRow> & { user_one_id: string; user_two_id: string };
        Update: Partial<ConnectionRow>;
      };
      notifications: {
        Row: NotificationRow;
        Insert: Partial<NotificationRow> & {
          user_id: string;
          actor_id: string;
          type: 'comment' | 'upvote' | 'follow' | 'reply' | 'connect_request' | 'connect_accept' | 'message';
          message: string;
        };
        Update: Partial<NotificationRow>;
      };
      conversations: {
        Row: ConversationRow;
        Insert: Partial<ConversationRow> & { created_by: string };
        Update: Partial<ConversationRow>;
      };
      conversation_participants: {
        Row: ConversationParticipantRow;
        Insert: Partial<ConversationParticipantRow> & { conversation_id: string; user_id: string };
        Update: Partial<ConversationParticipantRow>;
      };
      messages: {
        Row: MessageRow;
        Insert: Partial<MessageRow> & { conversation_id: string; sender_id: string; recipient_id?: string | null; content: string };
        Update: Partial<MessageRow>;
      };
    };
  };
};