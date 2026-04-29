-- CSV Trades Import - Batch 90 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-4-ad-msof-z1-1790000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '7ca3c91b-c00f-4eb4-8c39-ca95dad2f546', 
        'USDJPY', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        -13, 
        NULL, 
        NULL, 
        'Asia', 
        'calm', 
        NULL, 
        '2025-12-29', 
        '2026-04-28T05:05:04.654Z', 
        '2026-04-28T05:05:04.654Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;
INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-4-79-gjbo-ra-1800000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '8e475129-b68f-4945-b3cb-d643e1a1e6d3', 
        'XAUUSD', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        -94.65, 
        NULL, 
        NULL, 
        'London', 
        'Calm', 
        NULL, 
        '2025-12-26', 
        '2026-04-28T05:05:04.654Z', 
        '2026-04-28T05:05:04.654Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 90
