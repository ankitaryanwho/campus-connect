import { Router } from "express";
import { pool } from "@workspace/db";
import { authMiddleware } from "../lib/auth";
import { generateId } from "../lib/id";

const router = Router();

async function getSeller(sellerId: string) {
  const client = await pool.connect();
  try {
    const r = await client.query(
      "SELECT id, name, avatar, college, program, year, phone, verified FROM users WHERE id=$1",
      [sellerId]
    );
    return r.rows[0] ?? null;
  } finally { client.release(); }
}

async function formatListing(row: any, requestingUserId: string) {
  const seller = await getSeller(row.seller_id);
  const client = await pool.connect();
  try {
    const offerCount = await client.query(
      "SELECT COUNT(*) as cnt FROM marketplace_offers WHERE listing_id=$1 AND status!='withdrawn'",
      [row.id]
    );
    const myOffer = requestingUserId
      ? await client.query(
          "SELECT id, amount, status FROM marketplace_offers WHERE listing_id=$1 AND buyer_id=$2 ORDER BY created_at DESC LIMIT 1",
          [row.id, requestingUserId]
        )
      : null;
    return {
      id: row.id,
      listingType: row.listing_type,
      itemCategory: row.item_category,
      title: row.title,
      description: row.description,
      photos: JSON.parse(row.photos || "[]"),
      price: parseFloat(row.price),
      rentalUnit: row.rental_unit,
      status: row.status,
      college: row.college,
      viewsCount: row.views_count,
      createdAt: row.created_at,
      seller,
      isOwn: row.seller_id === requestingUserId,
      offerCount: parseInt(offerCount.rows[0]?.cnt ?? "0"),
      myOffer: myOffer?.rows[0] ?? null,
    };
  } finally { client.release(); }
}

// GET /marketplace — list active listings
router.get("/", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { type, category, cursor, limit: lim } = req.query as Record<string, string>;
    const limit = Math.min(parseInt(lim || "20"), 50);

    const client = await pool.connect();
    try {
      let conditions = ["status='active'"];
      const params: any[] = [];
      let pi = 1;

      if (type && (type === "sell" || type === "rent")) {
        conditions.push(`listing_type=$${pi++}`);
        params.push(type);
      }
      if (category && category !== "all") {
        conditions.push(`item_category=$${pi++}`);
        params.push(category);
      }
      if (cursor) {
        conditions.push(`created_at < (SELECT created_at FROM marketplace_listings WHERE id=$${pi++})`);
        params.push(cursor);
      }

      const where = conditions.length ? "WHERE " + conditions.join(" AND ") : "";
      params.push(limit + 1);
      const rows = await client.query(
        `SELECT * FROM marketplace_listings ${where} ORDER BY created_at DESC LIMIT $${pi}`,
        params
      );
      const hasMore = rows.rows.length > limit;
      const data = rows.rows.slice(0, limit);
      const formatted = await Promise.all(data.map(r => formatListing(r, userId)));
      res.json({ listings: formatted, hasMore });
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError" });
  }
});

// POST /marketplace — create listing
router.post("/", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { listingType, itemCategory, title, description, photos, price, rentalUnit } = req.body;
    if (!listingType || !title || price == null) {
      res.status(400).json({ error: "listingType, title, and price are required" });
      return;
    }
    if (listingType === "rent" && !rentalUnit) {
      res.status(400).json({ error: "rentalUnit is required for rent listings" });
      return;
    }
    const id = generateId();
    const client = await pool.connect();
    try {
      // Get seller college
      const uRow = await client.query("SELECT college FROM users WHERE id=$1", [userId]);
      const college = uRow.rows[0]?.college ?? null;

      await client.query(
        `INSERT INTO marketplace_listings (id,seller_id,listing_type,item_category,title,description,photos,price,rental_unit,status,college)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'active',$10)`,
        [id, userId, listingType, itemCategory || "other", title, description || "", JSON.stringify(photos || []), parseFloat(price), rentalUnit || null, college]
      );
      const row = await client.query("SELECT * FROM marketplace_listings WHERE id=$1", [id]);
      const formatted = await formatListing(row.rows[0], userId);
      res.status(201).json({ listing: formatted });
    } finally { client.release(); }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "ServerError" });
  }
});

