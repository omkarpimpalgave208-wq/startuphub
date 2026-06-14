-- MIGRATION: Fix Puja Rathod's username to prevent URL routing/lookup failure
--
-- Puja's original username is "rathod_#233". Since '#' starts the hash fragment
-- in a URL, React Router treats the path as "/profile/rathod_" and ignores "#233".
-- This migration updates her username to "rathod_233" (without the '#') so the
-- profile can be looked up and loaded successfully by visitors.

UPDATE public.profiles
SET username = 'rathod_233'
WHERE id = 'e4fcf270-a64f-43aa-a6a7-d061ac1e60ed';
