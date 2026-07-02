-- Jatakam: raw birth inputs only (versioned JSONB, like partner_expectations).
-- Derived values (nakshatra, rashi, Guna Milan) are recomputed by src/lib/astro.ts,
-- never stored. date_of_birth stays in its existing column — single source of truth.
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS astro jsonb NOT NULL DEFAULT '{}'::jsonb;
