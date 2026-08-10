-- Existing activity dates remain start dates. A null endDate represents a single-day activity.
ALTER TABLE activities ADD COLUMN endDate TEXT;
