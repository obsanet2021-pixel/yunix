-- CSV Trades Import - Batch 163 of 171
-- Generated: 2026-04-28 08:06:41

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-7-0g-diag-j5-3250000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'e47e084c-e1f6-45f6-aa9e-acd74ebd73bf', 
        'GBPJPY', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        3.04, 
        NULL, 
        NULL, 
        'London', 
        'calm', 
        NULL, 
        '2025-09-22', 
        '2026-04-28T05:05:04.657Z', 
        '2026-04-28T05:05:04.657Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;
INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-7-ep-tzmx-a2-3260000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'e47e084c-e1f6-45f6-aa9e-acd74ebd73bf', 
        'EURJPY', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        30.99, 
        NULL, 
        NULL, 
        'London', 
        'focused', 
        NULL, 
        '2025-09-19', 
        '2026-04-28T05:05:04.657Z', 
        '2026-04-28T05:05:04.657Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 163
