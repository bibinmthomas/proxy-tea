-- Sessions
CREATE TABLE sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  expires_at TIMESTAMPTZ DEFAULT (NOW() + INTERVAL '1 hour')
);

-- Items
CREATE TABLE items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  label TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Votes
CREATE TABLE votes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  item_id UUID REFERENCES items(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE NOT NULL,
  voter_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(item_id, voter_id)
);

-- Enable Realtime
ALTER TABLE sessions REPLICA IDENTITY FULL;
ALTER TABLE items REPLICA IDENTITY FULL;
ALTER TABLE votes REPLICA IDENTITY FULL;

-- Enable RLS (allow all for anon key since no auth)
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE items ENABLE ROW LEVEL SECURITY;
ALTER TABLE votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow all on sessions" ON sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all on items" ON items FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "allow all on votes" ON votes FOR ALL USING (true) WITH CHECK (true);
