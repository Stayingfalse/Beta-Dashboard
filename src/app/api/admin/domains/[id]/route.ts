import { NextRequest, NextResponse } from "next/server";
import { adminDebugLog } from "../../helperFunctions";
import { requireAuth } from "../../../auth/authHelpers";
import { getMariaDbPool } from "../../helperFunctions";

// DELETE: Remove domain by id, only if no users exist for that domain
export async function DELETE(req: NextRequest) {
  adminDebugLog("[domains/[id]] DELETE called");
  const pool = getMariaDbPool();
  if (!pool) {
    adminDebugLog("[domains/[id]] No pool");
    return NextResponse.json(
      {
        error: "Database is not configured. Please set MARIADB_URL or all required MariaDB environment variables.",
      },
      { status: 500 }
    );
  }
  const auth = await requireAuth(req, { requireAdmin: true });
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Get id from URL
  const url = new URL(req.url);
  const id = url.pathname.split("/").filter(Boolean).pop();
  adminDebugLog("[domains/[id]] Parsed id:", id);
  if (!id) {
    adminDebugLog("[domains/[id]] Missing id");
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const conn = await pool.getConnection();
  try {
    // Check for users in this domain
    const [user] = await conn.query("SELECT id FROM users WHERE domain_id = ? LIMIT 1", [id]);
    if (user) {
      adminDebugLog("[domains/[id]] Cannot delete domain with users", id);
      return NextResponse.json({ error: "Cannot delete domain: delete all users in this domain first." }, { status: 400 });
    }
    // Remove domain
    const result = await conn.query("DELETE FROM domains WHERE id = ?", [id]);
    adminDebugLog("[domains/[id]] Delete success", result);
    return NextResponse.json({ success: true });
  } catch (err) {
    adminDebugLog("[domains/[id]] Delete error", err);
    return NextResponse.json(
      { error: "Failed to delete domain", details: String(err) },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}

// GET: Get domain by id
export async function GET() {
  const pool = getMariaDbPool();
  if (!pool) {
    return NextResponse.json({ error: "Database is not configured. Please set MARIADB_URL or all required MariaDB environment variables." }, { status: 500 });
  }
  // ...existing code...
}

// POST: Update domain by id
export async function POST() {
  const pool = getMariaDbPool();
  if (!pool) {
    return NextResponse.json({ error: "Database is not configured. Please set MARIADB_URL or all required MariaDB environment variables." }, { status: 500 });
  }
  // ...existing code...
}
