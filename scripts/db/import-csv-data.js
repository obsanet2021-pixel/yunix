import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';
import { parse } from 'csv-parse/sync';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Missing Supabase credentials in .env');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const csvDir = path.join(__dirname, 'yunix database cvs files');

// Map CSV file names to table names
const csvToTableMap = {
  'account_snapshots-export-2026-04-14_07-45-25.csv': 'account_snapshots',
  'admin_audit_logs-export-2026-04-13_22-12-11.csv': 'admin_audit_logs',
  'bridge_activity_logs-export-2026-04-13_22-12-21.csv': 'bridge_activity_logs',
  'bridge_user_settings-export-2026-04-14_07-45-43.csv': 'bridge_user_settings',
  'ceo_telegram_config-export-2026-04-13_22-12-48.csv': 'ceo_telegram_config',
  'chat_conversations-export-2026-04-13_22-13-13.csv': 'chat_conversations',
  'chat_messages-export-2026-04-14_07-46-14.csv': 'chat_messages',
  'daily_checkins-export-2026-04-14_07-46-24.csv': 'daily_checkins',
  'delivery_bot_agents-export-2026-04-13_22-13-42.csv': 'delivery_bot_agents',
  'delivery_pricing-export-2026-04-14_07-46-41.csv': 'delivery_pricing',
  'discount_codes-export-2026-04-13_22-13-56.csv': 'discount_codes',
  'discount_rules-export-2026-04-14_07-46-52.csv': 'discount_rules',
  'final_certificates-export-2026-04-13_22-15-36.csv': 'final_certificates',
  'loyalty_progress-export-2026-04-13_22-16-03.csv': 'loyalty_progress',
  'mt5_bridge_config-export-2026-04-14_07-47-24.csv': 'mt5_bridge_config',
  'open_positions-export-2026-04-14_07-39-45.csv': 'open_positions',
  'order_status_history-export-2026-04-14_07-49-15.csv': 'order_status_history',
  'partner_rewards-export-2026-04-14_07-39-55.csv': 'partner_rewards',
  'password_reset_otps-export-2026-04-14_07-49-35.csv': 'password_reset_otps',
  'plaque_orders-export-2026-04-14_07-49-52.csv': 'plaque_orders',
  'plaque_payments-export-2026-04-14_07-40-35.csv': 'plaque_payments',
  'plaque_prices-export-2026-04-14_07-50-11.csv': 'plaque_prices',
  'portfolio_snapshots-export-2026-04-14_07-40-53.csv': 'portfolio_snapshots',
  'prop_firm_certificate_sizes-export-2026-04-14_07-41-09.csv': 'prop_firm_certificate_sizes',
  'referral_links-export-2026-04-14_07-41-50.csv': 'referral_links',
  'referrals-export-2026-04-14_07-51-58.csv': 'referrals',
  'social_media_posts-export-2026-04-14_07-42-01.csv': 'social_media_posts',
  'staff_reminders-export-2026-04-14_07-42-13.csv': 'staff_reminders',
  'student_progress-export-2026-04-14_07-52-45.csv': 'student_progress',
  'support_group_config-export-2026-04-14_07-42-24.csv': 'support_group_config',
  'support_messages-export-2026-04-14_07-53-03.csv': 'support_messages',
  'support_templates-export-2026-04-14_07-42-37.csv': 'support_templates',
  'trades-export-2026-04-14_07-43-54.csv': 'trades',
  'users_export.csv': 'users',
};

async function importCSV(csvFile, tableName) {
  const filePath = path.join(csvDir, csvFile);
  
  if (!fs.existsSync(filePath)) {
    console.log(`Skipping ${csvFile} - file not found`);
    return;
  }

  console.log(`Importing ${csvFile} to ${tableName}...`);
  
  const fileContent = fs.readFileSync(filePath, 'utf-8');
  // Use comma delimiter for users CSV, semicolon for others
  const delimiter = csvFile.includes('users') ? ',' : ';';
  const records = parse(fileContent, {
    columns: true,
    delimiter: delimiter,
    skip_empty_lines: true,
  });

  if (records.length === 0) {
    console.log(`  No records in ${csvFile}`);
    return;
  }

  // Convert records to match table schema
  const cleanedRecords = records.map(record => {
    const cleaned = {};
    for (const [key, value] of Object.entries(record)) {
      // Skip empty values
      if (value === '' || value === null || value === undefined) {
        continue;
      }
      
      // Convert string representations of arrays/objects
      if (value.startsWith('{') || value.startsWith('[')) {
        try {
          cleaned[key] = JSON.parse(value);
        } catch (e) {
          cleaned[key] = value;
        }
      } else {
        cleaned[key] = value;
      }
    }
    return cleaned;
  });

  // Insert in batches
  const batchSize = 100;
  for (let i = 0; i < cleanedRecords.length; i += batchSize) {
    const batch = cleanedRecords.slice(i, i + batchSize);
    
    try {
      const { data, error } = await supabase
        .from(tableName)
        .insert(batch)
        .select();
      
      if (error) {
        console.error(`  Error inserting batch ${i / batchSize + 1}:`, error.message);
        // Try inserting one by one for debugging
        for (const record of batch) {
          try {
            await supabase.from(tableName).insert(record);
          } catch (e) {
            console.error(`    Failed to insert record:`, e.message);
          }
        }
      } else {
        console.log(`  Inserted batch ${i / batchSize + 1} (${batch.length} records)`);
      }
    } catch (error) {
      console.error(`  Error in batch ${i / batchSize + 1}:`, error.message);
    }
  }
  
  console.log(`  Completed ${csvFile}`);
}

async function importAllCSVs() {
  console.log('Starting CSV import...\n');
  
  for (const [csvFile, tableName] of Object.entries(csvToTableMap)) {
    await importCSV(csvFile, tableName);
    console.log('');
  }
  
  console.log('CSV import completed!');
}

importAllCSVs().catch(console.error);
