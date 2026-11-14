begin;

-- Update default schedule in app_settings: generate at 08:00 WIB, post at 19:00 WIB
update public.app_settings
set generation_time = '08:00:00',
    posting_time = '19:00:00',
    updated_at = now()
where singleton = true;

-- Update primary recurring rule to 11 hours lead (660 minutes)
update public.recurring_rules
set posting_time = '19:00:00',
    generation_lead_minutes = 660,
    updated_at = now()
where posting_time = '19:00:00';

commit;
