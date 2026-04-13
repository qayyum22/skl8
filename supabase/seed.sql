-- skl8 seed data for Supabase
-- Run after supabase/schema.sql in the Supabase SQL editor.
-- Demo users created here all use the password: Password123!

create extension if not exists pgcrypto;

-- Demo auth users
insert into auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  invited_at,
  confirmation_token,
  confirmation_sent_at,
  recovery_token,
  recovery_sent_at,
  email_change_token_new,
  email_change,
  email_change_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at
)
values
  (
    '00000000-0000-0000-0000-000000000000',
    '11111111-1111-1111-1111-111111111111',
    'authenticated',
    'authenticated',
    'ava.learner@skl8.demo',
    crypt('Password123!', gen_salt('bf')),
    now(),
    null,
    '',
    null,
    '',
    null,
    '',
    '',
    null,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Ava Learner"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '22222222-2222-2222-2222-222222222222',
    'authenticated',
    'authenticated',
    'jordan.agent@skl8.demo',
    crypt('Password123!', gen_salt('bf')),
    now(),
    null,
    '',
    null,
    '',
    null,
    '',
    '',
    null,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Jordan Support"}',
    now(),
    now()
  ),
  (
    '00000000-0000-0000-0000-000000000000',
    '33333333-3333-3333-3333-333333333333',
    'authenticated',
    'authenticated',
    'priya.admin@skl8.demo',
    crypt('Password123!', gen_salt('bf')),
    now(),
    null,
    '',
    null,
    '',
    null,
    '',
    '',
    null,
    now(),
    '{"provider":"email","providers":["email"]}',
    '{"full_name":"Priya Admin"}',
    now(),
    now()
  )
on conflict (id) do update
set
  email = excluded.email,
  encrypted_password = excluded.encrypted_password,
  raw_app_meta_data = excluded.raw_app_meta_data,
  raw_user_meta_data = excluded.raw_user_meta_data,
  updated_at = now();

insert into auth.identities (
  provider_id,
  user_id,
  identity_data,
  provider,
  last_sign_in_at,
  created_at,
  updated_at,
  id
)
values
  (
    'ava.learner@skl8.demo',
    '11111111-1111-1111-1111-111111111111',
    format('{"sub":"%s","email":"%s"}', '11111111-1111-1111-1111-111111111111', 'ava.learner@skl8.demo')::jsonb,
    'email',
    now(),
    now(),
    now(),
    '44444444-4444-4444-4444-444444444441'
  ),
  (
    'jordan.agent@skl8.demo',
    '22222222-2222-2222-2222-222222222222',
    format('{"sub":"%s","email":"%s"}', '22222222-2222-2222-2222-222222222222', 'jordan.agent@skl8.demo')::jsonb,
    'email',
    now(),
    now(),
    now(),
    '44444444-4444-4444-4444-444444444442'
  ),
  (
    'priya.admin@skl8.demo',
    '33333333-3333-3333-3333-333333333333',
    format('{"sub":"%s","email":"%s"}', '33333333-3333-3333-3333-333333333333', 'priya.admin@skl8.demo')::jsonb,
    'email',
    now(),
    now(),
    now(),
    '44444444-4444-4444-4444-444444444443'
  )
on conflict (provider_id, provider) do update
set
  identity_data = excluded.identity_data,
  updated_at = now();

-- Ensure roles and names are correct in public.profiles
insert into public.profiles (id, full_name, role, created_at, updated_at)
values
  ('11111111-1111-1111-1111-111111111111', 'Ava Learner', 'customer', now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'Jordan Support', 'agent', now(), now()),
  ('33333333-3333-3333-3333-333333333333', 'Priya Admin', 'admin', now(), now())
on conflict (id) do update
set
  full_name = excluded.full_name,
  role = excluded.role,
  updated_at = now();

insert into public.learner_profiles (
  owner_user_id,
  student_id,
  email,
  learner_name,
  program_name,
  course_name,
  batch_id,
  batch_name,
  portal_status,
  current_term,
  mentor_name,
  application_id,
  enrollment_status,
  start_date,
  orientation_date,
  course_access_status,
  live_class_link_status,
  next_session,
  timings,
  certificate_email
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'SKL8-1042',
    'ava.learner@skl8.demo',
    'Ava Learner',
    'Data Analytics Pro',
    'Data Analytics Pro',
    'BATCH-DA-PRO-04',
    'DA-PRO Weekend Apr 2026',
    'Active',
    'Spring 2026',
    'Riya Menon',
    'APP-DA-2026-001',
    'Batch assigned',
    date '2026-04-22',
    date '2026-04-19',
    'Published',
    'Published',
    '2026-04-20 19:00 IST - SQL Foundations',
    'Sat, Sun | 10:00 AM - 1:00 PM',
    'ava.learner@skl8.demo'
  )
