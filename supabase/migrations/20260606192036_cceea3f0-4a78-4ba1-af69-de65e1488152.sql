
-- ─────────────────────────────────────────────
-- REFERENCE / LOOKUP TABLES
-- ─────────────────────────────────────────────

CREATE TABLE public.service_territories (
  id   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_territories TO authenticated;
GRANT ALL    ON public.service_territories TO service_role;
ALTER TABLE public.service_territories ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read territories" ON public.service_territories FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage territories" ON public.service_territories FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.service_areas (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  territory_id UUID REFERENCES public.service_territories(id) ON DELETE SET NULL,
  name         TEXT NOT NULL,
  location_town TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.service_areas TO authenticated;
GRANT ALL    ON public.service_areas TO service_role;
ALTER TABLE public.service_areas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read service_areas" ON public.service_areas FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage service_areas" ON public.service_areas FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.districts (
  id     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name   TEXT NOT NULL,
  region TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.districts TO authenticated;
GRANT ALL    ON public.districts TO service_role;
ALTER TABLE public.districts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read districts" ON public.districts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage districts" ON public.districts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.feeders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service_area_id  UUID REFERENCES public.service_areas(id) ON DELETE SET NULL,
  name             TEXT NOT NULL,
  code             TEXT,
  network_voltage_kv INTEGER NOT NULL CHECK (network_voltage_kv IN (11, 33)),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.feeders TO authenticated;
GRANT ALL    ON public.feeders TO service_role;
ALTER TABLE public.feeders ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read feeders" ON public.feeders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage feeders" ON public.feeders FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.transformer_ratings (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kva                INTEGER NOT NULL,
  network_voltage_kv INTEGER NOT NULL CHECK (network_voltage_kv IN (11, 33)),
  display_label      TEXT NOT NULL,
  UNIQUE(kva, network_voltage_kv)
);
GRANT SELECT ON public.transformer_ratings TO authenticated;
GRANT ALL    ON public.transformer_ratings TO service_role;
ALTER TABLE public.transformer_ratings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read ratings" ON public.transformer_ratings FOR SELECT TO authenticated USING (true);
CREATE POLICY "Super admins manage ratings" ON public.transformer_ratings FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- ─────────────────────────────────────────────
-- HELPER: who can edit asset records?
-- ─────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.can_edit_assets(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id
      AND role IN ('super_admin','territory_manager','engineer','field_technician')
  )
$$;
REVOKE EXECUTE ON FUNCTION public.can_edit_assets(UUID) FROM PUBLIC, anon;

-- ─────────────────────────────────────────────
-- CORE ASSET TABLE
-- ─────────────────────────────────────────────

CREATE TABLE public.transformers (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  asset_id              TEXT UNIQUE,
  uedcl_reference       TEXT,
  manufacturer          TEXT,
  serial_number         TEXT,
  year_manufactured     INTEGER,
  rating_id             UUID REFERENCES public.transformer_ratings(id),
  kva_rating            INTEGER,
  network_voltage_kv    INTEGER CHECK (network_voltage_kv IN (11, 33)),
  voltage_secondary     TEXT,
  phase_type            TEXT,
  cooling_type          TEXT,
  mounting_type         TEXT,
  vector_group          TEXT,
  territory_id          UUID REFERENCES public.service_territories(id),
  service_area_id       UUID REFERENCES public.service_areas(id),
  feeder_id             UUID REFERENCES public.feeders(id),
  substation_name       TEXT,
  district_id           UUID REFERENCES public.districts(id),
  sub_county            TEXT,
  parish                TEXT,
  village               TEXT,
  site_name             TEXT,
  latitude              DECIMAL(10,8),
  longitude             DECIMAL(11,8),
  gps_method            TEXT DEFAULT 'field_captured',
  gps_accuracy          DECIMAL,
  install_date          DATE,
  installing_contractor TEXT,
  commissioned_by       TEXT,
  commissioning_date    DATE,
  warranty_expiry       DATE,
  operational_status    TEXT DEFAULT 'unverified',
  record_status         TEXT DEFAULT 'draft',
  last_inspection_date  TIMESTAMPTZ,
  last_maintenance_date TIMESTAMPTZ,
  last_load_reading_date TIMESTAMPTZ,
  has_open_fault        BOOLEAN DEFAULT false,
  batch_import_id       UUID,
  created_by            UUID REFERENCES auth.users(id),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by            UUID REFERENCES auth.users(id),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.transformers TO authenticated;
GRANT ALL ON public.transformers TO service_role;
ALTER TABLE public.transformers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read transformers" ON public.transformers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors create transformers"     ON public.transformers FOR INSERT TO authenticated WITH CHECK (public.can_edit_assets(auth.uid()));
CREATE POLICY "Editors update transformers"     ON public.transformers FOR UPDATE TO authenticated USING (public.can_edit_assets(auth.uid())) WITH CHECK (public.can_edit_assets(auth.uid()));
CREATE POLICY "Super admins delete transformers" ON public.transformers FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));

CREATE INDEX idx_transformers_territory   ON public.transformers(territory_id);
CREATE INDEX idx_transformers_service_area ON public.transformers(service_area_id);
CREATE INDEX idx_transformers_feeder      ON public.transformers(feeder_id);
CREATE INDEX idx_transformers_status      ON public.transformers(operational_status);
CREATE INDEX idx_transformers_asset_id    ON public.transformers(asset_id);

CREATE TRIGGER transformers_set_updated_at
  BEFORE UPDATE ON public.transformers
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-generated asset_id
CREATE SEQUENCE public.transformer_asset_seq START 1;

CREATE OR REPLACE FUNCTION public.generate_asset_id()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.asset_id IS NULL THEN
    NEW.asset_id := 'TRF-' || LPAD(nextval('public.transformer_asset_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.generate_asset_id() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER set_asset_id
  BEFORE INSERT ON public.transformers
  FOR EACH ROW EXECUTE FUNCTION public.generate_asset_id();

-- ─────────────────────────────────────────────
-- ACTIVITY TABLES
-- ─────────────────────────────────────────────

CREATE TABLE public.inspections (
  id                         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transformer_id             UUID NOT NULL REFERENCES public.transformers(id) ON DELETE CASCADE,
  inspector_id               UUID REFERENCES auth.users(id),
  inspection_date            TIMESTAMPTZ NOT NULL,
  visit_type                 TEXT,
  gps_lat                    DECIMAL(10,8),
  gps_lng                    DECIMAL(11,8),
  network_voltage_confirmed  BOOLEAN,
  kva_rating_confirmed       BOOLEAN,
  rating_discrepancy_flag    BOOLEAN DEFAULT false,
  rust_condition             TEXT,
  oil_leakage                TEXT,
  bushing_condition          TEXT,
  tank_damage                TEXT,
  cooling_fins_condition     TEXT,
  oil_level                  TEXT,
  silica_gel_color           TEXT,
  oil_test_required          BOOLEAN,
  load_phase_a               DECIMAL,
  load_phase_b               DECIMAL,
  load_phase_c               DECIMAL,
  voltage_hv                 DECIMAL,
  voltage_lv                 DECIMAL,
  load_percentage            DECIMAL,
  overload_flag              BOOLEAN DEFAULT false,
  security_fencing           TEXT,
  earthing                   TEXT,
  warning_signs              TEXT,
  vegetation_encroachment    TEXT,
  unauthorized_connections   BOOLEAN,
  condition_narrative        TEXT,
  recommended_action         TEXT,
  created_at                 TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.inspections TO authenticated;
GRANT ALL ON public.inspections TO service_role;
ALTER TABLE public.inspections ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read inspections" ON public.inspections FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors create inspections"     ON public.inspections FOR INSERT TO authenticated WITH CHECK (public.can_edit_assets(auth.uid()));
CREATE POLICY "Editors update inspections"     ON public.inspections FOR UPDATE TO authenticated USING (public.can_edit_assets(auth.uid())) WITH CHECK (public.can_edit_assets(auth.uid()));
CREATE POLICY "Super admins delete inspections" ON public.inspections FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
CREATE INDEX idx_inspections_transformer ON public.inspections(transformer_id);
CREATE INDEX idx_inspections_date        ON public.inspections(inspection_date DESC);

CREATE TABLE public.maintenance_records (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transformer_id            UUID NOT NULL REFERENCES public.transformers(id) ON DELETE CASCADE,
  technician_id             UUID REFERENCES auth.users(id),
  maintenance_date          TIMESTAMPTZ NOT NULL,
  maintenance_type          TEXT,
  team_contractor           TEXT,
  supervised_by             TEXT,
  oil_topup                 BOOLEAN,
  oil_topup_liters          DECIMAL,
  oil_replacement           BOOLEAN,
  oil_filtration            BOOLEAN,
  silica_gel_replaced       BOOLEAN,
  bushing_replacement       BOOLEAN,
  tap_changer_service       BOOLEAN,
  cooling_service           BOOLEAN,
  physical_cleaning         BOOLEAN,
  other_work                TEXT,
  parts_used                TEXT,
  post_condition_narrative  TEXT,
  load_after_a              DECIMAL,
  load_after_b              DECIMAL,
  load_after_c              DECIMAL,
  completed_by              TEXT,
  reviewed_by               TEXT,
  next_maintenance_date     DATE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.maintenance_records TO authenticated;
GRANT ALL ON public.maintenance_records TO service_role;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read maintenance" ON public.maintenance_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors create maintenance"     ON public.maintenance_records FOR INSERT TO authenticated WITH CHECK (public.can_edit_assets(auth.uid()));
CREATE POLICY "Editors update maintenance"     ON public.maintenance_records FOR UPDATE TO authenticated USING (public.can_edit_assets(auth.uid())) WITH CHECK (public.can_edit_assets(auth.uid()));
CREATE POLICY "Super admins delete maintenance" ON public.maintenance_records FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
CREATE INDEX idx_maintenance_transformer ON public.maintenance_records(transformer_id);
CREATE INDEX idx_maintenance_date        ON public.maintenance_records(maintenance_date DESC);

CREATE TABLE public.fault_records (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transformer_id         UUID NOT NULL REFERENCES public.transformers(id) ON DELETE CASCADE,
  reported_by            UUID REFERENCES auth.users(id),
  fault_datetime         TIMESTAMPTZ NOT NULL,
  fault_source           TEXT,
  fault_description      TEXT,
  fault_type             TEXT,
  severity               TEXT,
  network_voltage_kv     INTEGER,
  customers_affected     INTEGER,
  area_affected          TEXT,
  fault_status           TEXT NOT NULL DEFAULT 'open',
  assigned_to            UUID REFERENCES auth.users(id),
  date_assigned          TIMESTAMPTZ,
  target_resolution      TIMESTAMPTZ,
  resolved_date          TIMESTAMPTZ,
  resolution_description TEXT,
  root_cause             TEXT,
  parts_replaced         TEXT,
  downtime_hours         DECIMAL,
  resolved_by            UUID REFERENCES auth.users(id),
  created_at             TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.fault_records TO authenticated;
GRANT ALL ON public.fault_records TO service_role;
ALTER TABLE public.fault_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read faults" ON public.fault_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors create faults"     ON public.fault_records FOR INSERT TO authenticated WITH CHECK (public.can_edit_assets(auth.uid()));
CREATE POLICY "Editors update faults"     ON public.fault_records FOR UPDATE TO authenticated USING (public.can_edit_assets(auth.uid())) WITH CHECK (public.can_edit_assets(auth.uid()));
CREATE POLICY "Super admins delete faults" ON public.fault_records FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
CREATE INDEX idx_faults_transformer ON public.fault_records(transformer_id);
CREATE INDEX idx_faults_status      ON public.fault_records(fault_status);
CREATE INDEX idx_faults_datetime    ON public.fault_records(fault_datetime DESC);

CREATE TABLE public.installation_records (
  id                        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transformer_id            UUID NOT NULL REFERENCES public.transformers(id) ON DELETE CASCADE,
  installation_date         TIMESTAMPTZ NOT NULL,
  installation_type         TEXT,
  previous_transformer_id   UUID REFERENCES public.transformers(id),
  replacement_reason        TEXT,
  network_voltage_kv        INTEGER,
  kva_rating                INTEGER,
  installing_team           TEXT,
  supervised_by             TEXT,
  transformer_source        TEXT,
  pre_install_test_results  TEXT,
  commissioning_readings    TEXT,
  commissioned_by           TEXT,
  handover_date             DATE,
  created_at                TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.installation_records TO authenticated;
GRANT ALL ON public.installation_records TO service_role;
ALTER TABLE public.installation_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read installations" ON public.installation_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors create installations"     ON public.installation_records FOR INSERT TO authenticated WITH CHECK (public.can_edit_assets(auth.uid()));
CREATE POLICY "Editors update installations"     ON public.installation_records FOR UPDATE TO authenticated USING (public.can_edit_assets(auth.uid())) WITH CHECK (public.can_edit_assets(auth.uid()));
CREATE POLICY "Super admins delete installations" ON public.installation_records FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
CREATE INDEX idx_installations_transformer ON public.installation_records(transformer_id);

-- ─────────────────────────────────────────────
-- SUPPORTING TABLES
-- ─────────────────────────────────────────────

CREATE TABLE public.asset_photos (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transformer_id      UUID REFERENCES public.transformers(id) ON DELETE CASCADE,
  photo_category      TEXT,
  image_url           TEXT NOT NULL,
  captured_by         UUID REFERENCES auth.users(id),
  captured_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  linked_record_type  TEXT,
  linked_record_id    UUID
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.asset_photos TO authenticated;
GRANT ALL ON public.asset_photos TO service_role;
ALTER TABLE public.asset_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read photos" ON public.asset_photos FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors manage photos"     ON public.asset_photos FOR INSERT TO authenticated WITH CHECK (public.can_edit_assets(auth.uid()));
CREATE POLICY "Editors update photos"     ON public.asset_photos FOR UPDATE TO authenticated USING (public.can_edit_assets(auth.uid())) WITH CHECK (public.can_edit_assets(auth.uid()));
CREATE POLICY "Super admins delete photos" ON public.asset_photos FOR DELETE TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
CREATE INDEX idx_photos_transformer ON public.asset_photos(transformer_id);

CREATE TABLE public.asset_timeline (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transformer_id      UUID NOT NULL REFERENCES public.transformers(id) ON DELETE CASCADE,
  event_type          TEXT NOT NULL,
  event_summary       TEXT NOT NULL,
  linked_record_type  TEXT,
  linked_record_id    UUID,
  created_by          UUID REFERENCES auth.users(id),
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.asset_timeline TO authenticated;
GRANT ALL ON public.asset_timeline TO service_role;
ALTER TABLE public.asset_timeline ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read timeline" ON public.asset_timeline FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors append timeline"     ON public.asset_timeline FOR INSERT TO authenticated WITH CHECK (public.can_edit_assets(auth.uid()));
CREATE INDEX idx_timeline_transformer ON public.asset_timeline(transformer_id, created_at DESC);

CREATE TABLE public.qr_codes (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  transformer_id  UUID NOT NULL REFERENCES public.transformers(id) ON DELETE CASCADE,
  qr_code_string  TEXT UNIQUE NOT NULL,
  generated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  generated_by    UUID REFERENCES auth.users(id),
  status          TEXT NOT NULL DEFAULT 'active',
  last_scanned_at TIMESTAMPTZ
);
GRANT SELECT, INSERT, UPDATE ON public.qr_codes TO authenticated;
GRANT ALL ON public.qr_codes TO service_role;
ALTER TABLE public.qr_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Authenticated read qr_codes" ON public.qr_codes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Editors create qr_codes"     ON public.qr_codes FOR INSERT TO authenticated WITH CHECK (public.can_edit_assets(auth.uid()));
CREATE POLICY "Editors update qr_codes"     ON public.qr_codes FOR UPDATE TO authenticated USING (public.can_edit_assets(auth.uid())) WITH CHECK (public.can_edit_assets(auth.uid()));

CREATE TABLE public.notifications (
  id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id             UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type                TEXT NOT NULL,
  message             TEXT NOT NULL,
  linked_record_type  TEXT,
  linked_record_id    UUID,
  is_read             BOOLEAN NOT NULL DEFAULT false,
  created_at          TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.notifications TO authenticated;
GRANT ALL ON public.notifications TO service_role;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users read own notifications"   ON public.notifications FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users update own notifications" ON public.notifications FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Super admins manage notifications" ON public.notifications FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));
CREATE INDEX idx_notifications_user ON public.notifications(user_id, is_read);

CREATE TABLE public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES auth.users(id),
  action      TEXT NOT NULL,
  table_name  TEXT,
  record_id   UUID,
  old_values  JSONB,
  new_values  JSONB,
  ip_address  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT ON public.audit_logs TO authenticated;
GRANT ALL ON public.audit_logs TO service_role;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read audit_logs" ON public.audit_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'super_admin'));

CREATE TABLE public.import_logs (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  imported_by    UUID REFERENCES auth.users(id),
  file_name      TEXT,
  total_rows     INTEGER,
  success_count  INTEGER,
  skip_count     INTEGER,
  error_count    INTEGER,
  error_details  JSONB,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT ON public.import_logs TO authenticated;
GRANT ALL ON public.import_logs TO service_role;
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Super admins read import_logs" ON public.import_logs FOR SELECT TO authenticated USING (public.has_role(auth.uid(),'super_admin'));
CREATE POLICY "Editors create import_logs"    ON public.import_logs FOR INSERT TO authenticated WITH CHECK (public.can_edit_assets(auth.uid()));

-- ─────────────────────────────────────────────
-- SEED: TRANSFORMER RATINGS
-- ─────────────────────────────────────────────
INSERT INTO public.transformer_ratings (kva, network_voltage_kv, display_label) VALUES
  (50,   11, '50kVA/11kV'),
  (100,  11, '100kVA/11kV'),
  (160,  11, '160kVA/11kV'),
  (200,  11, '200kVA/11kV'),
  (250,  11, '250kVA/11kV'),
  (315,  11, '315kVA/11kV'),
  (500,  11, '500kVA/11kV'),
  (630,  11, '630kVA/11kV'),
  (1000, 11, '1000kVA/11kV'),
  (50,   33, '50kVA/33kV'),
  (100,  33, '100kVA/33kV'),
  (160,  33, '160kVA/33kV'),
  (200,  33, '200kVA/33kV'),
  (250,  33, '250kVA/33kV'),
  (315,  33, '315kVA/33kV'),
  (500,  33, '500kVA/33kV'),
  (630,  33, '630kVA/33kV'),
  (1000, 33, '1000kVA/33kV');

INSERT INTO public.service_territories (name, code) VALUES
  ('Central Service Territory',           'CST'),
  ('Northern Service Territory',          'NST'),
  ('North North West Service Territory',  'NNWST'),
  ('Eastern Service Territory',           'EST'),
  ('Western Service Territory',           'WST');
