-- CSV Trades Import - Batch 59 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-3-no-jyqi-on-1170000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '7ca3c91b-c00f-4eb4-8c39-ca95dad2f546', 
        'EURJPY', 
        'buy', 
        0.05, 
        183.99, 
        183.99, 
        0.1, 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        '2026-02-03', 
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
        '17773527-0465-3-jy-pyyt-72-1180000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '7ca3c91b-c00f-4eb4-8c39-ca95dad2f546', 
        'GBPJPY', 
        'buy', 
        0.04, 
        213.16, 
        213.04, 
        -2.9, 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        '2026-02-03', 
        '2026-04-28T05:05:04.653Z', 
        '2026-04-28T05:05:04.653Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 59
