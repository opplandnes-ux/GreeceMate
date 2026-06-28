PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,

  order_type TEXT NOT NULL CHECK (order_type IN ('serviceOrder', 'buyerService')),
  service_id TEXT,
  service_name TEXT NOT NULL,
  service_category TEXT,
  service_price_text TEXT,

  customer_name TEXT NOT NULL,
  contact TEXT,
  wechat TEXT,
  whatsapp TEXT,
  email TEXT,
  country TEXT,
  city TEXT,
  preferred_time TEXT,
  is_urgent INTEGER NOT NULL DEFAULT 0 CHECK (is_urgent IN (0, 1)),
  chinese_companion INTEGER NOT NULL DEFAULT 0 CHECK (chinese_companion IN (0, 1)),
  upload_needed INTEGER NOT NULL DEFAULT 0 CHECK (upload_needed IN (0, 1)),

  description TEXT,
  notes TEXT,

  property_link TEXT,
  property_address TEXT,
  budget TEXT,
  golden_visa_plan TEXT,
  family_members TEXT,
  current_stage TEXT,

  order_status TEXT NOT NULL DEFAULT '新订单',
  payment_status TEXT NOT NULL DEFAULT 'unpaid' CHECK (
    payment_status IN ('unpaid', 'creating', 'pending', 'paid', 'failed', 'expired', 'refund_pending', 'refunded')
  ),
  source TEXT,

  approved_deposit_eur_minor INTEGER CHECK (
    approved_deposit_eur_minor IS NULL OR approved_deposit_eur_minor >= 0
  ),
  deposit_approved_at TEXT,

  order_view_token_hash TEXT NOT NULL,
  notification_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (notification_status IN ('pending', 'sent', 'failed')),

  assigned_to TEXT,
  internal_notes TEXT,
  result_notes TEXT,
  completed_at TEXT,

  version INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_orders_status_created
  ON orders(order_status, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_email
  ON orders(email);

CREATE INDEX IF NOT EXISTS idx_orders_service
  ON orders(service_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_orders_number
  ON orders(order_number);

