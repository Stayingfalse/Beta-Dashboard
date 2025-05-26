import { NextRequest, NextResponse } from "next/server";
import mariadb from "mariadb";
import { adminDebugLog } from "../debug";
import { requireAuth } from "../../auth/authHelpers";

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

// GET: List all users with domain, department, and link info
export async function GET(req: NextRequest) {
  adminDebugLog('[users] GET called');
  if (!pool) {
    adminDebugLog('[users] No pool');
    return NextResponse.json([], { status: 500 });
  }
  const auth = await requireAuth(req, pool, { requireAdmin: true });
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const conn = await pool.getConnection();
  try {
    const rows = await conn.query(`
      SELECT * FROM users
    `);
    adminDebugLog('[users] Query result:', rows);
    // Convert BigInt fields if any (is_admin is TINYINT(1) which is fine)
    const safeRows = (rows as Array<Record<string, unknown>>).map(row => ({
      ...row,
      is_admin: !!(row as Record<string, unknown>).is_admin,
      // Ensure any other BigInts are converted if they exist
    }));
    return NextResponse.json(safeRows);
  } catch (err) {
    adminDebugLog('[users] Query error', err);
    return NextResponse.json([], { status: 500 });
  } finally {
    conn.release();
  }
}

// PUT: Edit user (email, department, is_admin)
export async function PUT(req: NextRequest) {
  adminDebugLog('[users] PUT called');
  if (!pool) {
    adminDebugLog('[users] No pool');
    return NextResponse.json({ error: "DB not ready" }, { status: 500 });
  }
  const auth = await requireAuth(req, pool, { requireAdmin: true });
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, email, department_id, is_admin } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `UPDATE users SET email = ?, department_id = ?, is_admin = ? WHERE id = ?`,
      [email, department_id || null, !!is_admin, id]
    );
    adminDebugLog('[users] Updated user', id);
    return NextResponse.json({ success: true });
  } catch (err) {
    adminDebugLog('[users] PUT error', err);
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  } finally {
    conn.release();
  }
}

// DELETE: Delete user
export async function DELETE(req: NextRequest) {
  adminDebugLog('[users] DELETE called');
  if (!pool) {
    adminDebugLog('[users] No pool');
    return NextResponse.json({ error: "DB not ready" }, { status: 500 });
  }
  const auth = await requireAuth(req, pool, { requireAdmin: true });
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  const conn = await pool.getConnection();
  try {
    await conn.query(`DELETE FROM users WHERE id = ?`, [id]);
    adminDebugLog('[users] Deleted user', id);
    return NextResponse.json({ success: true });
  } catch (err) {
    adminDebugLog('[users] DELETE error', err);
    return NextResponse.json({ error: "Failed to delete user" }, { status: 500 });
  } finally {
    conn.release();
  }
}
