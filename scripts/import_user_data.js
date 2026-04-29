import pg from 'pg';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const { Pool } = pg;

// Load environment variables
const SUPABASE_URL = 'https://ounphbavkyrmotskydto.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91bnBoYmF2a3lybW90c2t5ZHRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjA4ODM4NiwiZXhwIjoyMDkxNjY0Mzg2fQ.DI4yhv4lVrauzhC6ARGol8h30AVBVraTASFD07BtgF8';

// Extract connection details from service role key
const token = JSON.parse(Buffer.from(SUPABASE_SERVICE_ROLE_KEY.split('.')[1], 'base64').toString());
const DB_HOST = 'db.ounphbavkyrmotskydto.supabase.co';
const DB_PORT = 5432;
const DB_NAME = 'postgres';
const DB_USER = 'postgres';
const DB_PASSWORD = process.env.DB_PASSWORD || 'Nasbo@2021';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BATCH_DIR = path.join(__dirname, 'batches');
const PROGRESS_FILE = path.join(__dirname, 'import_progress_js.txt');

// Create connection pool
const pool = new Pool({
  host: DB_HOST,
  port: DB_PORT,
  database: DB_NAME,
  user: DB_USER,
  password: DB_PASSWORD,
  ssl: {
    rejectUnauthorized: false
  }
});

async function getCompletedBatches() {
  if (fs.existsSync(PROGRESS_FILE)) {
    const content = fs.readFileSync(PROGRESS_FILE, 'utf-8');
    return new Set(content.trim().split('\n').filter(Boolean));
  }
  return new Set();
}

async function markBatchComplete(batchName) {
  fs.appendFileSync(PROGRESS_FILE, batchName + '\n');
}

async function importBatch(batchPath) {
  const sql = fs.readFileSync(batchPath, 'utf-8');
  
  try {
    await pool.query(sql);
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

async function main() {
  console.log('Starting SQL batch import...');
  console.log('Note: You need to set DB_PASSWORD environment variable');
  console.log('Get it from: https://supabase.com/dashboard/project/ounphbavkyrmotskydto/settings/database\n');

  if (!DB_PASSWORD || DB_PASSWORD === 'your-db-password') {
    console.error('❌ DB_PASSWORD not set!');
    console.log('Set it with: $env:DB_PASSWORD="your-password" (PowerShell)');
    console.log('Or: export DB_PASSWORD="your-password" (bash)');
    process.exit(1);
  }

  const completed = await getCompletedBatches();
  console.log(`Found ${completed.size} previously completed batches`);

  // Get all batch files
  const batchFiles = fs.readdirSync(BATCH_DIR)
    .filter(f => f.startsWith('batch_') && f.endsWith('.sql'))
    .map(f => ({
      name: f,
      num: parseInt(f.replace('batch_', '').replace('.sql', '')),
      path: path.join(BATCH_DIR, f)
    }))
    .filter(b => b.num >= 29 && b.num <= 201)
    .filter(b => !completed.has(b.name))
    .sort((a, b) => a.num - b.num);

  console.log(`Found ${batchFiles.length} batches to import (29-201)\n`);

  let successCount = 0;
  let failCount = 0;

  for (const batch of batchFiles) {
    process.stdout.write(`Importing ${batch.name}... `);
    
    const result = await importBatch(batch.path);
    
    if (result.success) {
      await markBatchComplete(batch.name);
      successCount++;
      console.log('✓');
      
      if (successCount % 10 === 0) {
        console.log(`Progress: ${successCount} imported, ${failCount} failed`);
      }
    } else {
      failCount++;
      console.log(`✗ ${result.error}`);
    }
  }

  console.log('\n=== IMPORT COMPLETE ===');
  console.log(`Imported: ${successCount}`);
  console.log(`Failed: ${failCount}`);
  console.log(`Total completed: ${completed.size + successCount}`);

  await pool.end();
}

main().catch(console.error);
