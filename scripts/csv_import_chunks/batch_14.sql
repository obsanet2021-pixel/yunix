-- CSV Trades Import - Batch 14 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-0-sz-sq4c-5c-2700000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'ef14e31e-d6db-4b8e-b0b5-9dd40428e617', 
        'EURJPY', 
        'buy', 
        0.4, 
        183.2, 
        183.1, 
        -29.8, 
        NULL, 
        NULL, 
        'Asia', 
        NULL, 
        NULL, 
        '2026-03-19', 
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
        '17773527-0465-0-si-yjes-p9-2800000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'ef14e31e-d6db-4b8e-b0b5-9dd40428e617', 
        'XAUUSD', 
        'buy', 
        0.01, 
        4884.92, 
        4861.63, 
        -23.82, 
        NULL, 
        NULL, 
        'New york', 
        NULL, 
        NULL, 
        '2026-03-18', 
        '2026-04-28T05:05:04.650Z', 
        '2026-04-28T05:05:04.650Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 14
