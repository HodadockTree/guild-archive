ALTER TABLE monthly_highlights ADD COLUMN sourceActivityId TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS idx_monthly_highlights_source_activity
  ON monthly_highlights(sourceActivityId) WHERE sourceActivityId IS NOT NULL;
