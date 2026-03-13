import Database from 'better-sqlite3';
import bcrypt from 'bcryptjs';
import path from 'path';
import os from 'os';
import fs from 'fs';

// Always use local database.sqlite to ensure data is persisted in the workspace
const dbPath = path.join(process.cwd(), 'database.sqlite');

const db = new Database(dbPath);

// Initialize DB
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'user',
    xp INTEGER DEFAULT 0,
    avatar TEXT
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT,
    status TEXT,
    assignee TEXT,
    userId TEXT,
    userName TEXT,
    xpReward INTEGER,
    dependencies TEXT,
    comments TEXT,
    progress INTEGER DEFAULT 0,
    dueDate TEXT,
    completedAt TEXT,
    priority TEXT,
    tags TEXT,
    estimatedHours INTEGER,
    subtasks TEXT,
    recurring TEXT,
    attachments TEXT,
    timeSpent INTEGER DEFAULT 0
  );
  CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    name TEXT,
    platform TEXT,
    status TEXT,
    assignee TEXT,
    userId TEXT,
    userName TEXT,
    saleLogged INTEGER DEFAULT 0,
    saleAmount INTEGER DEFAULT 0,
    createdAt TEXT,
    subSector TEXT,
    website TEXT
  );
  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    title TEXT,
    platform TEXT,
    status TEXT,
    author TEXT,
    userId TEXT,
    userName TEXT,
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    shares INTEGER DEFAULT 0,
    comments INTEGER DEFAULT 0,
    engagement TEXT,
    createdAt TEXT,
    scheduledFor TEXT,
    telegramJoins INTEGER DEFAULT 0,
    impressions INTEGER DEFAULT 0,
    linkClicks INTEGER DEFAULT 0,
    watchTime INTEGER DEFAULT 0,
    mainMetric TEXT,
    optionalData TEXT
  );
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );
  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    senderId TEXT,
    recipientId TEXT,
    channel TEXT,
    text TEXT,
    imageUrl TEXT,
    createdAt TEXT
  );
  CREATE TABLE IF NOT EXISTS daily_updates (
    id TEXT PRIMARY KEY,
    userId TEXT,
    userName TEXT,
    text TEXT,
    imageUrl TEXT,
    createdAt TEXT
  );
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    title TEXT,
    category TEXT,
    lastUpdated TEXT,
    author TEXT,
    content TEXT,
    type TEXT,
    fileUrl TEXT
  );
`);

// Add columns if they don't exist (for existing databases)
try { db.exec("ALTER TABLE users ADD COLUMN lastActive TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE messages ADD COLUMN recipientId TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN dueDate TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN completedAt TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE leads ADD COLUMN createdAt TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE leads ADD COLUMN subSector TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE leads ADD COLUMN website TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE posts ADD COLUMN createdAt TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE posts ADD COLUMN scheduledFor TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE posts ADD COLUMN telegramJoins INTEGER DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE posts ADD COLUMN impressions INTEGER DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN userId TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN userName TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN priority TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN tags TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN estimatedHours INTEGER"); } catch (e) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN subtasks TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN recurring TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN attachments TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN timeSpent INTEGER DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE leads ADD COLUMN userId TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE leads ADD COLUMN userName TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE posts ADD COLUMN userId TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE posts ADD COLUMN userName TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE documents ADD COLUMN type TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE documents ADD COLUMN fileUrl TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE messages ADD COLUMN channel TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE daily_updates ADD COLUMN likes TEXT DEFAULT '[]'"); } catch (e) {}
try { db.exec("ALTER TABLE daily_updates ADD COLUMN comments TEXT DEFAULT '[]'"); } catch (e) {}
try { db.exec("ALTER TABLE posts ADD COLUMN likes INTEGER DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE posts ADD COLUMN shares INTEGER DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE posts ADD COLUMN comments INTEGER DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE posts ADD COLUMN linkClicks INTEGER DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE posts ADD COLUMN watchTime INTEGER DEFAULT 0"); } catch (e) {}
try { db.exec("ALTER TABLE posts ADD COLUMN mainMetric TEXT"); } catch (e) {}
try { db.exec("ALTER TABLE posts ADD COLUMN optionalData TEXT"); } catch (e) {}

// Insert default settings if not exists
const defaultSettings = [
  { key: 'software_name', value: 'GrowthGrid' },
  { key: 'section_dashboard', value: 'Command Center' },
  { key: 'section_arena', value: 'The Arena' },
  { key: 'section_tasks', value: 'Active Missions' },
  { key: 'section_leads', value: 'Lead Pipeline' },
  { key: 'section_content', value: 'Content Engine' },
  { key: 'goalRevenue', value: '1000' },
  { key: 'viewsTarget', value: '2400' },
  { key: 'telegramTarget', value: '25' },
  { key: 'salesTarget', value: '1' },
  { key: 'daysRemaining', value: '60' }
];

const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
defaultSettings.forEach(setting => {
  insertSetting.run(setting.key, setting.value);
});

// Insert default admin if not exists
const adminExists = db.prepare('SELECT id FROM users WHERE email = ?').get('admin@growthgrid.com');
if (!adminExists) {
  const hash = bcrypt.hashSync('admin123', 10);
  db.prepare('INSERT INTO users (id, name, email, password, role, avatar) VALUES (?, ?, ?, ?, ?, ?)').run(
    'admin-1', 'Admin', 'admin@growthgrid.com', hash, 'admin', 'https://i.pravatar.cc/150?u=admin'
  );
}

export default db;
