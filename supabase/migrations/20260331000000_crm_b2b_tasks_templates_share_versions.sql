/*
  B2B: zadachi, shablony pism, public share tokeny, versionirovanie dokumentov po tipu.
*/

-- Versija dokumenta v ramkah (deal_id, document_kind) dlya aktivnyh (deleted_at IS NULL)
ALTER TABLE public.crm_b2b_deal_documents
  ADD COLUMN IF NOT EXISTS version_index smallint NOT NULL DEFAULT 1;

UPDATE public.crm_b2b_deal_documents AS d
SET version_index = sub.n
FROM (
  SELECT id,
    ROW_NUMBER() OVER (
      PARTITION BY deal_id, document_kind ORDER BY created_at ASC
    )::smallint AS n
  FROM public.crm_b2b_deal_documents
  WHERE deleted_at IS NULL
) AS sub
WHERE d.id = sub.id;

CREATE OR REPLACE FUNCTION public.crm_b2b_deal_documents_bump_version()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  SELECT (COALESCE(MAX(version_index), 0) + 1)::smallint INTO NEW.version_index
  FROM public.crm_b2b_deal_documents
  WHERE deal_id = NEW.deal_id
    AND document_kind = NEW.document_kind
    AND deleted_at IS NULL;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_crm_b2b_doc_version ON public.crm_b2b_deal_documents;

CREATE TRIGGER trg_crm_b2b_doc_version
  BEFORE INSERT ON public.crm_b2b_deal_documents
  FOR EACH ROW
  EXECUTE PROCEDURE public.crm_b2b_deal_documents_bump_version();

COMMENT ON COLUMN public.crm_b2b_deal_documents.version_index IS
  'Nomer versii v ramkah tipa dokumenta na sdelke (1,2,...) — trigger pri INSERT.';

-- Zadachi / napominanija po sdelke
CREATE TABLE public.crm_b2b_deal_tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.crm_b2b_deals (id) ON DELETE CASCADE,
  title text NOT NULL,
  due_at timestamptz,
  completed_at timestamptz,
  sort_order int NOT NULL DEFAULT 0,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_b2b_deal_tasks_deal ON public.crm_b2b_deal_tasks (deal_id, sort_order, created_at);

ALTER TABLE public.crm_b2b_deal_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_b2b_deal_tasks_all
  ON public.crm_b2b_deal_tasks FOR ALL TO authenticated
  USING (public.crm_can_access_b2b() OR public.crm_is_admin())
  WITH CHECK (public.crm_can_access_b2b() OR public.crm_is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_b2b_deal_tasks TO authenticated;

COMMENT ON TABLE public.crm_b2b_deal_tasks IS 'Lenta zadach / napominanij po B2B-sdelke.';

-- Shablony KP / pisem (placeholder {{pole}})
CREATE TABLE public.crm_b2b_email_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  subject_template text NOT NULL,
  body_template text NOT NULL,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_b2b_email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_b2b_email_templates_read
  ON public.crm_b2b_email_templates FOR SELECT TO authenticated
  USING (public.crm_can_access_b2b() OR public.crm_is_admin());

CREATE POLICY crm_b2b_email_templates_admin_insert
  ON public.crm_b2b_email_templates FOR INSERT TO authenticated
  WITH CHECK (public.crm_is_admin());

CREATE POLICY crm_b2b_email_templates_admin_update
  ON public.crm_b2b_email_templates FOR UPDATE TO authenticated
  USING (public.crm_is_admin())
  WITH CHECK (public.crm_is_admin());

CREATE POLICY crm_b2b_email_templates_admin_delete
  ON public.crm_b2b_email_templates FOR DELETE TO authenticated
  USING (public.crm_is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_b2b_email_templates TO authenticated;

INSERT INTO public.crm_b2b_email_templates (slug, name, subject_template, body_template, sort_order)
VALUES
  (
    'kp_short',
    'КП — кратко',
    'Raketa Pay — условия по {{company_legal_name}}',
    E'Здравствуйте{{contact_greeting}}!\n\nПо запросу {{company_legal_name}} ({{country_code}}) готовы обсудить перевод {{transfer_amount}} {{transfer_currency}}.\n{{purpose_block}}\nС уважением,\nКоманда Raketa Pay'
    ,
    10
  ),
  (
    'followup_stage',
    'Напоминание по этапу',
    'Статус сделки: {{stage_label}} — {{company_legal_name}}',
    E'Текущий этап в CRM: {{stage_label}}.\nКомпания: {{company_legal_name}}\nСумма: {{transfer_amount}} {{transfer_currency}}\nЦелевая дата закрытия: {{target_close_date}}\n\n{{internal_notes_block}}'
    ,
    20
  )
ON CONFLICT (slug) DO NOTHING;

-- Public read-only link (token reshen na servere Next + service role)
CREATE TABLE public.crm_b2b_deal_share_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.crm_b2b_deals (id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex'),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_crm_b2b_share_deal ON public.crm_b2b_deal_share_tokens (deal_id);

ALTER TABLE public.crm_b2b_deal_share_tokens ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_b2b_deal_share_tokens_all
  ON public.crm_b2b_deal_share_tokens FOR ALL TO authenticated
  USING (public.crm_can_access_b2b() OR public.crm_is_admin())
  WITH CHECK (public.crm_can_access_b2b() OR public.crm_is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_b2b_deal_share_tokens TO authenticated;

COMMENT ON TABLE public.crm_b2b_deal_share_tokens IS 'Token dlya read-only prosmotra sdelki na publichnoj stranice /p/b2b/[token].';
