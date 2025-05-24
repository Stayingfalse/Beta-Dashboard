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

// DELETE: Remove department by id
export async function DELETE(req: NextRequest) {
  if (!pool) return NextResponse.json({ error: "DB not ready" }, { status: 500 });
  // Get id from URL
  const url = new URL(req.url);
  const id = url.pathname.split("/").filter(Boolean).pop();
  if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });
  const conn = await pool.getConnection();
  try {
    await conn.query(`DELETE FROM departments WHERE id = ?`, [id]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete department" }, { status: 500 });
  } finally {
    conn.release();
  }
}
