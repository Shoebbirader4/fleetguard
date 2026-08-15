-- Domain integrity guards: prevent cross-tenant links and invalid stock mutations.

CREATE OR REPLACE FUNCTION public.validate_tenant_relationships()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE parent_tenant uuid;
BEGIN
  IF TG_TABLE_NAME = 'components' AND NEW.vehicle_id IS NOT NULL THEN
    SELECT tenant_id INTO parent_tenant FROM public.vehicles WHERE id = NEW.vehicle_id;
  ELSIF TG_TABLE_NAME IN ('work_orders','odometer_readings','inspections') AND NEW.vehicle_id IS NOT NULL THEN
    SELECT tenant_id INTO parent_tenant FROM public.vehicles WHERE id = NEW.vehicle_id;
  ELSIF TG_TABLE_NAME = 'documents' AND NEW.vehicle_id IS NOT NULL THEN
    SELECT tenant_id INTO parent_tenant FROM public.vehicles WHERE id = NEW.vehicle_id;
  ELSIF TG_TABLE_NAME = 'predictions' AND NEW.component_id IS NOT NULL THEN
    SELECT tenant_id INTO parent_tenant FROM public.components WHERE id = NEW.component_id;
  ELSIF TG_TABLE_NAME = 'alerts' AND NEW.vehicle_id IS NOT NULL THEN
    SELECT tenant_id INTO parent_tenant FROM public.vehicles WHERE id = NEW.vehicle_id;
  END IF;
  IF parent_tenant IS NOT NULL AND parent_tenant <> NEW.tenant_id THEN RAISE EXCEPTION 'Cross-tenant relationship rejected for %', TG_TABLE_NAME USING ERRCODE = '23514'; END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['components','work_orders','odometer_readings','inspections','documents','predictions','alerts'] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS validate_tenant_relationships_%I ON public.%I', table_name, table_name);
      EXECUTE format('CREATE TRIGGER validate_tenant_relationships_%I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.validate_tenant_relationships()', table_name, table_name);
    END IF;
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION public.validate_stock_quantity()
RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  IF (to_jsonb(NEW) ? 'quantity') AND coalesce((to_jsonb(NEW)->>'quantity')::numeric, 0) <= 0 THEN RAISE EXCEPTION 'Stock transaction quantity must be greater than zero'; END IF;
  IF (to_jsonb(NEW) ? 'current_quantity') AND coalesce((to_jsonb(NEW)->>'current_quantity')::numeric, 0) < 0 THEN RAISE EXCEPTION 'Inventory quantity cannot be negative'; END IF;
  IF (to_jsonb(NEW) ? 'reorder_level') AND coalesce((to_jsonb(NEW)->>'reorder_level')::numeric, 0) < 0 THEN RAISE EXCEPTION 'Reorder level cannot be negative'; END IF;
  RETURN NEW;
END;
$$;

DO $$
DECLARE table_name text;
BEGIN
  FOREACH table_name IN ARRAY ARRAY['spare_parts','stock_transactions'] LOOP
    IF to_regclass('public.' || table_name) IS NOT NULL THEN
      EXECUTE format('DROP TRIGGER IF EXISTS validate_stock_quantity_%I ON public.%I', table_name, table_name);
      EXECUTE format('CREATE TRIGGER validate_stock_quantity_%I BEFORE INSERT OR UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.validate_stock_quantity()', table_name, table_name);
    END IF;
  END LOOP;
END $$;

COMMENT ON FUNCTION public.validate_tenant_relationships() IS 'Rejects cross-tenant vehicle, component, document, alert, prediction, and work-order relationships.';
COMMENT ON FUNCTION public.validate_stock_quantity() IS 'Rejects negative inventory and non-positive stock transactions.';
