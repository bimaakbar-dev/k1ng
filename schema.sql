-- KONTRAK BERSAMA semua repo. Jalankan SEKALI saja (dari repo k1ng).
-- Mengubah skema = cek ulang semua repo.

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'offline',   -- offline | idle | thinking | working
  updated_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  details TEXT,
  assigned_to TEXT NOT NULL,
  created_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',   -- pending | in_progress | done | failed
  result TEXT,
  parent_id INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assigned_to, status);

CREATE TABLE IF NOT EXISTS events (            -- dibaca oleh UI
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent TEXT NOT NULL,
  type TEXT NOT NULL,                          -- message | delegate | task_start | task_done | task_failed | reply
  status TEXT,
  task_id INTEGER,
  message TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_time ON events(created_at);

-- Username bot = placeholder, ganti sesuai hasil @BotFather. Role boleh diubah.
INSERT OR IGNORE INTO agents (id, username, role) VALUES
 ('k1ng',    'k1ingAgentBot',    'Manager / Koordinator'),
 ('z3us',    'z3usAgentBot',    'Trend & Market Researcher'),
 ('a23s',    'a23sAgentBot',    'Niche & Competition Analyst'),
 ('h3r4',    'He2aAgentBot',    'Metadata Writer (judul & deskripsi)'),
 ('a2tem1s', 'a2tem1s_studio_bot', 'Keyword Specialist'),
 ('p0seid0n','p0seid0n_studio_bot','QC & Compliance Reviewer'),
 ('h4d3s',   'h4d3sAgentBot',   'Portfolio & Sales Analyst'),
 ('ap0ll0',  'ap0ll0_studio_bot',  'Creative Brief Planner');
