create table public.daily_meal_plans (
  user_id uuid not null references auth.users(id) on delete cascade,
  meal_date date not null default current_date,
  breakfast text not null default '',
  lunch text not null default '',
  dinner text not null default '',
  snack text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, meal_date)
);

alter table public.daily_meal_plans enable row level security;

create policy "Users can view their own daily meal plans"
  on public.daily_meal_plans for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can create their own daily meal plans"
  on public.daily_meal_plans for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own daily meal plans"
  on public.daily_meal_plans for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
