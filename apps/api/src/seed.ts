import bcrypt from "bcryptjs";
import { db, runMigrations } from "./db";

runMigrations();

db.exec(`
  DELETE FROM notes;
  DELETE FROM activities;
  DELETE FROM deals;
  DELETE FROM contacts;
  DELETE FROM accounts;
  DELETE FROM stages;
  DELETE FROM users;
`);

const passwordHash = bcrypt.hashSync("admin123", 10);
const user = db
  .prepare("INSERT INTO users (email, password_hash, name) VALUES (?, ?, ?)")
  .run("admin@localcrm.test", passwordHash, "Alex Admin");
const userId = user.lastInsertRowid as number;

const stageIds = [
  { name: "Lead", order_index: 1 },
  { name: "Qualified", order_index: 2 },
  { name: "Proposal", order_index: 3 },
  { name: "Negotiation", order_index: 4 },
  { name: "Won", order_index: 5, is_won: 1 },
  { name: "Lost", order_index: 6, is_lost: 1 }
].map((stage) =>
  db
    .prepare("INSERT INTO stages (name, order_index, is_won, is_lost) VALUES (?, ?, ?, ?)")
    .run(stage.name, stage.order_index, stage.is_won ?? 0, stage.is_lost ?? 0).lastInsertRowid as number
);

const accountIds = [
  { name: "Summit Labs", industry: "Healthcare", website: "https://summit.example", phone: "555-0101", address: "123 Pine St" },
  { name: "Atlas Manufacturing", industry: "Manufacturing", website: "https://atlas.example", phone: "555-0110", address: "98 Forge Rd" },
  { name: "Brightline Marketing", industry: "Marketing", website: "https://brightline.example", phone: "555-0199", address: "76 Sunset Blvd" }
].map((account) =>
  db
    .prepare(
      "INSERT INTO accounts (name, industry, website, phone, address, created_at, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
    )
    .run(account.name, account.industry, account.website, account.phone, account.address).lastInsertRowid as number
);

const contactIds = [
  { account_id: accountIds[0], first_name: "Jamie", last_name: "Ng", email: "jamie@summit.example", phone: "555-2211", title: "Operations" },
  { account_id: accountIds[0], first_name: "Priya", last_name: "Sato", email: "priya@summit.example", phone: "555-2212", title: "IT Director" },
  { account_id: accountIds[1], first_name: "Carlos", last_name: "Diaz", email: "carlos@atlas.example", phone: "555-3301", title: "Plant Manager" },
  { account_id: accountIds[2], first_name: "Mia", last_name: "Chen", email: "mia@brightline.example", phone: "555-7701", title: "CMO" }
].map((contact) =>
  db
    .prepare(
      "INSERT INTO contacts (account_id, first_name, last_name, email, phone, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
    )
    .run(contact.account_id, contact.first_name, contact.last_name, contact.email, contact.phone, contact.title).lastInsertRowid as number
);

const dealIds = [
  {
    account_id: accountIds[0],
    primary_contact_id: contactIds[0],
    title: "Summit Labs Expansion",
    amount: 42000,
    currency: "USD",
    stage_id: stageIds[1],
    owner_user_id: userId,
    close_date: "2024-12-15"
  },
  {
    account_id: accountIds[1],
    primary_contact_id: contactIds[2],
    title: "Atlas Automation Retrofit",
    amount: 98000,
    currency: "USD",
    stage_id: stageIds[2],
    owner_user_id: userId,
    close_date: "2024-11-20"
  },
  {
    account_id: accountIds[2],
    primary_contact_id: contactIds[3],
    title: "Brightline Campaign Rollout",
    amount: 55000,
    currency: "USD",
    stage_id: stageIds[0],
    owner_user_id: userId,
    close_date: "2024-10-05"
  }
].map((deal) =>
  db
    .prepare(
      "INSERT INTO deals (account_id, primary_contact_id, title, amount, currency, stage_id, owner_user_id, close_date, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
    )
    .run(
      deal.account_id,
      deal.primary_contact_id,
      deal.title,
      deal.amount,
      deal.currency,
      deal.stage_id,
      deal.owner_user_id,
      deal.close_date
    ).lastInsertRowid as number
);

const activities = [
  {
    deal_id: dealIds[0],
    type: "call",
    subject: "Discovery call",
    due_date: "2024-09-10",
    status: "open",
    assigned_user_id: userId
  },
  {
    deal_id: dealIds[1],
    type: "meeting",
    subject: "On-site walkthrough",
    due_date: "2024-09-14",
    status: "done",
    assigned_user_id: userId
  }
];

for (const activity of activities) {
  db
    .prepare(
      "INSERT INTO activities (deal_id, type, subject, due_date, status, assigned_user_id, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))"
    )
    .run(
      activity.deal_id,
      activity.type,
      activity.subject,
      activity.due_date,
      activity.status,
      activity.assigned_user_id
    );
}

const notes = [
  { deal_id: dealIds[0], author_user_id: userId, body: "Client wants phased rollout with training." },
  { deal_id: dealIds[1], author_user_id: userId, body: "Budget confirmed; waiting on final approval." }
];

for (const note of notes) {
  db
    .prepare("INSERT INTO notes (deal_id, author_user_id, body, created_at) VALUES (?, ?, ?, datetime('now'))")
    .run(note.deal_id, note.author_user_id, note.body);
}

console.log("Seed data inserted. Default admin: admin@localcrm.test / admin123");
