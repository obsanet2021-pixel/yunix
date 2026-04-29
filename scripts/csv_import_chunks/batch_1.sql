-- CSV Trades Import - Batch 1 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0464-8-ot-c62z-nb-1000000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'ef14e31e-d6db-4b8e-b0b5-9dd40428e617', 
        'XAUUSD', 
        'sell', 
        0.01, 
        4773.24, 
        4789.27, 
        -16.08, 
        NULL, 
        NULL, 
        'London', 
        NULL, 
        NULL, 
        '2026-04-14', 
        '2026-04-28T05:05:04.648Z', 
        '2026-04-28T05:05:04.648Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;
INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0464-9-uq-2t18-v4-2000000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'ef14e31e-d6db-4b8e-b0b5-9dd40428e617', 
        'XAUUSD', 
        'buy', 
        0.01, 
        4781.41, 
        4781.25, 
        0.03, 
        NULL, 
        NULL, 
        'London', 
        NULL, 
        NULL, 
        '2026-04-14', 
        '2026-04-28T05:05:04.649Z', 
        '2026-04-28T05:05:04.649Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 1
