-- CSV Trades Import - Batch 127 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-5-ow-cvcy-9v-2530000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '290907dc-9cfc-4872-94c1-03e6714b35fc', 
        'XAUUSD', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        10.64, 
        NULL, 
        NULL, 
        'Asia', 
        'Calm', 
        NULL, 
        '2025-11-14', 
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
        '17773527-0465-5-d7-gne6-5y-2540000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '290907dc-9cfc-4872-94c1-03e6714b35fc', 
        'XAUUSD', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        35.9, 
        NULL, 
        NULL, 
        'London', 
        'Calm', 
        'break and trend', 
        '2025-11-13', 
        '2026-04-28T05:05:04.655Z', 
        '2026-04-28T05:05:04.655Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 127
