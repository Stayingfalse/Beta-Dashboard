// Simple API route for Next.js backend
import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ message: 'Hello from the backend API!' });
}
