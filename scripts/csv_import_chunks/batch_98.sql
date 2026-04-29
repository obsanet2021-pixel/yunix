-- CSV Trades Import - Batch 98 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-5-ok-qve6-09-1950000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '8e475129-b68f-4945-b3cb-d643e1a1e6d3', 
        'XAUUSD', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        -29.51, 
        NULL, 
        NULL, 
        'Asia', 
        'Calm', 
        NULL, 
        '2025-12-15', 
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
        '17773527-0465-5-yy-vk8i-7e-1960000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'e47e084c-e1f6-45f6-aa9e-acd74ebd73bf', 
        'XAUUSD', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        -38.41, 
        NULL, 
        NULL, 
        'London', 
        'CALM', 
        NULL, 
        '2025-12-15', 
        '2026-04-28T05:05:04.655Z', 
        '2026-04-28T05:05:04.655Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 98
