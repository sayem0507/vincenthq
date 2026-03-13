import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';

export async function POST(req: Request) {
  try {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    
    const { action, payload } = await req.json();

    switch (action) {
      case 'update_setting':
        db.prepare('INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(payload.key, payload.value);
        break;

      case 'update_user':
        db.prepare('UPDATE users SET name = ?, email = ?, role = ?, avatar = ? WHERE id = ?').run(
          payload.name, payload.email, payload.role, payload.avatar, payload.id
        );
        break;

      case 'update_user_avatar':
        db.prepare('UPDATE users SET avatar = ? WHERE id = ?').run(payload.avatar, payload.userId);
        break;

      case 'update_daily_update':
        const existingUpdate = db.prepare('SELECT id FROM daily_updates WHERE id = ?').get(payload.id);
        if (existingUpdate) {
          db.prepare('UPDATE daily_updates SET text = ?, imageUrl = ?, likes = ?, comments = ? WHERE id = ?').run(
            payload.text, payload.imageUrl || null, JSON.stringify(payload.likes || []), JSON.stringify(payload.comments || []), payload.id
          );
        } else {
          db.prepare('INSERT INTO daily_updates (id, userId, userName, text, imageUrl, createdAt, likes, comments) VALUES (?, ?, ?, ?, ?, ?, ?, ?)').run(
            payload.id, payload.userId, payload.userName, payload.text, payload.imageUrl || null, new Date().toISOString(), JSON.stringify(payload.likes || []), JSON.stringify(payload.comments || [])
          );
        }
        break;

      case 'delete_daily_update':
        const updateId = typeof payload === 'object' ? payload.id : payload;
        db.prepare('DELETE FROM daily_updates WHERE id = ?').run(updateId);
        break;

      case 'add_daily_update':
        db.prepare('INSERT INTO daily_updates (id, userId, userName, text, imageUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(
          payload.id, payload.userId, payload.userName, payload.text, payload.imageUrl || null, new Date().toISOString()
        );
        break;

      case 'full_reset':
        db.prepare('DELETE FROM tasks').run();
        db.prepare('DELETE FROM leads').run();
        db.prepare('DELETE FROM posts').run();
        db.prepare('DELETE FROM users WHERE role != "admin"').run();
        break;

      case 'clear_all_data':
        if (payload === 'tasks') db.prepare('DELETE FROM tasks').run();
        if (payload === 'leads') db.prepare('DELETE FROM leads').run();
        if (payload === 'posts') db.prepare('DELETE FROM posts').run();
        break;

      case 'update_task':
        const existingTask = db.prepare('SELECT id FROM tasks WHERE id = ?').get(payload.id);
        const taskCompletedAt = payload.status === 'completed' && (!existingTask || (existingTask as any).status !== 'completed') ? new Date().toISOString() : payload.completedAt || null;
        
        if (existingTask) {
          db.prepare('UPDATE tasks SET title=?, status=?, assignee=?, userId=?, userName=?, xpReward=?, dependencies=?, comments=?, progress=?, dueDate=?, completedAt=?, priority=?, tags=?, estimatedHours=?, subtasks=?, recurring=?, attachments=?, timeSpent=? WHERE id=?').run(
            payload.title, payload.status, payload.assignee, payload.userId, payload.userName, payload.xpReward, JSON.stringify(payload.dependencies), JSON.stringify(payload.comments), payload.progress || 0, payload.dueDate || null, taskCompletedAt, payload.priority || null, JSON.stringify(payload.tags || []), payload.estimatedHours || null, JSON.stringify(payload.subtasks || []), payload.recurring || null, JSON.stringify(payload.attachments || []), payload.timeSpent || 0, payload.id
          );
        } else {
          db.prepare('INSERT INTO tasks (id, title, status, assignee, userId, userName, xpReward, dependencies, comments, progress, dueDate, completedAt, priority, tags, estimatedHours, subtasks, recurring, attachments, timeSpent) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
            payload.id, payload.title, payload.status, payload.assignee, payload.userId, payload.userName, payload.xpReward, JSON.stringify(payload.dependencies), JSON.stringify(payload.comments), payload.progress || 0, payload.dueDate || null, taskCompletedAt, payload.priority || null, JSON.stringify(payload.tags || []), payload.estimatedHours || null, JSON.stringify(payload.subtasks || []), payload.recurring || null, JSON.stringify(payload.attachments || []), payload.timeSpent || 0
          );
        }
        break;

      case 'update_lead':
        const existingLead = db.prepare('SELECT id FROM leads WHERE id = ?').get(payload.id);
        const leadCreatedAt = payload.createdAt || new Date().toISOString();
        if (existingLead) {
          db.prepare('UPDATE leads SET name=?, platform=?, status=?, assignee=?, userId=?, userName=?, saleLogged=?, saleAmount=?, createdAt=?, subSector=?, website=? WHERE id=?').run(
            payload.name, payload.platform, payload.status, payload.assignee, payload.userId, payload.userName, payload.saleLogged ? 1 : 0, payload.saleAmount || 0, leadCreatedAt, payload.subSector || '', payload.website || '', payload.id
          );
        } else {
          db.prepare('INSERT INTO leads (id, name, platform, status, assignee, userId, userName, saleLogged, saleAmount, createdAt, subSector, website) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
            payload.id, payload.name, payload.platform, payload.status, payload.assignee, payload.userId, payload.userName, payload.saleLogged ? 1 : 0, payload.saleAmount || 0, leadCreatedAt, payload.subSector || '', payload.website || ''
          );
        }
        break;

      case 'update_post':
        const existingPost = db.prepare('SELECT id FROM posts WHERE id = ?').get(payload.id);
        const postCreatedAt = payload.createdAt || new Date().toISOString();
        if (existingPost) {
          db.prepare('UPDATE posts SET title=?, platform=?, status=?, author=?, userId=?, userName=?, views=?, likes=?, shares=?, comments=?, engagement=?, createdAt=?, scheduledFor=?, telegramJoins=?, impressions=?, linkClicks=?, watchTime=?, mainMetric=?, optionalData=? WHERE id=?').run(
            payload.title, payload.platform, payload.status, payload.author, payload.userId, payload.userName, payload.views || 0, payload.likes || 0, payload.shares || 0, payload.comments || 0, payload.engagement || '', postCreatedAt, payload.scheduledFor || null, payload.telegramJoins || 0, payload.impressions || 0, payload.linkClicks || 0, payload.watchTime || 0, payload.mainMetric || '', payload.optionalData || '', payload.id
          );
        } else {
          db.prepare('INSERT INTO posts (id, title, platform, status, author, userId, userName, views, likes, shares, comments, engagement, createdAt, scheduledFor, telegramJoins, impressions, linkClicks, watchTime, mainMetric, optionalData) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)').run(
            payload.id, payload.title, payload.platform, payload.status, payload.author, payload.userId, payload.userName, payload.views || 0, payload.likes || 0, payload.shares || 0, payload.comments || 0, payload.engagement || '', postCreatedAt, payload.scheduledFor || null, payload.telegramJoins || 0, payload.impressions || 0, payload.linkClicks || 0, payload.watchTime || 0, payload.mainMetric || '', payload.optionalData || ''
          );
        }
        break;

      case 'update_user_xp':
        db.prepare('UPDATE users SET xp = xp + ? WHERE id = ?').run(payload.xpToAdd, payload.userId);
        break;

      case 'update_user_role':
        db.prepare('UPDATE users SET role = ? WHERE id = ?').run(payload.role, payload.userId);
        break;

      case 'create_user':
        const hash = bcrypt.hashSync(payload.password, 10);
        const id = crypto.randomUUID();
        const avatar = `https://i.pravatar.cc/150?u=${id}`;
        db.prepare('INSERT INTO users (id, name, email, password, role, avatar) VALUES (?, ?, ?, ?, ?, ?)').run(
          id, payload.name, payload.email, hash, payload.role || 'user', avatar
        );
        break;

      case 'add_daily_update':
        db.prepare('INSERT INTO daily_updates (id, userId, userName, text, imageUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?)').run(
          payload.id, payload.userId, payload.userName, payload.text, payload.imageUrl || null, new Date().toISOString()
        );
        break;

      case 'delete_user':
        const userId = typeof payload === 'object' ? payload.id : payload;
        db.prepare('DELETE FROM users WHERE id = ?').run(userId);
        break;

      case 'delete_task':
        const taskId = typeof payload === 'object' ? payload.id : payload;
        db.prepare('DELETE FROM tasks WHERE id = ?').run(taskId);
        // Cleanup dependencies in other tasks
        const allTasks = db.prepare('SELECT id, dependencies FROM tasks').all();
        for (const t of allTasks as any[]) {
          try {
            const deps = JSON.parse(t.dependencies || '[]');
            if (deps.includes(taskId)) {
              const newDeps = deps.filter((d: string) => d !== taskId);
              db.prepare('UPDATE tasks SET dependencies = ? WHERE id = ?').run(JSON.stringify(newDeps), t.id);
            }
          } catch (e) {
            // ignore parse errors
          }
        }
        break;

      case 'delete_lead':
        const leadId = typeof payload === 'object' ? payload.id : payload;
        db.prepare('DELETE FROM leads WHERE id = ?').run(leadId);
        break;

      case 'delete_post':
        const postId = typeof payload === 'object' ? payload.id : payload;
        db.prepare('DELETE FROM posts WHERE id = ?').run(postId);
        break;

      default:
        return NextResponse.json({ error: 'Unknown action' }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Action error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
