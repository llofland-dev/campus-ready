-- Contacts screen in the redesign matches the reference product's dedicated
-- call + email action buttons per contact — add the missing email column.
alter table public.contacts add column email text;
