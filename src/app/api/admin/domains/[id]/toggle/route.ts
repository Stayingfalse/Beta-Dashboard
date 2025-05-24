import { NextRequest, NextResponse } from "next/server";
import mariadb from "mariadb";

const dbUrl = process.env.MARIADB_URL || "";
let pool: mariadb.Pool | null = null;
if (dbUrl) {
  const url = new URL(dbUrl);
  pool = mariadb.createPool({
    host: url.hostname,
    user: url.username,
    password: url.password,
    port: Number(url.port) || 3306,
    database: url.pathname.replace(/^\//, ""),
    connectionLimit: 5,
  });
}

// POST: Toggle domain enabled/disabled
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  if (!pool) return NextResponse.json({ error: "DB not ready" }, { status: 500 });
  const domainId = params.id;
  const conn = await pool.getConnection();
  try {
    // Toggle is_enabled
    await conn.query(
      `UPDATE domains SET is_enabled = NOT is_enabled WHERE uid = ?`,
      [domainId]
    );
    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Failed to toggle domain" }, { status: 500 });
  } finally {
    conn.release();
  }
}
