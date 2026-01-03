-- Check function definition for notify_new_family_message
select pg_get_functiondef('notify_new_family_message'::regproc);

-- Also check notify_new_direct_message
select pg_get_functiondef('notify_new_direct_message'::regproc);
