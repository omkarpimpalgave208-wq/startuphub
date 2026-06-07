-- ==============================================================================
-- BACKFILL MIGRATION: First Startup Launched Badge
-- ==============================================================================
-- Description: Awards the "First Startup Launched" badge to all existing users 
--              who have uploaded at least one product but haven't received it yet.
-- Idempotent: Yes. Safe to run multiple times without creating duplicates.
-- ==============================================================================

WITH earliest_products AS (
    -- 1 & 2. Find every user with at least one startup, returning their earliest one
    SELECT DISTINCT ON (user_id) 
        user_id, 
        name AS startup_name, 
        created_at AS earned_date
    FROM public.products
    ORDER BY user_id, created_at ASC
),
users_to_update AS (
    -- 3. Match users with their earliest product and format the JSON badge payload
    SELECT 
        p.id AS user_id,
        p.achievements,
        json_build_object(
            'id', 'first_startup',
            'startupName', ep.startup_name,
            'earnedDate', ep.earned_date
        )::text AS badge_json
    FROM public.profiles p
    JOIN earliest_products ep ON p.id = ep.user_id
    WHERE 
        -- Check idempotency: Ignore if they already have the badge string/JSON
        NOT EXISTS (
            SELECT 1 
            FROM unnest(p.achievements) AS ach 
            WHERE ach LIKE '%"id":"first_startup"%' 
               OR ach LIKE '%"id": "first_startup"%'
               OR ach = 'First Startup Launched'
        )
)
-- 4. Update the profiles table directly, appending the JSON payload
UPDATE public.profiles p
SET achievements = array_append(p.achievements, utu.badge_json)
FROM users_to_update utu
WHERE p.id = utu.user_id;
