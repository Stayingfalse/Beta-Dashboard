import { NextRequest, NextResponse } from "next/server";
import { adminDebugLog, getMariaDbPool } from "../helperFunctions";
import { requireAuth } from "../../auth/authHelpers";

const pool = getMariaDbPool();

// GET: List departments for a domain with user/link counts
export async function GET(req: NextRequest) {
  adminDebugLog('[departments] GET called');
  const auth = await requireAuth(req, { requireAdmin: true });
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { searchParams } = new URL(req.url);
  const domainId = searchParams.get("domain_id");
  adminDebugLog('[departments] domainId:', domainId);
  if (!domainId) return NextResponse.json([], { status: 400 });
  const conn = await pool.getConnection();
  try {
    adminDebugLog('[departments] Querying departments for domain', domainId);
    const rows = await conn.query(`
      SELECT d.id, d.name,
        (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id) as user_count,
        (SELECT COUNT(*) FROM links l WHERE l.department_id = d.id) as link_count
      FROM departments d
      WHERE d.domain_id = ?
      ORDER BY d.name ASC
    `, [Number(domainId)]);
    adminDebugLog('[departments] Query result:', rows);
    // Convert BigInt fields to Number for JSON serialization
    const safeRows = (rows as Array<{ [key: string]: unknown }>).map((row) => ({
      ...row,
      id: typeof row.id === 'bigint' ? Number(row.id) : row.id,
      user_count: typeof row.user_count === 'bigint' ? Number(row.user_count) : row.user_count,
      link_count: typeof row.link_count === 'bigint' ? Number(row.link_count) : row.link_count,
    }));
    adminDebugLog('[departments] Safe result:', safeRows);
    return NextResponse.json(safeRows);
  } catch (err) {
    adminDebugLog('[departments] Query error', err);
    return NextResponse.json([], { status: 500 });
  } finally {
    conn.release();
  }
}

// POST: Add department to domain
export async function POST(req: NextRequest) {
  adminDebugLog('[departments] POST called');
  const auth = await requireAuth(req, { requireAdmin: true });
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { domain_id, name } = await req.json();
  adminDebugLog('[departments] POST body:', { domain_id, name });
  if (!domain_id || !name) return NextResponse.json([], { status: 400 });
  const conn = await pool.getConnection();
  try {
    adminDebugLog('[departments] Inserting department', { domain_id, name });
    await conn.query(
      `INSERT INTO departments (name, domain_id) VALUES (?, ?)` ,
      [name, Number(domain_id)]
    );
    adminDebugLog('[departments] Inserted, fetching updated list');
    // Return updated list
    const rows = await conn.query(`
      SELECT d.id, d.name,
        (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id) as user_count,
        (SELECT COUNT(*) FROM links l WHERE l.department_id = d.id) as link_count
      FROM departments d
      WHERE d.domain_id = ?
      ORDER BY d.name ASC
    `, [Number(domain_id)]);
    adminDebugLog('[departments] Updated list:', rows);
    // Convert BigInt fields to Number for JSON serialization
    const safeRows = (rows as Array<{ [key: string]: unknown }>).map((row) => ({
      ...row,
      id: typeof row.id === 'bigint' ? Number(row.id) : row.id,
      user_count: typeof row.user_count === 'bigint' ? Number(row.user_count) : row.user_count,
      link_count: typeof row.link_count === 'bigint' ? Number(row.link_count) : row.link_count,
    }));
    adminDebugLog('[departments] Safe result:', safeRows);
    return NextResponse.json(safeRows);
  } catch (err) {
    adminDebugLog('[departments] POST error', err);
    return NextResponse.json([], { status: 500 });
  } finally {
    conn.release();
  }
}
