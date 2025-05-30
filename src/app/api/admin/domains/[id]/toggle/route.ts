import { NextRequest, NextResponse } from "next/server";
import { adminDebugLog } from "../../../helperFunctions";
import { requireAuth } from "../../../../auth/authHelpers";
import { getMariaDbPool } from "../../../helperFunctions";

// POST: Toggle domain enabled/disabled
export async function POST(req: NextRequest) {
  adminDebugLog('[domains/[id]/toggle] POST called');
  const pool = getMariaDbPool();
  if (!pool) {
    return NextResponse.json({ error: "Database is not configured. Please set MARIADB_URL or all required MariaDB environment variables." }, { status: 500 });
  }
  const auth = await requireAuth(req, { requireAdmin: true });
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Get id from URL
  const url = new URL(req.url, 'http://localhost');
  // Find the UID between /domains/ and /toggle
  const match = url.pathname.match(/\/domains\/([^/]+)\/toggle/);
  const id = match ? match[1] : null;
  adminDebugLog('[domains/[id]/toggle] Parsed id:', id);
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const conn = await pool.getConnection();
  try {
    adminDebugLog('[domains/[id]/toggle] Toggling is_enabled for', id);
    // Toggle is_enabled (use INT id, not uid)
    await conn.query(
      `UPDATE domains SET is_enabled = NOT is_enabled WHERE id = ?`,
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
