# CEO Avatar Image Migration

## Current Situation
The CEO's avatar URL in the profiles table points to the old Supabase project:
- Old URL: `https://bduwtkejrfmcggfwniqe.supabase.co/storage/v1/object/public/certificates/avatars/729edbb5-3a37-4b62-b20b-2480dc5c7b2a-0.48056495984395653.jpg`
- Local file exists at: `c:\Users\Free user\yunix\yunix picture storage\certificates\avatars\729edbb5-3a37-4b62-b20b-2480dc5c7b2a-0.48056495984395653.jpg`

## Migration Steps

### Step 1: Upload to New Supabase Storage
1. Go to your new Supabase dashboard (https://ounphbavkyrmotskydto.supabase.co)
2. Navigate to Storage
3. Create a bucket named "certificates" if it doesn't exist
4. Inside the certificates bucket, create a folder named "avatars"
5. Upload the file: `729edbb5-3a37-4b62-b20b-2480dc5c7b2a-0.48056495984395653.jpg`
6. Make the bucket public (Storage > certificates > Policies > New Policy > Public access)

### Step 2: Update Avatar URL in Profiles
Run this SQL in Supabase SQL Editor:

```sql
UPDATE profiles 
SET avatar_url = 'https://ounphbavkyrmotskydto.supabase.co/storage/v1/object/public/certificates/avatars/729edbb5-3a37-4b62-b20b-2480dc5c7b2a-0.48056495984395653.jpg'
WHERE email = 'obsanet2021@gmail.com';
```

### Step 3: Verify
```sql
SELECT id, email, name, avatar_url 
FROM profiles 
WHERE email = 'obsanet2021@gmail.com';
```

## Alternative: Remove Avatar URL
If you don't want to migrate the avatar image, you can simply remove the URL:

```sql
UPDATE profiles 
SET avatar_url = NULL 
WHERE email = 'obsanet2021@gmail.com';
```
