-- Migration: Add banner positioning and sizing metadata to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_zoom double precision DEFAULT 1.0;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_position_x double precision DEFAULT 0.5;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS banner_position_y double precision DEFAULT 0.35;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS original_image_width integer;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS original_image_height integer;