on conflict (student_id) do update
set
  email = excluded.email,
  learner_name = excluded.learner_name,
  program_name = excluded.program_name,
  course_name = excluded.course_name,
  batch_id = excluded.batch_id,
  batch_name = excluded.batch_name,
  portal_status = excluded.portal_status,
  current_term = excluded.current_term,
  mentor_name = excluded.mentor_name,
  application_id = excluded.application_id,
  enrollment_status = excluded.enrollment_status,
  start_date = excluded.start_date,
  orientation_date = excluded.orientation_date,
  course_access_status = excluded.course_access_status,
  live_class_link_status = excluded.live_class_link_status,
  next_session = excluded.next_session,
  timings = excluded.timings,
  certificate_email = excluded.certificate_email,
  updated_at = now();

-- Demo support cases owned by the learner profile
insert into public.support_sessions (
  id,
  owner_user_id,
  owner_role,
  title,
  messages,
  agent_case,
  satisfaction,
  created_at,
  updated_at
)
values
  (
    'seed-login',
    '11111111-1111-1111-1111-111111111111',
    'customer',
    'Cannot access learner portal after password reset',
    jsonb_build_array(
      jsonb_build_object('id','m1','role','assistant','content','Hello! I can help with portal and LMS issues. What seems to be happening?','timestamp',(now() - interval '180 minutes')),
      jsonb_build_object('id','m2','role','user','content','I reset my password but I still cannot access my learner portal for the Data Analytics bootcamp.','timestamp',(now() - interval '177 minutes')),
      jsonb_build_object('id','m3','role','assistant','content','I am checking your access profile and LMS troubleshooting options now.','timestamp',(now() - interval '175 minutes')),
      jsonb_build_object('id','m4','role','assistant','content','I can confirm your enrollment is active. Please try signing in again in an incognito window. If it still fails, I can escalate it.','timestamp',(now() - interval '170 minutes')),
      jsonb_build_object('id','m5','role','user','content','It still fails and class starts tonight.','timestamp',(now() - interval '165 minutes'))
    ),
    jsonb_build_object(
      'category','login_access',
      'severity','urgent',
      'status','working',
      'summary','Learner locked out of portal after password reset before class start.',
      'assignedTo','Jordan Support',
      'resolutionNotes','Waiting on LMS admin to unlock SSO account before 7 PM class.',
      'requiresHuman',true,
      'escalated',true,
      'customerSentiment','frustrated',
      'firstResponseAt',(now() - interval '175 minutes'),
      'lastUpdated',(now() - interval '35 minutes')
    ),
    3.0,
    now() - interval '180 minutes',
    now() - interval '35 minutes'
  ),
  (
    'seed-fee',
    '11111111-1111-1111-1111-111111111111',
    'customer',
    'Payment deducted but fee not reflected',
    jsonb_build_array(
      jsonb_build_object('id','f1','role','assistant','content','Hello! I can help with fee receipts and payment issues.','timestamp',(now() - interval '420 minutes')),
      jsonb_build_object('id','f2','role','user','content','My installment payment was deducted but it is still showing unpaid in the portal.','timestamp',(now() - interval '415 minutes')),
      jsonb_build_object('id','f3','role','assistant','content','I have logged your payment issue with finance and shared the expected review window.','timestamp',(now() - interval '405 minutes')),
      jsonb_build_object('id','f4','role','assistant','content','Finance confirmed the payment and updated your invoice status. Your receipt is now available.','timestamp',(now() - interval '110 minutes'),'rating',5)
    ),
    jsonb_build_object(
      'category','fees',
      'severity','high',
      'status','resolved',
      'summary','Payment deducted but installment remained unpaid until finance reconciliation.',
      'assignedTo','Priya Support',
      'resolutionNotes','Resolved after finance mapped UPI reference to invoice INV-401.',
      'requiresHuman',true,
      'escalated',true,
      'customerSentiment','concerned',
      'firstResponseAt',(now() - interval '405 minutes'),
      'resolvedAt',(now() - interval '110 minutes'),
      'lastUpdated',(now() - interval '110 minutes')
    ),
    5.0,
    now() - interval '420 minutes',
    now() - interval '90 minutes'
  ),
  (
    'seed-certificate',
    '11111111-1111-1111-1111-111111111111',
    'customer',
    'Need internship letter before employer deadline',
    jsonb_build_array(
      jsonb_build_object('id','c1','role','assistant','content','Hello! I can help with completion letters and certificate requests.','timestamp',(now() - interval '260 minutes')),
      jsonb_build_object('id','c2','role','user','content','I need my internship letter emailed today for an employer submission deadline.','timestamp',(now() - interval '255 minutes')),
      jsonb_build_object('id','c3','role','assistant','content','I have prepared the request and escalated it with urgent priority for the learner success desk.','timestamp',(now() - interval '250 minutes'))
    ),
    jsonb_build_object(
      'category','certificate',
      'severity','urgent',
      'status','waiting',
      'summary','Urgent internship letter requested for same-day employer submission.',
      'assignedTo','Omar Support',
      'resolutionNotes','Awaiting program lead approval for internship letter wording.',
      'requiresHuman',true,
      'escalated',true,
      'customerSentiment','concerned',
      'firstResponseAt',(now() - interval '250 minutes'),
      'lastUpdated',(now() - interval '50 minutes')
    ),
    null,
    now() - interval '260 minutes',
    now() - interval '50 minutes'
  ),
  (
    'seed-schedule',
    '11111111-1111-1111-1111-111111111111',
    'customer',
    'Need weekend batch timetable',
    jsonb_build_array(
      jsonb_build_object('id','s1','role','assistant','content','Hello! I can help with your batch schedule and upcoming sessions.','timestamp',(now() - interval '80 minutes')),
      jsonb_build_object('id','s2','role','user','content','Please share the weekend batch timetable for Full Stack Development.','timestamp',(now() - interval '75 minutes')),
      jsonb_build_object('id','s3','role','assistant','content','I found your batch schedule and next live session timing.','timestamp',(now() - interval '72 minutes'),'rating',4)
    ),
    jsonb_build_object(
      'category','schedule',
      'severity','low',
      'status','resolved',
      'summary','Learner requested weekend batch timetable and next live session timing.',
      'assignedTo','You',
      'resolutionNotes','Shared Sat-Sun 10 AM to 1 PM schedule and mentor contact.',
      'requiresHuman',false,
      'escalated',false,
      'customerSentiment','calm',
      'firstResponseAt',(now() - interval '72 minutes'),
      'resolvedAt',(now() - interval '72 minutes'),
      'lastUpdated',(now() - interval '22 minutes')
    ),
    4.0,
    now() - interval '80 minutes',
    now() - interval '22 minutes'
  )
