-- Zajavka: fizlitso ili jurlico (dlja formy i avtoperehoda v roznitsu / B2B).

CREATE TYPE public.crm_lead_intended_segment AS ENUM ('retail', 'b2b');

ALTER TABLE public.crm_leads
  ADD COLUMN IF NOT EXISTS intended_segment public.crm_lead_intended_segment;

COMMENT ON COLUMN public.crm_leads.intended_segment IS
  'Kuda vedem zajavku: roznica (fizlitso) ili B2B (jurlico).';

CREATE INDEX IF NOT EXISTS idx_crm_leads_intended ON public.crm_leads (intended_segment);
