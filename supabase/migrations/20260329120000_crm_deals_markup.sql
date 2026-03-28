-- Natsenka % na moment sdelki (snap dlya otchetov; avto iz crm_services.default_markup_percent)

ALTER TABLE public.crm_deals
  ADD COLUMN IF NOT EXISTS deal_markup_percent numeric(7, 2);

COMMENT ON COLUMN public.crm_deals.deal_markup_percent IS
  'Procent natsenki na moment fiksatsii sdelki (iz uslugi ili ruchnaya korrektirovka).';
