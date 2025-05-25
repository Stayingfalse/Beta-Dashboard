import { NextRequest, NextResponse } from "next/server";
import mariadb from "mariadb";
import { adminDebugLog } from "../../../debug";

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
export async function POST(req: NextRequest) {
  adminDebugLog('[domains/[id]/toggle] POST called');
  if (!pool) {
    adminDebugLog('[domains/[id]/toggle] No pool');
    return NextResponse.json({ error: "DB not ready" }, { status: 500 });
  }
  // Get id from URL
  const url = new URL(req.url);
  const parts = url.pathname.split("/").filter(Boolean);
  const id = parts[parts.length - 2]; // get [id] from /api/admin/domains/[id]/toggle
  adminDebugLog('[domains/[id]/toggle] Parsed id:', id);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const conn = await pool.getConnection();
  try {
    adminDebugLog('[domains/[id]/toggle] Toggling is_enabled for', id);
    // Toggle is_enabled
    await conn.query(
      `UPDATE domains SET is_enabled = NOT is_enabled WHERE uid = ?`,
      [id]
    );
    adminDebugLog('[domains/[id]/toggle] Toggle success');
    return NextResponse.json({ success: true });
  } catch (err) {
    adminDebugLog('[domains/[id]/toggle] Toggle error', err);
    return NextResponse.json({ error: "Failed to toggle domain" }, { status: 500 });
  } finally {
    conn.release();
  }
}
