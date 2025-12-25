import express from "express";
import session from "express-session";
import cors from "cors";
import morgan from "morgan";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { all, get, initDb, insertAndGetId, run } from "./db";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

const boot = async () => {
  await initDb();
  app.listen(PORT, () => {
    console.log(`API running on http://localhost:${PORT}`);
  });
};

app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true
  })
);
app.use(express.json());
app.use(morgan("dev"));
app.use(
  session({
    secret: "local-crm-secret",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 8 }
  })
);

const requireAuth: express.RequestHandler = (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
};

const asyncHandler =
  (fn: express.RequestHandler): express.RequestHandler =>
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

app.post(
  "/api/auth/login",
  asyncHandler(async (req, res) => {
    const schema = z.object({
      email: z.string().email(),
      password: z.string().min(6)
    });
    const { email, password } = schema.parse(req.body);
    const user = get<{ id: number; email: string; password_hash: string; name: string }>(
      "SELECT id, email, password_hash, name FROM users WHERE email = ?",
      [email]
    );

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.session.userId = user.id;
    res.json({ data: { id: user.id, email: user.email, name: user.name } });
  })
);

app.post("/api/auth/logout", requireAuth, (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).json({ error: "Failed to logout" });
    }
    res.json({ data: { success: true } });
  });
});

app.get("/api/auth/me", requireAuth, (req, res) => {
  const user = get<{ id: number; email: string; name: string }>(
    "SELECT id, email, name FROM users WHERE id = ?",
    [req.session.userId as number]
  );
  res.json({ data: user });
});

app.get("/api/accounts", requireAuth, (req, res) => {
  const search = (req.query.search as string | undefined) ?? "";
  const accounts = search
    ? all("SELECT * FROM accounts WHERE name LIKE ? ORDER BY name", [`%${search}%`])
    : all("SELECT * FROM accounts ORDER BY name");
  res.json({ data: accounts });
});

app.post(
  "/api/accounts",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().min(1),
      industry: z.string().optional().nullable(),
      website: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      address: z.string().optional().nullable()
    });
    const payload = schema.parse(req.body);
    const accountId = insertAndGetId(
      `INSERT INTO accounts (name, industry, website, phone, address, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [payload.name, payload.industry, payload.website, payload.phone, payload.address]
    );
    const account = get("SELECT * FROM accounts WHERE id = ?", [accountId]);
    res.status(201).json({ data: account });
  })
);

app.put(
  "/api/accounts/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().min(1),
      industry: z.string().optional().nullable(),
      website: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      address: z.string().optional().nullable()
    });
    const payload = schema.parse(req.body);
    run(
      `UPDATE accounts
       SET name = ?, industry = ?, website = ?, phone = ?, address = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [payload.name, payload.industry, payload.website, payload.phone, payload.address, req.params.id]
    );
    const account = get("SELECT * FROM accounts WHERE id = ?", [req.params.id]);
    res.json({ data: account });
  })
);

app.delete("/api/accounts/:id", requireAuth, (req, res) => {
  run("DELETE FROM accounts WHERE id = ?", [req.params.id]);
  res.json({ data: { success: true } });
});

app.get("/api/contacts", requireAuth, (req, res) => {
  const accountId = req.query.account_id as string | undefined;
  const search = (req.query.search as string | undefined) ?? "";
  let query = "SELECT * FROM contacts";
  const params: Array<string> = [];
  const filters: string[] = [];
  if (accountId) {
    filters.push("account_id = ?");
    params.push(accountId);
  }
  if (search) {
    filters.push("(first_name LIKE ? OR last_name LIKE ? OR email LIKE ?)");
    params.push(`%${search}%`, `%${search}%`, `%${search}%`);
  }
  if (filters.length) {
    query += ` WHERE ${filters.join(" AND ")}`;
  }
  query += " ORDER BY last_name";
  const contacts = all(query, params);
  res.json({ data: contacts });
});

app.post(
  "/api/contacts",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      account_id: z.number(),
      first_name: z.string().min(1),
      last_name: z.string().min(1),
      email: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      title: z.string().optional().nullable()
    });
    const payload = schema.parse(req.body);
    const contactId = insertAndGetId(
      `INSERT INTO contacts (account_id, first_name, last_name, email, phone, title, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        payload.account_id,
        payload.first_name,
        payload.last_name,
        payload.email,
        payload.phone,
        payload.title
      ]
    );
    const contact = get("SELECT * FROM contacts WHERE id = ?", [contactId]);
    res.status(201).json({ data: contact });
  })
);

app.put(
  "/api/contacts/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      account_id: z.number(),
      first_name: z.string().min(1),
      last_name: z.string().min(1),
      email: z.string().optional().nullable(),
      phone: z.string().optional().nullable(),
      title: z.string().optional().nullable()
    });
    const payload = schema.parse(req.body);
    run(
      `UPDATE contacts
       SET account_id = ?, first_name = ?, last_name = ?,
           email = ?, phone = ?, title = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        payload.account_id,
        payload.first_name,
        payload.last_name,
        payload.email,
        payload.phone,
        payload.title,
        req.params.id
      ]
    );
    const contact = get("SELECT * FROM contacts WHERE id = ?", [req.params.id]);
    res.json({ data: contact });
  })
);

