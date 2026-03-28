-- Prosmotr kursov dlya B2B i admin (pereschet summy sdelki v USD na karte jurlica).

CREATE POLICY crm_fx_select_b2b_admin
  ON public.crm_exchange_rates FOR SELECT TO authenticated
  USING (public.crm_can_access_b2b() OR public.crm_is_admin());
