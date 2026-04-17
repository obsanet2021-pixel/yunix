# Phase 2 Migration Plan: Business Data

## Overview
Migrate core business data from old Supabase project to new project.

## Business Data Tables Identified

### Core Trading Data
- **prop_firms** (38 records) - User trading accounts
- **account_cycles** - Account cycle tracking
- **account_snapshots** - Account balance snapshots
- **portfolio_snapshots** - Portfolio tracking
- **open_positions** - Open trading positions

### Educational Content
- **courses** (13 records) - Educational courses
- **lessons** (139 records) - Course lessons

### Certificates & Rewards
- **certificates** (10 records) - User certificates
- **final_certificates** - Final certificates
- **prop_firm_certificate_sizes** - Certificate size configs

### Referral System
- **referrals** (empty) - Referral tracking
- **referral_links** - Referral links
- **partner_rewards** - Partner reward tracking
- **loyalty_progress** - Loyalty program data

### Payments & Orders
- **payouts** - Payout records
- **plaque_orders** - Plaque orders
- **plaque_payments** - Plaque payments
- **plaque_prices** - Plaque pricing
- **discount_codes** (2 records) - Discount codes
- **discount_rules** - Discount rules

### Communication
- **chat_conversations** - Chat conversations
- **chat_messages** - Chat messages
- **support_messages** - Support messages
- **support_templates** - Support templates
- **support_group_config** - Support configuration
- **telegram_broadcasts** - Telegram broadcasts
- **telegram_message_logs** - Telegram message logs
- **user_notifications** - User notifications

### Configuration & Logs
- **admin_audit_logs** - Admin activity logs
- **bridge_activity_logs** - Bridge activity logs
- **bridge_user_settings** - Bridge user settings
- **ceo_telegram_config** - CEO Telegram config
- **daily_checkins** - Daily checkins
- **delivery_bot_agents** - Delivery bot agents
- **delivery_pricing** - Delivery pricing
- **mt5_bridge_config** - MT5 bridge config
- **order_status_history** - Order status history
- **password_reset_otps** - Password reset OTPs
- **staff_reminders** - Staff reminders
- **student_progress** - Student progress tracking
- **social_media_posts** - Social media posts

## Migration Order (Based on Dependencies)

### Group 1: Configuration & Reference Tables (No dependencies)
1. discount_codes
2. discount_rules
3. plaque_prices
4. prop_firm_certificate_sizes
5. delivery_pricing
6. mt5_bridge_config
7. ceo_telegram_config
8. support_group_config
9. support_templates
10. delivery_bot_agents

### Group 2: Core Business Data (Depends on profiles)
11. prop_firms (depends on profiles.id)
12. courses (depends on profiles.id for author)
13. referral_links (depends on profiles.id)

### Group 3: Dependent Business Data (Depends on Group 2)
14. lessons (depends on courses.id)
15. certificates (depends on profiles.id and prop_firms.id)
16. final_certificates (depends on profiles.id)
17. account_cycles (depends on prop_firms.id)
18. account_snapshots (depends on prop_firms.id)
19. portfolio_snapshots (depends on profiles.id)
20. open_positions (depends on prop_firms.id)

### Group 4: Transactional Data (Depends on Groups 1-3)
21. referrals (depends on profiles.id and referral_links.id)
22. partner_rewards (depends on profiles.id)
23. loyalty_progress (depends on profiles.id)
24. payouts (depends on profiles.id)
25. plaque_orders (depends on profiles.id)
26. plaque_payments (depends on plaque_orders.id)
27. student_progress (depends on profiles.id and courses.id)

### Group 5: Communication & Logs (Optional - can be skipped)
28. chat_conversations
29. chat_messages
30. support_messages
31. user_notifications
32. telegram_broadcasts
33. telegram_message_logs
34. admin_audit_logs
35. bridge_activity_logs
36. bridge_user_settings
37. daily_checkins
38. order_status_history
39. password_reset_otps
40. staff_reminders
41. social_media_posts

## Important Notes

### Foreign Key Issues to Handle
- **CEO user ID mismatch**: Already fixed in Phase 1 (729edbb5-3a37-4b62-b20b-2480dc5c7b2a → ec850929-598f-41b3-a23c-7f0ceb464b8c)
- **Storage URLs**: All file URLs point to old Supabase project (bduwtkejrfmcggfwniqe) - will need to be updated in Phase 3

### Tables to Consider Skipping
- **password_reset_otps** - Temporary data, not needed
- **admin_audit_logs** - Historical logs, can skip
- **bridge_activity_logs** - Historical logs, can skip
- **daily_checkins** - Historical data, can skip

### Priority Migration
Focus on Groups 1-4 first as these contain core business data. Group 5 (logs) can be skipped or migrated later.
