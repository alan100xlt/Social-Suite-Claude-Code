CREATE POLICY "creator_can_read_own_company"
  ON public.companies FOR SELECT
  USING (created_by = auth.uid());