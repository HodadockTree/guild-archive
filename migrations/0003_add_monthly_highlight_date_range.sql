ALTER TABLE monthly_highlights ADD COLUMN startDate TEXT;
ALTER TABLE monthly_highlights ADD COLUMN endDate TEXT;

CREATE INDEX IF NOT EXISTS idx_monthly_highlights_start_end
  ON monthly_highlights(startDate, endDate);
