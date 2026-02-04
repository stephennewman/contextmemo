-- Brand Settings Table
-- Stores workflow automation toggles and consumption controls per brand

CREATE TABLE IF NOT EXISTS brand_settings (
  brand_id UUID PRIMARY KEY REFERENCES brands(id) ON DELETE CASCADE,
  
  -- Workflow 1: Core Discovery (Daily Scans)
  auto_scan_enabled BOOLEAN DEFAULT true,
  daily_scan_cap INTEGER DEFAULT 100, -- max queries to scan per day
  
  -- Workflow 2: Network Expansion
  auto_expand_network BOOLEAN DEFAULT false, -- analyze discovered competitors automatically
  max_competitors_to_expand INTEGER DEFAULT 3, -- per analysis run
  
  -- Workflow 3: Competitive Response  
  auto_respond_content BOOLEAN DEFAULT false, -- auto-generate response memos
  content_response_threshold TEXT DEFAULT 'high', -- 'all', 'high', 'critical'
  
  -- Workflow 4: Verification Loop
  auto_verify_citations BOOLEAN DEFAULT true, -- verify memos after publish
  verification_retry_days INTEGER DEFAULT 3, -- retry verification for X days
  
  -- Workflow 5: Greenspace Discovery
  weekly_greenspace_enabled BOOLEAN DEFAULT false, -- run weekly opportunity scan
  greenspace_day_of_week INTEGER DEFAULT 1, -- 0=Sunday, 1=Monday, etc.
  
  -- Memo generation limits
  auto_memo_enabled BOOLEAN DEFAULT false, -- auto-generate memos for gaps
  daily_memo_cap INTEGER DEFAULT 2, -- max memos to auto-generate per day
  memo_approval_required BOOLEAN DEFAULT true, -- require approval before publish
  
  -- Cost controls
  monthly_credit_cap INTEGER, -- optional hard cap on credits (null = plan limit)
  alert_at_percent INTEGER DEFAULT 80, -- alert when usage hits this % of cap
  pause_at_cap BOOLEAN DEFAULT true, -- stop automations when cap reached
  
  -- Notification preferences
  notify_on_gaps BOOLEAN DEFAULT true,
  notify_on_verifications BOOLEAN DEFAULT true,
  notify_on_competitor_content BOOLEAN DEFAULT true,
  notify_on_opportunities BOOLEAN DEFAULT false,
  notification_frequency TEXT DEFAULT 'realtime', -- 'realtime', 'daily_digest', 'weekly_digest'
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_brand_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER brand_settings_updated_at
  BEFORE UPDATE ON brand_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_brand_settings_updated_at();

-- Enable RLS
ALTER TABLE brand_settings ENABLE ROW LEVEL SECURITY;

-- Policy: Users can read settings for brands they own
CREATE POLICY "Users can view own brand settings" ON brand_settings
  FOR SELECT
  USING (
    brand_id IN (
      SELECT id FROM brands WHERE tenant_id = auth.uid()
    )
  );

-- Policy: Users can update settings for brands they own
CREATE POLICY "Users can update own brand settings" ON brand_settings
  FOR UPDATE
  USING (
    brand_id IN (
      SELECT id FROM brands WHERE tenant_id = auth.uid()
    )
  )
  WITH CHECK (
    brand_id IN (
      SELECT id FROM brands WHERE tenant_id = auth.uid()
    )
  );

-- Policy: Users can insert settings for brands they own
CREATE POLICY "Users can insert own brand settings" ON brand_settings
  FOR INSERT
  WITH CHECK (
    brand_id IN (
      SELECT id FROM brands WHERE tenant_id = auth.uid()
    )
  );

-- Policy: Service role has full access
CREATE POLICY "Service role has full access to brand_settings" ON brand_settings
  FOR ALL
  USING (true)
  WITH CHECK (true);

-- Function to auto-create settings when a brand is created
-- SECURITY DEFINER allows this function to bypass RLS when inserting brand_settings
CREATE OR REPLACE FUNCTION create_default_brand_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO brand_settings (brand_id)
  VALUES (NEW.id)
  ON CONFLICT (brand_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to auto-create settings for new brands
DROP TRIGGER IF EXISTS create_brand_settings_trigger ON brands;
CREATE TRIGGER create_brand_settings_trigger
  AFTER INSERT ON brands
  FOR EACH ROW
  EXECUTE FUNCTION create_default_brand_settings();

-- Add comments for documentation
COMMENT ON TABLE brand_settings IS 'Workflow automation toggles and consumption controls per brand';
COMMENT ON COLUMN brand_settings.auto_scan_enabled IS 'Whether daily scans run automatically (W1)';
COMMENT ON COLUMN brand_settings.auto_expand_network IS 'Whether to analyze discovered competitors automatically (W2)';
COMMENT ON COLUMN brand_settings.auto_respond_content IS 'Whether to auto-generate response memos for competitor content (W3)';
COMMENT ON COLUMN brand_settings.auto_verify_citations IS 'Whether to verify memo citations after publish (W4)';
COMMENT ON COLUMN brand_settings.weekly_greenspace_enabled IS 'Whether to run weekly greenspace opportunity scan (W5)';
COMMENT ON COLUMN brand_settings.monthly_credit_cap IS 'Optional hard cap on credits - null uses plan limit';
