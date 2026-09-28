require("dotenv").config();

const express = require("express");
const { Resend } = require("resend");
const { createAdminClient, createContextClient, verifyAuth } = require("@supabase/server/core");

// The project URL and publishable key are public. These local fallbacks use
// the existing Vite settings without ever exposing the secret key to a browser.
process.env.SUPABASE_URL ??= process.env.VITE_SUPABASE_URL;
process.env.SUPABASE_PUBLISHABLE_KEY ??= process.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const app = express();
const port = process.env.PORT || 3000;
const allowedOrigins = new Set(["http://127.0.0.1:5173", "http://localhost:5173"]);

app.use((req, res, next) => {
  const origin = req.get("origin");
  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
    res.setHeader("Vary", "Origin");
  }
  res.setHeader("Access-Control-Allow-Headers", "Authorization, Content-Type, Accept");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS");
  res.type("application/json");
  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.json({ limit: "6mb" }));

function requestForAuth(req) {
  const headers = new Headers();
  for (const [name, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) headers.set(name, value.join(", "));
    else if (value) headers.set(name, value);
  }
  return new Request(`http://${req.get("host")}${req.originalUrl}`, {
    method: req.method,
    headers,
  });
}

async function requireUser(req, res, next) {
  const { data: auth, error } = await verifyAuth(requestForAuth(req), { auth: "user" });
  if (error) {
    return res.status(error.status).json({
      code: error.code,
      message: "Sign in to access your meals.",
    });
  }

  try {
    req.supabase = createContextClient({
      auth: { token: auth.token, keyName: auth.keyName },
    });
    req.user = auth.userClaims;
    next();
  } catch (clientError) {
    console.error("Supabase server setup error:", clientError.code);
    res.status(clientError.status || 500).json({
      code: clientError.code || "SUPABASE_SETUP_ERROR",
      message: "The server could not connect to Supabase.",
    });
  }
}

app.get("/", (req, res) => {
  res.json({ status: "ok", service: "meal-planner-api" });
});

const dailyMealFields = new Set(["breakfast", "lunch", "dinner", "snack"]);
const dailyMealTagFields = new Set(["breakfast_tag", "lunch_tag", "dinner_tag", "snack_tag"]);
const validMealTags = new Set(["green", "yellow", "orange", "red"]);

function isValidDate(value) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

async function ensureDailyMealPlan(supabase, userId, mealDate) {
  return supabase.from("daily_meal_plans").upsert(
    { user_id: userId, meal_date: mealDate },
    { onConflict: "user_id,meal_date", ignoreDuplicates: true },
  );
}

app.get("/api/daily-meals/history", requireUser, async (req, res) => {
  const startDate = req.query.start;
  const endDate = req.query.end;
  if (!isValidDate(startDate) || !isValidDate(endDate) || startDate > endDate) {
    return res.status(400).json({ message: "Use valid start and end dates in YYYY-MM-DD format." });
  }

  const { data, error } = await req.supabase
    .from("daily_meal_plans")
    .select("meal_date, breakfast, lunch, dinner, snack, breakfast_tag, lunch_tag, dinner_tag, snack_tag, created_at, updated_at")
    .gte("meal_date", startDate)
    .lte("meal_date", endDate)
    .order("meal_date", { ascending: true });

  if (error) return res.status(400).json({ message: error.message });
  res.json({ plans: data });
});

app.get("/api/daily-meals", requireUser, async (req, res) => {
  const mealDate = req.query.date || new Date().toISOString().slice(0, 10);
  if (!isValidDate(mealDate)) return res.status(400).json({ message: "Use a valid date in YYYY-MM-DD format." });

  const { error: createError } = await ensureDailyMealPlan(req.supabase, req.user.id, mealDate);
  if (createError) return res.status(400).json({ message: createError.message });

  const { data, error } = await req.supabase
    .from("daily_meal_plans")
    .select("meal_date, breakfast, lunch, dinner, snack, breakfast_tag, lunch_tag, dinner_tag, snack_tag, created_at, updated_at")
    .eq("user_id", req.user.id)
    .eq("meal_date", mealDate)
    .single();

  if (error) return res.status(400).json({ message: error.message });
  res.json({ plan: data });
});

