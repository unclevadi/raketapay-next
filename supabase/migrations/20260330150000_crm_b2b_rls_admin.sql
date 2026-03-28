-- Admin polnij dostup k B2B (prosmotr/redaktirovanie), dazhe esli can_access_b2b = false.
-- Bez etogo RLS rezhet zaprosy, esli v UI pokazyvaem /crm/b2b tolko po is_admin.

DROP POLICY IF EXISTS crm_b2b_stages_read ON public.crm_b2b_pipeline_stages;

CREATE POLICY crm_b2b_stages_read
  ON public.crm_b2b_pipeline_stages FOR SELECT TO authenticated
  USING (public.crm_can_access_b2b() OR public.crm_is_admin());

DROP POLICY IF EXISTS crm_b2b_deals_all ON public.crm_b2b_deals;

CREATE POLICY crm_b2b_deals_all
  ON public.crm_b2b_deals FOR ALL TO authenticated
  USING (public.crm_can_access_b2b() OR public.crm_is_admin())
  WITH CHECK (public.crm_can_access_b2b() OR public.crm_is_admin());
