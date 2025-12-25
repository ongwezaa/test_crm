import express from "express";
import session from "express-session";
import cors from "cors";
import morgan from "morgan";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db, runMigrations } from "./db";

const app = express();
const PORT = process.env.PORT ? Number(process.env.PORT) : 4000;

runMigrations();

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
    const user = db
      .prepare("SELECT id, email, password_hash, name FROM users WHERE email = ?")
      .get(email);

    if (!user) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password_hash as string);
    if (!valid) {
      return res.status(401).json({ error: "Invalid credentials" });
    }

    req.session.userId = user.id as number;
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
  const user = db
    .prepare("SELECT id, email, name FROM users WHERE id = ?")
    .get(req.session.userId as number);
  res.json({ data: user });
});

app.get("/api/accounts", requireAuth, (req, res) => {
  const search = (req.query.search as string | undefined) ?? "";
  const accounts = search
    ? db
        .prepare("SELECT * FROM accounts WHERE name LIKE ? ORDER BY name")
        .all(`%${search}%`)
    : db.prepare("SELECT * FROM accounts ORDER BY name").all();
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
    const result = db
      .prepare(
        `INSERT INTO accounts (name, industry, website, phone, address, created_at, updated_at)
         VALUES (@name, @industry, @website, @phone, @address, datetime('now'), datetime('now'))`
      )
      .run(payload);
    const account = db.prepare("SELECT * FROM accounts WHERE id = ?").get(result.lastInsertRowid);
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
    db.prepare(
      `UPDATE accounts
       SET name = @name, industry = @industry, website = @website, phone = @phone, address = @address, updated_at = datetime('now')
       WHERE id = @id`
    ).run({ ...payload, id: req.params.id });
    const account = db.prepare("SELECT * FROM accounts WHERE id = ?").get(req.params.id);
    res.json({ data: account });
  })
);

app.delete("/api/accounts/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM accounts WHERE id = ?").run(req.params.id);
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
  const contacts = db.prepare(query).all(...params);
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
    const result = db
      .prepare(
        `INSERT INTO contacts (account_id, first_name, last_name, email, phone, title, created_at, updated_at)
         VALUES (@account_id, @first_name, @last_name, @email, @phone, @title, datetime('now'), datetime('now'))`
      )
      .run(payload);
    const contact = db.prepare("SELECT * FROM contacts WHERE id = ?").get(result.lastInsertRowid);
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
    db.prepare(
      `UPDATE contacts
       SET account_id = @account_id, first_name = @first_name, last_name = @last_name,
           email = @email, phone = @phone, title = @title, updated_at = datetime('now')
       WHERE id = @id`
    ).run({ ...payload, id: req.params.id });
    const contact = db.prepare("SELECT * FROM contacts WHERE id = ?").get(req.params.id);
    res.json({ data: contact });
  })
);

app.delete("/api/contacts/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM contacts WHERE id = ?").run(req.params.id);
  res.json({ data: { success: true } });
});

app.get("/api/stages", requireAuth, (req, res) => {
  const stages = db.prepare("SELECT * FROM stages ORDER BY order_index").all();
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
    const result = db
      .prepare(
        `INSERT INTO stages (name, order_index, is_won, is_lost) VALUES (@name, @order_index, @is_won, @is_lost)`
      )
      .run(payload);
    const stage = db.prepare("SELECT * FROM stages WHERE id = ?").get(result.lastInsertRowid);
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
    db.prepare(
      `UPDATE stages SET name = @name, order_index = @order_index, is_won = @is_won, is_lost = @is_lost WHERE id = @id`
    ).run({ ...payload, id: req.params.id });
    const stage = db.prepare("SELECT * FROM stages WHERE id = ?").get(req.params.id);
    res.json({ data: stage });
  })
);

app.delete("/api/stages/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM stages WHERE id = ?").run(req.params.id);
  res.json({ data: { success: true } });
});

app.get("/api/deals", requireAuth, (req, res) => {
  const { stage_id, owner_user_id, start_date, end_date, search } = req.query as Record<string, string>;
  const filters: string[] = [];
  const params: Record<string, string> = {};
  if (stage_id) {
    filters.push("stage_id = @stage_id");
    params.stage_id = stage_id;
  }
  if (owner_user_id) {
    filters.push("owner_user_id = @owner_user_id");
    params.owner_user_id = owner_user_id;
  }
  if (start_date) {
    filters.push("close_date >= @start_date");
    params.start_date = start_date;
  }
  if (end_date) {
    filters.push("close_date <= @end_date");
    params.end_date = end_date;
  }
  if (search) {
    filters.push("title LIKE @search");
    params.search = `%${search}%`;
  }
  const where = filters.length ? `WHERE ${filters.join(" AND ")}` : "";
  const deals = db.prepare(`SELECT * FROM deals ${where} ORDER BY updated_at DESC`).all(params);
  res.json({ data: deals });
});

