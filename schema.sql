-- Schema D1 untuk studio multi-agent Agent AI
-- Jalankan sekali: npx wrangler d1 execute studio --remote --file=schema.sql

CREATE TABLE IF NOT EXISTS agents (
  id TEXT PRIMARY KEY,
  username TEXT,
  role TEXT,
  status TEXT DEFAULT 'idle',
  updated_at INTEGER DEFAULT (strftime('%s', 'now') * 1000)
);

CREATE TABLE IF NOT EXISTS tasks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  details TEXT,
  assigned_to TEXT NOT NULL,
  created_by TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  result TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  agent TEXT NOT NULL,
  type TEXT NOT NULL,
  status TEXT,
  task_id INTEGER,
  message TEXT,
  created_at INTEGER
);

-- Insert default agents (id harus cocok dengan AGENT_NAME di wrangler.toml masing-masing repo)
INSERT OR IGNORE INTO agents (id, username, role, status) VALUES
  ('k1ng', 'k1ingAgentBot', 'Manager / Koordinator', 'idle'),
  ('z3us', 'z3usAgentBot', 'Trend & Market Researcher', 'idle'),
  ('h4d3s', 'had3sAgentBot', 'Portfolio & Sales Analyst', 'idle'),
  ('ap0ll0', 'ap0ll0AgentBot', 'Creative Brief Planner', 'idle'),
  ('h3r4', 'He2aBot', 'Metadata Writer', 'idle'),
  ('p0seid0n', 'p0seid0nAgentBot', 'QC & Compliance Reviewer', 'idle'),
  ('a2tem1s', 'a2tem1sAgentBot', 'Keyword Specialist', 'idle'),
  ('a23s', 'a23sAgentBot', 'Niche & Competition Analyst', 'idle');
