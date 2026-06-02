export interface Profile {
  id: string;
  username: string;
  full_name: string | null;
  avatar_url: string | null;
  banner_url?: string | null;
  banner_style?: string | null;
  location?: string | null;
  headline: string | null;
  bio: string | null;
  website?: string | null;
  website_url?: string | null;
  github_url: string | null;
  twitter_url: string | null;
  linkedin_url: string | null;
  skills?: string[];
  achievements?: string[];
  experience?: Array<{
    role: string;
    company: string;
    period: string;
    description: string;
  }>;
  products?: number;
  followers?: number;
  following?: number;
  connections?: number;
}

export interface ConnectionRequest {
  id: string;
  sender_id: string;
  receiver_id: string;
  status: 'pending' | 'accepted' | 'rejected';
  created_at: string;
  sender?: Profile;
  receiver?: Profile;
}

export interface Connection {
  id: string;
  user_one_id: string;
  user_two_id: string;
  created_at: string;
  user_one?: Profile;
  user_two?: Profile;
}

export interface Product {
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
  profiles?: Profile;
  comments?: { count: number }[];
  upvotes?: { count: number }[];
  hasUpvoted?: boolean;
}

export interface Comment {
  id: string;
  user_id: string;
  product_id: string | null;
  discussion_id: string | null;
  parent_id: string | null;
  content: string;
  created_at: string;
  updated_at: string;
  profiles?: Profile;
  replies?: { count: number }[];
  upvotes?: { count: number }[];
}

export interface Discussion {
  id: string;
  user_id: string;
  title: string;
  content: string;
  category: string;
  upvote_count: number;
  created_at: string;
  profiles?: Profile;
  comments?: { count: number }[];
  upvotes?: { count: number }[];
  hasUpvoted?: boolean;
}

export interface Notification {
  id: string;
  user_id: string;
  actor_id: string;
  type: 'comment' | 'upvote' | 'follow' | 'reply' | 'connect_request' | 'connect_accept' | 'message';
  product_id: string | null;
  discussion_id: string | null;
  conversation_id?: string | null;
  message: string;
  read: boolean;
  created_at: string;
  actor?: Profile;
  product?: { id: string; name: string; logo_url: string | null };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  is_read: boolean;
  created_at: string;
  sender?: Profile;
}

export interface Conversation {
  id: string;
  created_at: string;
  participants: Profile[];
  partner?: Profile;
  last_message?: string;
  last_message_at?: string;
  unread_count?: number;
  messages?: Message[];
}

export interface Bookmark {
  id: string;
  user_id: string;
  product_id: string | null;
  discussion_id: string | null;
  created_at: string;
  products?: Product;
}