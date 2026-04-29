-- CSV Trades Import - Batch 7 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0464-9-16-ooyu-du-1300000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '64445290-4ab3-435a-8d46-9f2bd4ff5e1e', 
        'XAUUSD', 
        'sell', 
        0.01, 
        4737.51, 
        4760.68, 
        -23.22, 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        '2026-04-01', 
        '2026-04-28T05:05:04.649Z', 
        '2026-04-28T05:05:04.649Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;
INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-0-n0-4g2h-nu-1400000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '64445290-4ab3-435a-8d46-9f2bd4ff5e1e', 
        'XAUUSD', 
        'sell', 
        0.01, 
        4763.84, 
        4778.58, 
        -14.79, 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        '2026-04-01', 
        '2026-04-28T05:05:04.650Z', 
        '2026-04-28T05:05:04.650Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 7
