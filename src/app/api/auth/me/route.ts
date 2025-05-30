import { NextRequest, NextResponse } from "next/server";
import { getMariaDbPool } from "../../admin/helperFunctions";

export async function GET(req: NextRequest) {
  const pool = getMariaDbPool();
  if (!pool) {
    return NextResponse.json({ error: "Database is not configured. Please set MARIADB_URL or all required MariaDB environment variables." }, { status: 500 });
  }
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