-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- 1. PROFILES TABLE
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  username text unique not null,
  full_name text,
  avatar_url text,
  headline text,
  bio text,
  website text,
  github_url text,
  twitter_url text,
  linkedin_url text,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. PRODUCTS (STARTUPS) TABLE
create table if not exists public.products (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  tagline text not null,
  description text not null,
  category text not null,
  website_url text,
  github_url text,
  logo_url text,
  screenshots text[] default '{}'::text[] not null,
  banner_url text,
  upvote_count integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 3. UPVOTES (VOTES) TABLE
create table if not exists public.upvotes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, product_id)
);

-- 4. DISCUSSIONS TABLE
create table if not exists public.discussions (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  title text not null,
  content text not null,
  category text not null,
  upvote_count integer default 0 not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 5. DISCUSSION UPVOTES TABLE
create table if not exists public.discussion_upvotes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  discussion_id uuid references public.discussions(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, discussion_id)
);

-- 6. COMMENTS TABLE
create table if not exists public.comments (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade,
  discussion_id uuid references public.discussions(id) on delete cascade,
  parent_id uuid references public.comments(id) on delete cascade,
  content text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null,
  constraint comment_target_check check (
    (product_id is not null and discussion_id is null) or 
    (product_id is null and discussion_id is not null)
  )
);

-- 7. FOLLOWS TABLE
create table if not exists public.follows (
  id uuid default gen_random_uuid() primary key,
  follower_id uuid references public.profiles(id) on delete cascade not null,
  followed_id uuid references public.profiles(id) on delete cascade not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(follower_id, followed_id)
);

-- 8. BOOKMARKS TABLE
create table if not exists public.bookmarks (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  product_id uuid references public.products(id) on delete cascade,
  discussion_id uuid references public.discussions(id) on delete cascade,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null,
  unique(user_id, product_id),
  constraint bookmark_target_check check (
    (product_id is not null and discussion_id is null) or
    (product_id is null and discussion_id is not null)
  )
);

