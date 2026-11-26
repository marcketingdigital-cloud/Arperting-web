-- ARPERTING CRM privado V5.0 · Ejecutar en Supabase SQL Editor.
-- Después de crear un usuario autorizado en Supabase Auth, añadirlo SOLO desde SQL Editor.
create extension if not exists pgcrypto;
create table if not exists public.arperting_staff (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'advisor' check(role in ('admin','advisor')),
  created_at timestamptz not null default now()
);
create table if not exists public.arperting_leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  name text not null check(char_length(name) between 2 and 80),
  email text,
  phone text,
  country text,
  profile text not null,
  goal text not null,
  channel text,
  challenge text,
  recommendation text,
  source text not null default 'website-diagnostic',
  utm_source text,
  privacy_accepted_at timestamptz not null,
  stage text not null default 'new' check(stage in ('new','qualified','proposal','won','lost')),
  priority text not null default 'medium' check(priority in ('low','medium','high')),
  next_action text,
  followup_at date,
  assigned_brand text not null default 'ARPETING' check(assigned_brand in ('ARPETING','7seven Creativo','Plátano View','GITOBIZZ')),
  notes text
);
create index if not exists arperting_leads_created_idx on public.arperting_leads(created_at desc);
create index if not exists arperting_leads_followup_idx on public.arperting_leads(followup_at);
create table if not exists public.arperting_lead_activity (
  id bigint generated always as identity primary key,
  lead_id uuid not null references public.arperting_leads(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  event text not null check(char_length(event) between 2 and 200),
  created_at timestamptz not null default now()
);
create index if not exists arperting_activity_lead_idx on public.arperting_lead_activity(lead_id,created_at desc);
alter table public.arperting_staff enable row level security;
alter table public.arperting_leads enable row level security;
alter table public.arperting_lead_activity enable row level security;
-- Función con owner seguro, no se utiliza user_metadata como señal de autorización.
create or replace function public.arperting_is_staff() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.arperting_staff where user_id = (select auth.uid()));
$$;
revoke all on function public.arperting_is_staff() from public;
grant execute on function public.arperting_is_staff() to authenticated;
revoke all on public.arperting_leads,public.arperting_staff,public.arperting_lead_activity from anon;
grant select on public.arperting_staff to authenticated;
grant select,update on public.arperting_leads to authenticated;
grant select,insert on public.arperting_lead_activity to authenticated;
drop policy if exists staff_self_read on public.arperting_staff;
create policy staff_self_read on public.arperting_staff for select to authenticated using(user_id=(select auth.uid()));
drop policy if exists lead_staff_read on public.arperting_leads;
create policy lead_staff_read on public.arperting_leads for select to authenticated using((select public.arperting_is_staff()));
drop policy if exists lead_staff_update on public.arperting_leads;
create policy lead_staff_update on public.arperting_leads for update to authenticated using((select public.arperting_is_staff())) with check((select public.arperting_is_staff()));
drop policy if exists activity_staff_read on public.arperting_lead_activity;
create policy activity_staff_read on public.arperting_lead_activity for select to authenticated using((select public.arperting_is_staff()));
drop policy if exists activity_staff_insert on public.arperting_lead_activity;
create policy activity_staff_insert on public.arperting_lead_activity for insert to authenticated with check((select public.arperting_is_staff()) and actor_id=(select auth.uid()));
-- No existe política pública INSERT en leads: solo la Edge Function inserta con clave de servidor.
-- Dar acceso únicamente a la cuenta autorizada. Reemplazar el correo y ejecutar UNA vez:
-- insert into public.arperting_staff(user_id,role)
-- select id,'admin' from auth.users where email='CORREO_AUTORIZADO@EJEMPLO.COM'
-- on conflict(user_id) do update set role='admin';
