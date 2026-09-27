-- Run this function from a scheduled trusted worker only after Parkway approves its retention period.
create or replace function public.list_expired_enquiries(p_retention_days integer)
returns table(id uuid, storage_paths text[]) language sql security definer set search_path='public' as $$
  select e.id,coalesce(array_agg(f.storage_path) filter(where f.storage_path is not null),'{}')
  from public.enquiries e left join public.enquiry_files f on f.enquiry_id=e.id
  where e.created_at < now() - make_interval(days=>p_retention_days) and e.status='ARCHIVED'
  group by e.id;
$$;
revoke all on function public.list_expired_enquiries(integer) from public,anon,authenticated;
grant execute on function public.list_expired_enquiries(integer) to service_role;
