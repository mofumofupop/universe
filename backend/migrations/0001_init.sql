CREATE TABLE profiles (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  name TEXT,
  affiliation TEXT,
  icon_url TEXT,
  -- JSON array of URL strings
  social_links TEXT NOT NULL DEFAULT '[]',
  password_hash TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now'))
);

-- Directed edge: user_id lists friend_id as a friend. An exchange inserts both directions.
CREATE TABLE friendships (
  user_id TEXT NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  friend_id TEXT NOT NULL REFERENCES profiles (id) ON DELETE CASCADE,
  created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')),
  PRIMARY KEY (user_id, friend_id)
);

CREATE INDEX friendships_friend_id ON friendships (friend_id);

CREATE TABLE qrs (
  id TEXT PRIMARY KEY REFERENCES profiles (id) ON DELETE CASCADE,
  qr TEXT NOT NULL UNIQUE,
  -- Unix epoch milliseconds
  created_at INTEGER NOT NULL
);
