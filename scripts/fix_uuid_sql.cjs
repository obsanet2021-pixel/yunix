const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

function generateUUID() {
  // Generate a valid UUID v4
  const bytes = crypto.randomBytes(16);
  bytes[6] = (bytes[6] & 0x0f) | 0x40; // Version 4
  bytes[8] = (bytes[8] & 0x3f) | 0x80; // Variant 10
  
  const hex = bytes.toString('hex');
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20, 32)
  ].join('-');
}

const inputDir = 'C:\\Users\\Free user\\yunix\\scripts\\csv_import_batches';
const files = fs.readdirSync(inputDir).filter(f => f.endsWith('.sql'));

console.log(`Fixing UUIDs in ${files.length} files...`);

files.forEach(file => {
  const filePath = path.join(inputDir, file);
  let content = fs.readFileSync(filePath, 'utf-8');
  
  // Find and replace invalid UUIDs with valid ones
  const uuidRegex = /'[0-9]+-[0-9]+-[a-z0-9-]+-[a-z0-9-]+-[0-9]+'/g;
  
  let match;
  let count = 0;
  while ((match = uuidRegex.exec(content)) !== null) {
    const invalidUUID = match[0];
    const validUUID = `'${generateUUID()}'`;
    content = content.replace(invalidUUID, validUUID);
    count++;
  }
  
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log(`  ${file}: Fixed ${count} UUIDs`);
});

console.log('\nDone! All UUIDs are now valid.');
console.log('Re-run the batches in Supabase SQL Editor.');
