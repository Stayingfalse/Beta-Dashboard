import { NextResponse } from "next/server";
import mariadb from "mariadb";
import { adminDebugLog } from "../debug";

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
      SELECT d.uid, d.domain, d.is_enabled, COUNT(u.id) as user_count
      FROM domains d
      LEFT JOIN users u ON u.domain_id = d.uid
      GROUP BY d.uid, d.domain, d.is_enabled
      ORDER BY d.domain ASC
    `);
    adminDebugLog('[domains] Query result:', rows);
    return NextResponse.json(rows);
  } catch (err) {
    adminDebugLog('[domains] Query error', err);
    return NextResponse.json([], { status: 500 });
  } finally {
    conn.release();
  }
}
