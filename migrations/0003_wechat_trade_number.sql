ALTER TABLE orders ADD COLUMN payment_trade_no TEXT;

CREATE INDEX IF NOT EXISTS idx_orders_payment_trade_no ON orders(payment_trade_no);
