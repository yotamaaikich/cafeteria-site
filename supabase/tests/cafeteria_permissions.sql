begin;

-- The fixture account exists only within this transaction; no email is sent.
create temporary table cafeteria_test_context as select gen_random_uuid() as user_id;
insert into auth.users (id) select user_id from cafeteria_test_context;
insert into public.cafeteria_admins (user_id) select user_id from cafeteria_test_context;

set local role anon;
do $test$
begin
    perform id from public.cafeteria limit 1;
    begin
        insert into public.cafeteria (people) values (0);
        raise exception 'Anonymous insert unexpectedly succeeded';
    exception when insufficient_privilege then null;
    end;
end;
$test$;

reset role;
select set_config('request.jwt.claims',
    json_build_object('sub', gen_random_uuid(), 'role', 'authenticated')::text, true);
set local role authenticated;
do $test$
begin
    if exists (select 1 from public.cafeteria_admins) then
        raise exception 'Non-admin can see another administrator';
    end if;
    begin
        insert into public.cafeteria (people) values (0);
        raise exception 'Non-admin insert unexpectedly succeeded';
    exception when insufficient_privilege then null;
    end;
    begin
        insert into public.cafeteria_admins (user_id) values ((select auth.uid()));
        raise exception 'Non-admin self-promotion unexpectedly succeeded';
    exception when insufficient_privilege then null;
    end;
end;
$test$;

reset role;
select set_config('request.jwt.claims',
    json_build_object('sub', user_id, 'role', 'authenticated')::text, true)
from cafeteria_test_context;
set local role authenticated;
insert into public.cafeteria
    (people, occupancy, status, status_icon, predict10, predict20, is_measurement,
     notice, curry, ramen, karaage, daily, updated_at)
values
    (37, 93, '混雑', '🔴', null, null, true,
     'Migration integration test', true, false, true, false, '2000-01-01')
returning id, people, occupancy, status_icon, notice, updated_at;

do $test$
declare latest public.cafeteria;
begin
    select * into latest from public.cafeteria
        order by updated_at desc nulls last, id desc limit 1;
    if latest.people <> 37 or latest.notice <> 'Migration integration test'
       or latest.updated_at <> now() or latest.ramen <> false or not latest.is_measurement then
        raise exception 'Admin write / latest read / server timestamp assertion failed';
    end if;
end;
$test$;

reset role;
rollback;
select 'PASS: public read, admin insert, non-admin rejection, server timestamp; all fixtures rolled back' as test_result;
