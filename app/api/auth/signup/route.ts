import { NextResponse } from 'next/server';
import db from '@/lib/db';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key-change-me';

export async function POST(req: Request) {
  try {
    const { name, email, password, promoCode } = await req.json();
    
    // Check promo code for admin role
    const role = promoCode === 'sayemking' ? 'admin' : 'user';
    
    const hash = bcrypt.hashSync(password, 10);
    const id = crypto.randomUUID();
    const avatar = `https://i.pravatar.cc/150?u=${id}`;
    
    db.prepare('INSERT INTO users (id, name, email, password, role, avatar) VALUES (?, ?, ?, ?, ?, ?)').run(
      id, name, email, hash, role, avatar
    );
    
    const token = jwt.sign({ id, role }, JWT_SECRET, { expiresIn: '7d' });
    
    return NextResponse.json({ 
      token, 
      user: { 
        id, 
        name, 
        email, 
        role, 
        avatar, 
        xp: 0 
      } 
    });
  } catch (error: any) {
    console.error('Signup error:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
