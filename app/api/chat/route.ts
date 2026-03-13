import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const messages = db.prepare(`
      SELECT m.*, u.name as senderName, u.avatar as senderAvatar 
      FROM messages m 
      LEFT JOIN users u ON m.senderId = u.id 
      ORDER BY m.createdAt ASC
    `).all();
    return NextResponse.json({ messages });
  } catch (error) {
    console.error('Error fetching messages:', error);
    return NextResponse.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const { id, senderId, recipientId, channel, text, imageUrl, createdAt } = await request.json();
    
    db.prepare('INSERT INTO messages (id, senderId, recipientId, channel, text, imageUrl, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)').run(
      id, senderId, recipientId || null, channel || null, text, imageUrl || null, createdAt
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving message:', error);
    return NextResponse.json({ error: 'Failed to save message' }, { status: 500 });
  }
}
