-- CSV Trades Import - Batch 100 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-5-td-4cvu-n2-1990000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '7ca3c91b-c00f-4eb4-8c39-ca95dad2f546', 
        'XAUUSD', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        -8.18, 
        NULL, 
        NULL, 
        'Asia', 
        'Calm', 
        NULL, 
        '2025-12-12', 
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
        '17773527-0465-5-z9-uqcy-dq-2000000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '7ca3c91b-c00f-4eb4-8c39-ca95dad2f546', 
        'XAUUSD', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        8.6, 
        NULL, 
        NULL, 
        'Asia', 
        'Calm', 
        NULL, 
        '2025-12-10', 
        '2026-04-28T05:05:04.655Z', 
        '2026-04-28T05:05:04.655Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 100
