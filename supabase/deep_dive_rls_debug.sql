-- Get full definition of notification functions to check for RLS violations inside triggers
select pg_get_functiondef('notify_new_family_message'::regproc);
select pg_get_functiondef('notify_new_direct_message'::regproc);

-- Check all policies on messages again (including restrictive ones)
SELECT * FROM pg_policies WHERE tablename = 'messages';

-- Check if there are any other triggers on messages
SELECT trigger_name, action_statement FROM information_schema.triggers WHERE event_object_table = 'messages';
