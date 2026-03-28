-- Roznica: menedzher na sdelke; vse sotrudniki CRM vidjat spisok kolleg dlja naznachenija.

ALTER TABLE public.crm_deals
  ADD COLUMN IF NOT EXISTS assigned_to uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_crm_deals_assigned_to ON public.crm_deals (assigned_to);

COMMENT ON COLUMN public.crm_deals.assigned_to IS 'Otvetstvennyj menedzher (polzovatel iz crm_staff).';

-- Ljuboj polzovatel iz crm_staff mozhet chitat vseh sotrudnikov (email dlja vypadajushhih spiskov).
CREATE POLICY crm_staff_select_team
  ON public.crm_staff FOR SELECT TO authenticated
  USING (public.crm_is_staff());