// GET /marketplace/my-listings — my listings
router.get("/my-listings", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const client = await pool.connect();
    try {
      const rows = await client.query(
        "SELECT * FROM marketplace_listings WHERE seller_id=$1 ORDER BY created_at DESC",
        [userId]
      );
      const formatted = await Promise.all(rows.rows.map(r => formatListing(r, userId)));
      res.json({ listings: formatted });
    } finally { client.release(); }
  } catch (err) {
    res.status(500).json({ error: "ServerError" });
  }
});

// GET /marketplace/my-offers — offers I made
router.get("/my-offers", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const client = await pool.connect();
    try {
      const rows = await client.query(
        `SELECT o.*, l.title as listing_title, l.price as listing_price, l.listing_type, l.status as listing_status
         FROM marketplace_offers o
         JOIN marketplace_listings l ON o.listing_id=l.id
         WHERE o.buyer_id=$1 ORDER BY o.created_at DESC`,
        [userId]
      );
      res.json({ offers: rows.rows });
    } finally { client.release(); }
  } catch (err) {
    res.status(500).json({ error: "ServerError" });
  }
});

// GET /marketplace/:id — listing detail
router.get("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const client = await pool.connect();
    try {
      const row = await client.query("SELECT * FROM marketplace_listings WHERE id=$1", [id]);
      if (!row.rows.length) { res.status(404).json({ error: "Not found" }); return; }
      // Bump view count (async, don't await)
      client.query("UPDATE marketplace_listings SET views_count=views_count+1 WHERE id=$1", [id]).catch(() => {});
      const formatted = await formatListing(row.rows[0], userId);
      res.json({ listing: formatted });
    } finally { client.release(); }
  } catch (err) {
    res.status(500).json({ error: "ServerError" });
  }
});

// DELETE /marketplace/:id — withdraw listing
router.delete("/:id", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const client = await pool.connect();
    try {
      const row = await client.query("SELECT seller_id FROM marketplace_listings WHERE id=$1", [id]);
      if (!row.rows.length) { res.status(404).json({ error: "Not found" }); return; }
      if (row.rows[0].seller_id !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
      await client.query("UPDATE marketplace_listings SET status='withdrawn', updated_at=now() WHERE id=$1", [id]);
      res.json({ ok: true });
    } finally { client.release(); }
  } catch (err) {
    res.status(500).json({ error: "ServerError" });
  }
});

// PATCH /marketplace/:id/status — mark as sold / rented
router.patch("/:id/status", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { status } = req.body;
    if (!["active", "sold", "rented"].includes(status)) {
      res.status(400).json({ error: "Invalid status" }); return;
    }
    const client = await pool.connect();
    try {
      const row = await client.query("SELECT seller_id FROM marketplace_listings WHERE id=$1", [id]);
      if (!row.rows.length) { res.status(404).json({ error: "Not found" }); return; }
      if (row.rows[0].seller_id !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
      await client.query("UPDATE marketplace_listings SET status=$1, updated_at=now() WHERE id=$2", [status, id]);
      res.json({ ok: true });
    } finally { client.release(); }
  } catch (err) {
    res.status(500).json({ error: "ServerError" });
  }
});

