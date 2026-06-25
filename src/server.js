import "dotenv/config.js";
import express from "express";
import cors from "cors";
import { supabase } from "./config/supabase.js";

const app = express();

const allowedOrgins = ["*", "https://pagination-frontend-4sk8.vercel.app/"];

app.use(express.json());
app.use(cors({ origin: allowedOrgins }));

// get products through offset pagination
app.get("/api/products", async (req, res) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const category = req.query.category;

    const offset = (page - 1) * limit;

    let query = supabase.from("products").select("*", { count: "exact" });

    if (category) {
      query = query.eq("category", category);
    }

    const {
      data: productsData,
      error: productErrors,
      count: totalCount,
    } = await query
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .range(offset, offset + limit - 1);

    if (productErrors) {
      return res.status(400).json({
        error: productErrors.message,
      });
    }

    const totalPages = Math.ceil(totalCount / limit);

    res.status(200).json({
      data: productsData,
      pagination: {
        currentPage: page,
        totalPages,
        totalItems: totalCount,
        itemsPerPage: limit,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    });
  } catch (err) {
    res.status(500).json({
      error: err.message,
    });
  }
});

app.get("/api/products/cursor", async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);

    if (error) throw error;

    let nextCursor = null;

    if (data.length > 0) {
      const last = data[data.length - 1];

      nextCursor = {
        updated_at: last.updated_at,
        id: last.id,
      };
    }

    res.json({
      products: data,
      nextCursor,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

app.use("/as", async (req, res) => {
  try {
    const limit = Number(req.query.limit) || 20;

    const cursorUpdatedAt = req.query.cursor;
    const cursorId = req.query.cursorId;

    let query = supabase
      .from("products")
      .select("*")
      .order("updated_at", { ascending: false })
      .order("id", { ascending: false })
      .limit(limit);

    if (cursorUpdatedAt && cursorId) {
      query = query.or(
        `updated_at.lt.${cursorUpdatedAt},and(updated_at.eq.${cursorUpdatedAt},id.lt.${cursorId})`,
      );
    }

    const { data, error } = await query;

    if (error) throw error;

    let nextCursor = null;

    if (data.length > 0) {
      const last = data[data.length - 1];

      nextCursor = {
        updated_at: last.updated_at,
        id: last.id,
      };
    }

    res.json({
      products: data,
      nextCursor,
    });
  } catch (err) {
    res.status(500).json({
      message: err.message,
    });
  }
});

app.use("/", (_, res) => {
  return res.send(`Server  is running on ${process.env.PORT}`);
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
