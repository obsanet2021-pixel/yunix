INSERT INTO courses (id, title, slug, description, category, thumbnail_url, video_url, resources, author_id, published, created_at, updated_at, level, hours) VALUES
(
  '23e99da3-c5c9-4ce4-9ecc-35eb100dd56e',
  'Introduction to Forex',
  'introduction-to-forex',
  $$Step into the world of Forex trading with confidence!

This beginner-friendly course is designed to give you a solid foundation in currency trading, focusing on the behavior of different pairs. You'll learn how the market moves, what drives price action, and how to read charts like a pro, all without overwhelming jargon.

By the end of this course:-
- you'll understand market structure
-liquidity
-sessions, and basic risk management.

 equipping you with the skills to take your first smart steps in Forex trading. Start your journey to becoming a knowledgeable, disciplined, and confident trader today$$,
  'Trading Basics',
  'https://bduwtkejrfmcggfwniqe.supabase.co/storage/v1/object/public/course-thumbnails/thumbnails/introduction-to-forex-1765273371639.jpg',
  NULL,
  '[]',
  'ec850929-598f-41b3-a23c-7f0ceb464b8c',
  true,
  '2025-12-06 15:03:20.65864+00',
  '2025-12-09 09:42:55.447971+00',
  'beginner',
  1.7
),
(
  'c4a6bbaf-5dcf-4dbc-9cd7-f92d409e5f9e',
  'second stage',
  'second-stage',
  NULL,
  'basic',
  NULL,
  NULL,
  '[]',
  'ec850929-598f-41b3-a23c-7f0ceb464b8c',
  false,
  '2025-12-18 19:31:02.703179+00',
  '2025-12-20 11:01:27.908135+00',
  'intermediate',
  0.8
),
(
  '9e075b9c-6161-4c76-8304-6d4be7a187fa',
  'thired stage',
  'thired-stage',
  NULL,
  'advanced',
  NULL,
  NULL,
  '[]',
  'ec850929-598f-41b3-a23c-7f0ceb464b8c',
  false,
  '2025-12-18 19:31:36.964787+00',
  '2025-12-20 11:01:33.417209+00',
  'advanced',
  0.3
)
ON CONFLICT (id) DO NOTHING;

SELECT COUNT(*) as courses_count FROM courses;
