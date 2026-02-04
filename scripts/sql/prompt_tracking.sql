-- Prompt Tracking Schema Extensions
-- Adds tracking fields to queries and scan_results tables for prompt-centric feed

-- ============================================================================
-- QUERIES TABLE EXTENSIONS
-- ============================================================================

-- Tracking fields
ALTER TABLE queries ADD COLUMN IF NOT EXISTS scan_count INTEGER DEFAULT 0;
ALTER TABLE queries ADD COLUMN IF NOT EXISTS last_scanned_at TIMESTAMPTZ;
ALTER TABLE queries ADD COLUMN IF NOT EXISTS first_cited_at TIMESTAMPTZ;
ALTER TABLE queries ADD COLUMN IF NOT EXISTS last_cited_at TIMESTAMPTZ;
ALTER TABLE queries ADD COLUMN IF NOT EXISTS citation_lost_at TIMESTAMPTZ;
ALTER TABLE queries ADD COLUMN IF NOT EXISTS citation_streak INTEGER DEFAULT 0;
ALTER TABLE queries ADD COLUMN IF NOT EXISTS longest_streak INTEGER DEFAULT 0;
ALTER TABLE queries ADD COLUMN IF NOT EXISTS current_status TEXT DEFAULT 'never_scanned';

-- Origin tracking
ALTER TABLE queries ADD COLUMN IF NOT EXISTS source_type TEXT DEFAULT 'auto';
ALTER TABLE queries ADD COLUMN IF NOT EXISTS source_batch_id TEXT;
ALTER TABLE queries ADD COLUMN IF NOT EXISTS inspired_by_competitor_id UUID REFERENCES competitors(id);

-- Exclusion tracking
ALTER TABLE queries ADD COLUMN IF NOT EXISTS excluded_at TIMESTAMPTZ;
ALTER TABLE queries ADD COLUMN IF NOT EXISTS excluded_reason TEXT;

-- Add check constraint for current_status
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'queries_current_status_check'
  ) THEN
    ALTER TABLE queries ADD CONSTRAINT queries_current_status_check 
      CHECK (current_status IN ('never_scanned', 'gap', 'cited', 'lost_citation'));
  END IF;
END $$;

-- Add check constraint for source_type
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'queries_source_type_check'
  ) THEN
    ALTER TABLE queries ADD CONSTRAINT queries_source_type_check 
      CHECK (source_type IN ('original', 'expanded', 'competitor_inspired', 'greenspace', 'manual', 'auto'));
  END IF;
END $$;

-- Add check constraint for excluded_reason
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'queries_excluded_reason_check'
  ) THEN
    ALTER TABLE queries ADD CONSTRAINT queries_excluded_reason_check 
      CHECK (excluded_reason IS NULL OR excluded_reason IN ('irrelevant', 'duplicate', 'low_value', 'other', 'manual'));
  END IF;
END $$;

-- ============================================================================
-- SCAN_RESULTS TABLE EXTENSIONS
-- ============================================================================

-- Delta tracking fields
ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS is_first_citation BOOLEAN DEFAULT FALSE;
ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS citation_status_changed BOOLEAN DEFAULT FALSE;
ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS previous_cited BOOLEAN;
ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS new_competitors_found TEXT[];
ALTER TABLE scan_results ADD COLUMN IF NOT EXISTS position_change INTEGER;

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Index for finding prompts by status
CREATE INDEX IF NOT EXISTS idx_queries_current_status ON queries(brand_id, current_status);

-- Index for finding prompts by source
CREATE INDEX IF NOT EXISTS idx_queries_source_type ON queries(brand_id, source_type);

-- Index for finding excluded prompts
CREATE INDEX IF NOT EXISTS idx_queries_excluded ON queries(brand_id, excluded_at) WHERE excluded_at IS NOT NULL;

-- Index for streak leaderboard
CREATE INDEX IF NOT EXISTS idx_queries_streak ON queries(brand_id, citation_streak DESC);

-- Index for scan results delta queries
CREATE INDEX IF NOT EXISTS idx_scan_results_query_scanned ON scan_results(query_id, scanned_at DESC);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON COLUMN queries.scan_count IS 'Total number of times this prompt has been scanned';
COMMENT ON COLUMN queries.last_scanned_at IS 'Timestamp of the most recent scan';
COMMENT ON COLUMN queries.first_cited_at IS 'Timestamp when brand was first cited for this prompt (BIG WIN)';
COMMENT ON COLUMN queries.last_cited_at IS 'Timestamp of most recent citation';
COMMENT ON COLUMN queries.citation_lost_at IS 'Timestamp when citation was lost after being cited (OH NO)';
COMMENT ON COLUMN queries.citation_streak IS 'Number of consecutive scans where brand was cited';
COMMENT ON COLUMN queries.longest_streak IS 'Highest citation streak ever achieved';
COMMENT ON COLUMN queries.current_status IS 'Current citation status: never_scanned, gap, cited, lost_citation';
COMMENT ON COLUMN queries.source_type IS 'How this prompt was created: original, expanded, competitor_inspired, greenspace, manual, auto';
COMMENT ON COLUMN queries.source_batch_id IS 'ID of the generation batch that created this prompt';
COMMENT ON COLUMN queries.inspired_by_competitor_id IS 'If competitor_inspired, which competitor';
COMMENT ON COLUMN queries.excluded_at IS 'When this prompt was excluded from scanning';
COMMENT ON COLUMN queries.excluded_reason IS 'Why this prompt was excluded';

COMMENT ON COLUMN scan_results.is_first_citation IS 'True if this scan was the first time brand was cited';
COMMENT ON COLUMN scan_results.citation_status_changed IS 'True if citation status changed from previous scan';
COMMENT ON COLUMN scan_results.previous_cited IS 'Whether brand was cited in the previous scan';
COMMENT ON COLUMN scan_results.new_competitors_found IS 'Competitors mentioned that were not in previous scan';
COMMENT ON COLUMN scan_results.position_change IS 'Change in brand position from previous scan (positive = improved)';
