-- Razdelenie prav: retail (fizlitsa / podpiski) vs B2B (jurlica) + admin.
-- Kursy: smotret retail; menyat tolko admin.

ALTER TABLE public.crm_staff
  ADD COLUMN IF NOT EXISTS can_access_retail boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS can_access_b2b boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_admin boolean NOT NULL DEFAULT false;

COMMENT ON COLUMN public.crm_staff.can_access_retail IS 'Dostup k /crm, kursy (prosmotr), prays, sdelki fizlits';
COMMENT ON COLUMN public.crm_staff.can_access_b2b IS 'Dostup k /crm/b2b';
COMMENT ON COLUMN public.crm_staff.is_admin IS 'Upravlenie sotrudnikami i redaktirovanie kursov';

-- Funktsii dostupa (RLS)
CREATE OR REPLACE FUNCTION public.crm_can_access_retail()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crm_staff s
    WHERE s.user_id = auth.uid() AND s.can_access_retail
  );
$$;

CREATE OR REPLACE FUNCTION public.crm_can_access_b2b()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crm_staff s
    WHERE s.user_id = auth.uid() AND s.can_access_b2b
  );
$$;

CREATE OR REPLACE FUNCTION public.crm_is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crm_staff s
    WHERE s.user_id = auth.uid() AND s.is_admin
  );
$$;

-- Perevesit retail-tablicy na can_access_retail
DROP POLICY IF EXISTS crm_categories_staff_all ON public.crm_service_categories;
DROP POLICY IF EXISTS crm_services_staff_all ON public.crm_services;
DROP POLICY IF EXISTS crm_fx_staff_all ON public.crm_exchange_rates;
DROP POLICY IF EXISTS crm_deals_staff_all ON public.crm_deals;

CREATE POLICY crm_categories_retail_all
  ON public.crm_service_categories FOR ALL TO authenticated
  USING (public.crm_can_access_retail())
  WITH CHECK (public.crm_can_access_retail());

CREATE POLICY crm_services_retail_all
  ON public.crm_services FOR ALL TO authenticated
  USING (public.crm_can_access_retail())
  WITH CHECK (public.crm_can_access_retail());

CREATE POLICY crm_deals_retail_all
  ON public.crm_deals FOR ALL TO authenticated
  USING (public.crm_can_access_retail())
  WITH CHECK (public.crm_can_access_retail());

-- Kursy: prosmotr retail, zapis tolko admin
CREATE POLICY crm_fx_select_retail
  ON public.crm_exchange_rates FOR SELECT TO authenticated
  USING (public.crm_can_access_retail());

CREATE POLICY crm_fx_admin_write
  ON public.crm_exchange_rates FOR INSERT TO authenticated
  WITH CHECK (public.crm_is_admin());

CREATE POLICY crm_fx_admin_update
  ON public.crm_exchange_rates FOR UPDATE TO authenticated
  USING (public.crm_is_admin())
  WITH CHECK (public.crm_is_admin());

CREATE POLICY crm_fx_admin_delete
  ON public.crm_exchange_rates FOR DELETE TO authenticated
  USING (public.crm_is_admin());

-- crm_staff: svoja stroka ili admin vidi vseh; izmenenija tolko admin
DROP POLICY IF EXISTS crm_staff_select_own ON public.crm_staff;

CREATE POLICY crm_staff_select
  ON public.crm_staff FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.crm_is_admin());

CREATE POLICY crm_staff_admin_insert
  ON public.crm_staff FOR INSERT TO authenticated
  WITH CHECK (public.crm_is_admin());

CREATE POLICY crm_staff_admin_update
  ON public.crm_staff FOR UPDATE TO authenticated
  USING (public.crm_is_admin())
  WITH CHECK (public.crm_is_admin());

CREATE POLICY crm_staff_admin_delete
  ON public.crm_staff FOR DELETE TO authenticated
  USING (public.crm_is_admin());

-- B2B: stadii vоронki
CREATE TABLE public.crm_b2b_pipeline_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0
);

CREATE TYPE public.crm_b2b_deal_tier AS ENUM (
  'tier_s',
  'tier_m',
  'tier_l',
  'tier_xl'
);

CREATE TYPE public.crm_b2b_transfer_currency AS ENUM (
  'USD',
  'EUR',
  'RUB',
  'UZS',
  'GBP',
  'OTHER'
);

CREATE TABLE public.crm_b2b_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_legal_name text NOT NULL,
  country_code char(2) NOT NULL,
  tax_id text,
  counterparty_country text,
  transfer_amount numeric(18, 2) NOT NULL,
  transfer_currency public.crm_b2b_transfer_currency NOT NULL DEFAULT 'USD',
  purpose_summary text,
  stage_id uuid NOT NULL REFERENCES public.crm_b2b_pipeline_stages (id) ON DELETE RESTRICT,
  deal_tier public.crm_b2b_deal_tier NOT NULL DEFAULT 'tier_m',
  priority smallint NOT NULL DEFAULT 2 CHECK (priority >= 1 AND priority <= 4),
  assigned_to uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  contact_name text,
  contact_email text,
  contact_phone text,
  internal_notes text,
  compliance_notes text,
  expected_margin_usd numeric(14, 4),
  target_close_date date,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_b2b_deals_stage ON public.crm_b2b_deals (stage_id);
CREATE INDEX idx_crm_b2b_deals_assigned ON public.crm_b2b_deals (assigned_to);
CREATE INDEX idx_crm_b2b_deals_created ON public.crm_b2b_deals (created_at DESC);

CREATE TRIGGER trg_crm_b2b_deals_updated
  BEFORE UPDATE ON public.crm_b2b_deals
  FOR EACH ROW EXECUTE PROCEDURE public.crm_set_updated_at();

ALTER TABLE public.crm_b2b_pipeline_stages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_b2b_deals ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_b2b_stages_read
  ON public.crm_b2b_pipeline_stages FOR SELECT TO authenticated
  USING (public.crm_can_access_b2b());

CREATE POLICY crm_b2b_deals_all
  ON public.crm_b2b_deals FOR ALL TO authenticated
  USING (public.crm_can_access_b2b())
  WITH CHECK (public.crm_can_access_b2b());

INSERT INTO public.crm_b2b_pipeline_stages (slug, label, sort_order) VALUES
  ('inquiry', 'Запрос / лид', 10),
  ('kyc_docs', 'Сбор документов', 20),
  ('compliance', 'Комплаенс', 30),
  ('pricing', 'КП и условия', 40),
  ('management', 'Согласование руководства', 50),
  ('contract', 'Договор', 60),
  ('execution', 'Исполнение (SWIFT / SEPA)', 70),
  ('completed', 'Закрыто успешно', 80),
  ('rejected', 'Отказ', 90)
ON CONFLICT (slug) DO NOTHING;

COMMENT ON TABLE public.crm_b2b_deals IS
  'B2B: jurlica, perevody, stadii soglasonija. Dostup po can_access_b2b.';

-- Posle primenenija migracii: naznachite admina i prava sushhestvujushhim strokam, naprimer:
-- UPDATE public.crm_staff SET is_admin = true, can_access_retail = true, can_access_b2b = true
-- WHERE email = 's21@crm.raketapay.internal';
