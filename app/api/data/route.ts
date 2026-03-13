import { NextResponse } from 'next/server';
import db from '@/lib/db';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string };

    // Update lastActive heartbeat
    db.prepare('UPDATE users SET lastActive = ? WHERE id = ?').run(new Date().toISOString(), decoded.id);

    const tasks = db.prepare('SELECT * FROM tasks').all().map((t: any) => ({
      ...t,
      dependencies: JSON.parse(t.dependencies as string || '[]'),
      comments: JSON.parse(t.comments as string || '[]'),
      tags: JSON.parse(t.tags as string || '[]'),
      subtasks: JSON.parse(t.subtasks as string || '[]'),
      attachments: JSON.parse(t.attachments as string || '[]')
    }));
    const leads = db.prepare('SELECT * FROM leads').all();
    const posts = db.prepare('SELECT * FROM posts').all();
    const users = db.prepare('SELECT id, name, email, role, avatar, xp, lastActive FROM users').all();
    const dailyUpdates = db.prepare('SELECT * FROM daily_updates ORDER BY createdAt DESC').all().map((u: any) => ({
      ...u,
      likes: JSON.parse(u.likes as string || '[]'),
      comments: JSON.parse(u.comments as string || '[]')
    }));
    
    // Calculate online users (active in the last 15 seconds)
    const fifteenSecondsAgo = new Date(Date.now() - 15 * 1000).toISOString();
    const onlineUsers = users.filter((u: any) => u.lastActive && u.lastActive > fifteenSecondsAgo);

    const settingsRows = db.prepare('SELECT * FROM settings').all() as {key: string, value: string}[];
    const settings = settingsRows.reduce((acc, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {} as Record<string, string>);

    return NextResponse.json({ tasks, leads, posts, users, settings, dailyUpdates, onlineUsers });
  } catch (error) {
    console.error('Error fetching data:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
