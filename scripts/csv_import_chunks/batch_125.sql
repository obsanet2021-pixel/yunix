-- CSV Trades Import - Batch 125 of 171
-- Generated: 2026-04-28 08:06:40

INSERT INTO public.trades (
        id, user_id, prop_firm_id, pair, trade_type, volume, entry_price, 
        close_price, profit, take_profit, stop_loss, session, emotion, 
        notes, trade_date, created_at, updated_at, is_synced, screenshots, 
        mistake_tags, rule_broken
      ) VALUES (
        '17773527-0465-5-at-8zf1-zx-2490000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        'f537a1af-e961-438b-a6b1-571b22b75ad1', 
        'GBPJPY', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        -46.22, 
        NULL, 
        NULL, 
        'London', 
        'Calm', 
        NULL, 
        '2025-11-14', 
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
        '17773527-0465-5-85-pepr-vv-2500000000000', 
        'ec850929-598f-41b3-a23c-7f0ceb464b8c', 
        '290907dc-9cfc-4872-94c1-03e6714b35fc', 
        'XAUUSD', 
        NULL, 
        NULL, 
        NULL, 
        NULL, 
        -2.36, 
        NULL, 
        NULL, 
        'Asia', 
        'Calm', 
        NULL, 
        '2025-11-14', 
        '2026-04-28T05:05:04.655Z', 
        '2026-04-28T05:05:04.655Z', 
        false, '{}', '{}', false
      ) ON CONFLICT DO NOTHING;

-- End of batch 125
