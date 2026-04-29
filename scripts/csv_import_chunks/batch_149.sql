-- CSV Trades Import - Batch 149 of 171
-- Generated: 2026-04-28 08:06:41

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-7-zj-y75y-wu-2970000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'e47e084c-e1f6-45f6-aa9e-acd74ebd73bf', 
        'XAUUSD', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        -8.43, 
        NULL, 
        NULL, 
        'Ny', 
        'Calm', 
        NULL, 
        '2025-10-30', 
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
        '17773527-0465-7-zi-c6p8-5h-2980000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'e47e084c-e1f6-45f6-aa9e-acd74ebd73bf', 
        'XAUUSD', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        36.84, 
        NULL, 
        NULL, 
        'London', 
        'CALM', 
        NULL, 
        '2025-10-30', 
        '2026-04-28T05:05:04.657Z', 
        '2026-04-28T05:05:04.657Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 149
