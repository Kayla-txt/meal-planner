create table public.meal_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_name text not null check (char_length(trim(meal_name)) > 0),
  meal_date date not null default current_date,
  meal_type text check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index meal_history_user_date_idx
  on public.meal_history (user_id, meal_date desc);

alter table public.meal_history enable row level security;

create policy "Users can view their own meal history"
  on public.meal_history for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can add their own meals"
  on public.meal_history for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own meals"
  on public.meal_history for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own meals"
  on public.meal_history for delete to authenticated
  using (auth.uid() = user_id);
