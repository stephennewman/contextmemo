-- ============================================================================
-- Entity Types Migration
-- Add entity_type column to competitors table and create entity_profiles table
-- for competitive comparison matrix
-- ============================================================================

-- Step 1: Add entity_type column to competitors table
-- This allows us to distinguish between actual competitors and other entities
-- like publishers, associations, news outlets, etc.
ALTER TABLE competitors 
ADD COLUMN IF NOT EXISTS entity_type TEXT DEFAULT 'product_competitor';

-- Add is_partner_candidate flag to identify potential partnership opportunities
ALTER TABLE competitors 
ADD COLUMN IF NOT EXISTS is_partner_candidate BOOLEAN DEFAULT FALSE;

-- Step 2: Create entity_profiles table for storing comparison attributes
-- This enables the "us vs them" comparison matrix feature
CREATE TABLE IF NOT EXISTS entity_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  competitor_id UUID NOT NULL REFERENCES competitors(id) ON DELETE CASCADE,
  
  -- Comparison attributes (flexible key-value structure)
  -- Common attributes: pricing, deployment, integrations, support, features, etc.
  attribute_name TEXT NOT NULL,
  
  -- Values for brand (us) vs competitor (them)
  brand_value TEXT,
  competitor_value TEXT,
  
  -- Assessment: how do we compare? (win, lose, tie, unknown)
  comparison_result TEXT CHECK (comparison_result IN ('win', 'lose', 'tie', 'unknown', 'na')),
  
  -- Notes/context for this comparison point
  notes TEXT,
  
  -- Importance/priority of this attribute (for sorting/display)
  importance INTEGER DEFAULT 50 CHECK (importance >= 0 AND importance <= 100),
  
  -- Source: where this info came from
  source TEXT, -- 'manual', 'ai_extracted', 'website', 'customer_feedback'
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Unique constraint: one attribute per competitor per brand
  UNIQUE(brand_id, competitor_id, attribute_name)
);

-- Step 3: Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_entity_profiles_brand 
  ON entity_profiles(brand_id);

CREATE INDEX IF NOT EXISTS idx_entity_profiles_competitor 
  ON entity_profiles(competitor_id);

CREATE INDEX IF NOT EXISTS idx_competitors_entity_type 
  ON competitors(entity_type);

CREATE INDEX IF NOT EXISTS idx_competitors_partner_candidate 
  ON competitors(is_partner_candidate) WHERE is_partner_candidate = TRUE;

-- Step 4: Add RLS policies for entity_profiles
ALTER TABLE entity_profiles ENABLE ROW LEVEL SECURITY;

-- Users can view profiles for their brands
CREATE POLICY entity_profiles_select ON entity_profiles
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM brands b
      JOIN tenants t ON b.tenant_id = t.id
      WHERE b.id = entity_profiles.brand_id
      AND t.id = auth.uid()
    )
  );

-- Users can manage profiles for their brands
CREATE POLICY entity_profiles_all ON entity_profiles
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM brands b
      JOIN tenants t ON b.tenant_id = t.id
      WHERE b.id = entity_profiles.brand_id
      AND t.id = auth.uid()
    )
  );

-- Step 5: Create helper function to get comparison summary
CREATE OR REPLACE FUNCTION get_competitor_comparison_summary(p_brand_id UUID, p_competitor_id UUID)
RETURNS TABLE (
  total_attributes INTEGER,
  wins INTEGER,
  losses INTEGER,
  ties INTEGER,
  win_rate NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*)::INTEGER as total_attributes,
    COUNT(*) FILTER (WHERE comparison_result = 'win')::INTEGER as wins,
    COUNT(*) FILTER (WHERE comparison_result = 'lose')::INTEGER as losses,
    COUNT(*) FILTER (WHERE comparison_result = 'tie')::INTEGER as ties,
    CASE 
      WHEN COUNT(*) FILTER (WHERE comparison_result IN ('win', 'lose')) > 0 
      THEN ROUND(
        COUNT(*) FILTER (WHERE comparison_result = 'win')::NUMERIC / 
        NULLIF(COUNT(*) FILTER (WHERE comparison_result IN ('win', 'lose')), 0) * 100, 
        1
      )
      ELSE 0
    END as win_rate
  FROM entity_profiles
  WHERE brand_id = p_brand_id 
  AND competitor_id = p_competitor_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Step 6: Add common attributes template (stored in brand context)
-- These are suggested attributes that appear when creating comparison profiles
COMMENT ON TABLE entity_profiles IS 'Stores competitive comparison attributes for the us vs them matrix. Common attributes include: pricing_model, deployment_options, ease_of_use, customer_support, integrations, scalability, security_compliance, time_to_value, mobile_experience, customization, reporting, api_access';

-- Step 7: Update existing competitors to have default entity_type based on context
-- If context.competition_type = 'direct', set entity_type = 'product_competitor'
-- If context.competition_type = 'partial', set entity_type = 'product_competitor' (partial overlap)
-- This preserves existing data while adding the new classification
UPDATE competitors 
SET entity_type = 'product_competitor'
WHERE entity_type IS NULL;
