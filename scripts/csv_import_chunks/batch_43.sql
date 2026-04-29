-- CSV Trades Import - Batch 43 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-2-1h-r82e-yz-8500000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'ef14e31e-d6db-4b8e-b0b5-9dd40428e617', 
        'XAUUSD', 
        'sell', 
        0.01, 
        4980.33, 
        4999.65, 
        -19.3, 
        NULL, 
        NULL, 
        'New york', 
        NULL, 
        NULL, 
        '2026-02-13', 
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
        '17773527-0465-2-ir-ls2g-xw-8600000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'ef14e31e-d6db-4b8e-b0b5-9dd40428e617', 
        'EURJPY', 
        'buy', 
        0.01, 
        181.82, 
        181.31, 
        3.3, 
        NULL, 
        NULL, 
        'London', 
        NULL, 
        NULL, 
        '2026-02-13', 
        '2026-04-28T05:05:04.652Z', 
        '2026-04-28T05:05:04.652Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 43
