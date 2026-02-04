-- Usage Events V2 Expansion
-- Adds workflow tracking and credits to usage_events table

-- Add new columns to usage_events if they don't exist
ALTER TABLE usage_events
ADD COLUMN IF NOT EXISTS workflow TEXT,
ADD COLUMN IF NOT EXISTS credits_used INTEGER DEFAULT 1,
ADD COLUMN IF NOT EXISTS feed_event_id UUID REFERENCES feed_events(id) ON DELETE SET NULL;

-- Create index for workflow-based queries
CREATE INDEX IF NOT EXISTS idx_usage_events_workflow ON usage_events(tenant_id, workflow, created_at DESC);

-- Create index for credit aggregation
CREATE INDEX IF NOT EXISTS idx_usage_events_credits ON usage_events(tenant_id, created_at DESC);

-- Function to get usage summary for a tenant
CREATE OR REPLACE FUNCTION get_tenant_usage_v2(
  p_tenant_id UUID,
  p_start_date TIMESTAMPTZ DEFAULT date_trunc('month', NOW()),
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  total_credits_used BIGINT,
  credits_by_workflow JSONB,
  credits_by_event_type JSONB,
  total_cost_cents NUMERIC,
  event_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(credits_used), 0)::BIGINT as total_credits_used,
    COALESCE(
      jsonb_object_agg(
        COALESCE(workflow, 'unknown'),
        workflow_credits
      ) FILTER (WHERE workflow IS NOT NULL),
      '{}'::jsonb
    ) as credits_by_workflow,
    COALESCE(
      jsonb_object_agg(
        event_type,
        type_credits
      ),
      '{}'::jsonb
    ) as credits_by_event_type,
    COALESCE(SUM(total_cost_cents), 0)::NUMERIC as total_cost_cents,
    COUNT(*)::BIGINT as event_count
  FROM (
    SELECT 
      workflow,
      event_type,
      SUM(credits_used) OVER (PARTITION BY workflow) as workflow_credits,
      SUM(credits_used) OVER (PARTITION BY event_type) as type_credits,
      total_cost_cents,
      credits_used
    FROM usage_events
    WHERE tenant_id = p_tenant_id
      AND created_at >= p_start_date
      AND created_at <= p_end_date
  ) subq;
END;
$$ LANGUAGE plpgsql;

-- Function to check if tenant has credits remaining
CREATE OR REPLACE FUNCTION check_credits_remaining(
  p_tenant_id UUID,
  p_credits_needed INTEGER DEFAULT 1
)
RETURNS TABLE (
  has_credits BOOLEAN,
  credits_used BIGINT,
  credits_limit INTEGER,
  credits_remaining INTEGER
) AS $$
DECLARE
  v_plan_limits JSONB;
  v_monthly_limit INTEGER;
  v_credits_used BIGINT;
BEGIN
  -- Get tenant's plan limits
  SELECT plan_limits INTO v_plan_limits
  FROM tenants
  WHERE id = p_tenant_id;
  
  -- Default limit if not set (use memos_per_month * 10 as credit equivalent)
  v_monthly_limit := COALESCE(
    (v_plan_limits->>'credits_per_month')::INTEGER,
    COALESCE((v_plan_limits->>'memos_per_month')::INTEGER, 30) * 10
  );
  
  -- Get credits used this month
  SELECT COALESCE(SUM(credits_used), 0) INTO v_credits_used
  FROM usage_events
  WHERE tenant_id = p_tenant_id
    AND created_at >= date_trunc('month', NOW());
  
  RETURN QUERY SELECT
    (v_credits_used + p_credits_needed <= v_monthly_limit) as has_credits,
    v_credits_used as credits_used,
    v_monthly_limit as credits_limit,
    GREATEST(0, v_monthly_limit - v_credits_used::INTEGER) as credits_remaining;
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON COLUMN usage_events.workflow IS 'Which workflow generated this usage (core_discovery, network_expansion, etc.)';
COMMENT ON COLUMN usage_events.credits_used IS 'Number of credits consumed by this event';
COMMENT ON COLUMN usage_events.feed_event_id IS 'Link to the feed event that triggered this usage (if any)';
