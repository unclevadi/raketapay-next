-- Polnye prava: bootstrap-email ili edinstvennaja stroka crm_staff (pervyj sotrudnik).
-- Inache — UPDATE vruchnuju po email / user_id.

UPDATE public.crm_staff s
SET
  can_access_retail = true,
  can_access_b2b = true,
  is_admin = true
WHERE lower(coalesce(s.email, '')) LIKE '%@crm.raketapay.internal'
   OR (SELECT count(*) FROM public.crm_staff) = 1;
