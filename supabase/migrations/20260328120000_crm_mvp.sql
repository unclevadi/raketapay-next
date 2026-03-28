/*
  Raketa Pay - внутренняя CRM (MVP): отдельные сущности + RLS.
  v2: курсы по cron из API банка 2-3 раза в сутки - см. комментарий в crm_exchange_rates.
*/

-- Типы сделки / позиции прайса (не смешиваем с журналом оплат)
CREATE TYPE public.crm_deal_line_type AS ENUM (
  'subscription',
  'one_off',
  'topup',
  'transfer',
  'other'
);

CREATE TYPE public.crm_client_currency AS ENUM ('USD', 'UZS', 'RUB');

CREATE TYPE public.crm_payment_method AS ENUM (
  'card',
  'bank_transfer',
  'crypto',
  'cash',
  'other'
);

-- Категории как на сайте (подборки в модалках)
CREATE TABLE public.crm_service_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  label text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Справочник услуг / позиций прайса
CREATE TABLE public.crm_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category_id uuid NOT NULL REFERENCES public.crm_service_categories (id) ON DELETE RESTRICT,
  name text NOT NULL,
  catalog_key text NOT NULL UNIQUE,
  line_type public.crm_deal_line_type NOT NULL DEFAULT 'other',
  cost_usd numeric(14, 4) NOT NULL DEFAULT 0,
  default_markup_percent numeric(7, 2) NOT NULL DEFAULT 15.00,
  price_source_note text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Один активный снимок операционных курсов (ручное обновление в MVP)
CREATE TABLE public.crm_exchange_rates (
  id smallint PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  uzs_per_usd numeric(18, 6) NOT NULL DEFAULT 12650,
  rub_per_usd numeric(18, 6) NOT NULL DEFAULT 92.5,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

INSERT INTO public.crm_exchange_rates (id, uzs_per_usd, rub_per_usd)
VALUES (1, 12650, 92.5)
ON CONFLICT (id) DO NOTHING;

COMMENT ON TABLE public.crm_exchange_rates IS
  'MVP: kursy zadajutsja v CRM. Startovye znachenija - zaglushki pri migracii, ne kotirovka CB; obnovljajte v razdele Kursy. v2: cron iz API banka.';

-- Доступ сотрудников: строка = пользователь Supabase Auth с правом на CRM
CREATE TABLE public.crm_staff (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  email text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_services_category ON public.crm_services (category_id);
CREATE INDEX idx_crm_services_active_sort ON public.crm_services (is_active, sort_order);

-- Журнал сделок (отдельно от справочника услуг)
CREATE TABLE public.crm_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_name text NOT NULL,
  contact_telegram text,
  contact_email text,
  contact_phone text,
  service_id uuid REFERENCES public.crm_services (id) ON DELETE SET NULL,
  custom_line_description text,
  client_amount numeric(14, 4) NOT NULL,
  client_currency public.crm_client_currency NOT NULL DEFAULT 'RUB',
  payment_method public.crm_payment_method NOT NULL DEFAULT 'other',
  paid_at timestamptz NOT NULL DEFAULT now(),
  margin_amount numeric(14, 4),
  margin_is_manual boolean NOT NULL DEFAULT false,
  internal_notes text,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT crm_deals_contact_or_custom CHECK (
    service_id IS NOT NULL OR (custom_line_description IS NOT NULL AND length(trim(custom_line_description)) > 0)
  )
);

CREATE INDEX idx_crm_deals_paid_at ON public.crm_deals (paid_at DESC);
CREATE INDEX idx_crm_deals_client_name ON public.crm_deals (client_name);
CREATE INDEX idx_crm_deals_created_by ON public.crm_deals (created_by);

CREATE OR REPLACE FUNCTION public.crm_set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_crm_services_updated
  BEFORE UPDATE ON public.crm_services
  FOR EACH ROW EXECUTE PROCEDURE public.crm_set_updated_at();

CREATE TRIGGER trg_crm_deals_updated
  BEFORE UPDATE ON public.crm_deals
  FOR EACH ROW EXECUTE PROCEDURE public.crm_set_updated_at();

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

ALTER TABLE public.crm_service_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_exchange_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_staff ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.crm_is_staff()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.crm_staff s WHERE s.user_id = auth.uid()
  );
$$;

-- Сотрудник видит только свою строку staff (достаточно для проверки доступа в приложении)
CREATE POLICY crm_staff_select_own
  ON public.crm_staff FOR SELECT TO authenticated
  USING (user_id = auth.uid());

-- Остальные таблицы CRM - только для user_id из crm_staff
CREATE POLICY crm_categories_staff_all
  ON public.crm_service_categories FOR ALL TO authenticated
  USING (public.crm_is_staff())
  WITH CHECK (public.crm_is_staff());

CREATE POLICY crm_services_staff_all
  ON public.crm_services FOR ALL TO authenticated
  USING (public.crm_is_staff())
  WITH CHECK (public.crm_is_staff());

CREATE POLICY crm_fx_staff_all
  ON public.crm_exchange_rates FOR ALL TO authenticated
  USING (public.crm_is_staff())
  WITH CHECK (public.crm_is_staff());

CREATE POLICY crm_deals_staff_all
  ON public.crm_deals FOR ALL TO authenticated
  USING (public.crm_is_staff())
  WITH CHECK (public.crm_is_staff());

-- Первого сотрудника добавляют в SQL Editor (service role) или через Dashboard:
-- INSERT INTO public.crm_staff (user_id, email) VALUES ('<uuid>', 'ops@...');

-- Категории (как на лендинге)
INSERT INTO public.crm_service_categories (slug, label, sort_order) VALUES
  ('ai', 'AI & Генерация', 10),
  ('subs', 'Подписки & Софт', 20),
  ('travel', 'Путешествия & Жильё', 30),
  ('market', 'Маркетплейсы & Игры', 40),
  ('transfers', 'Переводы & Alipay', 50),
  ('business', 'Для бизнеса', 60)
ON CONFLICT (slug) DO NOTHING;

-- Сиды услуг: см. 20260328120001_crm_catalog_seed.sql (генерация из lib/service-details.ts)
