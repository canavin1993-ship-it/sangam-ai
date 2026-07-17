-- Referral engine: two-sided premium unlocked ON VERIFICATION (not signup), with a
-- community-contribution milestone ladder. Rewarding on verification is deliberate —
-- it prevents fake-profile farming (you only earn when the referred family passes
-- ID/selfie/phone verification) and reinforces the verification moat. All reward
-- logic lives here, server-side, so it fires no matter how a profile gets verified.

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------
create table if not exists public.referral_codes (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  code       text unique not null,
  created_at timestamptz not null default now()
);

create table if not exists public.referrals (
  id          uuid primary key default gen_random_uuid(),
  referrer_id uuid not null references auth.users(id) on delete cascade,
  referred_id uuid not null references auth.users(id) on delete cascade,
  code        text not null,
  status      text not null default 'pending' check (status in ('pending', 'rewarded')),
  created_at  timestamptz not null default now(),
  rewarded_at timestamptz,
  unique (referred_id)                       -- a family can only be referred once
);
create index if not exists referrals_referrer_idx on public.referrals (referrer_id);

alter table public.referral_codes enable row level security;
alter table public.referrals enable row level security;

-- Read-only for the owner; all writes go through the SECURITY DEFINER functions below.
create policy "read own referral code" on public.referral_codes
  for select using (auth.uid() = user_id);
create policy "referrer reads own referrals" on public.referrals
  for select using (auth.uid() = referrer_id);

-- ---------------------------------------------------------------------------
-- Helper: grant a comped subscription tier (amount_inr = 0). Never charges.
-- ---------------------------------------------------------------------------
create or replace function public.grant_comp_tier(
  p_user uuid,
  p_tier public.plan_tier,
  p_months int
) returns void
language sql security definer set search_path = public as $$
  insert into public.subscriptions (user_id, tier, status, amount_inr, starts_at, expires_at)
  values (p_user, p_tier, 'active', 0, now(), now() + make_interval(months => p_months));
$$;

-- ---------------------------------------------------------------------------
-- get_or_create_referral_code — lazy, per user. 8-char base32-ish, collision-retried.
-- ---------------------------------------------------------------------------
create or replace function public.get_my_referral_code()
returns text
language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  select code into v_code from public.referral_codes where user_id = auth.uid();
  if v_code is not null then return v_code; end if;

  loop
    -- 8 hex chars from gen_random_uuid (built-in; no pgcrypto dependency).
    v_code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
    begin
      insert into public.referral_codes (user_id, code) values (auth.uid(), v_code);
      return v_code;
    exception when unique_violation then
      -- retry on the rare code collision
    end;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------------
-- redeem_referral — called once, at onboarding, by the NEW user. Records a pending
-- referral. Guards: code must exist, cannot refer yourself, cannot be referred twice.
-- Returns true if a pending referral was recorded.
-- ---------------------------------------------------------------------------
create or replace function public.redeem_referral(p_code text)
returns boolean
language plpgsql security definer set search_path = public as $$
declare
  v_referrer uuid;
begin
  select user_id into v_referrer from public.referral_codes where code = upper(trim(p_code));
  if v_referrer is null or v_referrer = auth.uid() then
    return false;
  end if;
  insert into public.referrals (referrer_id, referred_id, code)
  values (v_referrer, auth.uid(), upper(trim(p_code)))
  on conflict (referred_id) do nothing;
  return found;
end;
$$;

-- ---------------------------------------------------------------------------
-- The reward trigger: when a referred family becomes verified, pay out BOTH sides
-- and check the referrer's milestone. is_verified is admin/system-controlled (a
-- separate guard trigger blocks self-setting), so this is a trustworthy signal.
-- ---------------------------------------------------------------------------
create or replace function public.on_profile_verified()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_ref record;
  v_count int;
begin
  -- Only the false → true transition, and only if this family was referred and unpaid.
  select * into v_ref from public.referrals
    where referred_id = NEW.id and status = 'pending';
  if not found then
    return NEW;
  end if;

  update public.referrals set status = 'rewarded', rewarded_at = now() where id = v_ref.id;

  -- Two-sided: 6 months premium each. Two-sided kills the inviter's guilt.
  perform public.grant_comp_tier(v_ref.referred_id, 'premium', 6);
  perform public.grant_comp_tier(v_ref.referrer_id, 'premium', 6);

  -- Milestone: 5 verified referrals → Founding Family (elite, 2 years). Fires once.
  select count(*) into v_count from public.referrals
    where referrer_id = v_ref.referrer_id and status = 'rewarded';
  if v_count = 5 then
    perform public.grant_comp_tier(v_ref.referrer_id, 'elite', 24);
  end if;

  return NEW;
end;
$$;

drop trigger if exists trg_on_profile_verified on public.profiles;
create trigger trg_on_profile_verified
  after update of is_verified on public.profiles
  for each row
  when (OLD.is_verified = false and NEW.is_verified = true)
  execute function public.on_profile_verified();

-- ---------------------------------------------------------------------------
-- Grants — the two user-callable RPCs + RLS-gated reads. Reward-writing functions
-- (grant_comp_tier, on_profile_verified) are SECURITY DEFINER and internal only.
-- ---------------------------------------------------------------------------
grant select on public.referral_codes to authenticated;
grant select on public.referrals to authenticated;
grant execute on function public.get_my_referral_code() to authenticated;
grant execute on function public.redeem_referral(text) to authenticated;
revoke execute on function public.grant_comp_tier(uuid, public.plan_tier, int) from public, anon, authenticated;

-- Manual verification (run after applying, with two test users A→B):
--   select public.redeem_referral('<A_code>');            -- as B
--   update profiles set is_verified = true where id = '<B_id>';  -- as admin
--   select tier, status from subscriptions where user_id in ('<A_id>','<B_id>');
--   -- expect a comped 'premium' row for both.
