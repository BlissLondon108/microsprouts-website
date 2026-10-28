-- Cloudflare D1. Run remotely before enabling live payments.
-- Contains customer contact information: restrict database access and set retention policy.
CREATE TABLE IF NOT EXISTS orders (
  order_key TEXT PRIMARY KEY,
  kind TEXT NOT NULL,
  stripe_ref TEXT NOT NULL UNIQUE,
  subscription_id TEXT NOT NULL DEFAULT '',
  customer_name TEXT NOT NULL DEFAULT '',
  customer_email TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  pack_grams INTEGER NOT NULL CHECK(pack_grams IN (200,500)),
  quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 10),
  frequency TEXT NOT NULL,
  method TEXT NOT NULL,
  postcode TEXT NOT NULL DEFAULT '',
  preferred_date TEXT NOT NULL DEFAULT '',
  total_pence INTEGER NOT NULL CHECK(total_pence>=0),
  status TEXT NOT NULL DEFAULT 'paid',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS orders_subscription_idx ON orders(subscription_id);
CREATE INDEX IF NOT EXISTS orders_created_idx ON orders(created_at);
CREATE TABLE IF NOT EXISTS stripe_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  stripe_ref TEXT NOT NULL,
  processed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS alert_outbox (
  alert_key TEXT PRIMARY KEY,
  event_id TEXT NOT NULL,
  subject TEXT NOT NULL,
  body TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX IF NOT EXISTS alerts_pending_idx ON alert_outbox(sent_at,created_at);
