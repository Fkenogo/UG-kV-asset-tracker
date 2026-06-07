
CREATE POLICY "Authenticated read asset-photos"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'asset-photos');

CREATE POLICY "Editors upload asset-photos"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'asset-photos' AND public.can_edit_assets(auth.uid()));

CREATE POLICY "Editors update asset-photos"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'asset-photos' AND public.can_edit_assets(auth.uid()));

CREATE POLICY "Super admins delete asset-photos"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'asset-photos' AND public.has_role(auth.uid(),'super_admin'));
