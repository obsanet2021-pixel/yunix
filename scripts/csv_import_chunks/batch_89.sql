-- CSV Trades Import - Batch 89 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-4-4w-vw2s-06-1770000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '8e475129-b68f-4945-b3cb-d643e1a1e6d3', 
        'XAUUSD', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        -48.3, 
        NULL, 
        NULL, 
        'London', 
        'Calm', 
        NULL, 
        '2025-12-30', 
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
        '17773527-0465-4-t6-nhbx-ej-1780000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'e47e084c-e1f6-45f6-aa9e-acd74ebd73bf', 
        'XAUUSD', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        23.47, 
        NULL, 
        NULL, 
        'Ny', 
        'Calm', 
        'respecting entry and time iss the key', 
        '2025-12-30', 
        '2026-04-28T05:05:04.654Z', 
        '2026-04-28T05:05:04.654Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 89
