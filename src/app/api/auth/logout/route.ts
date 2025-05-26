import { NextRequest, NextResponse } from "next/server";
import { getMariaDbPool } from "../../admin/helperFunctions";

export async function POST(req: NextRequest) {
  const pool = getMariaDbPool();
  if (!pool) {
    return NextResponse.json(
      {
        error: "Database is not configured. Please set MARIADB_URL or all required MariaDB environment variables.",
      },
      { status: 500 }
    );
  }
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