// POST /marketplace/:id/offers — make an offer
router.post("/:id/offers", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const { amount, message } = req.body;
    if (!amount || parseFloat(amount) <= 0) {
      res.status(400).json({ error: "Valid offer amount required" }); return;
    }
    const client = await pool.connect();
    try {
      const listing = await client.query("SELECT * FROM marketplace_listings WHERE id=$1", [id]);
      if (!listing.rows.length) { res.status(404).json({ error: "Listing not found" }); return; }
      if (listing.rows[0].seller_id === userId) {
        res.status(400).json({ error: "Cannot offer on your own listing" }); return;
      }
      if (listing.rows[0].status !== "active") {
        res.status(400).json({ error: "Listing is no longer active" }); return;
      }
      // Withdraw any previous pending offer from this buyer
      await client.query(
        "UPDATE marketplace_offers SET status='withdrawn' WHERE listing_id=$1 AND buyer_id=$2 AND status='pending'",
        [id, userId]
      );
      const offerId = generateId();
      await client.query(
        "INSERT INTO marketplace_offers (id,listing_id,buyer_id,amount,message,status) VALUES ($1,$2,$3,$4,$5,'pending')",
        [offerId, id, userId, parseFloat(amount), message || null]
      );
      res.status(201).json({ ok: true, offerId });
    } finally { client.release(); }
  } catch (err) {
    res.status(500).json({ error: "ServerError" });
  }
});

// GET /marketplace/:id/offers — get offers for a listing (owner only)
router.get("/:id/offers", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { id } = req.params;
    const client = await pool.connect();
    try {
      const listing = await client.query("SELECT seller_id FROM marketplace_listings WHERE id=$1", [id]);
      if (!listing.rows.length) { res.status(404).json({ error: "Not found" }); return; }
      if (listing.rows[0].seller_id !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
      const offers = await client.query(
        `SELECT o.*, u.name as buyer_name, u.avatar as buyer_avatar, u.college as buyer_college, u.program as buyer_program
         FROM marketplace_offers o
         JOIN users u ON o.buyer_id=u.id
         WHERE o.listing_id=$1 AND o.status!='withdrawn'
         ORDER BY o.created_at DESC`,
        [id]
      );
      res.json({ offers: offers.rows });
    } finally { client.release(); }
  } catch (err) {
    res.status(500).json({ error: "ServerError" });
  }
});

// PATCH /marketplace/offers/:offerId — accept or reject offer (owner)
router.patch("/offers/:offerId", authMiddleware, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { offerId } = req.params;
    const { action } = req.body;
    if (!["accept", "reject"].includes(action)) {
      res.status(400).json({ error: "action must be accept or reject" }); return;
    }
    const client = await pool.connect();
    try {
      const offerRow = await client.query(
        `SELECT o.*, l.seller_id, l.listing_type FROM marketplace_offers o
         JOIN marketplace_listings l ON o.listing_id=l.id
         WHERE o.id=$1`,
        [offerId]
      );
      if (!offerRow.rows.length) { res.status(404).json({ error: "Offer not found" }); return; }
      const offer = offerRow.rows[0];
      if (offer.seller_id !== userId) { res.status(403).json({ error: "Forbidden" }); return; }
      if (offer.status !== "pending") { res.status(400).json({ error: "Offer already resolved" }); return; }

      if (action === "accept") {
        await client.query("UPDATE marketplace_offers SET status='accepted' WHERE id=$1", [offerId]);
        // Reject all other pending offers
        await client.query(
          "UPDATE marketplace_offers SET status='rejected' WHERE listing_id=$1 AND id!=$2 AND status='pending'",
          [offer.listing_id, offerId]
        );
        // Mark listing sold/rented
        const newStatus = offer.listing_type === "rent" ? "rented" : "sold";
        await client.query("UPDATE marketplace_listings SET status=$1, updated_at=now() WHERE id=$2", [newStatus, offer.listing_id]);
      } else {
        await client.query("UPDATE marketplace_offers SET status='rejected' WHERE id=$1", [offerId]);
      }
      res.json({ ok: true });
    } finally { client.release(); }
  } catch (err) {
    res.status(500).json({ error: "ServerError" });
  }
});

export default router;
