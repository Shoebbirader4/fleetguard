-- FleetGuard production hardening: tenant boundaries and audit events.

CREATE TABLE IF NOT EXISTS public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  user_id uuid REFERENCES public.users(id) ON DELETE SET NULL,
  operation text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  changed_fields jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  actor_role text,
  source text NOT NULL DEFAULT 'application',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS actor_role text;
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'application';
ALTER TABLE public.audit_logs ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE public.audit_logs ALTER COLUMN user_id DROP NOT NULL;
CREATE INDEX IF NOT EXISTS idx_audit_logs_tenant_created ON public.audit_logs (tenant_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON public.audit_logs (entity_type, entity_id);

CREATE OR REPLACE FUNCTION public.write_audit_event()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE before_row jsonb; after_row jsonb; tenant_uuid uuid; entity_uuid uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN before_row := to_jsonb(OLD); after_row := NULL; tenant_uuid := OLD.tenant_id; entity_uuid := OLD.id;
  ELSE before_row := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE NULL END; after_row := to_jsonb(NEW); tenant_uuid := NEW.tenant_id; entity_uuid := NEW.id;
  END IF;
  IF tenant_uuid IS NOT NULL THEN
    INSERT INTO public.audit_logs (tenant_id, user_id, operation, entity_type, entity_id, changed_fields, metadata, actor_role, source)
    VALUES (tenant_uuid, auth.uid(), lower(TG_OP), TG_TABLE_NAME, entity_uuid,
      CASE WHEN TG_OP = 'UPDATE' THEN jsonb_build_object('before', before_row, 'after', after_row) ELSE NULL END,
      jsonb_build_object('request_id', coalesce(current_setting('request.headers', true), '{}')), public.current_user_role(), CASE WHEN auth.role() = 'service_role' THEN 'system' ELSE 'application' END);
  END IF;
  RETURN coalesce(NEW, OLD);
END;
$$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['tenants','users','vehicles','components','odometer_readings','work_orders','alerts','predictions','spare_parts','documents','inspections','vendors','purchase_orders','stock_transactions'] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS fleetguard_audit_%I ON public.%I', table_name, table_name);
      EXECUTE format('CREATE TRIGGER fleetguard_audit_%I AFTER INSERT OR UPDATE OR DELETE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.write_audit_event()', table_name, table_name);
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.prevent_audit_mutation()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$ BEGIN RAISE EXCEPTION 'Audit logs are immutable'; END; $$;
DROP TRIGGER IF EXISTS audit_logs_no_update ON public.audit_logs;
DROP TRIGGER IF EXISTS audit_logs_no_delete ON public.audit_logs;
CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();
CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON public.audit_logs FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_mutation();

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS audit_logs_tenant_select ON public.audit_logs;
CREATE POLICY audit_logs_tenant_select ON public.audit_logs FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id() AND public.has_permission('audit:view'));
DROP POLICY IF EXISTS audit_logs_system_insert ON public.audit_logs;
CREATE POLICY audit_logs_system_insert ON public.audit_logs FOR INSERT WITH CHECK (auth.role() = 'service_role' OR tenant_id = public.current_tenant_id());

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['users','vehicles','components','odometer_readings','work_orders','alerts','predictions','spare_parts','documents','inspections','vendors','purchase_orders','stock_transactions'] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = 'public' AND table_name = table_name AND column_name = 'tenant_id') THEN
      EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', table_name);
      EXECUTE format('DROP POLICY IF EXISTS fleetguard_tenant_boundary ON public.%I', table_name);
      EXECUTE format('CREATE POLICY fleetguard_tenant_boundary ON public.%I AS RESTRICTIVE FOR ALL TO authenticated USING (tenant_id = public.current_tenant_id()) WITH CHECK (tenant_id = public.current_tenant_id())', table_name);
    END IF;
  END LOOP;
END $$;

COMMENT ON FUNCTION public.write_audit_event() IS 'Writes tenant-scoped immutable audit events for security-sensitive FleetGuard mutations.';
COMMENT ON FUNCTION public.prevent_audit_mutation() IS 'Prevents updates and deletes to audit history.';
