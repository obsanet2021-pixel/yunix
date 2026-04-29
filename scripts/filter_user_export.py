#!/usr/bin/env python3
"""
Filter yunix_export/database/02_data.sql for a specific user.
Maps old UUID to new UUID in the target database.
Two-pass approach:
  1. Collect owned IDs (prop_firms, chat_conversations, etc.)
  2. Extract rows matching those IDs + direct user_id matches.
"""
import re, sys, os

OLD_UUID = "729edbb5-3a37-4b62-b20b-2480dc5c7b2a"
NEW_UUID = "ec850929-598f-41b3-a23c-7f0ceb464b8c"
OLD_UUID_SQL = f"'{OLD_UUID}'::uuid"
NEW_UUID_SQL = f"'{NEW_UUID}'::uuid"

INPUT_FILE = r"C:\Users\Free user\yunix\yunix_export\yunix_export\database\02_data.sql"
OUTPUT_FILE = r"C:\Users\Free user\yunix\scripts\02_data_filtered.sql"

UUID_RE = re.compile(r"'([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})'::uuid")


def extract_col_value(line: str, col_name: str) -> str | None:
    """Extract a specific column value from an INSERT statement.
    
    Assumes format: INSERT INTO ... (col1, col2, ...) VALUES (val1, val2, ...);
    Uses a simple balanced-quote parser to split values.
    """
    # Extract column list and values list
    m = re.search(r'\(([^)]+)\)\s+VALUES\s+\((.+)\);\s*$', line, re.DOTALL)
    if not m:
        return None
    cols_str = m.group(1)
    vals_str = m.group(2)
    
    cols = [c.strip().strip('"') for c in cols_str.split(',')]
    
    # Parse values respecting single-quoted strings
    vals = []
    current = ""
    in_quote = False
    i = 0
    paren_depth = 0
    while i < len(vals_str):
        ch = vals_str[i]
        if ch == "'":
            current += ch
            if in_quote:
                # check for escaped quote ''
                if i + 1 < len(vals_str) and vals_str[i + 1] == "'":
                    current += "'"
                    i += 1
                else:
                    in_quote = False
            else:
                in_quote = True
        elif ch == '(' and not in_quote:
            current += ch
            paren_depth += 1
        elif ch == ')' and not in_quote:
            if paren_depth > 0:
                current += ch
                paren_depth -= 1
            else:
                # End of values
                vals.append(current.strip())
                break
        elif ch == ',' and not in_quote and paren_depth == 0:
            vals.append(current.strip())
            current = ""
        else:
            current += ch
        i += 1
    if current:
        vals.append(current.strip())
    
    if len(cols) != len(vals):
        return None
    
    for c, v in zip(cols, vals):
        if c.strip() == col_name:
            return v
    return None


