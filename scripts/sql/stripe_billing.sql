-- Stripe billing setup
-- Run this in Supabase SQL Editor to enable billing

-- Add Stripe subscription fields to tenants table
ALTER TABLE tenants 
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_status TEXT,
ADD COLUMN IF NOT EXISTS plan_limits JSONB DEFAULT '{"prompts": 50, "memos_per_month": 5, "brands": 1, "seats": 1}'::jsonb,
ADD COLUMN IF NOT EXISTS current_period_end TIMESTAMPTZ;

-- Create usage tracking table
CREATE TABLE IF NOT EXISTS usage_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  usage_type TEXT NOT NULL, -- 'prompt', 'memo', 'scan'
  brand_id UUID REFERENCES brands(id) ON DELETE CASCADE,
  count INTEGER NOT NULL DEFAULT 1,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  -- Unique constraint to prevent duplicate entries per period
  UNIQUE(tenant_id, usage_type, brand_id, period_start)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_usage_tracking_tenant ON usage_tracking(tenant_id);
CREATE INDEX IF NOT EXISTS idx_usage_tracking_period ON usage_tracking(tenant_id, period_start, period_end);

-- Enable RLS
ALTER TABLE usage_tracking ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read their own usage
CREATE POLICY "Users can view own usage" ON usage_tracking
  FOR SELECT
  USING (tenant_id = auth.uid());

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to usage" ON usage_tracking
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to get current usage for a tenant
CREATE OR REPLACE FUNCTION get_tenant_usage(p_tenant_id UUID)
RETURNS TABLE (
  prompts_used BIGINT,
  memos_used BIGINT,
  brands_used BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    COALESCE(SUM(CASE WHEN usage_type = 'prompt' THEN count ELSE 0 END), 0) as prompts_used,
    COALESCE(SUM(CASE WHEN usage_type = 'memo' AND period_start >= date_trunc('month', CURRENT_DATE) THEN count ELSE 0 END), 0) as memos_used,
    (SELECT COUNT(*)::BIGINT FROM brands WHERE tenant_id = p_tenant_id) as brands_used
  FROM usage_tracking
  WHERE tenant_id = p_tenant_id
    AND period_end >= CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Add comment for documentation
COMMENT ON TABLE usage_tracking IS 'Tracks usage of billable features per tenant';
COMMENT ON COLUMN tenants.plan_limits IS 'JSON object with plan limits: {prompts, memos_per_month, brands, seats}';
