begin;

create type public.enquiry_status as enum ('NEW','CONTACTED','QUOTED','WON','LOST','ARCHIVED');
create type public.notification_kind as enum ('CUSTOMER_CONFIRMATION','PARKWAY_NOTIFICATION');
create type public.notification_status as enum ('PENDING','PROCESSING','SENT','RETRY','FAILED');
create sequence public.enquiry_reference_seq as bigint start 1 cache 1;

create table public.enquiries (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique default ('PF-' || extract(year from current_date)::integer || '-' || lpad(nextval('public.enquiry_reference_seq')::text, 6, '0')),
  name text not null check (char_length(name) between 1 and 120), company text check (char_length(company) <= 160),
  email text not null check (char_length(email) <= 254), phone text check (char_length(phone) <= 40),
  service text not null check (char_length(service) <= 100), project_description text not null check (char_length(project_description) between 1 and 10000),
  material text check (char_length(material) <= 200), thickness text check (char_length(thickness) <= 100), quantity text check (char_length(quantity) <= 100),
  dimensions text check (char_length(dimensions) <= 500), finish text check (char_length(finish) <= 500), tolerance text check (char_length(tolerance) <= 500),
  required_date date, urgency text check (char_length(urgency) <= 100), status public.enquiry_status not null default 'NEW',
  internal_notes text, assigned_user uuid references auth.users(id) on delete set null, quotation_value numeric(12,2) check (quotation_value is null or quotation_value >= 0), follow_up_date date,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index enquiries_created_idx on public.enquiries(created_at desc);
create index enquiries_status_idx on public.enquiries(status, created_at desc);
create index enquiries_service_idx on public.enquiries(service, created_at desc);

create table public.enquiry_files (
  id uuid primary key default gen_random_uuid(), enquiry_id uuid not null references public.enquiries(id) on delete cascade,
  original_filename text not null check (char_length(original_filename) between 1 and 240), storage_filename text not null,
  mime_type text not null, extension text not null, size_bytes bigint not null check (size_bytes > 0), storage_path text not null unique,
  scan_status text not null default 'NOT_CONFIGURED' check (scan_status in ('NOT_CONFIGURED','PENDING','CLEAN','QUARANTINED','REJECTED')), scan_completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index enquiry_files_enquiry_idx on public.enquiry_files(enquiry_id);

create table public.enquiry_audit (
  id bigint generated always as identity primary key, enquiry_id uuid not null references public.enquiries(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null, action text not null, previous_value jsonb, new_value jsonb,
  created_at timestamptz not null default now()
);
create index enquiry_audit_enquiry_idx on public.enquiry_audit(enquiry_id, created_at desc);

create table public.notification_jobs (
  id uuid primary key default gen_random_uuid(), enquiry_id uuid not null references public.enquiries(id) on delete cascade,
  kind public.notification_kind not null, status public.notification_status not null default 'PENDING', attempts integer not null default 0,
  provider_id text, last_error text, next_attempt_at timestamptz, sent_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(enquiry_id, kind)
);
create index notification_retry_idx on public.notification_jobs(status, next_attempt_at) where status in ('PENDING','RETRY');

create function public.set_updated_at() returns trigger language plpgsql set search_path='' as $$ begin new.updated_at=now(); return new; end $$;
create trigger enquiries_updated before update on public.enquiries for each row execute function public.set_updated_at();
create trigger notification_jobs_updated before update on public.notification_jobs for each row execute function public.set_updated_at();

create function public.create_enquiry(
  p_name text,p_company text,p_email text,p_phone text,p_service text,p_project_description text,p_material text,p_thickness text,p_quantity text,p_dimensions text,p_finish text,p_tolerance text,p_required_date date,p_urgency text
) returns table(id uuid,reference text) language plpgsql security definer set search_path='public' as $$
begin
  return query insert into public.enquiries(name,company,email,phone,service,project_description,material,thickness,quantity,dimensions,finish,tolerance,required_date,urgency)
  values(p_name,nullif(p_company,''),lower(p_email),nullif(p_phone,''),p_service,p_project_description,nullif(p_material,''),nullif(p_thickness,''),nullif(p_quantity,''),nullif(p_dimensions,''),nullif(p_finish,''),nullif(p_tolerance,''),p_required_date,nullif(p_urgency,'')) returning enquiries.id,enquiries.reference;
end $$;

create function public.queue_enquiry_notifications(p_enquiry_id uuid)
returns setof public.notification_jobs language sql security definer set search_path='public' as $$
  insert into public.notification_jobs(enquiry_id,kind) values
    (p_enquiry_id,'CUSTOMER_CONFIRMATION'),(p_enquiry_id,'PARKWAY_NOTIFICATION')
  on conflict(enquiry_id,kind) do nothing returning *;
$$;


create function public.claim_notification_jobs(p_limit integer default 20)
returns setof public.notification_jobs language plpgsql security definer set search_path='public' as $$
begin
  return query
  with due as (
    select id from public.notification_jobs
    where (status in ('PENDING','RETRY') and coalesce(next_attempt_at,created_at)<=now())
       or (status='PROCESSING' and updated_at<now()-interval '15 minutes')
    order by created_at for update skip locked limit greatest(1,least(p_limit,100))
  )
  update public.notification_jobs jobs set status='PROCESSING',attempts=jobs.attempts+1
  from due where jobs.id=due.id returning jobs.*;
end $$;

create function public.update_enquiry_status(p_enquiry_id uuid,p_status public.enquiry_status,p_actor_id uuid)
returns void language plpgsql security definer set search_path='public' as $$
declare old_status public.enquiry_status;
begin
  select status into old_status from public.enquiries where id=p_enquiry_id for update;
  if not found then raise exception 'Enquiry not found'; end if;
  update public.enquiries set status=p_status where id=p_enquiry_id;
  if old_status is distinct from p_status then
    insert into public.enquiry_audit(enquiry_id,actor_id,action,previous_value,new_value)
    values(p_enquiry_id,p_actor_id,'STATUS_CHANGED',jsonb_build_object('status',old_status),jsonb_build_object('status',p_status));
  end if;
end $$;

alter table public.enquiries enable row level security;
alter table public.enquiry_files enable row level security;
alter table public.enquiry_audit enable row level security;
alter table public.notification_jobs enable row level security;
revoke all on public.enquiries,public.enquiry_files,public.enquiry_audit,public.notification_jobs from anon,authenticated;
revoke all on function public.create_enquiry(text,text,text,text,text,text,text,text,text,text,text,text,date,text) from public,anon,authenticated;
revoke all on function public.queue_enquiry_notifications(uuid) from public,anon,authenticated;
revoke all on function public.update_enquiry_status(uuid,public.enquiry_status,uuid) from public,anon,authenticated;
revoke all on function public.claim_notification_jobs(integer) from public,anon,authenticated;
grant usage on schema public to service_role;
grant all on public.enquiries,public.enquiry_files,public.enquiry_audit,public.notification_jobs to service_role;
grant usage,select on sequence public.enquiry_reference_seq to service_role;
grant execute on function public.create_enquiry(text,text,text,text,text,text,text,text,text,text,text,text,date,text) to service_role;
grant execute on function public.queue_enquiry_notifications(uuid) to service_role;
grant execute on function public.update_enquiry_status(uuid,public.enquiry_status,uuid) to service_role;
grant execute on function public.claim_notification_jobs(integer) to service_role;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('rfq-private','rfq-private',false,10485760,array['application/pdf','application/dxf','application/acad','application/step','image/svg+xml','image/jpeg','image/png'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

commit;
