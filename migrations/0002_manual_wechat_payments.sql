PRAGMA foreign_keys = OFF;

BEGIN TRANSACTION;

ALTER TABLE orders RENAME TO orders_before_manual_payment;

CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  order_number TEXT NOT NULL UNIQUE,
  idempotency_key TEXT NOT NULL UNIQUE,

  order_type TEXT NOT NULL CHECK (order_type IN ('serviceOrder', 'buyerService')),
  service_id TEXT,
  service_name TEXT NOT NULL,
  service_category TEXT,
  service_price_text TEXT,
  payment_mode TEXT NOT NULL DEFAULT 'manual_confirm'
    CHECK (payment_mode IN ('wechat_qr_deposit', 'manual_confirm', 'no_payment', 'external_platform')),
  deposit_cny INTEGER CHECK (deposit_cny IS NULL OR deposit_cny >= 0),
  amount_eur_reference TEXT,

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
  payment_status TEXT NOT NULL DEFAULT 'unpaid'
    CHECK (payment_status IN ('unpaid', 'pending_manual_check', 'paid_external', 'refunded_external', 'cancelled')),
  payment_channel TEXT,
  payment_amount_cny INTEGER CHECK (payment_amount_cny IS NULL OR payment_amount_cny >= 0),
  payment_received_amount_cny INTEGER CHECK (
    payment_received_amount_cny IS NULL OR payment_received_amount_cny >= 0
  ),
  payment_payer_name TEXT,
  payment_remark TEXT,
  payment_reported_at TEXT,
  payment_submitted_at TEXT,
  payment_proof_url TEXT,
  paid_at TEXT,
  payment_checked_at TEXT,
  payment_checked_by TEXT,
  payment_check_notes TEXT,
  external_platform TEXT,
  external_order_id TEXT,
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

INSERT INTO orders (
  id, order_number, idempotency_key, order_type, service_id, service_name,
  service_category, service_price_text, customer_name, contact, wechat, whatsapp,
  email, country, city, preferred_time, is_urgent, chinese_companion, upload_needed,
  description, notes, property_link, property_address, budget, golden_visa_plan,
  family_members, current_stage, order_status, payment_status, source,
  approved_deposit_eur_minor, deposit_approved_at, order_view_token_hash,
  notification_status, assigned_to, internal_notes, result_notes, completed_at,
  version, created_at, updated_at
)
SELECT
  id, order_number, idempotency_key, order_type, service_id, service_name,
  service_category, service_price_text, customer_name, contact, wechat, whatsapp,
  email, country, city, preferred_time, is_urgent, chinese_companion, upload_needed,
  description, notes, property_link, property_address, budget, golden_visa_plan,
  family_members, current_stage, order_status,
  CASE
    WHEN payment_status = 'paid' THEN 'paid_external'
    WHEN payment_status = 'refunded' THEN 'refunded_external'
    ELSE 'unpaid'
  END,
  source, approved_deposit_eur_minor, deposit_approved_at, order_view_token_hash,
  notification_status, assigned_to, internal_notes, result_notes, completed_at,
  version, created_at, updated_at
FROM orders_before_manual_payment;

DROP TABLE orders_before_manual_payment;

CREATE INDEX idx_orders_status_created ON orders(order_status, created_at DESC);
CREATE INDEX idx_orders_email ON orders(email);
CREATE INDEX idx_orders_service ON orders(service_id, created_at DESC);
CREATE INDEX idx_orders_number ON orders(order_number);
CREATE INDEX idx_orders_payment_status ON orders(payment_status, updated_at DESC);

COMMIT;

PRAGMA foreign_keys = ON;
