import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function GET() {
  try {
    const docs = db.prepare('SELECT * FROM documents ORDER BY lastUpdated DESC').all();
    return NextResponse.json(docs);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { id, title, category, lastUpdated, author, content, type, fileUrl } = body;

    db.prepare(`
      INSERT INTO documents (id, title, category, lastUpdated, author, content, type, fileUrl)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, title, category, lastUpdated, author, content || '', type, fileUrl || '');

    return NextResponse.json({ success: true, document: body });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create document' }, { status: 500 });
  }
}