app.delete("/api/contacts/:id", requireAuth, (req, res) => {
  run("DELETE FROM contacts WHERE id = ?", [req.params.id]);
  res.json({ data: { success: true } });
});

app.get("/api/stages", requireAuth, (_req, res) => {
  const stages = all("SELECT * FROM stages ORDER BY order_index");
  res.json({ data: stages });
});

app.post(
  "/api/stages",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().min(1),
      order_index: z.number(),
      is_won: z.number().optional().default(0),
      is_lost: z.number().optional().default(0)
    });
    const payload = schema.parse(req.body);
    const stageId = insertAndGetId(
      `INSERT INTO stages (name, order_index, is_won, is_lost) VALUES (?, ?, ?, ?)`,
      [payload.name, payload.order_index, payload.is_won, payload.is_lost]
    );
    const stage = get("SELECT * FROM stages WHERE id = ?", [stageId]);
    res.status(201).json({ data: stage });
  })
);

app.put(
  "/api/stages/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      name: z.string().min(1),
      order_index: z.number(),
      is_won: z.number().optional().default(0),
      is_lost: z.number().optional().default(0)
    });
    const payload = schema.parse(req.body);
    run(`UPDATE stages SET name = ?, order_index = ?, is_won = ?, is_lost = ? WHERE id = ?`, [
      payload.name,
      payload.order_index,
      payload.is_won,
      payload.is_lost,
      req.params.id
    ]);
    const stage = get("SELECT * FROM stages WHERE id = ?", [req.params.id]);
    res.json({ data: stage });
  })
);

app.delete("/api/stages/:id", requireAuth, (req, res) => {
  run("DELETE FROM stages WHERE id = ?", [req.params.id]);
  res.json({ data: { success: true } });
});

app.get("/api/deals", requireAuth, (req, res) => {
  const { stage_id, owner_user_id, start_date, end_date, search } = req.query as Record<string, string>;
  const filters: string[] = [];
  const params: Array<string> = [];
  if (stage_id) {
    filters.push("stage_id = ?");
    params.push(stage_id);
  }
  if (owner_user_id) {
    filters.push("owner_user_id = ?");
    params.push(owner_user_id);
  }
  if (start_date) {
    filters.push("close_date >= ?");
    params.push(start_date);
  }
  if (end_date) {
    filters.push("close_date <= ?");
    params.push(end_date);
  }
  if (search) {
    filters.push("title LIKE ?");
    params.push(`%${search}%`);
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const deals = all(`SELECT * FROM deals ${where} ORDER BY updated_at DESC`, params);
  res.json({ data: deals });
});

app.get("/api/deals/:id", requireAuth, (req, res) => {
  const deal = get("SELECT * FROM deals WHERE id = ?", [req.params.id]);
  if (!deal) {
    return res.status(404).json({ error: "Deal not found" });
  }
  res.json({ data: deal });
});

app.post(
  "/api/deals",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      account_id: z.number(),
      primary_contact_id: z.number().optional().nullable(),
      title: z.string().min(1),
      amount: z.number(),
      currency: z.string().default("USD"),
      stage_id: z.number(),
      owner_user_id: z.number(),
      close_date: z.string().optional().nullable()
    });
    const payload = schema.parse(req.body);
    const dealId = insertAndGetId(
      `INSERT INTO deals (account_id, primary_contact_id, title, amount, currency, stage_id, owner_user_id, close_date, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        payload.account_id,
        payload.primary_contact_id,
        payload.title,
        payload.amount,
        payload.currency,
        payload.stage_id,
        payload.owner_user_id,
        payload.close_date
      ]
    );
    const deal = get("SELECT * FROM deals WHERE id = ?", [dealId]);
    res.status(201).json({ data: deal });
  })
);

app.put(
  "/api/deals/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      account_id: z.number(),
      primary_contact_id: z.number().optional().nullable(),
      title: z.string().min(1),
      amount: z.number(),
      currency: z.string().default("USD"),
      stage_id: z.number(),
      owner_user_id: z.number(),
      close_date: z.string().optional().nullable()
    });
    const payload = schema.parse(req.body);
    run(
      `UPDATE deals
       SET account_id = ?, primary_contact_id = ?, title = ?,
           amount = ?, currency = ?, stage_id = ?,
           owner_user_id = ?, close_date = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        payload.account_id,
        payload.primary_contact_id,
        payload.title,
        payload.amount,
        payload.currency,
        payload.stage_id,
        payload.owner_user_id,
        payload.close_date,
        req.params.id
      ]
    );
    const deal = get("SELECT * FROM deals WHERE id = ?", [req.params.id]);
    res.json({ data: deal });
  })
);