app.patch("/api/daily-meals/:date", requireUser, async (req, res) => {
  const { date: mealDate } = req.params;
  if (!isValidDate(mealDate)) return res.status(400).json({ message: "Use a valid date in YYYY-MM-DD format." });

  const updates = {};
  for (const field of dailyMealFields) {
    if (req.body[field] !== undefined) {
      if (typeof req.body[field] !== "string") return res.status(400).json({ message: `${field} must be text.` });
      updates[field] = req.body[field].trim();
    }
  }
  for (const field of dailyMealTagFields) {
    if (req.body[field] !== undefined) {
      const tag = req.body[field];
      if (tag !== null && !validMealTags.has(tag)) {
        return res.status(400).json({ message: `${field} must be green, yellow, orange, or red.` });
      }
      updates[field] = tag;
    }
  }
  if (!Object.keys(updates).length) return res.status(400).json({ message: "No meal changes were supplied." });

  const { error: createError } = await ensureDailyMealPlan(req.supabase, req.user.id, mealDate);
  if (createError) return res.status(400).json({ message: createError.message });

  updates.updated_at = new Date().toISOString();
  const { data, error } = await req.supabase
    .from("daily_meal_plans")
    .update(updates)
    .eq("user_id", req.user.id)
    .eq("meal_date", mealDate)
    .select("meal_date, breakfast, lunch, dinner, snack, breakfast_tag, lunch_tag, dinner_tag, snack_tag, created_at, updated_at")
    .single();

  if (error) return res.status(400).json({ message: error.message });
  res.json({ plan: data });
});

app.get("/api/meals", requireUser, async (req, res) => {
  const { data, error } = await req.supabase
    .from("meal_history")
    .select("id, meal_name, meal_date, meal_type, notes, created_at, updated_at")
    .order("meal_date", { ascending: false });

  if (error) return res.status(400).json({ message: error.message });
  res.json({ meals: data });
});

app.post("/api/meals", requireUser, async (req, res) => {
  const mealName = typeof req.body.meal_name === "string" ? req.body.meal_name.trim() : "";
  const mealType = req.body.meal_type || null;
  const validTypes = new Set(["breakfast", "lunch", "dinner", "snack"]);

  if (!mealName) return res.status(400).json({ message: "A meal name is required." });
  if (mealType && !validTypes.has(mealType)) {
    return res.status(400).json({ message: "Choose breakfast, lunch, dinner, or snack." });
  }

  const meal = {
    user_id: req.user.id,
    meal_name: mealName,
    meal_type: mealType,
    notes: typeof req.body.notes === "string" ? req.body.notes.trim() || null : null,
  };
  if (req.body.meal_date) meal.meal_date = req.body.meal_date;

  const { data, error } = await req.supabase
    .from("meal_history")
    .insert(meal)
    .select()
    .single();

  if (error) return res.status(400).json({ message: error.message });
  res.status(201).json({ meal: data });
});

app.patch("/api/meals/:id", requireUser, async (req, res) => {
  const updates = {};
  if (typeof req.body.meal_name === "string") {
    const name = req.body.meal_name.trim();
    if (!name) return res.status(400).json({ message: "A meal name cannot be empty." });
    updates.meal_name = name;
  }
  if (typeof req.body.meal_date === "string") updates.meal_date = req.body.meal_date;
  if (typeof req.body.notes === "string") updates.notes = req.body.notes.trim() || null;
  if (req.body.meal_type !== undefined) updates.meal_type = req.body.meal_type || null;
  if (!Object.keys(updates).length) return res.status(400).json({ message: "No changes were supplied." });

  updates.updated_at = new Date().toISOString();
  const { data, error } = await req.supabase
    .from("meal_history")
    .update(updates)
    .eq("id", req.params.id)
    .select()
    .single();

  if (error) return res.status(400).json({ message: error.message });
  res.json({ meal: data });
});

