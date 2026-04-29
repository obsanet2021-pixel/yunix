-- CSV Trades Import - Batch 6 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0464-9-lz-f8oa-2n-1100000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'ef14e31e-d6db-4b8e-b0b5-9dd40428e617', 
        'XAUUSD', 
        'buy', 
        0.01, 
        4681.75, 
        4687.44, 
        -7.22, 
        NULL, 
        NULL, 
        'Asia', 
        NULL, 
        NULL, 
        '2026-04-01', 
        '2026-04-28T05:05:04.649Z', 
        '2026-04-28T05:05:04.649Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;
INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0464-9-a8-drzt-yr-1200000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '64445290-4ab3-435a-8d46-9f2bd4ff5e1e', 
        'XAUUSD', 
        'sell', 
        0.01, 
        4730.34, 
        4726.89, 
        3.4, 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        '2026-04-01', 
        '2026-04-28T05:05:04.649Z', 
        '2026-04-28T05:05:04.649Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 6
