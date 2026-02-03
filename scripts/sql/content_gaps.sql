-- Content Gaps table
-- Stores identified gaps where competitors are cited but the brand isn't
-- These are opportunities for content creation

CREATE TABLE IF NOT EXISTS content_gaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE CASCADE,
  competitor_id UUID REFERENCES competitors(id) ON DELETE SET NULL,
  competitor_name TEXT NOT NULL,
  
  -- Source information
  source_query TEXT NOT NULL,
  cited_url TEXT,
  
  -- Analysis results
  content_type TEXT, -- faq, comparison, how_to, product_page, blog_post, landing_page, documentation
  content_structure TEXT, -- Description of what made this content citable
  recommendation TEXT, -- What the brand should create
  key_factors JSONB DEFAULT '[]', -- Factors that enabled the citation
  query_alignment TEXT, -- How content matched user intent
  
  -- Status tracking
  status TEXT DEFAULT 'identified', -- identified, content_created, verified
  response_memo_id UUID REFERENCES memos(id) ON DELETE SET NULL,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  verified_at TIMESTAMPTZ
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_gaps_brand ON content_gaps(brand_id);
CREATE INDEX IF NOT EXISTS idx_content_gaps_status ON content_gaps(status);
CREATE INDEX IF NOT EXISTS idx_content_gaps_competitor ON content_gaps(competitor_id);

-- Add citation_analysis column to scan_results if not exists
ALTER TABLE scan_results 
ADD COLUMN IF NOT EXISTS citation_analysis JSONB;

-- Add context column to competitors if not exists
ALTER TABLE competitors 
ADD COLUMN IF NOT EXISTS context JSONB DEFAULT '{}',
ADD COLUMN IF NOT EXISTS context_extracted_at TIMESTAMPTZ;

-- Comment
COMMENT ON TABLE content_gaps IS 'Identified content gaps where competitors are cited but the brand is not. Used by the citation loop to drive content creation.';
