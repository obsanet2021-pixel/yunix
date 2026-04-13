-- Insert missing profile for CEO account
INSERT INTO public.profiles (id, email, name, created_at, updated_at)
VALUES (
  '729edbb5-3a37-4b62-b20b-2480dc5c7b2a',
  'obsanet2021@gmail.com',
  'YUNIX CEO',
  now(),
  now()
)
ON CONFLICT (id) DO NOTHING;