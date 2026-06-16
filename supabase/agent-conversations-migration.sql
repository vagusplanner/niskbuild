-- AI Help Assistant conversation log (user + admin copilot)
CREATE TABLE IF NOT EXISTS agent_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  message TEXT NOT NULL,
  response TEXT NOT NULL,
  provider TEXT NOT NULL CHECK (provider IN ('ollama', 'groq')),
  prompt_type TEXT NOT NULL CHECK (prompt_type IN ('simple', 'complex')),
  mode TEXT NOT NULL DEFAULT 'user' CHECK (mode IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_agent_conversations_user ON agent_conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_agent_conversations_mode ON agent_conversations(mode, created_at DESC);

ALTER TABLE agent_conversations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own agent conversations"
  ON agent_conversations FOR SELECT
  USING (auth.uid() = user_id);