app.delete("/api/meals/:id", requireUser, async (req, res) => {
  const { error } = await req.supabase.from("meal_history").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ message: error.message });
  res.json({ success: true });
});

app.delete("/api/account", requireUser, async (req, res) => {
  try {
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin.auth.admin.deleteUser(req.user.id);
    if (error) return res.status(400).json({ message: error.message });
    res.json({ success: true });
  } catch (error) {
    console.error("Account deletion setup error:", error.code);
    res.status(error.status || 500).json({
      message: "The server could not delete this account.",
    });
  }
});

app.get("/api/shopping-items", requireUser, async (req, res) => {
  const { data, error } = await req.supabase
    .from("shopping_items")
    .select("id, item_name, is_checked, created_at")
    .order("is_checked", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) return res.status(400).json({ message: error.message });
  res.json({ items: data });
});

app.post("/api/shopping-items", requireUser, async (req, res) => {
  const itemName = typeof req.body.item_name === "string" ? req.body.item_name.trim() : "";
  if (!itemName) return res.status(400).json({ message: "An item name is required." });
  const { data, error } = await req.supabase
    .from("shopping_items")
    .insert({ user_id: req.user.id, item_name: itemName })
    .select("id, item_name, is_checked, created_at")
    .single();
  if (error) return res.status(400).json({ message: error.message });
  res.status(201).json({ item: data });
});

app.patch("/api/shopping-items/:id", requireUser, async (req, res) => {
  if (typeof req.body.is_checked !== "boolean") return res.status(400).json({ message: "is_checked must be true or false." });
  const { data, error } = await req.supabase
    .from("shopping_items")
    .update({ is_checked: req.body.is_checked })
    .eq("id", req.params.id)
    .select("id, item_name, is_checked, created_at")
    .single();
  if (error) return res.status(400).json({ message: error.message });
  res.json({ item: data });
});

app.delete("/api/shopping-items/:id", requireUser, async (req, res) => {
  const { error } = await req.supabase.from("shopping_items").delete().eq("id", req.params.id);
  if (error) return res.status(400).json({ message: error.message });
  res.json({ success: true });
});

app.post("/api/shopping-list/email", requireUser, async (req, res) => {
  const screenshot = req.body.screenshot;
  const recipient = req.user.email;
  if (!recipient) return res.status(400).json({ message: "Your account does not have an email address." });
  if (typeof screenshot !== "string" || !/^[A-Za-z0-9+/=]+$/.test(screenshot) || screenshot.length > 7_500_000) {
    return res.status(400).json({ message: "Please send a valid shopping-list screenshot." });
  }
  if (!process.env.RESEND_API_KEY || !process.env.RESEND_FROM_EMAIL) {
    return res.status(503).json({ message: "Add RESEND_API_KEY and RESEND_FROM_EMAIL to .env, then restart the API." });
  }

  const resend = new Resend(process.env.RESEND_API_KEY);
  const { error } = await resend.emails.send({
    from: process.env.RESEND_FROM_EMAIL,
    to: [recipient],
    subject: "Your Meal Planner shopping list",
    html: "<p>Your shopping list screenshot is attached.</p>",
    attachments: [{ filename: "shopping-list.png", content: screenshot, contentType: "image/png" }],
  });
  if (error) return res.status(400).json({ message: error.message });
  res.json({ success: true });
});

app.use((error, req, res, next) => {
  if (error instanceof SyntaxError && "body" in error) {
    return res.status(400).json({ message: "Request body must be valid JSON." });
  }
  console.error("Unexpected API error:", error);
  res.status(500).json({ message: "The API encountered an unexpected error." });
});

app.listen(port, () => {
  console.log(`Open http://localhost:${port}`);
});
