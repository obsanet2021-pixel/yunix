-- CSV Trades Import - Batch 84 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-4-gx-2di9-dm-1670000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '8e475129-b68f-4945-b3cb-d643e1a1e6d3', 
        'GBPJPY', 
        'buy', 
        1, 
        210.899, 
        210.688, 
        -134.44, 
        212.04, 
        210.688, 
        'Asia', 
        'wasn''t calm', 
        NULL, 
        '2026-01-05', 
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
        '17773527-0465-4-4j-ogav-zn-1680000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '8e475129-b68f-4945-b3cb-d643e1a1e6d3', 
        'XAUUSD', 
        'sell', 
        0.04, 
        4420.97, 
        4434.31, 
        -53.36, 
        4218, 
        4433, 
        'Asia', 
        'wasn''t calm', 
        NULL, 
        '2026-01-05', 
        '2026-04-28T05:05:04.654Z', 
        '2026-04-28T05:05:04.654Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 84
