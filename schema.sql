CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id TEXT UNIQUE NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    discord_id TEXT UNIQUE,
    role TEXT DEFAULT 'member',
    status TEXT DEFAULT 'active'
);
