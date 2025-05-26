import { NextRequest, NextResponse } from "next/server";
import { adminDebugLog } from "../../../debug";
import { requireAuth } from "../../../../auth/authHelpers";
import { getMariaDbPool } from "../../debug";

const pool = getMariaDbPool();

// POST: Toggle domain enabled/disabled
export async function POST(req: NextRequest) {
  adminDebugLog('[domains/[id]/toggle] POST called');
  if (!pool) {
    adminDebugLog('[domains/[id]/toggle] No pool');
    return NextResponse.json({ error: "DB not ready" }, { status: 500 });
  }
  const auth = await requireAuth(req, pool, { requireAdmin: true });
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
