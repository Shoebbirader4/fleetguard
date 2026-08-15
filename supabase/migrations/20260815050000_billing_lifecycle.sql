-- Provider-agnostic billing boundary for production payment integration.

CREATE TABLE IF NOT EXISTS public.billing_customers (
  tenant_id uuid PRIMARY KEY REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_customer_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_customer_id)
);

CREATE TABLE IF NOT EXISTS public.subscription_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  from_plan text,
  to_plan text,
  from_status text,
  to_status text,
  provider_event_id text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  UNIQUE(provider_event_id)
);

CREATE TABLE IF NOT EXISTS public.billing_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id uuid NOT NULL REFERENCES public.tenants(id) ON DELETE CASCADE,
  provider text,
  provider_invoice_id text,
  currency text NOT NULL DEFAULT 'INR' CHECK (currency = 'INR'),
  amount_inr integer NOT NULL CHECK (amount_inr >= 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','open','paid','past_due','void','refunded')),
  period_start timestamptz NOT NULL,
  period_end timestamptz NOT NULL,
  due_at timestamptz,
  paid_at timestamptz,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(provider, provider_invoice_id)
);

CREATE TABLE IF NOT EXISTS public.billing_webhook_events (
  provider text NOT NULL,
  provider_event_id text NOT NULL,
  event_type text NOT NULL,
  payload_hash text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz,
  processing_error text,
  PRIMARY KEY (provider, provider_event_id)
);

ALTER TABLE public.billing_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS billing_customers_owner ON public.billing_customers;
CREATE POLICY billing_customers_owner ON public.billing_customers FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id() AND public.has_permission('billing:manage'));
DROP POLICY IF EXISTS subscription_events_tenant ON public.subscription_events;
CREATE POLICY subscription_events_tenant ON public.subscription_events FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
DROP POLICY IF EXISTS billing_invoices_tenant ON public.billing_invoices;
CREATE POLICY billing_invoices_tenant ON public.billing_invoices FOR SELECT TO authenticated USING (tenant_id = public.current_tenant_id());
DROP POLICY IF EXISTS billing_webhook_no_client_access ON public.billing_webhook_events;
CREATE POLICY billing_webhook_no_client_access ON public.billing_webhook_events FOR ALL TO authenticated USING (false) WITH CHECK (false);

CREATE OR REPLACE FUNCTION public.request_plan_change(requested_plan text)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE tenant_row public.tenants%ROWTYPE; plan_row public.subscription_plans%ROWTYPE; previous_plan text; event_id uuid;
BEGIN
  IF NOT public.has_permission('billing:manage') THEN RAISE EXCEPTION 'Billing management permission required'; END IF;
  SELECT * INTO tenant_row FROM public.tenants WHERE id = public.current_tenant_id() FOR UPDATE;
  SELECT * INTO plan_row FROM public.subscription_plans WHERE code = requested_plan AND is_active = true;
  IF plan_row.code IS NULL THEN RAISE EXCEPTION 'Unknown subscription plan: %', requested_plan; END IF;
  previous_plan := coalesce(tenant_row.subscription_plan_code, tenant_row.subscription_plan);
  IF previous_plan = requested_plan AND tenant_row.subscription_status = 'active' THEN RETURN jsonb_build_object('status', 'already_active', 'snapshot', public.subscription_snapshot(tenant_row.id)); END IF;
  INSERT INTO public.subscription_events (tenant_id, event_type, from_plan, to_plan, from_status, to_status, metadata, created_by) VALUES (tenant_row.id, 'plan_change_requested', previous_plan, requested_plan, tenant_row.subscription_status, 'pending_payment', jsonb_build_object('price_per_vehicle_inr', plan_row.monthly_price_inr, 'billing_currency', 'INR'), auth.uid()) RETURNING id INTO event_id;
  RETURN jsonb_build_object('status', 'pending_payment', 'event_id', event_id, 'plan', requested_plan, 'price_per_vehicle_inr', plan_row.monthly_price_inr, 'billing_currency', 'INR', 'snapshot', public.subscription_snapshot(tenant_row.id));
END;
$$;

CREATE OR REPLACE FUNCTION public.record_billing_webhook(provider_name text, provider_event_id_value text, event_type_value text, payload_hash_value text)
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
BEGIN
  INSERT INTO public.billing_webhook_events (provider, provider_event_id, event_type, payload_hash) VALUES (provider_name, provider_event_id_value, event_type_value, payload_hash_value) ON CONFLICT (provider, provider_event_id) DO NOTHING;
  RETURN FOUND;
END;
$$;

COMMENT ON FUNCTION public.request_plan_change(text) IS 'Creates an auditable plan transition request. Production payment providers should call this only after verified payment confirmation.';
COMMENT ON FUNCTION public.record_billing_webhook(text,text,text,text) IS 'Idempotency boundary for verified provider webhook processing.';
