-- Игра в жизнь: база для аккаунтов, облачного сохранения и подписки.
-- Выполнить один раз: Supabase → SQL Editor → New query → вставить всё → Run.

-- Профиль: пробный период и оплаченный доступ
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  created_at timestamptz not null default now(),
  trial_until timestamptz not null default now() + interval '7 days',
  premium_until timestamptz
);

-- Сохранение прогресса: одна запись на пользователя
create table if not exists public.saves (
  user_id uuid primary key references auth.users on delete cascade,
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
alter table public.saves enable row level security;

-- Доступ только для вошедших пользователей (какие строки видны — решают политики ниже)
grant usage on schema public to authenticated;
grant select, insert, update on public.saves to authenticated;
grant select on public.profiles to authenticated;

-- Профиль можно только читать. Менять подписку может только сервер (обработчик оплаты).
drop policy if exists "profile: read own" on public.profiles;
create policy "profile: read own" on public.profiles
  for select using (auth.uid() = id);

-- Сохранение: каждый видит и меняет только своё
drop policy if exists "save: read own" on public.saves;
create policy "save: read own" on public.saves
  for select using (auth.uid() = user_id);
drop policy if exists "save: insert own" on public.saves;
create policy "save: insert own" on public.saves
  for insert with check (auth.uid() = user_id);
drop policy if exists "save: update own" on public.saves;
create policy "save: update own" on public.saves
  for update using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Профиль создаётся автоматически при регистрации
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id) values (new.id) on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
