-- Add vertical and query_framing columns to queries table
-- Supports the Research tab: market x competitor matrix with buyer awareness scoring

ALTER TABLE queries ADD COLUMN IF NOT EXISTS vertical text;
ALTER TABLE queries ADD COLUMN IF NOT EXISTS query_framing text;

-- Constraint: query_framing must be 'problem' or 'solution' (or null for legacy queries)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'query_framing_check'
  ) THEN
    ALTER TABLE queries ADD CONSTRAINT query_framing_check
      CHECK (query_framing IN ('problem', 'solution') OR query_framing IS NULL);
  END IF;
END $$;

-- Index for efficient grouping by vertical
CREATE INDEX IF NOT EXISTS idx_queries_vertical ON queries (brand_id, vertical) WHERE vertical IS NOT NULL;

-- Index for framing-based awareness scoring
CREATE INDEX IF NOT EXISTS idx_queries_framing ON queries (brand_id, vertical, query_framing) WHERE query_framing IS NOT NULL;
