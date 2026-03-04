-- ============================================
-- FitTrack Database Schema
-- Run this against your Supabase SQL editor
-- ============================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================
-- PROFILES
-- ============================================
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  email text not null,
  full_name text not null default '',
  avatar_url text,
  current_weight numeric,
  target_weight numeric,
  height numeric,
  age integer,
  gender text check (gender in ('male', 'female', 'other')),
  activity_level text check (activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')),
  weight_goal text check (weight_goal in ('lose', 'maintain', 'gain')),
  daily_calories_target integer,
  daily_protein_target integer,
  daily_carbs_target integer,
  daily_fat_target integer,
  daily_water_target integer,
  onboarding_completed boolean default false,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.profiles enable row level security;

create policy "Users can view own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.profiles for update
  using (auth.uid() = id);

create policy "Users can insert own profile"
  on public.profiles for insert
  with check (auth.uid() = id);

-- ============================================
-- MEALS
-- ============================================
create table if not exists public.meals (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')) default 'snack',
  input_method text check (input_method in ('barcode', 'photo', 'text', 'manual')) not null,
  photo_url text,
  calories numeric not null default 0,
  protein numeric not null default 0,
  carbs numeric not null default 0,
  fat numeric not null default 0,
  nutrition_details jsonb,
  logged_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.meals enable row level security;

create policy "Users can manage own meals"
  on public.meals for all
  using (auth.uid() = user_id);

create index idx_meals_user_date on public.meals (user_id, logged_at);

-- ============================================
-- EXERCISES
-- ============================================
create table if not exists public.exercises (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  name text not null,
  description text,
  exercise_type text not null,
  duration_minutes integer not null default 0,
  calories_burned numeric not null default 0,
  details jsonb,
  logged_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.exercises enable row level security;

create policy "Users can manage own exercises"
  on public.exercises for all
  using (auth.uid() = user_id);

create index idx_exercises_user_date on public.exercises (user_id, logged_at);

-- ============================================
-- WATER LOGS
-- ============================================
create table if not exists public.water_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  amount_ml integer not null,
  logged_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.water_logs enable row level security;

create policy "Users can manage own water logs"
  on public.water_logs for all
  using (auth.uid() = user_id);

create index idx_water_user_date on public.water_logs (user_id, logged_at);

-- ============================================
-- WEIGHT LOGS
-- ============================================
create table if not exists public.weight_logs (
  id uuid default uuid_generate_v4() primary key,
  user_id uuid references public.profiles(id) on delete cascade not null,
  weight numeric not null,
  logged_at timestamptz default now(),
  created_at timestamptz default now()
);

alter table public.weight_logs enable row level security;

create policy "Users can manage own weight logs"
  on public.weight_logs for all
  using (auth.uid() = user_id);

create index idx_weight_user_date on public.weight_logs (user_id, logged_at);

-- ============================================
-- FRIENDSHIPS
-- ============================================
create table if not exists public.friendships (
  id uuid default uuid_generate_v4() primary key,
  requester_id uuid references public.profiles(id) on delete cascade not null,
  addressee_id uuid references public.profiles(id) on delete cascade not null,
  status text check (status in ('pending', 'accepted', 'rejected')) default 'pending',
  created_at timestamptz default now(),
  unique (requester_id, addressee_id)
);

alter table public.friendships enable row level security;

create policy "Users can view own friendships"
  on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

create policy "Users can create friendship requests"
  on public.friendships for insert
  with check (auth.uid() = requester_id);

create policy "Users can update friendships they're part of"
  on public.friendships for update
  using (auth.uid() = addressee_id or auth.uid() = requester_id);

create policy "Users can delete own friendships"
  on public.friendships for delete
  using (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Now that friendships exists, add the profile policy that references it
create policy "Users can view friend profiles"
  on public.profiles for select
  using (
    exists (
      select 1 from public.friendships
      where status = 'accepted'
        and (requester_id = auth.uid() and addressee_id = profiles.id
          or addressee_id = auth.uid() and requester_id = profiles.id)
    )
  );

-- ============================================
-- FUNCTIONS
-- ============================================

-- Auto-update updated_at on profiles
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_profile_updated
  before update on public.profiles
  for each row execute function public.handle_updated_at();

-- Create profile on signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', '')
  );
  return new;
end;
$$ language plpgsql security definer;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================
-- STORAGE BUCKET for meal photos
-- ============================================
insert into storage.buckets (id, name, public)
values ('meal-photos', 'meal-photos', true)
on conflict do nothing;

create policy "Users can upload meal photos"
  on storage.objects for insert
  with check (bucket_id = 'meal-photos' and auth.uid()::text = (storage.foldername(name))[1]);

create policy "Anyone can view meal photos"
  on storage.objects for select
  using (bucket_id = 'meal-photos');
