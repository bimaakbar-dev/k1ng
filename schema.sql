CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL,
  role TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'offline',
  updated_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  details TEXT,
  assigned_to TEXT NOT NULL,
  created_by TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result TEXT,
  parent_id INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_tasks_assignee ON tasks(assigned_to, status);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT,
  task_id INTEGER,
  message TEXT,
  created_at INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_events_time ON events(created_at);

INSERT OR IGNORE INTO agents (id, username, role) VALUES
 ('k1ng',    'k1ingAgentBot',    'Manager / Koordinator'),
 ('z3us',    'z3us_studio_bot',    'Trend & Market Researcher'),
 ('a23s',    'a23s_studio_bot',    'Niche & Competition Analyst'),
 ('h3r4',    'h3r4_studio_bot',    'Metadata Writer (judul & deskripsi)'),
 ('a2tem1s', 'a2tem1s_studio_bot', 'Keyword Specialist'),
 ('p0seid0n','p0seid0n_studio_bot','QC & Compliance Reviewer'),
 ('h4d3s',   'h4d3s_studio_bot',   'Portfolio & Sales Analyst'),
 ('ap0ll0',  'ap0ll0_studio_bot',  'Creative Brief Planner');