-- 9. NOTIFICATIONS TABLE
create table if not exists public.notifications (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  actor_id uuid references public.profiles(id) on delete cascade not null,
  type text not null check (type in ('comment', 'upvote', 'follow', 'reply')),
  product_id uuid references public.products(id) on delete cascade,
  discussion_id uuid references public.discussions(id) on delete cascade,
  message text not null,
  read boolean default false not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- INDEXES FOR FASTER PERFORMANCE
create index if not exists products_user_id_idx on public.products(user_id);
create index if not exists upvotes_product_id_idx on public.upvotes(product_id);
create index if not exists upvotes_user_id_idx on public.upvotes(user_id);
create index if not exists comments_product_id_idx on public.comments(product_id);
create index if not exists comments_discussion_id_idx on public.comments(discussion_id);
create index if not exists comments_parent_id_idx on public.comments(parent_id);
create index if not exists discussions_user_id_idx on public.discussions(user_id);
create index if not exists follows_follower_id_idx on public.follows(follower_id);
create index if not exists follows_followed_id_idx on public.follows(followed_id);
create index if not exists bookmarks_user_id_idx on public.bookmarks(user_id);
create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_read_idx on public.notifications(read);

-- ROW LEVEL SECURITY (RLS) POLICIES
alter table public.profiles enable row level security;
alter table public.products enable row level security;
alter table public.upvotes enable row level security;
alter table public.discussions enable row level security;
alter table public.discussion_upvotes enable row level security;
alter table public.comments enable row level security;
alter table public.follows enable row level security;
alter table public.bookmarks enable row level security;
alter table public.notifications enable row level security;

-- Profiles Policies
create policy "Allow public read access to profiles" on public.profiles for select using (true);
create policy "Allow users to update their own profile" on public.profiles for update using (auth.uid() = id);

-- Products Policies
create policy "Allow public read access to products" on public.products for select using (true);
create policy "Allow authenticated users to insert products" on public.products for insert with check (auth.uid() = user_id);
create policy "Allow users to update their own products" on public.products for update using (auth.uid() = user_id);
create policy "Allow users to delete their own products" on public.products for delete using (auth.uid() = user_id);

-- Upvotes Policies
create policy "Allow public read access to upvotes" on public.upvotes for select using (true);
create policy "Allow authenticated users to upvote" on public.upvotes for insert with check (auth.uid() = user_id);
create policy "Allow users to delete their own upvotes" on public.upvotes for delete using (auth.uid() = user_id);

-- Discussions Policies
create policy "Allow public read access to discussions" on public.discussions for select using (true);
create policy "Allow authenticated users to create discussions" on public.discussions for insert with check (auth.uid() = user_id);
create policy "Allow users to update their own discussions" on public.discussions for update using (auth.uid() = user_id);
create policy "Allow users to delete their own discussions" on public.discussions for delete using (auth.uid() = user_id);

-- Discussion Upvotes Policies
create policy "Allow public read access to discussion upvotes" on public.discussion_upvotes for select using (true);
create policy "Allow authenticated users to upvote discussions" on public.discussion_upvotes for insert with check (auth.uid() = user_id);
create policy "Allow users to delete their own discussion upvotes" on public.discussion_upvotes for delete using (auth.uid() = user_id);

-- Comments Policies
create policy "Allow public read access to comments" on public.comments for select using (true);
create policy "Allow authenticated users to post comments" on public.comments for insert with check (auth.uid() = user_id);
create policy "Allow users to update their own comments" on public.comments for update using (auth.uid() = user_id);
create policy "Allow users to delete their own comments" on public.comments for delete using (auth.uid() = user_id);

-- Follows Policies
create policy "Allow public read access to follows" on public.follows for select using (true);
create policy "Allow authenticated users to follow" on public.follows for insert with check (auth.uid() = follower_id);
create policy "Allow users to delete their own follows" on public.follows for delete using (auth.uid() = follower_id);

-- Bookmarks Policies
create policy "Allow users to read their own bookmarks" on public.bookmarks for select using (auth.uid() = user_id);
create policy "Allow authenticated users to bookmark" on public.bookmarks for insert with check (auth.uid() = user_id);
create policy "Allow users to delete their own bookmarks" on public.bookmarks for delete using (auth.uid() = user_id);

-- Notifications Policies
create policy "Allow users to read their own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Allow users to update their own notifications" on public.notifications for update using (auth.uid() = user_id);
create policy "Allow users to delete their own notifications" on public.notifications for delete using (auth.uid() = user_id);

-- TRIGGER FOR AUTOMATIC PROFILE CREATION ON AUTH SIGNUP
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, username, full_name, avatar_url, headline, bio)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name'),
    new.raw_user_meta_data->>'avatar_url',
    new.raw_user_meta_data->>'headline',
    new.raw_user_meta_data->>'bio'
  );
  return new;
end;
$$ language plpgsql security definer;

create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- RPC FUNCTION TO INCREMENT PRODUCT UPVOTES
create or replace function public.increment_upvote_count(product_id uuid)
returns void as $$
begin
  update public.products
  set upvote_count = upvote_count + 1
  where id = product_id;
end;
$$ language plpgsql security definer;

-- RPC FUNCTION TO DECREMENT PRODUCT UPVOTES
create or replace function public.decrement_upvote_count(product_id uuid)
returns void as $$
begin
  update public.products
  set upvote_count = greatest(0, upvote_count - 1)
  where id = product_id;
end;
$$ language plpgsql security definer;

-- RPC FUNCTION TO INCREMENT DISCUSSION UPVOTES
create or replace function public.increment_discussion_upvote_count(discussion_id uuid)
returns void as $$
begin
  update public.discussions
  set upvote_count = upvote_count + 1
  where id = discussion_id;
end;
$$ language plpgsql security definer;

-- RPC FUNCTION TO DECREMENT DISCUSSION UPVOTES
create or replace function public.decrement_discussion_upvote_count(discussion_id uuid)
returns void as $$
begin
  update public.discussions
  set upvote_count = greatest(0, upvote_count - 1)
  where id = discussion_id;
end;
$$ language plpgsql security definer;

-- STORAGE BUCKETS CONFIGURATION (Run this in Supabase Storage or Dashboard)
-- Create bucket "uploads" as public
-- Policies for public storage read access:
-- create policy "Allow public read access to uploads" on storage.objects for select using (bucket_id = 'uploads');
-- create policy "Allow authenticated uploads" on storage.objects for insert with check (bucket_id = 'uploads' and auth.role() = 'authenticated');
-- create policy "Allow owners to delete uploads" on storage.objects for delete using (bucket_id = 'uploads' and auth.uid()::text = owner);
