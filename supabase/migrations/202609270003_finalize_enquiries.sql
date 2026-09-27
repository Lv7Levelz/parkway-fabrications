begin;
alter table public.enquiries add column submitted_at timestamptz;
-- Existing entries predate the finalisation protocol. Preserve their delivery state.
update public.enquiries set submitted_at=created_at;
alter table public.enquiry_files alter column scan_status set default 'PENDING';

create function public.complete_enquiry(p_enquiry_id uuid)
returns void language plpgsql security definer set search_path='public' as $$
begin
  update public.enquiries set submitted_at=coalesce(submitted_at,now()) where id=p_enquiry_id;
  if not found then raise exception 'Enquiry not found'; end if;
  perform public.queue_enquiry_notifications(p_enquiry_id);
end $$;
revoke all on function public.complete_enquiry(uuid) from public,anon,authenticated;
grant execute on function public.complete_enquiry(uuid) to service_role;

create or replace function public.claim_notification_jobs(p_limit integer default 20)
returns setof public.notification_jobs language plpgsql security definer set search_path='public' as $$
begin
  return query
  with due as (
    select jobs.id from public.notification_jobs jobs
    join public.enquiries e on e.id=jobs.enquiry_id
    where e.submitted_at is not null and (
      (jobs.status in ('PENDING','RETRY') and coalesce(jobs.next_attempt_at,jobs.created_at)<=now())
      or (jobs.status='PROCESSING' and jobs.updated_at<now()-interval '15 minutes')
    )
    order by jobs.created_at for update of jobs skip locked limit greatest(1,least(p_limit,100))
  )
  update public.notification_jobs jobs set status='PROCESSING',attempts=jobs.attempts+1
  from due where jobs.id=due.id returning jobs.*;
end $$;
commit;
