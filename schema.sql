-- Cloudflare D1 schema for 냥춘 길드 활동 아카이브 서버 DB.
-- 기존 better-sqlite3 스키마(src/lib/serverDb.ts)를 그대로 이식했습니다.
-- 적용: wrangler d1 execute <DB_NAME> --local --file=./schema.sql
--       wrangler d1 execute <DB_NAME> --remote --file=./schema.sql

CREATE TABLE IF NOT EXISTS members (
  id TEXT PRIMARY KEY,
  nickname TEXT NOT NULL,
  status TEXT NOT NULL,
  joinedAt TEXT,
  leftAt TEXT,
  memo TEXT,
  createdAt TEXT,
  updatedAt TEXT
);

CREATE TABLE IF NOT EXISTS activities (
  id TEXT PRIMARY KEY,
  type TEXT NOT NULL,
  date TEXT NOT NULL,
  title TEXT,
  memo TEXT,
  airshipType TEXT,
  imageDataUrl TEXT,
  createdAt TEXT,
  updatedAt TEXT
);

CREATE TABLE IF NOT EXISTS activity_participants (
  activityId TEXT NOT NULL,
  memberId TEXT NOT NULL,
  PRIMARY KEY (activityId, memberId),
  FOREIGN KEY (activityId) REFERENCES activities(id) ON DELETE CASCADE,
  FOREIGN KEY (memberId) REFERENCES members(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS activity_conquest_types (
  activityId TEXT NOT NULL,
  conquestType TEXT NOT NULL,
  PRIMARY KEY (activityId, conquestType),
  FOREIGN KEY (activityId) REFERENCES activities(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS import_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  importedAt TEXT NOT NULL,
  memberCount INTEGER NOT NULL,
  activityCount INTEGER NOT NULL,
  participantCount INTEGER NOT NULL,
  conquestTypeCount INTEGER NOT NULL
);

-- /archive, /viewer, /api/archive/months* 는 activities.date 기준으로 월별 정렬/집계하므로
-- 날짜 기준 조회와 참여자/점령전 조인 조회에 index를 둡니다.
CREATE INDEX IF NOT EXISTS idx_activities_date ON activities(date);
CREATE INDEX IF NOT EXISTS idx_activity_participants_memberId ON activity_participants(memberId);
CREATE INDEX IF NOT EXISTS idx_activity_conquest_types_activityId ON activity_conquest_types(activityId);
