import { NextRequest, NextResponse } from "next/server";
import mariadb from "mariadb";

export async function requireAuth(req: NextRequest, pool: mariadb.Pool, { requireAdmin = false } = {}): Promise<{ userId: string, isAdmin: boolean } | null> {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer /, "");
  if (!token) return null;
  const conn = await pool.getConnection();
  try {
    const [session] = await conn.query("SELECT * FROM sessions WHERE token = ? AND expires > NOW() LIMIT 1", [token]);
    if (!session || !session.uid) return null;
    const [user] = await conn.query("SELECT id, is_admin FROM users WHERE id = ? LIMIT 1", [session.uid]);
    if (!user) return null;
    if (requireAdmin && !user.is_admin) return null;
    return { userId: user.id, isAdmin: !!user.is_admin };
  } finally {
    conn.release();
  }
}
