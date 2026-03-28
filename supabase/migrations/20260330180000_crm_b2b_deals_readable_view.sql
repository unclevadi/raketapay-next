-- Udobnyj prosmotr v Table Editor: k UUID dobavljajutsja stage_slug / stage_label.
-- Istina po-prezhnemu v crm_b2b_deals.stage_id (FK).

CREATE OR REPLACE VIEW public.crm_b2b_deals_readable
WITH (security_invoker = true) AS
SELECT
  d.*,
  s.slug AS stage_slug,
  s.label AS stage_label,
  s.sort_order AS stage_sort_order
FROM public.crm_b2b_deals d
LEFT JOIN public.crm_b2b_pipeline_stages s ON s.id = d.stage_id;

COMMENT ON VIEW public.crm_b2b_deals_readable IS
  'B2B sdelki s chelovekochitajemym etapom. RLS nasleduetsja ot bazovyh tablic (security_invoker).';

GRANT SELECT ON public.crm_b2b_deals_readable TO authenticated;
