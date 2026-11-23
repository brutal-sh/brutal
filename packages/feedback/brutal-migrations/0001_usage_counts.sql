CREATE TABLE usage_counts (
  day TEXT NOT NULL,
  version TEXT NOT NULL,
  event TEXT NOT NULL,
  format TEXT NOT NULL,
  count INTEGER NOT NULL CHECK (count > 0),
  PRIMARY KEY (day, version, event, format)
) WITHOUT ROWID;
