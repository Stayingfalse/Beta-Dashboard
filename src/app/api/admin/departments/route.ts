import { NextRequest, NextResponse } from "next/server";
import mariadb from "mariadb";

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

// GET: List departments for a domain with user/link counts
export async function GET(req: NextRequest) {
  if (!pool) return NextResponse.json([], { status: 500 });
  const { searchParams } = new URL(req.url);
  const domainId = searchParams.get("domain_id");
  if (!domainId) return NextResponse.json([], { status: 400 });
  const conn = await pool.getConnection();
  try {
    const rows = await conn.query(`
      SELECT d.id, d.name,
        (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id) as user_count,
        (SELECT COUNT(*) FROM links l WHERE l.department_id = d.id) as link_count
      FROM departments d
      WHERE d.domain_id = ?
      ORDER BY d.name ASC
    `, [domainId]);
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json([], { status: 500 });
  } finally {
    conn.release();
  }
}

// POST: Add department to domain
export async function POST(req: NextRequest) {
  if (!pool) return NextResponse.json([], { status: 500 });
  const { domain_id, name } = await req.json();
  if (!domain_id || !name) return NextResponse.json([], { status: 400 });
  const conn = await pool.getConnection();
  try {
    await conn.query(
      `INSERT INTO departments (id, name, domain_id) VALUES (UUID(), ?, ?)`,
      [name, domain_id]
    );
    // Return updated list
    const rows = await conn.query(`
      SELECT d.id, d.name,
        (SELECT COUNT(*) FROM users u WHERE u.department_id = d.id) as user_count,
        (SELECT COUNT(*) FROM links l WHERE l.department_id = d.id) as link_count
      FROM departments d
      WHERE d.domain_id = ?
      ORDER BY d.name ASC
    `, [domain_id]);
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json([], { status: 500 });
  } finally {
    conn.release();
  }
}
