begin;
set transaction isolation level repeatable read;

create temporary table forecast_test_baseline as
select coalesce(sum((value->>'samples')::integer), 0) as samples
from jsonb_array_elements(public.cafeteria_forecast_context()->'recent');

-- These fixtures are never committed or exposed to other sessions.
insert into public.cafeteria (people, is_measurement, notice)
values (12, true, 'Forecast test fixture'), (20, true, 'Forecast test fixture'),
       (39, false, 'Menu-only test fixture');

do $test$
declare context jsonb; total bigint;
begin
    context := public.cafeteria_forecast_context();
    select coalesce(sum((value->>'samples')::integer), 0) into total
        from jsonb_array_elements(context->'recent');
    if total <> (select samples + 2 from forecast_test_baseline) then
        raise exception 'Measurement aggregation included a menu-only save or lost measurements';
    end if;
    if context->>'as_of' is null or jsonb_typeof(context->'historical') <> 'array' then
        raise exception 'Malformed forecast context';
    end if;
    if (select prosecdef from pg_proc where oid = 'public.cafeteria_forecast_context()'::regprocedure) then
        raise exception 'Forecast context must not run as security definer';
    end if;
end;
$test$;

set local role anon;
do $test$
begin
    perform public.cafeteria_forecast_context();
    begin
        insert into public.cafeteria (people, is_measurement) values (1, true);
        raise exception 'Anonymous measurement insert unexpectedly succeeded';
    exception when insufficient_privilege then null;
    end;
end;
$test$;

reset role;
rollback;
select 'PASS: camera-only aggregation, invoker security, public read, no anonymous writes; fixtures rolled back' as test_result;
