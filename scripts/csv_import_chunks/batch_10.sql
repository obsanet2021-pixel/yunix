-- CSV Trades Import - Batch 10 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-0-zv-zdnd-9w-1900000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'ef14e31e-d6db-4b8e-b0b5-9dd40428e617', 
        'XAUUSD', 
        'buy', 
        0.01, 
        4555.93, 
        4548.86, 
        -7, 
        NULL, 
        NULL, 
        'Asia', 
        NULL, 
        NULL, 
        '2026-03-25', 
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
        '17773527-0465-0-82-37wj-7s-2000000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '64445290-4ab3-435a-8d46-9f2bd4ff5e1e', 
        'XAUUSD', 
        'buy', 
        0.01, 
        4392.13, 
        4394.78, 
        2.6, 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        '2026-03-24', 
        '2026-04-28T05:05:04.650Z', 
        '2026-04-28T05:05:04.650Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 10
