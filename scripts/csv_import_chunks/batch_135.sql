-- CSV Trades Import - Batch 135 of 171
-- Generated: 2026-04-28 08:06:41

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-5-j4-qcad-mq-2690000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'e47e084c-e1f6-45f6-aa9e-acd74ebd73bf', 
        'XAUUSD', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        -30.66, 
        NULL, 
        NULL, 
        'London', 
        'CALM', 
        'miscalculated the sl', 
        '2025-11-07', 
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
        '17773527-0465-5-e6-vwkf-5n-2700000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '290907dc-9cfc-4872-94c1-03e6714b35fc', 
        'XAUUSD', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        5.38, 
        NULL, 
        NULL, 
        'London', 
        'CALM', 
        NULL, 
        '2025-11-07', 
        '2026-04-28T05:05:04.655Z', 
        '2026-04-28T05:05:04.655Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 135