def main():
    if not os.path.exists(INPUT_FILE):
        with open(OUTPUT_FILE, "w") as f:
            f.write(f"Input file not found: {INPUT_FILE}\n")
        sys.exit(1)

    # ======================================================================
    # PASS 1: collect owned IDs
    # ======================================================================
    owned_prop_firm_ids = set()
    owned_conversation_ids = set()
    owned_broadcast_ids = set()
    owned_order_ids = set()
    owned_ticket_ids = set()
    current_table = None

    print("Pass 1: collecting owned IDs...")
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line.startswith("-- Data for Name:"):
                m = re.search(r"Name:\s+(\w+)", line)
                current_table = m.group(1) if m else None
                continue
            if not line.startswith("INSERT INTO public."):
                continue
            
            # Quick check: does this line reference our user at all?
            if OLD_UUID_SQL not in line:
                continue
            
            if current_table == "prop_firms":
                user_val = extract_col_value(line, "user_id")
                if user_val == OLD_UUID_SQL:
                    pf_id = extract_col_value(line, "id")
                    if pf_id:
                        owned_prop_firm_ids.add(pf_id)
            elif current_table == "chat_conversations":
                user_val = extract_col_value(line, "user_id")
                if user_val == OLD_UUID_SQL:
                    conv_id = extract_col_value(line, "id")
                    if conv_id:
                        owned_conversation_ids.add(conv_id)
            elif current_table == "telegram_broadcasts":
                user_val = extract_col_value(line, "user_id")
                if user_val == OLD_UUID_SQL:
                    bc_id = extract_col_value(line, "id")
                    if bc_id:
                        owned_broadcast_ids.add(bc_id)
            elif current_table == "plaque_orders":
                user_val = extract_col_value(line, "user_id")
                if user_val == OLD_UUID_SQL:
                    ord_id = extract_col_value(line, "id")
                    if ord_id:
                        owned_order_ids.add(ord_id)
            elif current_table == "support_tickets":
                user_val = extract_col_value(line, "user_id")
                if user_val == OLD_UUID_SQL:
                    tkt_id = extract_col_value(line, "id")
                    if tkt_id:
                        owned_ticket_ids.add(tkt_id)

    print(f"  prop_firms: {len(owned_prop_firm_ids)}")
    print(f"  chat_conversations: {len(owned_conversation_ids)}")
    print(f"  telegram_broadcasts: {len(owned_broadcast_ids)}")
    print(f"  plaque_orders: {len(owned_order_ids)}")
    print(f"  support_tickets: {len(owned_ticket_ids)}")

    # ======================================================================
    # PASS 2: filter rows and write output
    # ======================================================================
    print("Pass 2: filtering and writing SQL...")
    
    out_lines = []
    current_table = None
    table_header_buffer = []  # Lines from -- Data for Name... up to first INSERT
    table_insert_buffer = []  # Kept INSERTs for current table
    in_table_block = False
    
    def flush_table():
        """Write buffered table header + inserts + footer if any inserts were kept."""
        nonlocal table_header_buffer, table_insert_buffer, out_lines
        if table_insert_buffer:
            out_lines.extend(table_header_buffer)
            out_lines.extend(table_insert_buffer)
            out_lines.append("\n")
        table_header_buffer = []
        table_insert_buffer = []
    
    with open(INPUT_FILE, "r", encoding="utf-8") as f:
        for raw_line in f:
            line = raw_line.strip()
            
            # Detect start of a new table data block
            if line.startswith("-- Data for Name:"):
                flush_table()
                m = re.search(r"Name:\s+(\w+)", line)
                current_table = m.group(1) if m else None
                in_table_block = True
                table_header_buffer = [raw_line]
                continue
            
            if not in_table_block:
                # Copy top-level non-table lines (SET statements, etc.)
                out_lines.append(raw_line)
                continue
            
            # We are inside a table block
            if line.startswith("ALTER TABLE") and "ENABLE TRIGGER ALL" in line:
                # End of table block
                flush_table()
                in_table_block = False
                current_table = None
                continue
            
            if not line.startswith("INSERT INTO public."):
                table_header_buffer.append(raw_line)
                continue
            
            # Evaluate INSERT line
            keep = False
            
            # Tables with direct user_id ownership
            user_val = extract_col_value(line, "user_id")
            if user_val == OLD_UUID_SQL:
                keep = True
            
            # bridge_activity_logs: also by prop_firm_id
            if not keep and current_table == "bridge_activity_logs":
                pf_val = extract_col_value(line, "prop_firm_id")
                if pf_val and pf_val in owned_prop_firm_ids:
                    keep = True
            
            # Tables that reference prop_firm_id
            if not keep:
                pf_val = extract_col_value(line, "prop_firm_id")
                if pf_val and pf_val in owned_prop_firm_ids:
                    keep = True
            
            # chat_messages: by conversation_id
            if not keep and current_table == "chat_messages":
                conv_val = extract_col_value(line, "conversation_id")
                if conv_val and conv_val in owned_conversation_ids:
                    keep = True
            
            # telegram_broadcast_logs: by broadcast_id
            if not keep and current_table == "telegram_broadcast_logs":
                bc_val = extract_col_value(line, "broadcast_id")
                if bc_val and bc_val in owned_broadcast_ids:
                    keep = True
            
            # plaque_payments / order_status_history: by order_id
            if not keep and current_table in ("plaque_payments", "order_status_history"):
                ord_val = extract_col_value(line, "order_id")
                if ord_val and ord_val in owned_order_ids:
                    keep = True
            
            # ticket_messages: by ticket_id
            if not keep and current_table == "ticket_messages":
                tkt_val = extract_col_value(line, "ticket_id")
                if tkt_val and tkt_val in owned_ticket_ids:
                    keep = True
            
            if keep:
                # Remap old UUID to new UUID
                remapped = raw_line.replace(OLD_UUID_SQL, NEW_UUID_SQL)
                table_insert_buffer.append(remapped)
    
    flush_table()
    
    # Write output
    with open(OUTPUT_FILE, "w", encoding="utf-8") as f:
        f.writelines(out_lines)
    
    # Count kept INSERTs
    kept_count = sum(1 for l in out_lines if l.strip().startswith("INSERT INTO public."))
    print(f"Done. Wrote {kept_count} INSERT statements to {OUTPUT_FILE}")

if __name__ == "__main__":
    main()
