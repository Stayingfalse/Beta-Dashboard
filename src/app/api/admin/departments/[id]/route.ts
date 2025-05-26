import { NextRequest, NextResponse } from "next/server";
import { adminDebugLog, getMariaDbPool } from "../../helperFunctions";
import { requireAuth } from "../../../auth/authHelpers";

const pool = getMariaDbPool();

// DELETE: Remove department by id
export async function DELETE(req: NextRequest) {
  adminDebugLog("[departments/[id]] DELETE called");
  if (!pool) {
    adminDebugLog("[departments/[id]] No pool");
    return NextResponse.json({ error: "DB not ready" }, { status: 500 });
  }
  const auth = await requireAuth(req, { requireAdmin: true });
  if (!auth) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Get id from URL
  const url = new URL(req.url);
  const id = url.pathname.split("/").filter(Boolean).pop();
  adminDebugLog("[departments/[id]] Parsed id:", id);
  if (!id) {
    adminDebugLog("[departments/[id]] Missing id");
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }
  const conn = await pool.getConnection();
  try {
    adminDebugLog("[departments/[id]] Deleting department", id);
    // Remove department_id from links before deleting department (to avoid FK constraint errors)
    await conn.query(`UPDATE links SET department_id = NULL WHERE department_id = ?`, [id]);
    const result = await conn.query(`DELETE FROM departments WHERE id = ?`, [id]);
    adminDebugLog("[departments/[id]] Delete success", result);
    return NextResponse.json({ success: true });
  } catch (err) {
    adminDebugLog("[departments/[id]] Delete error", err);
    return NextResponse.json(
      { error: "Failed to delete department", details: String(err) },
      { status: 500 }
    );
  } finally {
    conn.release();
  }
}
