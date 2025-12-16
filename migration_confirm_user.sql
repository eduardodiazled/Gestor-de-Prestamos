
-- Force confirm the user email
update auth.users
set email_confirmed_at = now()
where email = 'lueddios17@gmail.com';
