// Phase 1 Migration: Auth Users
// This script creates Supabase auth users from the profiles data
// Run with: node migration-phase1-auth-users.js

import { createClient } from '@supabase/supabase-js';

// Your new Supabase credentials
const SUPABASE_URL = 'https://ounphbavkyrmotskydto.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91bnBoYmF2a3lybW90c2t5ZHRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjA4ODM4NiwiZXhwIjoyMDkxNjY0Mzg2fQ.DI4yhv4lVrauzhC6ARGol8h30AVBVraTASFD07BtgF8';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// User data from profiles export
const users = [
  { id: '2f15ae12-6c00-4c2b-8431-2e8b99d76da9', email: 'aymensuleyman25@gmail.com' },
  { id: 'fa1e9f3d-cd42-48ca-9741-6b43051a6ed6', email: 'awel5652@gmail.com' },
  { id: '1f7fa447-51c8-4c38-a477-2d9811dacf8d', email: 'ezedinwasfe@gmail.com' },
  { id: 'df7d2ccb-c209-4cc6-bb4a-37a728ece9a0', email: 'mohamedmohamedmifta@gmail.com' },
  { id: '6d0296ea-6afb-42e5-b4a5-e38c7ff401e8', email: 'abduzte@gmail.com' },
  { id: '504c9700-89ef-4c93-a627-c4d774bb4e77', email: 'ezujuniorzizu@gmail.com' },
  { id: '4d701042-b3d7-4804-890c-96f21e26761f', email: 'zashzash59@gmail.com' },
  { id: '2f13d10f-99e8-403b-9ef5-85b6935435fd', email: 'oumernet@gmail.com' },
  { id: 'f800a31b-7574-4565-8b04-93ca452b3e31', email: 'abcreative1223@gmail.com' },
  { id: 'e175a88c-5a5a-4fca-b7ae-942ef889ca62', email: 'huneyifa@gmail.com' },
  { id: 'd4012bc2-1082-4968-a8d3-bc8879727d4e', email: 'monksquad2025@gmail.com' },
  { id: '75e66d44-e6cc-481f-b070-17e419d25c58', email: 'abdusquad33@gmail.com' },
  { id: '47cc4b90-3142-4176-a81f-86bb6e284d1a', email: 'nasserahmed2013@gmail.com' },
  { id: 'c7065f46-338d-43ef-9e42-bf920a8ea11d', email: 'bemnet792@gmail.com' },
  { id: '4453cd26-25d0-4b4c-9da1-95e8acee5ce1', email: 'akhidiniyas@gmail.com' },
  { id: '5ee0cce9-799b-4504-8382-a3d2b2556855', email: 'fbiabdurohman26@gmail.com' },
  { id: 'fc1a20a7-df28-4a2a-b16c-f5adf45f1291', email: 'nuredinabdisa596@gmail.com' },
  { id: '5aeab45b-e0c6-494e-b930-96f39cec2f6a', email: 'mm2306131@gmail.com' },
  { id: '12ea244c-efbe-4c2c-9c66-2c938d7d55bd', email: 'imutiy1997@gmail.com' },
  { id: '729edbb5-3a37-4b62-b20b-2480dc5c7b2a', email: 'obsanet2021@gmail.com' },
  { id: 'da5d1704-1fa9-4270-9a7e-a77d8b9efb5e', email: 'mirafyohannes21@gmail.com' },
  { id: 'df29fd2b-f8b3-4bc0-890f-a4f62208c03a', email: 'hailabdawit134@gmail.com' },
  { id: 'e8fd3f47-f082-479d-b70f-c1f793ff91c8', email: 'aawel630@gmail.com' },
  { id: '04ca1cda-0f56-4482-bfef-02e1a3445370', email: 'muhew1100@gmail.com' },
  { id: '616f2a58-669b-4c40-822e-adfef7058906', email: 'roythegentalman@gmail.com' },
  { id: '18500679-9563-4266-bbd5-a14d1306147a', email: 'obsnet2021@gmail.com' },
  { id: '0a0c8b07-dfb8-4ad1-a62f-f2cf50cb03b6', email: 'top100gmom@gmail.com' },
  { id: '4ab475bf-af84-4668-ae7a-08da6a4022b1', email: 'salihzeynu1@gmail.com' },
  { id: '40a60634-cc05-4f0f-a502-748eee45c314', email: 'remadanmohammed5@gmail.com' },
  { id: '8ce5b5c6-e0fc-4f31-80a3-db588576718f', email: 'proahm4da@gmail.com' },
  { id: '9db1f01a-5a1d-4cbe-a9f2-2a1603546a25', email: 'mahikiya9@gmail.com' },
  { id: 'b90b7142-fbab-4250-bead-a7781b769b56', email: 'mehadisiham@gmail.com' },
  { id: '24984dc4-fcf2-4511-ba4e-9faa5a745823', email: 'ihaydar086@gmail.com' },
  { id: '2fb21c8d-bd25-44b3-9261-b18b899d1e3c', email: 'natayafe23@gmail.com' },
  { id: '58beeaf5-8028-48b8-996f-45085b85b34e', email: 'alicreative.891@gmail.com' },
  { id: 'd03c351c-765d-417b-b19e-f03e74024411', email: 'fanutare2@gmail.com' },
  { id: '4e1a3fa6-2d1c-423e-a6c8-feca51061c00', email: 'amarmunir40@gmail.com' },
  { id: '4c4a651f-12e0-4a4f-b8ef-a71a940e749c', email: 'yasernaser232@gmail.com' },
  { id: '0e2592fc-b364-4274-8dd7-d1c5533f17fe', email: 'kztrade990@gmail.com' }
];

async function createAuthUsers() {
  console.log('Starting auth user migration...');
  let successCount = 0;
  let errorCount = 0;

  for (const user of users) {
    try {
      // Generate a temporary password (users will need to reset)
      const tempPassword = 'TempPassword123!'; // You should change this
      
      const { data, error } = await supabase.auth.admin.createUser({
        id: user.id,
        email: user.email,
        password: tempPassword,
        email_confirm: true,
        user_metadata: {
          migrated: true,
          migration_date: new Date().toISOString()
        }
      });

      if (error) {
        console.error(`Error creating user ${user.email}:`, error.message);
        errorCount++;
      } else {
        console.log(`✓ Created user: ${user.email}`);
        successCount++;
      }
      
      // Add delay to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`Error processing user ${user.email}:`, error.message);
      errorCount++;
    }
  }

  console.log(`\nMigration complete:`);
  console.log(`✓ Success: ${successCount} users`);
  console.log(`✗ Errors: ${errorCount} users`);
  console.log(`\nIMPORTANT: All users have temporary password "TempPassword123!"`);
  console.log(`They will need to use "Forgot Password" to set their own passwords.`);
}

createAuthUsers().catch(console.error);
