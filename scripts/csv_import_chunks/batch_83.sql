-- CSV Trades Import - Batch 83 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-4-1g-et3r-jp-1650000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'e47e084c-e1f6-45f6-aa9e-acd74ebd73bf', 
        'XAUUSD', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        -46.83, 
        NULL, 
        NULL, 
        'London', 
        'Calm', 
        NULL, 
        '2026-01-06', 
        '2026-04-28T05:05:04.654Z', 
        '2026-04-28T05:05:04.654Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;
INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-4-e9-2s22-9m-1660000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '7ca3c91b-c00f-4eb4-8c39-ca95dad2f546', 
        'XAUUSD', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        -16.06, 
        NULL, 
        NULL, 
        'London', 
        'Calm', 
        NULL, 
        '2026-01-06', 
        '2026-04-28T05:05:04.654Z', 
        '2026-04-28T05:05:04.654Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 83
