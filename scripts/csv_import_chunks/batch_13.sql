-- CSV Trades Import - Batch 13 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-0-g0-jgf7-es-2500000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'ef14e31e-d6db-4b8e-b0b5-9dd40428e617', 
        'XAUUSD', 
        'buy', 
        0.01, 
        4688.17, 
        4661.02, 
        27.31, 
        NULL, 
        NULL, 
        'London', 
        NULL, 
        NULL, 
        '2026-03-20', 
        '2026-04-28T05:05:04.650Z', 
        '2026-04-28T05:05:04.650Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;
INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-0-e5-ng1n-ie-2600000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '64445290-4ab3-435a-8d46-9f2bd4ff5e1e', 
        'EURJPY', 
        'sell', 
        0.01, 
        182.599, 
        182.681, 
        -0.52, 
        NULL, 
        NULL, 
        'New york', 
        NULL, 
        NULL, 
        '2026-03-19', 
        '2026-04-28T05:05:04.650Z', 
        '2026-04-28T05:05:04.650Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 13
