-- Zajavki (leads), audit log, pravo zakryvat uspeh (can_confirm_success).

ALTER TABLE public.crm_staff
  ADD COLUMN IF NOT EXISTS can_confirm_success boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN public.crm_staff.can_confirm_success IS
  'Mozhet stavit uspeh/otkaz (roznica) i zakryvat B2B uspehom; admin vsegda mozhet.';

CREATE TYPE public.crm_lead_status AS ENUM (
  'new',
  'in_progress',
  'qualified',
  'converted',
  'lost',
  'spam'
);

CREATE TABLE public.crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status public.crm_lead_status NOT NULL DEFAULT 'new',
  source text,
  campaign text,
  contact_name text NOT NULL,
  contact_phone text,
  contact_email text,
  contact_telegram text,
  company_name text,
  message text,
  assigned_to uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  internal_notes text,
  converted_retail_deal_id uuid REFERENCES public.crm_deals (id) ON DELETE SET NULL,
  converted_b2b_deal_id uuid REFERENCES public.crm_b2b_deals (id) ON DELETE SET NULL,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_leads_status ON public.crm_leads (status);
CREATE INDEX idx_crm_leads_created ON public.crm_leads (created_at DESC);
CREATE INDEX idx_crm_leads_assigned ON public.crm_leads (assigned_to);

CREATE TRIGGER trg_crm_leads_updated
  BEFORE UPDATE ON public.crm_leads
  FOR EACH ROW EXECUTE PROCEDURE public.crm_set_updated_at();

CREATE TABLE public.crm_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  event_type text NOT NULL,
  entity_table text NOT NULL,
  entity_id uuid NOT NULL,
  summary text,
  meta jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_audit_entity ON public.crm_audit_log (entity_table, entity_id);
CREATE INDEX idx_crm_audit_created ON public.crm_audit_log (created_at DESC);

ALTER TABLE public.crm_leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_leads_all_staff
  ON public.crm_leads FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.crm_staff s WHERE s.user_id = auth.uid())
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.crm_staff s WHERE s.user_id = auth.uid())
  );

CREATE POLICY crm_audit_select_staff
  ON public.crm_audit_log FOR SELECT TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.crm_staff s WHERE s.user_id = auth.uid())
  );

CREATE POLICY crm_audit_insert_self
  ON public.crm_audit_log FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

COMMENT ON TABLE public.crm_leads IS 'Vhodjaschie zajavki; konvertacija v roznichnuju ili B2B sdelku.';
COMMENT ON TABLE public.crm_audit_log IS 'Sobytija CRM (smena statusa, etapa); zapis iz prilozhenija.';
