import { NextRequest, NextResponse } from "next/server";
import { getMariaDbPool } from "../admin/helperFunctions";
import type { LinkRow, LinkIdRow } from "./types";

const pool = getMariaDbPool();

async function getUserFromToken(token: string) {
  if (!pool) throw new Error("MARIADB_URL not set");
  const conn = await pool.getConnection();
  try {
    const [session] = await conn.query(
      "SELECT uid FROM sessions WHERE token = ?",
      [token]
    );
    if (!session) return null;
    const [user] = await conn.query(
      "SELECT id, email, department_id, domain_id FROM users WHERE id = ?",
      [session.uid]
    );
    return user || null;
  } finally {
    conn.release();
  }
}

export async function GET(req: NextRequest) {
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
  if (!user.department_id || !user.domain_id) {
    return NextResponse.json({ error: "User must have department and domain set" }, { status: 400 });
  }
  if (!url.startsWith("https://www.amazon.co.uk/hz/wishlist/")) {
    return NextResponse.json({ error: "Invalid Amazon UK wishlist link format." }, { status: 400 });
  }
  const conn = await pool.getConnection();
  try {
    // Upsert link for user, now including department_id and domain_id
    await conn.query(
      `INSERT INTO links (uid, url, department_id, domain_id) VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE url = VALUES(url), department_id = VALUES(department_id), domain_id = VALUES(domain_id)`,
      [user.id, url, user.department_id, user.domain_id]
    );
    return NextResponse.json({ success: true });
  } finally {
    conn.release();
  }
}

// POST /api/links/allocate: Allocate 3 (or 1 additional) links to a user
export async function PUT(req: NextRequest) {
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
    // Get all link_ids already allocated to this user
    const allocatedRows = await conn.query(
      "SELECT link_id FROM link_allocations WHERE user_id = ?",
      [user.id]
    );
    const alreadyAllocated = new Set(allocatedRows.map((r: LinkIdRow) => Number(r.link_id)));
    // Get user's own link id
    const [ownLink] = await conn.query("SELECT id FROM links WHERE uid = ?", [user.id]);
    const ownLinkId = ownLink ? Number(ownLink.id) : null;
    // Select eligible links (not own, not already allocated)
    const eligibleLinks = await conn.query(
      `SELECT id, url, times_allocated, times_purchased, error_count FROM links`
    );
    const filtered = (eligibleLinks as LinkRow[]).filter((l: LinkRow) =>
      Number(l.id) !== ownLinkId && !alreadyAllocated.has(Number(l.id))
    );
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
    return NextResponse.json({ allocated: result });
  } catch {
    return NextResponse.json({ error: "Failed to allocate links" }, { status: 500 });
  } finally {
    conn.release();
  }
}
