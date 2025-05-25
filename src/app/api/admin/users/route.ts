import { NextRequest, NextResponse } from "next/server";
import mariadb from "mariadb";
import { adminDebugLog } from "../debug";
import { requireAuth } from "../../auth/authHelpers";

async function requireAdmin(req: NextRequest, pool: mariadb.Pool) {
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer /, "");
  if (!token) return null;
  const conn = await pool.getConnection();
  try {
    const [session] = await conn.query("SELECT * FROM sessions WHERE token = ? AND expires > NOW() LIMIT 1", [token]);
    if (!session || !session.uid) return null;
    const [user] = await conn.query("SELECT is_admin FROM users WHERE id = ? LIMIT 1", [session.uid]);
    if (!user || !user.is_admin) return null;
    return session.uid;
  } finally {
    conn.release();
  }
}

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
      SELECT u.id, u.email, u.is_admin, d.domain, dep.id as department_id, dep.name as department_name,
        l.url as link_url
      FROM users u
      LEFT JOIN domains d ON u.domain_id = d.uid
      LEFT JOIN departments dep ON u.department_id = dep.id
      LEFT JOIN links l ON l.uid = u.id
      ORDER BY u.email ASC
    `);
    adminDebugLog('[users] Query result:', rows);
    return NextResponse.json(rows);
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
