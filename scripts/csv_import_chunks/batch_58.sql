-- CSV Trades Import - Batch 58 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-3-tj-x18y-o3-1150000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '7ca3c91b-c00f-4eb4-8c39-ca95dad2f546', 
        'USDJPY', 
        'buy', 
        0.06, 
        156.87, 
        156.91, 
        1.22, 
        NULL, 
        NULL, 
        'London', 
        NULL, 
        NULL, 
        '2026-02-05', 
        '2026-04-28T05:05:04.653Z', 
        '2026-04-28T05:05:04.653Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;
INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-3-tb-u01c-oz-1160000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '7ca3c91b-c00f-4eb4-8c39-ca95dad2f546', 
        'USDJPY', 
        'buy', 
        0.03, 
        NULL, 
        NULL, 
        6.07, 
        NULL, 
        NULL, 
        'London', 
        NULL, 
        NULL, 
        '2026-02-05', 
        '2026-04-28T05:05:04.653Z', 
        '2026-04-28T05:05:04.653Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 58
