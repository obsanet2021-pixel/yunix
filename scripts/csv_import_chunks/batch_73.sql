-- CSV Trades Import - Batch 73 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-3-mq-abop-sr-1450000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '8e475129-b68f-4945-b3cb-d643e1a1e6d3', 
        'EURJPY', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        -65.83, 
        NULL, 
        NULL, 
        'London', 
        'wasn''t calm', 
        NULL, 
        '2026-01-15', 
        '2026-04-28T05:05:04.653Z', 
        '2026-04-28T05:05:04.653Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;
INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-3-b3-ie63-dw-1460000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '8e475129-b68f-4945-b3cb-d643e1a1e6d3', 
        'EURJPY', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        20.05, 
        NULL, 
        NULL, 
        'London', 
        'wasn''t calm', 
        NULL, 
        '2026-01-15', 
        '2026-04-28T05:05:04.653Z', 
        '2026-04-28T05:05:04.653Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 73
