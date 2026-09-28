create table public.shopping_items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  item_name text not null check (char_length(trim(item_name)) between 1 and 120),
  is_checked boolean not null default false,
  created_at timestamptz not null default now()
);

alter table public.shopping_items enable row level security;

create policy "Users can view their own shopping items"
  on public.shopping_items for select to authenticated
  using (auth.uid() = user_id);

create policy "Users can add their own shopping items"
  on public.shopping_items for insert to authenticated
  with check (auth.uid() = user_id);

create policy "Users can update their own shopping items"
  on public.shopping_items for update to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "Users can delete their own shopping items"
  on public.shopping_items for delete to authenticated
  using (auth.uid() = user_id);
