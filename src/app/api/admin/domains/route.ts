import { NextResponse } from "next/server";
import { adminDebugLog, getMariaDbPool } from "../helperFunctions";

const pool = getMariaDbPool();

// GET: List all domains with user counts
export async function GET() {
  adminDebugLog('[domains] GET called');
  if (!pool) {
    adminDebugLog('[domains] No pool');
    return NextResponse.json([], { status: 500 });
  }
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
