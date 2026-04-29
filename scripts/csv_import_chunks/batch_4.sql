-- CSV Trades Import - Batch 4 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0464-9-k7-cdym-21-7000000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'ef14e31e-d6db-4b8e-b0b5-9dd40428e617', 
        'XAUUSD', 
        'sell', 
        0.03, 
        4673.64, 
        4689.48, 
        -50.58, 
        NULL, 
        NULL, 
        'Asia', 
        NULL, 
        NULL, 
        '2026-04-06', 
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
        '17773527-0464-9-ol-jlky-3a-8000000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'ef14e31e-d6db-4b8e-b0b5-9dd40428e617', 
        'XAUUSD', 
        'buy', 
        0.01, 
        4675.45, 
        4674.96, 
        0.41, 
        NULL, 
        NULL, 
        'Asia', 
        NULL, 
        NULL, 
        '2026-04-06', 
        '2026-04-28T05:05:04.649Z', 
        '2026-04-28T05:05:04.649Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 4
