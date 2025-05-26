import { NextRequest, NextResponse } from "next/server";
import mariadb from "mariadb";
import type { LinkRow, LinkIdRow } from "./types";
import { adminDebugLog } from "../admin/debug";

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

async function getUserFromToken(token: string) {
  adminDebugLog('[links] getUserFromToken called', { token });
  if (!pool) throw new Error("MARIADB_URL not set");
  const conn = await pool.getConnection();
  try {
    const [session] = await conn.query(
      "SELECT uid FROM sessions WHERE token = ?",
      [token]
    );
    adminDebugLog('[links] session lookup', { session });
    if (!session) return null;
    const [user] = await conn.query(
      "SELECT id, email, department_id FROM users WHERE id = ?",
      [session.uid]
    );
    adminDebugLog('[links] user lookup', { user });
    return user || null;
  } finally {
    conn.release();
  }
}

export async function GET(req: NextRequest) {
  adminDebugLog('[links] GET called');
  if (!pool)
    return NextResponse.json({ error: "MARIADB_URL not set" }, { status: 500 });
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = auth.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const conn = await pool.getConnection();
  try {
    const [link] = await conn.query(
      "SELECT id, url FROM links WHERE uid = ?",
      [user.id]
    );
    return NextResponse.json({ link: link || null });
  } finally {
    conn.release();
  }
}

export async function POST(req: NextRequest) {
  adminDebugLog('[links] POST called');
  if (!pool)
    return NextResponse.json({ error: "MARIADB_URL not set" }, { status: 500 });
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = auth.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { url } = await req.json();
  if (!url || typeof url !== "string") {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }
  // Backend validation for Amazon UK wishlist format
  const amazonPattern = /^https:\/\/www\.amazon\.co\.uk\/hz\/wishlist\/[A-Za-z0-9?=&#_\/-]+$/;
  if (!amazonPattern.test(url)) {
    return NextResponse.json(
      { error: "Invalid Amazon UK wishlist link format." },
      { status: 400 }
    );
  }
  
  const conn = await pool.getConnection();
  try {
    // Upsert link for user, now including department_id
    await conn.query(
      `INSERT INTO links (uid, url, department_id) VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE url = VALUES(url), department_id = VALUES(department_id)`,
      [user.id, url, user.department_id]
    );
    return NextResponse.json({ success: true });
  } finally {
    conn.release();
  }
}

// POST /api/links/allocate: Allocate 3 (or 1 additional) links to a user
export async function PUT(req: NextRequest) {
  adminDebugLog('[links] PUT called');
  if (!pool)
    return NextResponse.json({ error: "MARIADB_URL not set" }, { status: 500 });
  const auth = req.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const token = auth.replace("Bearer ", "");
  const user = await getUserFromToken(token);
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const { additional } = await req.json().catch(() => ({}));
  const numToAllocate = additional ? 1 : 3;
  const conn = await pool.getConnection();
  try {
    adminDebugLog('[links] Allocating links', { userId: user.id, additional });
    // Get all link_ids already allocated to this user
    const allocatedRows = await conn.query(
      "SELECT link_id FROM link_allocations WHERE user_id = ?",
      [user.id]
    );
    const alreadyAllocated = new Set(allocatedRows.map((r: LinkIdRow) => Number(r.link_id)));
    adminDebugLog('[links] Already allocated', { alreadyAllocated });
    // Get user's own link id
    const [ownLink] = await conn.query("SELECT id FROM links WHERE uid = ?", [user.id]);
    const ownLinkId = ownLink ? Number(ownLink.id) : null;
    adminDebugLog('[links] Own link id', { ownLinkId });
    // Select eligible links (not own, not already allocated)
    const eligibleLinks = await conn.query(
      `SELECT id, url, times_allocated, times_purchased, error_count FROM links`
    );
    const filtered = (eligibleLinks as LinkRow[]).filter((l: LinkRow) =>
      Number(l.id) !== ownLinkId && !alreadyAllocated.has(Number(l.id))
    );
    adminDebugLog('[links] Eligible links', { eligibleLinks });
    adminDebugLog('[links] Filtered links', { filtered });
    // Sort by times_allocated, then times_purchased, then error_count
    filtered.sort((a: LinkRow, b: LinkRow) =>
      Number(a.times_allocated) - Number(b.times_allocated) ||
      Number(a.times_purchased) - Number(b.times_purchased) ||
      Number(a.error_count) - Number(b.error_count)
    );
    // Randomize among ties for fairness
    function shuffle(arr: LinkRow[]) {
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
    }
    const toAllocate: LinkRow[] = [];
    let i = 0;
    while (toAllocate.length < numToAllocate && i < filtered.length) {
      // Find all with same priority as filtered[i]
      const group = filtered.filter((l: LinkRow) =>
        l.times_allocated === filtered[i].times_allocated &&
        l.times_purchased === filtered[i].times_purchased &&
        l.error_count === filtered[i].error_count
      );
      shuffle(group);
      for (const l of group) {
        if (toAllocate.length < numToAllocate && !toAllocate.find(x => x.id === l.id)) {
          toAllocate.push(l);
        }
      }
      i += group.length;
    }
    adminDebugLog('[links] toAllocate', { toAllocate });
    // Allocate and update stats
    for (const link of toAllocate) {
      await conn.query(
        `INSERT INTO link_allocations (user_id, link_id, is_additional) VALUES (?, ?, ?)`,
        [user.id, link.id, !!additional]
      );
      await conn.query(
        `UPDATE links SET times_allocated = times_allocated + 1 WHERE id = ?`,
        [link.id]
      );
    }
    // Return allocated links (convert BigInt to Number)
    const result = toAllocate.map(l => ({
      ...l,
      id: Number(l.id),
      times_allocated: Number(l.times_allocated),
      times_purchased: Number(l.times_purchased),
      error_count: Number(l.error_count)
    }));
    adminDebugLog('[links] Allocation result', { result });
    return NextResponse.json({ allocated: result });
  } catch (e) {
    adminDebugLog('[links] Error allocating links', { error: e });
    return NextResponse.json({ error: "Failed to allocate links" }, { status: 500 });
  } finally {
    conn.release();
  }
}
