import { NextRequest, NextResponse } from "next/server";
import { getMariaDbPool } from "../../admin/helperFunctions";

const pool = getMariaDbPool();

export async function POST(req: NextRequest) {
  if (!pool) return NextResponse.json({ error: "MARIADB_URL not set" }, { status: 500 });
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer /, "");
  if (!token) return NextResponse.json({ error: "No session token" }, { status: 401 });
  const conn = await pool.getConnection();
  try {
    await conn.query("DELETE FROM sessions WHERE token = ?", [token]);
    return NextResponse.json({ success: true });
  } finally {
    conn.release();
  }
}
