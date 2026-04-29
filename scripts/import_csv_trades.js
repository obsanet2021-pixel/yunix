const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://ounphbavkyrmotskydto.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im91bnBoYmF2a3lybW90c2t5ZHRvIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTczNzgwODg4MCwiZXhwIjoyMDUzODQ0ODgwfQ.1wD8TgZELf6Pq6v7fKTOt2E6tNC1U8D8L8Q3Q3Q3Q3Q';

const supabase = createClient(supabaseUrl, supabaseKey);

// User and prop firm mappings
const USER_ID = 'ec850929-598f-41b3-a23c-7f0ceb464b8c';

const PROP_FIRM_MAP = {
  'UPCOMERS': 'ef14e31e-d6db-4b8e-b0b5-9dd40428e617',
  'Fundingpips pro': '64445290-4ab3-435a-8d46-9f2bd4ff5e1e',
  'FUNDING PIPS': '8e475129-b68f-4945-b3cb-d643e1a1e6d3',
  'NOSTRO': '7ca3c91b-c00f-4eb4-8c39-ca95dad2f546',
  'Nostro': 'f537a1af-e961-438b-a6b1-571b22b75ad1',
  'QT': 'e47e084c-e1f6-45f6-aa9e-acd74ebd73bf',
  'EQUITY EDGE-F': '290907dc-9cfc-4872-94c1-03e6714b35fc',
  'EQUITY': '290907dc-9cfc-4872-94c1-03e6714b35fc',
};

// Generate UUID v4
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

// Parse CSV line properly handling quotes
function parseCSVLine(line) {
  const result = [];
  let current = '';
  let inQuotes = false;
  
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current.trim());
  return result;
}

async function importTrades() {
  try {
    const csvPath = path.join(__dirname, '..', 'yunix_export', 'trades_2026-04-28.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    // Skip header
    const header = parseCSVLine(lines[0]);
    console.log('CSV Columns:', header);
    
    const trades = [];
    
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line.trim()) continue;
      
      const values = parseCSVLine(line);
      if (values.length < 9) continue;
      
      const [
        date, pair, type, volume, entry, tp, sl, close, pnl,
        session, emotion, propFirm, notes
      ] = values;
      
      if (!date || !pair) continue;
      
      // Map prop firm
      let propFirmId = null;
      const firmName = propFirm?.trim();
      if (firmName) {
        propFirmId = PROP_FIRM_MAP[firmName] || null;
        if (!propFirmId) {
          console.log(`Warning: Unknown prop firm "${firmName}" for trade on ${date}`);
        }
      }
      
      // Parse numeric values
      const parsedVolume = volume ? parseFloat(volume) : null;
      const parsedEntry = entry ? parseFloat(entry) : null;
      const parsedClose = close ? parseFloat(close) : null;
      const parsedPnl = pnl ? parseFloat(pnl) : null;
      const parsedTp = tp ? parseFloat(tp) : null;
      const parsedSl = sl ? parseFloat(sl) : null;
      
      // Normalize pair name
      let normalizedPair = pair?.toUpperCase().replace('/', '');
      
      // Normalize trade type
      let tradeType = type?.toLowerCase();
      if (tradeType === 'buy') tradeType = 'buy';
      else if (tradeType === 'sell') tradeType = 'sell';
      else tradeType = null;
      
      // Normalize session
      let normalizedSession = session?.trim();
      if (normalizedSession) {
        normalizedSession = normalizedSession.charAt(0).toUpperCase() + normalizedSession.slice(1).toLowerCase();
      }
      
      const trade = {
        id: generateUUID(),
        user_id: USER_ID,
        prop_firm_id: propFirmId,
        pair: normalizedPair,
        trade_type: tradeType,
        volume: parsedVolume,
        entry_price: parsedEntry,
        close_price: parsedClose,
        profit: parsedPnl,
        take_profit: parsedTp,
        stop_loss: parsedSl,
        session: normalizedSession || null,
        emotion: emotion?.trim() || null,
        notes: notes?.trim() || null,
        trade_date: date,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        is_synced: false,
        screenshots: '{}',
        mistake_tags: '{}',
        rule_broken: false
      };
      
      trades.push(trade);
    }
    
    console.log(`Parsed ${trades.length} trades from CSV`);
    
    // Insert in batches of 50
    const batchSize = 50;
    let inserted = 0;
    let errors = 0;
    
    for (let i = 0; i < trades.length; i += batchSize) {
      const batch = trades.slice(i, i + batchSize);
      
      try {
        const { data, error } = await supabase
          .from('trades')
          .upsert(batch, { 
            onConflict: 'id',
            ignoreDuplicates: true 
          });
        
        if (error) {
          console.error(`Batch ${i/batchSize + 1} error:`, error);
          errors += batch.length;
        } else {
          inserted += batch.length;
          console.log(`Batch ${i/batchSize + 1}: Inserted ${batch.length} trades`);
        }
      } catch (err) {
        console.error(`Batch ${i/batchSize + 1} failed:`, err.message);
        errors += batch.length;
      }
      
      // Small delay between batches
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    console.log(`\nImport complete!`);
    console.log(`Successfully inserted: ${inserted} trades`);
    console.log(`Errors: ${errors} trades`);
    
  } catch (error) {
    console.error('Import failed:', error);
  }
}

importTrades();
