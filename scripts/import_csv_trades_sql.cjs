const fs = require('fs');
const path = require('path');

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

let uuidCounter = 0;
function generateUUID() {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  uuidCounter++;
  return `${timestamp}-${random}-${uuidCounter}`.padEnd(36, '0').substring(0, 36).replace(/(.{8})(.{4})(.{4})(.{4})(.{12})/, '$1-$2-$3-$4-$5');
}

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

function escapeSQL(value) {
  if (value === null || value === undefined) return 'NULL';
  if (typeof value === 'number') return value;
  return `'${value.replace(/'/g, "''")}'`;
}

async function generateSQL() {
  try {
    const csvPath = path.join(__dirname, '..', 'yunix_export', 'trades_2026-04-28.csv');
    const csvContent = fs.readFileSync(csvPath, 'utf-8');
    const lines = csvContent.split('\n').filter(line => line.trim());
    
    const sqlLines = [];
    sqlLines.push('-- CSV Trades Import');
    sqlLines.push(`-- Generated: ${new Date().toISOString()}`);
    sqlLines.push('');
    
    let tradeCount = 0;
    
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
      
      const tradeId = generateUUID();
      const now = new Date().toISOString();
      
      const sql = `INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        ${escapeSQL(tradeId)}, 
        ${escapeSQL(USER_ID)}, 
        ${propFirmId ? escapeSQL(propFirmId) : 'NULL'}, 
        ${escapeSQL(normalizedPair)}, 
        ${tradeType ? escapeSQL(tradeType) : 'NULL'}, 
        ${parsedVolume !== null ? parsedVolume : 'NULL'}, 
        ${parsedEntry !== null ? parsedEntry : 'NULL'}, 
        ${parsedClose !== null ? parsedClose : 'NULL'}, 
        ${parsedPnl !== null ? parsedPnl : 'NULL'}, 
        ${parsedTp !== null ? parsedTp : 'NULL'}, 
        ${parsedSl !== null ? parsedSl : 'NULL'}, 
        ${normalizedSession ? escapeSQL(normalizedSession) : 'NULL'}, 
        ${emotion?.trim() ? escapeSQL(emotion.trim()) : 'NULL'}, 
        ${notes?.trim() ? escapeSQL(notes.trim()) : 'NULL'}, 
        ${escapeSQL(date)}, 
        ${escapeSQL(now)}, 
        ${escapeSQL(now)}, 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;`;
      
      sqlLines.push(sql);
      tradeCount++;
    }
    
    sqlLines.push('');
    sqlLines.push(`-- Total trades: ${tradeCount}`);
    
    const outputPath = path.join(__dirname, 'csv_trades_import.sql');
    fs.writeFileSync(outputPath, sqlLines.join('\n'));
    
    console.log(`Generated SQL for ${tradeCount} trades`);
    console.log(`Output file: ${outputPath}`);
    
  } catch (error) {
    console.error('Error:', error);
  }
}

generateSQL();
