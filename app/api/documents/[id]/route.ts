import { NextResponse } from 'next/server';
import db from '@/lib/db';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, category, lastUpdated, author, content, type, fileUrl } = body;

    db.prepare(`
      UPDATE documents 
      SET title = ?, category = ?, lastUpdated = ?, author = ?, content = ?, type = ?, fileUrl = ?
      WHERE id = ?
    `).run(title, category, lastUpdated, author, content || '', type, fileUrl || '', id);

    return NextResponse.json({ success: true, document: body });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update document' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    db.prepare('DELETE FROM documents WHERE id = ?').run(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete document' }, { status: 500 });
  }
}
