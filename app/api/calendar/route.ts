import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const tasks = db.prepare('SELECT id, title, status, dueDate, completedAt FROM tasks').all();
    const leads = db.prepare('SELECT id, name, status, createdAt FROM leads').all();
    const posts = db.prepare('SELECT id, title, status, createdAt, scheduledFor FROM posts').all();

    return NextResponse.json({ tasks, leads, posts });
  } catch (error) {
    console.error('Error fetching calendar data:', error);
    return NextResponse.json({ error: 'Failed to fetch data' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const { id, type, dateField, newDate } = await request.json();
    
    if (type === 'task') {
      db.prepare(`UPDATE tasks SET ${dateField} = ? WHERE id = ?`).run(newDate, id);
    } else if (type === 'post') {
      db.prepare(`UPDATE posts SET ${dateField} = ? WHERE id = ?`).run(newDate, id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error updating calendar data:', error);
    return NextResponse.json({ error: 'Failed to update data' }, { status: 500 });
  }
}