app.get("/api/deals/:id", requireAuth, (req, res) => {
  const deal = db.prepare("SELECT * FROM deals WHERE id = ?").get(req.params.id);
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
    const result = db
      .prepare(
        `INSERT INTO deals (account_id, primary_contact_id, title, amount, currency, stage_id, owner_user_id, close_date, created_at, updated_at)
         VALUES (@account_id, @primary_contact_id, @title, @amount, @currency, @stage_id, @owner_user_id, @close_date, datetime('now'), datetime('now'))`
      )
      .run(payload);
    const deal = db.prepare("SELECT * FROM deals WHERE id = ?").get(result.lastInsertRowid);
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
    db.prepare(
      `UPDATE deals
       SET account_id = @account_id, primary_contact_id = @primary_contact_id, title = @title,
           amount = @amount, currency = @currency, stage_id = @stage_id,
           owner_user_id = @owner_user_id, close_date = @close_date, updated_at = datetime('now')
       WHERE id = @id`
    ).run({ ...payload, id: req.params.id });
    const deal = db.prepare("SELECT * FROM deals WHERE id = ?").get(req.params.id);
    res.json({ data: deal });
  })
);

app.patch(
  "/api/deals/:id/stage",
  requireAuth,
  asyncHandler(async (req, res) => {
    const schema = z.object({ stage_id: z.number() });
    const payload = schema.parse(req.body);
    db.prepare("UPDATE deals SET stage_id = ?, updated_at = datetime('now') WHERE id = ?").run(payload.stage_id, req.params.id);
    const deal = db.prepare("SELECT * FROM deals WHERE id = ?").get(req.params.id);
    res.json({ data: deal });
  })
);

app.delete("/api/deals/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM deals WHERE id = ?").run(req.params.id);
  res.json({ data: { success: true } });
});

app.get("/api/activities", requireAuth, (req, res) => {
  const dealId = req.query.deal_id as string | undefined;
  const stmt = dealId
    ? db.prepare("SELECT * FROM activities WHERE deal_id = ? ORDER BY due_date")
    : db.prepare("SELECT * FROM activities ORDER BY due_date");
  const activities = dealId ? stmt.all(dealId) : stmt.all();
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
    const result = db
      .prepare(
        `INSERT INTO activities (deal_id, type, subject, due_date, status, assigned_user_id, created_at, updated_at)
         VALUES (@deal_id, @type, @subject, @due_date, @status, @assigned_user_id, datetime('now'), datetime('now'))`
      )
      .run(payload);
    const activity = db.prepare("SELECT * FROM activities WHERE id = ?").get(result.lastInsertRowid);
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
    db.prepare(
      `UPDATE activities
       SET deal_id = @deal_id, type = @type, subject = @subject, due_date = @due_date,
           status = @status, assigned_user_id = @assigned_user_id, updated_at = datetime('now')
       WHERE id = @id`
    ).run({ ...payload, id: req.params.id });
    const activity = db.prepare("SELECT * FROM activities WHERE id = ?").get(req.params.id);
    res.json({ data: activity });
  })
);

app.delete("/api/activities/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM activities WHERE id = ?").run(req.params.id);
  res.json({ data: { success: true } });
});

app.get("/api/notes", requireAuth, (req, res) => {
  const dealId = req.query.deal_id as string | undefined;
  const stmt = dealId
    ? db.prepare("SELECT * FROM notes WHERE deal_id = ? ORDER BY created_at DESC")
    : db.prepare("SELECT * FROM notes ORDER BY created_at DESC");
  const notes = dealId ? stmt.all(dealId) : stmt.all();
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
    const result = db
      .prepare(
        `INSERT INTO notes (deal_id, author_user_id, body, created_at)
         VALUES (@deal_id, @author_user_id, @body, datetime('now'))`
      )
      .run(payload);
    const note = db.prepare("SELECT * FROM notes WHERE id = ?").get(result.lastInsertRowid);
    res.status(201).json({ data: note });
  })
);

app.delete("/api/notes/:id", requireAuth, (req, res) => {
  db.prepare("DELETE FROM notes WHERE id = ?").run(req.params.id);
  res.json({ data: { success: true } });
});

app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  if (err instanceof z.ZodError) {
    return res.status(400).json({ error: "Validation error", details: err.errors.map((e) => e.message).join(", ") });
  }
  console.error(err);
  res.status(500).json({ error: "Server error" });
});

app.listen(PORT, () => {
  console.log(`API running on http://localhost:${PORT}`);
});
