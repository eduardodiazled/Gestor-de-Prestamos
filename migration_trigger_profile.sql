-- Create a trigger to automatically create a profile entry when a new user signs up via Supabase Auth
create or replace function public.handle_new_user() 
returns trigger as $$
begin
  insert into public.profiles (id, email, full_name, role)
  values (
    new.id, 
    new.email, 
    coalesce(new.raw_user_meta_data->>'full_name', new.email), -- Use metadata name or email as fallback
    'investor' -- Default role
  );
  return new;
end;
$$ language plpgsql security definer;

-- Trigger logic
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
