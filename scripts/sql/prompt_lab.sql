-- Prompt Lab Tables
-- Run this in Supabase SQL Editor

-- Table for lab run sessions
CREATE TABLE IF NOT EXISTS prompt_lab_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'running', 'completed', 'stopped', 'cancelled', 'error')),
  duration_minutes int DEFAULT 60,
  budget_cents int DEFAULT 5000,  -- $50 default
  models_used text[] DEFAULT ARRAY['perplexity-sonar', 'gpt-4o-mini', 'claude-3-5-haiku', 'grok-4-fast'],
  stats jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

-- Table for individual scan results from lab runs
CREATE TABLE IF NOT EXISTS lab_scan_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lab_run_id text NOT NULL,  -- Can be uuid or string fallback
  brand_id uuid REFERENCES brands(id) ON DELETE CASCADE NOT NULL,
  prompt_text text NOT NULL,
  model text NOT NULL,
  response_text text,
  brand_mentioned boolean DEFAULT false,
  brand_cited boolean DEFAULT false,
  entities_mentioned text[] DEFAULT '{}',
  citations text[],
  input_tokens int DEFAULT 0,
  output_tokens int DEFAULT 0,
  cost_cents numeric(10,4) DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_lab_runs_brand_id ON prompt_lab_runs(brand_id);
CREATE INDEX IF NOT EXISTS idx_lab_runs_status ON prompt_lab_runs(status);
CREATE INDEX IF NOT EXISTS idx_lab_results_run_id ON lab_scan_results(lab_run_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_brand_id ON lab_scan_results(brand_id);
CREATE INDEX IF NOT EXISTS idx_lab_results_model ON lab_scan_results(model);
CREATE INDEX IF NOT EXISTS idx_lab_results_brand_cited ON lab_scan_results(brand_cited);
CREATE INDEX IF NOT EXISTS idx_lab_results_created_at ON lab_scan_results(created_at);

-- View for analyzing cross-model citation patterns
CREATE OR REPLACE VIEW lab_model_comparison AS
SELECT 
  brand_id,
  model,
  COUNT(*) as total_scans,
  COUNT(*) FILTER (WHERE brand_cited) as citations,
  ROUND(100.0 * COUNT(*) FILTER (WHERE brand_cited) / COUNT(*), 1) as citation_rate,
  COUNT(*) FILTER (WHERE brand_mentioned) as mentions,
  ROUND(100.0 * COUNT(*) FILTER (WHERE brand_mentioned) / COUNT(*), 1) as mention_rate
FROM lab_scan_results
GROUP BY brand_id, model;

-- View for top entities across all scans
CREATE OR REPLACE VIEW lab_top_entities AS
SELECT 
  brand_id,
  entity,
  COUNT(*) as mention_count,
  COUNT(DISTINCT model) as models_mentioning,
  COUNT(DISTINCT prompt_text) as unique_prompts
FROM lab_scan_results, unnest(entities_mentioned) as entity
WHERE array_length(entities_mentioned, 1) > 0
GROUP BY brand_id, entity
ORDER BY mention_count DESC;

-- Enable RLS
ALTER TABLE prompt_lab_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE lab_scan_results ENABLE ROW LEVEL SECURITY;

-- RLS Policies (users can only see their own brand's data)
CREATE POLICY "Users can view their brand lab runs" ON prompt_lab_runs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM brands WHERE brands.id = prompt_lab_runs.brand_id
      AND brands.tenant_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert lab runs for their brands" ON prompt_lab_runs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM brands WHERE brands.id = prompt_lab_runs.brand_id
      AND brands.tenant_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their brand lab runs" ON prompt_lab_runs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM brands WHERE brands.id = prompt_lab_runs.brand_id
      AND brands.tenant_id = auth.uid()
    )
  );

CREATE POLICY "Users can view their brand lab results" ON lab_scan_results
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM brands WHERE brands.id = lab_scan_results.brand_id
      AND brands.tenant_id = auth.uid()
    )
  );

-- Service role bypass for Inngest functions
CREATE POLICY "Service role can manage lab runs" ON prompt_lab_runs
  FOR ALL USING (auth.role() = 'service_role');

CREATE POLICY "Service role can manage lab results" ON lab_scan_results
  FOR ALL USING (auth.role() = 'service_role');

-- Comments
COMMENT ON TABLE prompt_lab_runs IS 'High-volume prompt research sessions';
COMMENT ON TABLE lab_scan_results IS 'Individual scan results from prompt lab runs';
COMMENT ON VIEW lab_model_comparison IS 'Compare citation rates across AI models';
COMMENT ON VIEW lab_top_entities IS 'Most frequently mentioned entities across lab scans';