app.patch(
  "/api/deals/:id/stage",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({ stage_id: z.number() });
    const payload = schema.parse(req.body);
    run("UPDATE deals SET stage_id = ?, updated_at = datetime('now') WHERE id = ?", [
      payload.stage_id,
      req.params.id
    ]);
    const deal = get("SELECT * FROM deals WHERE id = ?", [req.params.id]);
    res.json({ data: deal });
  })
);

app.delete("/api/deals/:id", requireAuth, (req, res) => {
  run("DELETE FROM deals WHERE id = ?", [req.params.id]);
  res.json({ data: { success: true } });
});

app.get("/api/activities", requireAuth, (req, res) => {
  const dealId = req.query.deal_id as string | undefined;
  const activities = dealId
    ? all("SELECT * FROM activities WHERE deal_id = ? ORDER BY due_date", [dealId])
    : all("SELECT * FROM activities ORDER BY due_date");
  res.json({ data: activities });
});

app.post(
  "/api/activities",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      deal_id: z.number(),
      type: z.string().min(1),
      subject: z.string().min(1),
      due_date: z.string().optional().nullable(),
      status: z.string().default("open"),
      assigned_user_id: z.number()
    });
    const payload = schema.parse(req.body);
    const activityId = insertAndGetId(
      `INSERT INTO activities (deal_id, type, subject, due_date, status, assigned_user_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
      [
        payload.deal_id,
        payload.type,
        payload.subject,
        payload.due_date,
        payload.status,
        payload.assigned_user_id
      ]
    );
    const activity = get("SELECT * FROM activities WHERE id = ?", [activityId]);
    res.status(201).json({ data: activity });
  })
);

app.put(
  "/api/activities/:id",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      deal_id: z.number(),
      type: z.string().min(1),
      subject: z.string().min(1),
      due_date: z.string().optional().nullable(),
      status: z.string().default("open"),
      assigned_user_id: z.number()
    });
    const payload = schema.parse(req.body);
    run(
      `UPDATE activities
       SET deal_id = ?, type = ?, subject = ?, due_date = ?,
           status = ?, assigned_user_id = ?, updated_at = datetime('now')
       WHERE id = ?`,
      [
        payload.deal_id,
        payload.type,
        payload.subject,
        payload.due_date,
        payload.status,
        payload.assigned_user_id,
        req.params.id
      ]
    );
    const activity = get("SELECT * FROM activities WHERE id = ?", [req.params.id]);
    res.json({ data: activity });
  })
);

app.delete("/api/activities/:id", requireAuth, (req, res) => {
  run("DELETE FROM activities WHERE id = ?", [req.params.id]);
  res.json({ data: { success: true } });
});

app.get("/api/notes", requireAuth, (req, res) => {
  const dealId = req.query.deal_id as string | undefined;
  const notes = dealId
    ? all("SELECT * FROM notes WHERE deal_id = ? ORDER BY created_at DESC", [dealId])
    : all("SELECT * FROM notes ORDER BY created_at DESC");
  res.json({ data: notes });
});

app.post(
  "/api/notes",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      deal_id: z.number(),
      author_user_id: z.number(),
      body: z.string().min(1)
    });
    const payload = schema.parse(req.body);
    const noteId = insertAndGetId(
      `INSERT INTO notes (deal_id, author_user_id, body, created_at)
       VALUES (?, ?, ?, datetime('now'))`,
      [payload.deal_id, payload.author_user_id, payload.body]
    );
    const note = get("SELECT * FROM notes WHERE id = ?", [noteId]);
    res.status(201).json({ data: note });
  })
);

app.delete("/api/notes/:id", requireAuth, (req, res) => {
  run("DELETE FROM notes WHERE id = ?", [req.params.id]);
  res.json({ data: { success: true } });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: "Validation error", details: err.errors.map((e) => e.message).join(", ") });
  }
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

boot().catch((err) => {
  console.error("Failed to initialize database", err);
  process.exit(1);
});
