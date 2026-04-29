-- CSV Trades Import - Batch 29 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-0-28-f70t-1v-5700000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'ef14e31e-d6db-4b8e-b0b5-9dd40428e617', 
        'XAUUSD', 
        'buy', 
        0.01, 
        5360.02, 
        5329.71, 
        30.3, 
        NULL, 
        NULL, 
        'Asia', 
        NULL, 
        NULL, 
        '2026-03-03', 
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
        '17773527-0465-0-05-lgxj-y3-5800000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'ef14e31e-d6db-4b8e-b0b5-9dd40428e617', 
        'XAUUSD', 
        'sell', 
        0.06, 
        5188.97, 
        5180.31, 
        -52.5, 
        NULL, 
        NULL, 
        'Asia', 
        NULL, 
        NULL, 
        '2026-02-27', 
        '2026-04-28T05:05:04.650Z', 
        '2026-04-28T05:05:04.650Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 29
