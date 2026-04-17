-- Phase 1 Migration: Profiles
-- Run this in Supabase SQL Editor AFTER admin_roles migration
-- This imports profiles from the exported CSV

-- Clear existing profiles (optional - uncomment if needed)
-- TRUNCATE TABLE profiles CASCADE;

INSERT INTO profiles (id, email, name, bio, avatar_url, created_at, updated_at, account_type, telegram_chat_id, telegram_link_code, telegram_linked_at) VALUES
('2f15ae12-6c00-4c2b-8431-2e8b99d76da9', 'aymensuleyman25@gmail.com', 'aymensuleyman25', NULL, NULL, '2025-11-01 10:57:28.856275+00', '2025-11-01 10:57:28.856275+00', 'Personal', NULL, NULL, NULL),
('fa1e9f3d-cd42-48ca-9741-6b43051a6ed6', 'awel5652@gmail.com', 'awel5652', NULL, NULL, '2025-11-03 04:52:39.310591+00', '2025-11-03 04:52:39.310591+00', 'Personal', NULL, NULL, NULL),
('1f7fa447-51c8-4c38-a477-2d9811dacf8d', 'ezedinwasfe@gmail.com', 'ezedinwasfe', NULL, NULL, '2025-11-03 05:05:47.934785+00', '2025-11-03 05:05:47.934785+00', 'Personal', NULL, NULL, NULL),
('df7d2ccb-c209-4cc6-bb4a-37a728ece9a0', 'mohamedmohamedmifta@gmail.com', 'mohamedmohamedmifta', NULL, NULL, '2025-11-03 14:00:56.024401+00', '2025-11-03 14:00:56.024401+00', 'Personal', NULL, NULL, NULL),
('6d0296ea-6afb-42e5-b4a5-e38c7ff401e8', 'abduzte@gmail.com', 'abduzte', NULL, NULL, '2025-11-03 15:49:06.855207+00', '2025-11-03 15:49:06.855207+00', 'Personal', NULL, NULL, NULL),
('504c9700-89ef-4c93-a627-c4d774bb4e77', 'ezujuniorzizu@gmail.com', 'ezujuniorzizu', NULL, NULL, '2025-11-09 06:34:28.010547+00', '2025-11-09 06:34:28.010547+00', 'Personal', NULL, NULL, NULL),
('4d701042-b3d7-4804-890c-96f21e26761f', 'zashzash59@gmail.com', 'zashzash59', NULL, NULL, '2025-11-11 13:31:19.262365+00', '2025-11-11 13:31:19.262365+00', 'Personal', NULL, NULL, NULL),
('2f13d10f-99e8-403b-9ef5-85b6935435fd', 'oumernet@gmail.com', 'oumernet', NULL, NULL, '2025-11-15 14:25:54.655444+00', '2025-11-15 14:25:54.655444+00', 'Personal', NULL, NULL, NULL),
('f800a31b-7574-4565-8b04-93ca452b3e31', 'abcreative1223@gmail.com', 'abcreative1223', NULL, NULL, '2025-11-26 18:50:08.017441+00', '2025-11-26 18:50:08.017441+00', 'Personal', NULL, NULL, NULL),
('e175a88c-5a5a-4fca-b7ae-942ef889ca62', 'huneyifa@gmail.com', 'huneyifa', NULL, NULL, '2025-12-02 18:23:27.725138+00', '2025-12-28 12:24:56.395831+00', 'Personal', '5766666449', NULL, '2025-12-28 12:24:56.336+00'),
('d4012bc2-1082-4968-a8d3-bc8879727d4e', 'monksquad2025@gmail.com', 'monksquad2025', NULL, NULL, '2025-12-04 10:32:53.961257+00', '2025-12-04 10:32:53.961257+00', 'Personal', NULL, NULL, NULL),
('75e66d44-e6cc-481f-b070-17e419d25c58', 'abdusquad33@gmail.com', 'abdusquad33', NULL, NULL, '2025-12-05 03:24:28.99416+00', '2025-12-05 03:24:28.99416+00', 'Personal', NULL, NULL, NULL),
('47cc4b90-3142-4176-a81f-86bb6e284d1a', 'nasserahmed2013@gmail.com', 'nasserahmed2013', NULL, NULL, '2025-12-05 04:41:19.747478+00', '2025-12-05 04:41:19.747478+00', 'Personal', NULL, NULL, NULL),
('c7065f46-338d-43ef-9e42-bf920a8ea11d', 'bemnet792@gmail.com', 'bemnet792', NULL, NULL, '2025-12-05 13:52:44.190017+00', '2025-12-05 13:52:44.190017+00', 'Personal', NULL, NULL, NULL),
('4453cd26-25d0-4b4c-9da1-95e8acee5ce1', 'akhidiniyas@gmail.com', 'akhidiniyas', NULL, NULL, '2025-12-07 16:28:53.050505+00', '2025-12-07 16:28:53.050505+00', 'Personal', NULL, NULL, NULL),
('5ee0cce9-799b-4504-8382-a3d2b2556855', 'fbiabdurohman26@gmail.com', 'ABDUROHMAN SEID', NULL, NULL, '2025-12-29 14:32:25.797463+00', '2025-12-29 14:32:25.797463+00', 'Personal', NULL, NULL, NULL),
('fc1a20a7-df28-4a2a-b16c-f5adf45f1291', 'nuredinabdisa596@gmail.com', 'nuredinabdisa596', NULL, NULL, '2025-12-01 15:02:35.283989+00', '2026-01-01 20:13:33.401725+00', 'Personal', '5270023907', NULL, '2026-01-01 20:13:33.352+00'),
('5aeab45b-e0c6-494e-b930-96f39cec2f6a', 'mm2306131@gmail.com', 'mm2306131', NULL, NULL, '2025-12-10 11:35:39.157324+00', '2025-12-10 11:35:39.157324+00', 'Personal', NULL, NULL, NULL),
('12ea244c-efbe-4c2c-9c66-2c938d7d55bd', 'imutiy1997@gmail.com', 'imu j', NULL, NULL, '2026-02-05 06:43:56.996095+00', '2026-02-05 06:43:56.996095+00', 'Personal', NULL, NULL, NULL),
('729edbb5-3a37-4b62-b20b-2480dc5c7b2a', 'obsanet2021@gmail.com', 'YUNIX CEO', NULL, 'https://bduwtkejrfmcggfwniqe.supabase.co/storage/v1/object/public/certificates/avatars/729edbb5-3a37-4b62-b20b-2480dc5c7b2a-0.48056495984395653.jpg', '2025-12-18 11:06:50.083497+00', '2026-03-16 09:01:17.597845+00', 'Personal', '5543308273', NULL, '2025-12-18 15:35:39.454+00'),
('da5d1704-1fa9-4270-9a7e-a77d8b9efb5e', 'mirafyohannes21@gmail.com', 'Jo Eee', NULL, NULL, '2026-04-13 18:31:12.871965+00', '2026-04-13 18:31:12.871965+00', 'Personal', NULL, NULL, NULL),
('df29fd2b-f8b3-4bc0-890f-a4f62208c03a', 'hailabdawit134@gmail.com', 'hailabdawit134', NULL, NULL, '2025-12-18 03:52:55.242935+00', '2025-12-18 04:04:30.388358+00', 'Personal', NULL, NULL, NULL),
('e8fd3f47-f082-479d-b70f-c1f793ff91c8', 'aawel630@gmail.com', 'aawel630', NULL, NULL, '2025-11-04 14:24:08.683339+00', '2025-12-18 14:49:47.910206+00', 'Personal', '1006447588', NULL, '2025-12-18 14:49:47.875+00'),
('04ca1cda-0f56-4482-bfef-02e1a3445370', 'muhew1100@gmail.com', 'Md Snip', NULL, NULL, '2026-04-13 19:18:55.900807+00', '2026-04-13 19:19:07.979206+00', 'Personal', '7044126786', NULL, '2026-04-13 19:19:07.943+00'),
('616f2a58-669b-4c40-822e-adfef7058906', 'roythegentalman@gmail.com', 'roythegentalman', NULL, NULL, '2025-12-01 14:50:38.400126+00', '2025-12-18 15:19:32.912539+00', 'Personal', '1373141959', NULL, '2025-12-18 15:19:32.88+00'),
('18500679-9563-4266-bbd5-a14d1306147a', 'obsnet2021@gmail.com', 'obsnet2021', NULL, NULL, '2025-12-03 02:20:35.185921+00', '2025-12-18 15:51:16.883202+00', 'Personal', '6540671391', NULL, '2025-12-18 15:51:16.855+00'),
('0a0c8b07-dfb8-4ad1-a62f-f2cf50cb03b6', 'top100gmom@gmail.com', 'top100gmom', NULL, NULL, '2025-12-01 16:56:23.181516+00', '2025-12-18 16:55:26.869929+00', 'Personal', '7351539477', NULL, '2025-12-18 16:55:26.837+00'),
('4ab475bf-af84-4668-ae7a-08da6a4022b1', 'salihzeynu1@gmail.com', 'Al-shebab', NULL, NULL, '2025-12-05 11:35:49.795323+00', '2025-12-18 18:26:31.894609+00', 'Personal', '8092569844', NULL, '2025-12-18 18:26:31.864+00'),
('40a60634-cc05-4f0f-a502-748eee45c314', 'remadanmohammed5@gmail.com', 'remadanmohammed5', NULL, NULL, '2025-12-04 10:27:24.463948+00', '2025-12-19 06:56:02.75349+00', 'Personal', '1903391934', NULL, '2025-12-19 06:56:02.658+00'),
('8ce5b5c6-e0fc-4f31-80a3-db588576718f', 'proahm4da@gmail.com', 'proahm4da', NULL, NULL, '2025-12-01 14:48:21.327481+00', '2025-12-19 10:44:49.948522+00', 'Personal', '2098982047', NULL, '2025-12-19 10:44:49.885+00'),
('9db1f01a-5a1d-4cbe-a9f2-2a1603546a25', 'mahikiya9@gmail.com', 'Sebri Mehadi', NULL, NULL, '2025-12-20 04:36:28.069538+00', '2025-12-20 04:36:28.069538+00', 'Personal', NULL, NULL, NULL),
('b90b7142-fbab-4250-bead-a7781b769b56', 'mehadisiham@gmail.com', 'Siham Mehadi', NULL, NULL, '2025-12-20 09:18:27.040155+00', '2025-12-20 09:25:19.861536+00', 'Personal', '7357498085', NULL, '2025-12-20 09:25:19.801+00'),
('24984dc4-fcf2-4511-ba4e-9faa5a745823', 'ihaydar086@gmail.com', 'Sumeya oumer', NULL, NULL, '2025-12-20 17:55:04.3313+00', '2025-12-20 17:55:29.389556+00', 'Personal', '6260208282', NULL, '2025-12-20 17:55:29.352+00'),
('2fb21c8d-bd25-44b3-9261-b18b899d1e3c', 'natayafe23@gmail.com', 'Natan Tesfaye', NULL, NULL, '2025-12-21 10:35:08.190332+00', '2025-12-21 10:35:08.190332+00', 'Personal', NULL, NULL, NULL),
('58beeaf5-8028-48b8-996f-45085b85b34e', 'alicreative.891@gmail.com', 'alicreative.891', NULL, NULL, '2025-12-04 11:00:55.279793+00', '2025-12-21 15:18:09.043289+00', 'Personal', '6281817557', NULL, '2025-12-21 15:18:08.99+00'),
('d03c351c-765d-417b-b19e-f03e74024411', 'fanutare2@gmail.com', 'Fanuel', NULL, NULL, '2025-12-17 07:13:39.816904+00', '2025-12-24 08:22:45.186922+00', 'Personal', '1622390109', NULL, '2025-12-24 08:22:45.161+00'),
('4e1a3fa6-2d1c-423e-a6c8-feca51061c00', 'amarmunir40@gmail.com', 'Amar Munir', NULL, NULL, '2026-04-13 20:08:26.696513+00', '2026-04-13 20:08:53.930225+00', 'Personal', '8016485653', NULL, '2026-04-13 20:08:53.903+00'),
('4c4a651f-12e0-4a4f-b8ef-a71a940e749c', 'yasernaser232@gmail.com', 'Yaser Naser', NULL, NULL, '2026-04-13 21:24:12.895616+00', '2026-04-13 21:24:12.895616+00', 'Personal', NULL, NULL, NULL),
('0e2592fc-b364-4274-8dd7-d1c5533f17fe', 'kztrade990@gmail.com', 'Vv Nova', NULL, NULL, '2026-04-14 04:53:59.278585+00', '2026-04-14 04:53:59.278585+00', 'Personal', NULL, NULL, NULL);
