-- Add source attribution columns to competitors table
-- Tracks which model and method produced each entity

ALTER TABLE competitors 
  ADD COLUMN IF NOT EXISTS source_model TEXT,
  ADD COLUMN IF NOT EXISTS source_method TEXT;

-- Add check constraint for known methods
ALTER TABLE competitors
  ADD CONSTRAINT competitors_source_method_check 
  CHECK (source_method IS NULL OR source_method IN (
    'onboarding_discovery',    -- Initial competitor/discover during onboarding
    'weekly_discovery',        -- Weekly competitor/discover refresh
    'scan_citation',           -- Auto-discovered from scan citation domains
    'citation_backfill',       -- Backfilled from historical citations
    'competitor_research',     -- Deep competitor research (new focused pipeline)
    'prompt_extraction',       -- Extracted from AI model responses
    'manual'                   -- Manually added by user
  ));

-- Add index for filtering by source
CREATE INDEX IF NOT EXISTS idx_competitors_source_method ON competitors(source_method);

-- Comment for documentation
COMMENT ON COLUMN competitors.source_model IS 'AI model that identified this entity (e.g. gpt-4o, gpt-4o-mini)';
COMMENT ON COLUMN competitors.source_method IS 'Pipeline that created this entity (onboarding_discovery, scan_citation, competitor_research, etc.)';

-- Backfill existing records where we can infer the source
UPDATE competitors 
SET source_method = 'scan_citation', source_model = 'gpt-4o-mini'
WHERE source_method IS NULL 
  AND context->>'discovered_from' = 'citations';

UPDATE competitors 
SET source_method = 'citation_backfill', source_model = 'gpt-4o-mini'
WHERE source_method IS NULL 
  AND context->>'discovered_from' = 'citations_backfill';

UPDATE competitors 
SET source_method = 'onboarding_discovery', source_model = 'gpt-4o'
WHERE source_method IS NULL 
  AND auto_discovered = true
  AND context->>'discovered_from' IS NULL;

UPDATE competitors 
SET source_method = 'manual'
WHERE source_method IS NULL 
  AND auto_discovered = false;
