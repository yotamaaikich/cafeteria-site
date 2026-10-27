-- Only camera measurements train the forecast. Older rows remain unchanged in meaning.
alter table public.cafeteria
    add column if not exists is_measurement boolean not null default false;

create index if not exists cafeteria_measurement_time_idx
    on public.cafeteria (updated_at desc)
    where is_measurement;

-- Return bounded aggregates rather than transferring weeks of raw history.
-- Runs with the caller's permissions and the existing public-read RLS policy.
create or replace function public.cafeteria_forecast_context()
returns jsonb
language sql stable parallel safe security invoker set search_path = ''
as $$
    with clock as (
        select now() as as_of,
            (date_trunc('day', now() at time zone 'Asia/Tokyo') at time zone 'Asia/Tokyo') as today_start,
            (extract(hour from now() at time zone 'Asia/Tokyo')::integer * 60
                + extract(minute from now() at time zone 'Asia/Tokyo')::integer) as minute_of_day
    ), recent as (
        select date_trunc('minute', c.updated_at) as at,
            round(avg(c.people))::integer as people, count(*)::integer as samples
        from public.cafeteria c cross join clock t
        where c.is_measurement and c.people is not null and c.people >= 0
            and c.updated_at >= t.as_of - interval '20 minutes' and c.updated_at <= t.as_of
        group by 1
    ), historical as (
        select date_bin(interval '5 minutes', c.updated_at, timestamptz '2000-01-01 00:00:00+00')
                + interval '2 minutes 30 seconds' as at,
            round(avg(c.people))::integer as people, count(*)::integer as samples
        from public.cafeteria c cross join clock t
        where c.is_measurement and c.people is not null and c.people >= 0
            and c.updated_at >= t.as_of - interval '28 days' and c.updated_at < t.today_start
            and mod(extract(hour from c.updated_at at time zone 'Asia/Tokyo')::integer * 60
                + extract(minute from c.updated_at at time zone 'Asia/Tokyo')::integer
                - t.minute_of_day + 1445, 1440) between 0 and 30
        group by 1
    )
    select jsonb_build_object(
        'as_of', (select as_of from clock),
        'recent', coalesce((select jsonb_agg(to_jsonb(r) order by r.at) from recent r), '[]'::jsonb),
        'historical', coalesce((select jsonb_agg(to_jsonb(h) order by h.at) from historical h), '[]'::jsonb)
    );
$$;

revoke all on function public.cafeteria_forecast_context() from public;
grant execute on function public.cafeteria_forecast_context() to anon, authenticated, service_role;
notify pgrst, 'reload schema';
