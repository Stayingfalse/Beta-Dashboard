import { NextRequest, NextResponse } from "next/server";
import mariadb from "mariadb";
import { adminDebugLog } from "../../../debug";
import { requireAuth } from "../../../../auth/authHelpers";

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

// DELETE: Remove domain by id, only if no users exist for that domain
export async function DELETE(req: NextRequest) {
  adminDebugLog("[domains/[id]] DELETE called");
  if (!pool) {
    adminDebugLog("[domains/[id]] No pool");
    return NextResponse.json({ error: "DB not ready" }, { status: 500 });
  }
  const auth = await requireAuth(req, pool, { requireAdmin: true });
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
