-- CSV Trades Import - Batch 109 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-5-nc-80n4-py-2170000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '8e475129-b68f-4945-b3cb-d643e1a1e6d3', 
        'XAUUSD', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        -25.9, 
        NULL, 
        NULL, 
        'Asia', 
        'Calm', 
        NULL, 
        '2025-11-28', 
        '2026-04-28T05:05:04.655Z', 
        '2026-04-28T05:05:04.655Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;
INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-5-vl-ki3r-48-2180000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '7ca3c91b-c00f-4eb4-8c39-ca95dad2f546', 
        'EURJPY', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        3.5, 
        NULL, 
        NULL, 
        'Asia', 
        'Calm', 
        NULL, 
        '2025-11-28', 
        '2026-04-28T05:05:04.655Z', 
        '2026-04-28T05:05:04.655Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 109
