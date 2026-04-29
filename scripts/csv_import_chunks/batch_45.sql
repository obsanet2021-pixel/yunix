-- CSV Trades Import - Batch 45 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-2-15-oshx-71-8900000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '7ca3c91b-c00f-4eb4-8c39-ca95dad2f546', 
        'EURJPY', 
        'buy', 
        0.01, 
        181.64, 
        181.93, 
        1.9, 
        NULL, 
        NULL, 
        'London', 
        NULL, 
        NULL, 
        '2026-02-13', 
        '2026-04-28T05:05:04.652Z', 
        '2026-04-28T05:05:04.652Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;
INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-2-rq-3w80-vv-9000000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'ef14e31e-d6db-4b8e-b0b5-9dd40428e617', 
        'EURJPY', 
        'buy', 
        0.1, 
        181.86, 
        181.4, 
        30.04, 
        NULL, 
        NULL, 
        'London', 
        NULL, 
        NULL, 
        '2026-02-13', 
        '2026-04-28T05:05:04.652Z', 
        '2026-04-28T05:05:04.652Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 45
