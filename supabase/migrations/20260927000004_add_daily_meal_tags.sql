alter table public.daily_meal_plans
  add column breakfast_tag text check (breakfast_tag in ('green', 'yellow', 'orange', 'red')),
  add column lunch_tag text check (lunch_tag in ('green', 'yellow', 'orange', 'red')),
  add column dinner_tag text check (dinner_tag in ('green', 'yellow', 'orange', 'red')),
  add column snack_tag text check (snack_tag in ('green', 'yellow', 'orange', 'red'));
