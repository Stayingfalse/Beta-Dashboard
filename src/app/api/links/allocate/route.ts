import { NextRequest, NextResponse } from "next/server";
import { getMariaDbPool } from "../../admin/helperFunctions";
import type { LinkRow } from "../types";

async function getUserFromToken(token: string) {
  const pool = getMariaDbPool();
  if (!pool) throw new Error("MARIADB_URL not set");
  const conn = await pool.getConnection();
  try {
    const [session] = await conn.query(
      "SELECT uid FROM sessions WHERE token = ?",
      [token]
    );
    if (!session) return null;
    const [user] = await conn.query(
      "SELECT id, email, department_id FROM users WHERE id = ?",
      [session.uid]
    );
    return user || null;
  } finally {
    conn.release();
  }
}

export async function GET(req: NextRequest) {
  const pool = getMariaDbPool();
  if (!pool)
    return NextResponse.json(
      {
        error:
          "Database is not configured. Please set MARIADB_URL or all required MariaDB environment variables.",
      },
      { status: 500 }
    );
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = auth.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const conn = await pool.getConnection();
  try {
    const rows = await conn.query(
      `SELECT l.id, l.url, l.times_allocated, l.times_purchased, l.error_count
       FROM link_allocations a
       JOIN links l ON a.link_id = l.id
       WHERE a.user_id = ?
       ORDER BY a.allocated_at ASC`,
      [user.id]
    );
    const result = (rows as LinkRow[]).map((l) => ({
      ...l,
      id: Number(l.id),
      times_allocated: Number(l.times_allocated),
      times_purchased: Number(l.times_purchased),
      error_count: Number(l.error_count),
    }));
    return NextResponse.json({ allocated: result });
  } catch {
    return NextResponse.json(
      { error: "Failed to fetch allocated links" },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}

export async function POST(_req: NextRequest) {
  const pool = getMariaDbPool();
  if (!pool) {
    return NextResponse.json(
      {
        error:
          "Database is not configured. Please set MARIADB_URL or all required MariaDB environment variables.",
      },
      { status: 500 }
    );
  }
  // ...existing code for POST handler...
}