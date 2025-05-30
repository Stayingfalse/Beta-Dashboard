import { NextRequest, NextResponse } from "next/server";
import { adminDebugLog, getMariaDbPool } from "../helperFunctions";
import { requireAuth } from "../../auth/authHelpers";

// GET: List all users with domain, department, and link info
export async function GET(req: NextRequest) {
  const pool = getMariaDbPool();
  if (!pool) {
    return NextResponse.json({ error: "Database is not configured. Please set MARIADB_URL or all required MariaDB environment variables." }, { status: 500 });
  }
  adminDebugLog('[users] GET called');
  const auth = await requireAuth(req, { requireAdmin: true });
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const conn = await pool.getConnection();
  try {
    const rows = await conn.query(`
      SELECT 
        u.id, u.email, u.is_admin, 
        d.name AS domain, d.id AS domain_id,
        u.department_id, dep.name AS department_name,
        COUNT(l.id) AS link_count
      FROM users u
      LEFT JOIN domains d ON u.domain_id = d.id
      LEFT JOIN departments dep ON u.department_id = dep.id
      LEFT JOIN links l ON l.uid = u.id
      GROUP BY u.id, u.email, u.is_admin, d.name, d.id, u.department_id, dep.name
    `); adminDebugLog('[users] Query result:', rows);
    // Convert BigInt fields if any (is_admin is TINYINT(1) which is fine)
    const safeRows = (rows as Array<Record<string, unknown>>).map(row => ({
      ...row,
      is_admin: !!(row as Record<string, unknown>).is_admin,
      // Convert BigInt link_count to Number
      link_count: Number((row as Record<string, unknown>).link_count || 0),
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
  const pool = getMariaDbPool();
  if (!pool) {
    return NextResponse.json({ error: "Database is not configured. Please set MARIADB_URL or all required MariaDB environment variables." }, { status: 500 });
  }
  const auth = await requireAuth(req, { requireAdmin: true });
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id, email, department_id, is_admin } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  // Prevent current user from removing their own admin status
  if (id === auth.userId && is_admin === false) {
    adminDebugLog('[users] Prevented self-demotion for user', id);
    return NextResponse.json({ error: "You cannot remove your own admin status." }, { status: 400 });
  }
  // Fetch current user data if email is not provided
  let finalEmail = email;
  const conn = await pool.getConnection();
  try {
    if (!finalEmail) {
      const [userRow] = await conn.query("SELECT email FROM users WHERE id = ?", [id]);
      if (!userRow || !userRow.email) {
        return NextResponse.json({ error: "User not found or missing email" }, { status: 400 });
      }
      finalEmail = userRow.email;
    }
    // Prevent update if no actual changes (id is required, but all other fields can be undefined or unchanged)
    if (email === undefined && department_id === undefined && is_admin === undefined) {
      adminDebugLog('[users] PUT: No changes, skipping update for user', id);
      return NextResponse.json({ success: true });
    } await conn.query(
      `UPDATE users SET email = ?, department_id = ?, is_admin = ? WHERE id = ?`,
      [finalEmail, department_id || null, !!is_admin, id]
    );
    // If department_id changed, update the department_id on the user's existing links to prevent duplicates
    if (department_id !== undefined) {
      const linkUpdateResult = await conn.query("UPDATE links SET department_id = ? WHERE uid = ?", [department_id || null, id]);
      adminDebugLog('[users] Updated user links department', { user_id: id, department_id, link_updates: linkUpdateResult.affectedRows });
    }

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
  const auth = await requireAuth(req, { requireAdmin: true });
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await req.json();
  if (!id) return NextResponse.json({ error: "Missing user id" }, { status: 400 });
  const pool = getMariaDbPool();
  if (!pool) {
    return NextResponse.json({ error: "Database is not configured. Please set MARIADB_URL or all required MariaDB environment variables." }, { status: 500 });
  }
  const conn = await pool.getConnection();
  try {
    // Remove all links and allocations for this user before deleting user (to avoid FK constraint errors)
    await conn.query(`DELETE FROM link_allocations WHERE user_id = ?`, [id]);
    await conn.query(`DELETE FROM links WHERE uid = ?`, [id]);
    const result = await conn.query(`DELETE FROM users WHERE id = ?`, [id]);
    adminDebugLog('[users] Deleted user', id, 'result:', result);
    return NextResponse.json({ success: true });
  } catch (err) {
    adminDebugLog('[users] DELETE error', err);
    return NextResponse.json({ error: "Failed to delete user", details: String(err) }, { status: 500 });
  } finally {
    conn.release();
  }
}
