import { NextRequest, NextResponse } from "next/server";
import { adminDebugLog, getMariaDbPool } from "../helperFunctions";

// GET: List all domains with user counts
export async function GET() {
  const pool = getMariaDbPool();
  if (!pool) {
    return NextResponse.json({ error: "Database is not configured. Please set MARIADB_URL or all required MariaDB environment variables." }, { status: 500 });
  }
  adminDebugLog('[domains] GET called');
  const conn = await pool.getConnection();
  try {
    adminDebugLog('[domains] Querying domains');
    const rows = await conn.query(`
      SELECT d.id, d.name, d.is_enabled, COUNT(u.id) as user_count
      FROM domains d
      LEFT JOIN users u ON u.domain_id = d.id
      GROUP BY d.id, d.name, d.is_enabled
      ORDER BY d.name ASC
    `);
    // Convert BigInt to number for serialization
    const safeRows = rows.map((row: Record<string, unknown>) => ({
      ...row,
      id: typeof row.id === 'bigint' ? Number(row.id) : row.id,
      user_count: typeof row.user_count === 'bigint' ? Number(row.user_count) : row.user_count,
    }));
    adminDebugLog('[domains] Query result:', safeRows);
    return NextResponse.json(safeRows);
  } catch (err) {
    adminDebugLog('[domains] Query error', err);
    return NextResponse.json([], { status: 500 });
  } finally {
    conn.release();
  }
}

// POST: Create a new domain
export async function POST(req: NextRequest) {
  const pool = getMariaDbPool();
  if (!pool) {
    return NextResponse.json({ error: "Database is not configured. Please set MARIADB_URL or all required MariaDB environment variables." }, { status: 500 });
  }
  adminDebugLog('[domains] POST called');
  const conn = await pool.getConnection();
  try {
    const body = await req.json();
    adminDebugLog('[domains] Creating domain with data:', body);
    const result = await conn.query(
      `
      INSERT INTO domains (name, is_enabled)
      VALUES (?, ?)
    `,
      [body.name, body.is_enabled]
    );
    adminDebugLog('[domains] Domain created, ID:', result.insertId);
    return NextResponse.json({ id: result.insertId, ...body });
  } catch (err) {
    adminDebugLog('[domains] Insert error', err);
    return NextResponse.json({ error: "Failed to create domain" }, { status: 500 });
  } finally {
    conn.release();
  }
}

// PUT: Update an existing domain
export async function PUT(req: NextRequest) {
  const pool = getMariaDbPool();
  if (!pool) {
    return NextResponse.json({ error: "Database is not configured. Please set MARIADB_URL or all required MariaDB environment variables." }, { status: 500 });
  }
  adminDebugLog('[domains] PUT called');
  const conn = await pool.getConnection();
  try {
    const body = await req.json();
    adminDebugLog('[domains] Updating domain with data:', body);
    await conn.query(
      `
      UPDATE domains
      SET name = ?, is_enabled = ?
      WHERE id = ?
    `,
      [body.name, body.is_enabled, body.id]
    );
    adminDebugLog('[domains] Domain updated, ID:', body.id);
    return NextResponse.json({ id: body.id, ...body });
  } catch (err) {
    adminDebugLog('[domains] Update error', err);
    return NextResponse.json({ error: "Failed to update domain" }, { status: 500 });
  } finally {
    conn.release();
  }
}

// DELETE: Delete a domain
export async function DELETE(req: NextRequest) {
  const pool = getMariaDbPool();
  if (!pool) {
    return NextResponse.json({ error: "Database is not configured. Please set MARIADB_URL or all required MariaDB environment variables." }, { status: 500 });
  }
  adminDebugLog('[domains] DELETE called');
  const conn = await pool.getConnection();
  try {
    const body = await req.json();
    adminDebugLog('[domains] Deleting domain, ID:', body.id);
    await conn.query(
      `
      DELETE FROM domains
      WHERE id = ?
    `,
      [body.id]
    );
    adminDebugLog('[domains] Domain deleted, ID:', body.id);
    return NextResponse.json({ id: body.id });
  } catch (err) {
    adminDebugLog('[domains] Delete error', err);
    return NextResponse.json({ error: "Failed to delete domain" }, { status: 500 });
  } finally {
    conn.release();
  }
}
