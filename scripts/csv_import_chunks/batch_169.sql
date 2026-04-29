-- CSV Trades Import - Batch 169 of 171
-- Generated: 2026-04-28 08:06:41

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-7-d1-3kg0-76-3370000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'e47e084c-e1f6-45f6-aa9e-acd74ebd73bf', 
        'EURJPY', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        103.38, 
        NULL, 
        NULL, 
        'London', 
        'Confident', 
        NULL, 
        '2025-09-05', 
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
        '17773527-0465-7-pz-nwh1-ex-3380000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'e47e084c-e1f6-45f6-aa9e-acd74ebd73bf', 
        'USDJPY', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        -0.18, 
        NULL, 
        NULL, 
        'London', 
        'focused', 
        NULL, 
        '2025-09-04', 
        '2026-04-28T05:05:04.657Z', 
        '2026-04-28T05:05:04.657Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 169
