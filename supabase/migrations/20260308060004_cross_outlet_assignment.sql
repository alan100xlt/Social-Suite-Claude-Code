-- Cross-outlet assignment support
ALTER TABLE inbox_conversations ADD COLUMN IF NOT EXISTS cross_outlet_source uuid REFERENCES companies(id);
CREATE INDEX IF NOT EXISTS idx_inbox_conv_cross_outlet ON inbox_conversations(cross_outlet_source) WHERE cross_outlet_source IS NOT NULL;
