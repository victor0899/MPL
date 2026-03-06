-- Create table to track image analysis usage per group
CREATE TABLE IF NOT EXISTS image_analysis_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  group_id UUID NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  success BOOLEAN NOT NULL DEFAULT true,

  CONSTRAINT fk_user FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Add index for efficient queries by group and date
CREATE INDEX IF NOT EXISTS idx_image_analysis_logs_group_date
  ON image_analysis_logs(group_id, analyzed_at DESC);

-- Add index for user queries
CREATE INDEX IF NOT EXISTS idx_image_analysis_logs_user
  ON image_analysis_logs(user_id, analyzed_at DESC);

-- Enable RLS
ALTER TABLE image_analysis_logs ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view logs from their groups
CREATE POLICY "Users can view logs from their groups"
  ON image_analysis_logs
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM group_members gm
      WHERE gm.group_id = image_analysis_logs.group_id
        AND gm.user_id = auth.uid()
        AND gm.status = 'active'
    )
  );

-- Policy: Authenticated users can insert their own logs
CREATE POLICY "Users can insert their own analysis logs"
  ON image_analysis_logs
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Add comment
COMMENT ON TABLE image_analysis_logs IS 'Tracks image analysis API usage per group for rate limiting (5 per group per day)';
