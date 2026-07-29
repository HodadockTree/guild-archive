-- 기존 길드원 행과 활동/이미지 데이터는 유지합니다.
ALTER TABLE members ADD COLUMN gender TEXT;
ALTER TABLE members ADD COLUMN birthYear INTEGER;

CREATE TABLE IF NOT EXISTS monthly_highlights (
  id TEXT PRIMARY KEY,
  month TEXT NOT NULL,
  category TEXT NOT NULL,
  title TEXT NOT NULL,
  dateText TEXT,
  description TEXT,
  imageUrl TEXT,
  createdAt TEXT NOT NULL,
  updatedAt TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_monthly_highlights_month
  ON monthly_highlights(month);
CREATE INDEX IF NOT EXISTS idx_monthly_highlights_month_createdAt
  ON monthly_highlights(month, createdAt);
