-- Phase 2 Migration: Lessons Data
-- Insert lessons data from CSV export

INSERT INTO lessons (id, course_id, title, content, video_url, order_index, created_at, updated_at) VALUES
('4c11391e-d977-4092-9796-e5748b8e2c50', '23e99da3-c5c9-4ce4-9ecc-35eb100dd56e', 'What is Market Structure? HH, HL, LL, LH', $$Market structure tells you the direction.
Higher highs and higher lows = uptrend.
Lower highs and lower lows = downtrend.
If you understand structure, you understand where price wants to go next.

This is the foundation of all smart trading.$$, NULL, 5, '2025-12-06 15:14:03.169181+00', '2025-12-06 15:14:03.169181+00'),
('b7d4a0a5-66fa-432b-ae2c-0d555557a9e7', '23e99da3-c5c9-4ce4-9ecc-35eb100dd56e', 'Trends Explained (Bullish, Bearish, Ranging)', $$Price only does three things: goes up, goes down, or moves sideways.

A bullish trend means buyers are in control.
A bearish trend means sellers dominate.

A range means no clear direction — the worst place for beginners to trade.
Always identify the trend first before doing anything else.$$, NULL, 6, '2025-12-06 15:14:52.463842+00', '2025-12-06 15:14:52.463842+00'),
('811a7582-ceb8-41b2-8ce9-299990768b83', '23e99da3-c5c9-4ce4-9ecc-35eb100dd56e', 'BOS vs CHoCH', $$A Break of Structure, BOS, confirms continuation.

A Change of Character, CHoCH, signals reversal.

This helps you understand when the trend is changing or still strong.

Once you see a CHoCH, prepare for a new direction.

Once you see a BOS, the trend is continuing.

Simple. Powerful.$$, NULL, 7, '2025-12-06 15:15:45.812706+00', '2025-12-06 15:15:45.812706+00'),
('d0677888-cad9-4255-9892-54500b59b6cd', '23e99da3-c5c9-4ce4-9ecc-35eb100dd56e', 'Support & Resistance the Correct Way', $$S/R levels are areas where price reacts.
But beginners usually draw too many lines.

We only mark clear swing highs and swing lows.
These levels show where liquidity is sitting.

Keep your chart clean, mark only important levels, and watch how price reacts.$$, NULL, 8, '2025-12-06 15:16:22.421632+00', '2025-12-06 15:16:22.421632+00'),
('7eb70da4-73c8-4a2c-97d3-036ea3ac44ce', '23e99da3-c5c9-4ce4-9ecc-35eb100dd56e', 'Candlestick Basics', $$Candlesticks tell you the story of buyers and sellers.

Big bullish candle = strong buying.
Big bearish candle = strong selling.
Long wicks = rejection.
Weak bodies = indecision.

If you learn to read candles, you can understand momentum and exhaustion without indicators$$, NULL, 9, '2025-12-06 15:17:06.050361+00', '2025-12-06 15:17:06.050361+00'),
('0e70c4e7-0b12-44fa-b81a-371093b05d6c', '23e99da3-c5c9-4ce4-9ecc-35eb100dd56e', 'What is Liquidity? Equal Highs & Lows', $$Liquidity is money in the market.

Banks hunt liquidity because that's where orders sit.
Equal highs and equal lows are perfect targets for liquidity grabs.
When you see them, expect a stop hunt, not a breakout.

Start thinking like smart money.$$, NULL, 10, '2025-12-06 15:26:47.301619+00', '2025-12-06 15:26:47.301619+00'),
('e1d9502a-4c27-457c-9635-ec140c652068', '23e99da3-c5c9-4ce4-9ecc-35eb100dd56e', 'How Stop Hunts Work', $$Stop hunts aren't accidents — they're intentional.

Price moves above a high or below a low, takes liquidity, then reverses.
This is the foundation of smart trading.

Stop hunts manipulate retail traders — but once you understand them, they become opportunities.$$, NULL, 11, '2025-12-06 15:30:35.237216+00', '2025-12-06 15:30:35.237216+00'),
('c468f784-bd56-4700-b298-22cf1594064e', '23e99da3-c5c9-4ce4-9ecc-35eb100dd56e', 'Imbalance & Fair Value Gaps', $$An imbalance is a fast move with no opposite candles.

Price usually comes back to fill the gap.

This gives you targets and entry zones.

Once you understand imbalance, entries become more accurate and logical.$$, NULL, 12, '2025-12-06 15:32:40.087871+00', '2025-12-06 15:32:40.087871+00'),
('8d788181-ea4d-40b2-9f91-6732f97debcb', '23e99da3-c5c9-4ce4-9ecc-35eb100dd56e', 'Order Block', $$An Order Block is the last opposite candle before a strong move.
It shows where big traders entered the market.
Price often returns to these zones before continuing.
This is a simple, beginner-friendly way to understand supply and demand.$$, NULL, 13, '2025-12-06 15:33:11.307873+00', '2025-12-06 15:33:11.307873+00'),
('010dd7a2-34e8-463b-9e74-f9f586c33bc7', '23e99da3-c5c9-4ce4-9ecc-35eb100dd56e', ' Breaker Block', $$A Breaker Block is formed when an order block fails and gets broken.

Instead of reacting like an Order Block, it becomes a strong continuation zone.

We only touch the basics here — in the intermediate level we go deeper into real breaker block setups.$$, NULL, 14, '2025-12-06 15:33:56.459692+00', '2025-12-06 15:33:56.459692+00'),
('4ef8a855-f4ca-4cc7-b0b9-5ec4aaeb6e3f', '23e99da3-c5c9-4ce4-9ecc-35eb100dd56e', 'introduction to JPY Pairs Personality', $$JPY pairs move faster and more aggressively than most pairs.

GBPJPY is the most volatile.

EURJPY is smoother.

USDJPY respects structure beautifully.

Each JPY pair has a personality — learning them helps you choose the pair that fits your style.$$, NULL, 15, '2025-12-06 15:34:56.63273+00', '2025-12-06 15:34:56.63273+00'),
('e0cafb03-c8a2-4b57-9a87-2fd1d40607dd', '23e99da3-c5c9-4ce4-9ecc-35eb100dd56e', 'Timeframes Explained', $$The higher timeframe shows the direction.

The lower timeframe shows the entry.

Never trade using only one timeframe.

A clean multi-timeframe approach removes confusion and gives you confidence.$$, NULL, 16, '2025-12-06 15:35:30.776078+00', '2025-12-06 15:35:30.776078+00'),
('af3883fd-07da-457e-aa38-a67516237603', '23e99da3-c5c9-4ce4-9ecc-35eb100dd56e', 'Session Timing for different Pairs', $$JPY pairs move the most during Tokyo and London overlap.
News in New York can cause big spikes.
Knowing session timing helps you predict when volatility will come.
Always trade when the market is alive, not dead.$$, NULL, 17, '2025-12-06 15:36:31.354828+00', '2025-12-06 15:36:31.354828+00'),
('7d3541b5-56a8-40af-bc75-4da54555bd46', '23e99da3-c5c9-4ce4-9ecc-35eb100dd56e', 'Risk Management Basics', $$Risk management keeps you alive.

Never risk more than 1–2% per trade.
Use stop losses always.

Your goal is to stay in the game long enough to grow.

A trader without risk management is gambling — not trading.$$, NULL, 18, '2025-12-06 15:37:06.780735+00', '2025-12-06 15:37:06.780735+00'),
('6714b620-aa12-4535-85ae-cec4fa85559b', '23e99da3-c5c9-4ce4-9ecc-35eb100dd56e', 'Beginner Journaling & Mindset', $$Journal every trade: the why, the entry, the exit, and the emotion.
Your journal teaches you more than any course.

Mindset is simple: stay disciplined, stay patient, and follow your plan.

Trading is not luck — it's repetition and self-control.$$, NULL, 19, '2025-12-06 15:37:40.635203+00', '2025-12-06 15:37:40.635203+00'),
('4ef9157c-9b0d-4bbd-a744-2bc2532c4d3d', '23e99da3-c5c9-4ce4-9ecc-35eb100dd56e', 'What is Forex? How Currency Pairs Work', $$Forex means foreign exchange — trading one currency for another.
Every pair has two parts: the base currency and the quote currency.
If EURJPY goes up, it means the euro is strengthening and the yen is weakening.
If it goes down, yen is getting stronger.
Your job as a trader is to predict(study) if price will go up or down based on market structure and liquidity.
That's all Forex really is. Don't overcomplicate it.$$, 'https://youtu.be/-bkHw0k4__A', 1, '2025-12-06 15:07:13.52668+00', '2025-12-10 08:50:48.576273+00'),
('2fc7d97c-3bf3-4ca3-83ae-d8f78f400a78', '23e99da3-c5c9-4ce4-9ecc-35eb100dd56e', 'What Moves the Forex Market?', $$Three main things move the Forex market:

Liquidity — banks move price to take money sitting above highs and below lows.

Sessions — different markets create different volatility.

News — economic announcements create sudden movement.
Understanding these three ideas will help you stop guessing and start reading the market logically.$$, 'https://youtu.be/ymxuuJPz4YU', 2, '2025-12-06 15:10:24.649624+00', '2025-12-11 10:11:39.749185+00'),
('be3e34f2-634c-4aa7-886c-54b13d3588b6', '23e99da3-c5c9-4ce4-9ecc-35eb100dd56e', 'Brokers, Spreads, Commissions & Leverage', $$	->Your broker gives you access to the market.

->Spreads are the small differences between buy and sell prices.
Commissions are fees per trade.

->Leverage allows you to control big positions with small balances, but high leverage can destroy accounts.
The goal as a trader is not to gamble — it's to control risk. Keep leverage safe.$$, 'https://youtu.be/pl7ysgRJFKM', 3, '2025-12-06 15:11:40.845234+00', '2025-12-26 14:46:47.488339+00'),
('f3fb8cc2-d398-4062-bd6b-114d0909e7b7', '23e99da3-c5c9-4ce4-9ecc-35eb100dd56e', 'How to Use TradingView Properly', $$In this lesson, I show you how to set up TradingView for clean trading.
A clean chart is a clear mind.

You only need:
— Candlesticks
— A few drawing tools
— A watchlist for your favorite pairs

No indicators. No extra noise.
We keep the chart simple so we can clearly see structure and liquidity.$$, 'https://youtu.be/VnRdfEGZJFM', 4, '2025-12-06 15:12:57.606569+00', '2026-01-25 06:39:46.498913+00'),
('a06e3b30-08c2-4625-8e8a-f5840b04bfbe', '23e99da3-c5c9-4ce4-9ecc-35eb100dd56e', 'Introduction to Forex ', $$Welcome to yunix. In this beginner level, I'm going to teach you everything you need before you start trading .

My goal is simple: by the end of this level, you will understand the basics clearly — market structure, sessions, liquidity, and how price actually moves.
We won't rush. We build step by step.
This lesson is just an introduction. Let's begin the journey$$, 'https://youtu.be/NdkeES8pAU0', 0, '2025-12-06 15:04:43.739424+00', '2025-12-09 09:40:02.504652+00');

-- Verify insertion
SELECT COUNT(*) as lessons_count FROM lessons;
