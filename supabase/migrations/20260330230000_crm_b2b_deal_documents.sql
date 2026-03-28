/*
  B2B: vlozhenija (dogovor, schet, zakryvajushhie i t.d.) v Storage + metadannye v Postgres.
  Put v bucket: {deal_id}/{uuid}_{filename}. Dostup k fajlu = tot zhe B2B-dostup, chto i k sdelkam.
*/

CREATE TYPE public.crm_b2b_document_kind AS ENUM (
  'contract',
  'invoice',
  'closing',
  'correspondence',
  'other'
);

CREATE TABLE public.crm_b2b_deal_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  deal_id uuid NOT NULL REFERENCES public.crm_b2b_deals (id) ON DELETE CASCADE,
  storage_path text NOT NULL,
  original_filename text NOT NULL,
  content_type text,
  byte_size bigint NOT NULL CHECK (byte_size >= 0 AND byte_size <= 52428800),
  document_kind public.crm_b2b_document_kind NOT NULL DEFAULT 'other',
  uploaded_by uuid REFERENCES auth.users (id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz,
  CONSTRAINT crm_b2b_deal_documents_path_unique UNIQUE (storage_path)
);

CREATE INDEX idx_crm_b2b_deal_documents_deal ON public.crm_b2b_deal_documents (deal_id)
  WHERE deleted_at IS NULL;
CREATE INDEX idx_crm_b2b_deal_documents_created ON public.crm_b2b_deal_documents (deal_id, created_at DESC);

COMMENT ON TABLE public.crm_b2b_deal_documents IS
  'Metadannye fajlov B2B-sdelki; binarnye dannye v bucket crm-b2b-documents. Pri CASCADE udalenii sdelki stroki propadajut — fajly v Storage mogut ostatsja (uborka vruchnuyu / v2).';

ALTER TABLE public.crm_b2b_deal_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_b2b_deal_documents_all
  ON public.crm_b2b_deal_documents FOR ALL TO authenticated
  USING (public.crm_can_access_b2b() OR public.crm_is_admin())
  WITH CHECK (public.crm_can_access_b2b() OR public.crm_is_admin());

GRANT SELECT, INSERT, UPDATE, DELETE ON public.crm_b2b_deal_documents TO authenticated;

-- Proverka: pervyj segment puti = UUID sdelki, sdelka sushestvuet, polzovatel v B2B.
CREATE OR REPLACE FUNCTION public.crm_can_access_b2b_storage_path(object_path text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT (public.crm_can_access_b2b() OR public.crm_is_admin())
  AND object_path IS NOT NULL
  AND position('/' IN object_path) > 1
  AND split_part(object_path, '/', 1) ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
  AND EXISTS (
    SELECT 1
    FROM public.crm_b2b_deals d
    WHERE d.id::text = split_part(object_path, '/', 1)
  );
$$;

COMMENT ON FUNCTION public.crm_can_access_b2b_storage_path(text) IS
  'RLS Storage: put v vide deal_id/ostalnoe, sdelka est v crm_b2b_deals.';

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'crm-b2b-documents',
  'crm-b2b-documents',
  false,
  52428800,
  ARRAY[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Storage: chitat / zagruzhat / menyat / udaljat tolko objekty s validnym prefiksom sdelki.
CREATE POLICY crm_b2b_documents_storage_select
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'crm-b2b-documents'
    AND public.crm_can_access_b2b_storage_path(name)
  );

CREATE POLICY crm_b2b_documents_storage_insert
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'crm-b2b-documents'
    AND public.crm_can_access_b2b_storage_path(name)
  );

CREATE POLICY crm_b2b_documents_storage_update
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'crm-b2b-documents'
    AND public.crm_can_access_b2b_storage_path(name)
  )
  WITH CHECK (
    bucket_id = 'crm-b2b-documents'
    AND public.crm_can_access_b2b_storage_path(name)
  );

CREATE POLICY crm_b2b_documents_storage_delete
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'crm-b2b-documents'
    AND public.crm_can_access_b2b_storage_path(name)
  );
