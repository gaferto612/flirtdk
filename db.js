const Database = require('better-sqlite3');
const path     = require('path');

const db = new Database(path.join(__dirname, 'flirtdk.db'));

db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id              INTEGER PRIMARY KEY AUTOINCREMENT,
    username        TEXT    NOT NULL UNIQUE,
    email           TEXT    NOT NULL UNIQUE,
    password        TEXT    NOT NULL,
    verified        INTEGER DEFAULT 0,
    verify_token    TEXT    DEFAULT NULL,
    premium         INTEGER DEFAULT 0,
    premium_until   TEXT    DEFAULT NULL,
    stripe_customer TEXT    DEFAULT NULL,
    created_at      TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id           INTEGER PRIMARY KEY,
    user_id      INTEGER NOT NULL UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    display_name TEXT    NOT NULL,
    age          INTEGER,
    gender       TEXT,
    seeking      TEXT,
    city         TEXT,
    bio          TEXT,
    photo        TEXT    DEFAULT NULL,
    is_online    INTEGER DEFAULT 0,
    last_seen    TEXT    DEFAULT (datetime('now')),
    updated_at   TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS messages (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    from_user  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    body       TEXT    NOT NULL,
    read       INTEGER DEFAULT 0,
    created_at TEXT    DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS likes (
    from_user  INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    to_user    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TEXT    DEFAULT (datetime('now')),
    PRIMARY KEY (from_user, to_user)
  );

  CREATE TABLE IF NOT EXISTS push_subscriptions (
    id         INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    endpoint   TEXT    NOT NULL UNIQUE,
    p256dh     TEXT    NOT NULL,
    auth       TEXT    NOT NULL,
    created_at TEXT    DEFAULT (datetime('now'))
  );
`);

module.exports = db;
