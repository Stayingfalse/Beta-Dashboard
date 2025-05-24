import { NextRequest, NextResponse } from "next/server";
import mariadb from "mariadb";
import { adminDebugLog } from "../../debug";

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
  adminDebugLog('[departments/[id]] DELETE called');
  if (!pool) {
    adminDebugLog('[departments/[id]] No pool');
    return NextResponse.json({ error: "DB not ready" }, { status: 500 });
  }
  // Get id from URL
  const url = new URL(req.url);
  const id = url.pathname.split("/").filter(Boolean).pop();
  adminDebugLog('[departments/[id]] Parsed id:', id);
  if (!id) {
    adminDebugLog('[departments/[id]] Missing id');
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const conn = await pool.getConnection();
  try {
    adminDebugLog('[departments/[id]] Deleting department', id);
    await conn.query(`DELETE FROM departments WHERE id = ?`, [id]);
    adminDebugLog('[departments/[id]] Delete success');
    return NextResponse.json({ success: true });
  } catch (err) {
    adminDebugLog('[departments/[id]] Delete error', err);
    return NextResponse.json({ error: "Failed to delete department" }, { status: 500 });
  } finally {
    conn.release();
  }
}
