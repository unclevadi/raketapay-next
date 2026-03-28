-- Ishod roznichnoj sdelki: v rabote / uspeh / otkaz.

CREATE TYPE public.crm_retail_deal_outcome AS ENUM (
  'open',
  'success',
  'lost'
);

ALTER TABLE public.crm_deals
  ADD COLUMN IF NOT EXISTS deal_outcome public.crm_retail_deal_outcome NOT NULL DEFAULT 'open';

COMMENT ON COLUMN public.crm_deals.deal_outcome IS
  'open — v rabote; success — uspeh; lost — otkaz / ne sostoyalas.';
