-- Add billing columns to brands table for per-brand Stripe metered billing

-- Add Stripe subscription columns to brands
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT,
ADD COLUMN IF NOT EXISTS stripe_subscription_item_id TEXT,
ADD COLUMN IF NOT EXISTS billing_enabled BOOLEAN DEFAULT false;

-- Create index for subscription lookups
CREATE INDEX IF NOT EXISTS idx_brands_stripe_subscription 
ON brands(stripe_subscription_id) 
WHERE stripe_subscription_id IS NOT NULL;

-- Add credits tracking columns for pre-payment model
ALTER TABLE brands
ADD COLUMN IF NOT EXISTS credits_balance INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS credits_used_this_month INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS billing_cycle_start TIMESTAMPTZ;

-- Create function to reset monthly credits
CREATE OR REPLACE FUNCTION reset_monthly_credits()
RETURNS void AS $$
BEGIN
  UPDATE brands
  SET credits_used_this_month = 0,
      billing_cycle_start = date_trunc('month', NOW())
  WHERE billing_enabled = true
    AND (billing_cycle_start IS NULL 
         OR billing_cycle_start < date_trunc('month', NOW()));
END;
$$ LANGUAGE plpgsql;

-- Add comments
COMMENT ON COLUMN brands.stripe_subscription_id IS 'Stripe subscription ID for this brand (metered billing)';
COMMENT ON COLUMN brands.stripe_subscription_item_id IS 'Stripe subscription item ID for reporting usage';
COMMENT ON COLUMN brands.billing_enabled IS 'Whether this brand has active billing';
COMMENT ON COLUMN brands.credits_balance IS 'Pre-paid credits balance (for pay-upfront model)';
COMMENT ON COLUMN brands.credits_used_this_month IS 'Credits consumed this billing period';
COMMENT ON COLUMN brands.billing_cycle_start IS 'Start of current billing cycle';

-- Create usage_credits table for tracking credit purchases and consumption
CREATE TABLE IF NOT EXISTS usage_credits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  
  -- Transaction type
  transaction_type TEXT NOT NULL CHECK (transaction_type IN ('purchase', 'usage', 'refund', 'adjustment')),
  
  -- Amount (positive for purchases/refunds, negative for usage)
  credits INTEGER NOT NULL,
  
  -- Balance after this transaction
  balance_after INTEGER NOT NULL,
  
  -- Payment info (for purchases)
  stripe_payment_intent_id TEXT,
  amount_paid_cents INTEGER,
  
  -- Usage info (for consumption)
  usage_event_id UUID REFERENCES usage_events(id),
  
  -- Metadata
  description TEXT,
  metadata JSONB DEFAULT '{}',
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_usage_credits_brand ON usage_credits(brand_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_usage_credits_tenant ON usage_credits(tenant_id, created_at DESC);

-- Enable RLS
ALTER TABLE usage_credits ENABLE ROW LEVEL SECURITY;

-- RLS policy: users can view their own credits
-- Note: tenants.id IS the user_id (same as auth.uid())
CREATE POLICY "Users can view own credits" ON usage_credits
  FOR SELECT
  USING (
    tenant_id IN (
      SELECT id FROM tenants WHERE id = auth.uid()
    )
  );

COMMENT ON TABLE usage_credits IS 'Credit transaction ledger for per-brand usage billing';
