-- CSV Trades Import - Batch 121 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-5-lz-4580-ew-2410000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'f537a1af-e961-438b-a6b1-571b22b75ad1', 
        'XAUUSD', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        -14.09, 
        NULL, 
        NULL, 
        'Asia', 
        'CALM', 
        'reversal', 
        '2025-11-20', 
        '2026-04-28T05:05:04.655Z', 
        '2026-04-28T05:05:04.655Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;
INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-5-2y-fzt4-c6-2420000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'e47e084c-e1f6-45f6-aa9e-acd74ebd73bf', 
        'XAUUSD', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        102.2, 
        NULL, 
        NULL, 
        'London', 
        'CALM', 
        'trend + break', 
        '2025-11-19', 
        '2026-04-28T05:05:04.655Z', 
        '2026-04-28T05:05:04.655Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 121
