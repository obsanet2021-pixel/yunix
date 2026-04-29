-- CSV Trades Import - Batch 47 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-2-ls-rwnc-r9-9300000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'ef14e31e-d6db-4b8e-b0b5-9dd40428e617', 
        'XAUUSD', 
        'buy', 
        0.01, 
        5055.4, 
        5075.72, 
        -20.32, 
        NULL, 
        NULL, 
        'Asia', 
        NULL, 
        NULL, 
        '2026-02-12', 
        '2026-04-28T05:05:04.652Z', 
        '2026-04-28T05:05:04.652Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;
INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-2-gk-xt2j-9x-9400000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'ef14e31e-d6db-4b8e-b0b5-9dd40428e617', 
        'USDJPY', 
        'buy', 
        0.12, 
        153.15, 
        153.35, 
        -16.48, 
        NULL, 
        NULL, 
        'Asia', 
        NULL, 
        NULL, 
        '2026-02-12', 
        '2026-04-28T05:05:04.652Z', 
        '2026-04-28T05:05:04.652Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 47