on conflict (id) do update
set
  owner_user_id = excluded.owner_user_id,
  owner_role = excluded.owner_role,
  title = excluded.title,
  messages = excluded.messages,
  agent_case = excluded.agent_case,
  satisfaction = excluded.satisfaction,
  updated_at = excluded.updated_at;


insert into public.payment_verification_records (
  owner_user_id,
  learner_id,
  learner_name,
  program_name,
  invoice_id,
  payment_reference,
  amount,
  payment_date,
  status,
  next_step
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'SKL8-1042',
    'Ava Learner',
    'Data Analytics Pro',
    'INV-24018',
    'UPI23947290',
    12500.00,
    date '2026-04-02',
    'Payment received, ledger sync pending',
    'Finance can reconcile this payment to your learner account.'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'SKL8-1042',
    'Ava Learner',
    'Data Analytics Pro',
    'INV-24022',
    'UPI23947771',
    12500.00,
    date '2026-04-07',
    'Payment settled and receipt eligible',
    'Finance can generate and send the receipt after confirmation.'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'SKL8-1042',
    'Ava Learner',
    'Data Analytics Pro',
    'INV-24031',
    'UPI23948901',
    12500.00,
    date '2026-04-08',
    'Two matching transactions found',
    'Finance will compare both transactions before issuing a refund update.'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'SKL8-1042',
    'Ava Learner',
    'Data Analytics Pro',
    'INV-24039',
    'UPI23949055',
    12500.00,
    date '2026-04-09',
    'Gateway hold detected',
    'Finance will confirm whether the hold auto-reverses or needs manual review.'
  )
on conflict (learner_id, invoice_id, payment_reference) do update
set
  learner_name = excluded.learner_name,
  program_name = excluded.program_name,
  amount = excluded.amount,
  payment_date = excluded.payment_date,
  status = excluded.status,
  next_step = excluded.next_step,
  updated_at = now();

insert into public.certificate_request_records (
  owner_user_id,
  student_id,
  learner_name,
  program_name,
  certificate_type,
  delivery_method,
  status,
  turnaround_time,
  created_at,
  updated_at
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'SKL8-1042',
    'Ava Learner',
    'Data Analytics Pro',
    'internship',
    'email',
    'queued',
    '2 business days',
    now() - interval '2 days',
    now() - interval '2 days'
  ),
  (
    '11111111-1111-1111-1111-111111111111',
    'SKL8-1042',
    'Ava Learner',
    'Data Analytics Pro',
    'completion',
    'portal_download',
    'fulfilled',
    '2 business days',
    now() - interval '10 days',
    now() - interval '8 days'
  );

insert into public.support_escalations (
  owner_user_id,
  reason,
  priority,
  summary,
  assigned_team,
  estimated_wait,
  status,
  created_at,
  updated_at
)
values
  (
    '11111111-1111-1111-1111-111111111111',
    'Learner still blocked after login troubleshooting.',
    'high',
    'Portal login still failing after reset and private-window retry.',
    'Learner success desk',
    '20 minutes',
    'open',
    now() - interval '1 day',
    now() - interval '1 day'
  );
