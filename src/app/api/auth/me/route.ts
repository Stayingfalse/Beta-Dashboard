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

export async function GET(req: NextRequest) {
  if (!pool) return NextResponse.json({ error: "MARIADB_URL not set" }, { status: 500 });
  const authHeader = req.headers.get("authorization");
  const token = authHeader?.replace(/^Bearer /, "");
  if (!token) return NextResponse.json({ error: "No session token" }, { status: 401 });
  const conn = await pool.getConnection();
  try {
    const [session] = await conn.query("SELECT * FROM sessions WHERE token = ? AND expires > NOW() LIMIT 1", [token]);
    if (!session || !session.uid) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    const [user] = await conn.query("SELECT email, department_id, is_admin FROM users WHERE id = ? LIMIT 1", [session.uid]);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 401 });
    // Check domain enabled state
    const [userDomain] = await conn.query("SELECT domain_id FROM users WHERE id = ? LIMIT 1", [session.uid]);
    if (!userDomain) return NextResponse.json({ error: "User domain not found" }, { status: 401 });
    const [domainRow] = await conn.query("SELECT is_enabled FROM domains WHERE id = ? LIMIT 1", [userDomain.domain_id]);
    const domain_enabled = !!(domainRow && domainRow.is_enabled);
    // Get department name if set
    let department = null;
    if (user.department_id) {
      const [dept] = await conn.query("SELECT id, name FROM departments WHERE id = ? LIMIT 1", [user.department_id]);
      if (dept) department = { id: dept.id, name: dept.name };
    }
    return NextResponse.json({ user: { ...user, department }, domain_enabled });
  } finally {
    conn.release();
  }
}