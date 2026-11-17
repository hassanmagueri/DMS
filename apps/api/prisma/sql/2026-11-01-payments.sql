-- Additive payment tables. Does not change existing delivery tables.
-- Apply manually. Do not use prisma migrate or prisma db push.

CREATE SEQUENCE IF NOT EXISTS payments_id_seq;
CREATE SEQUENCE IF NOT EXISTS payment_attempts_id_seq;
CREATE SEQUENCE IF NOT EXISTS payment_webhook_events_id_seq;
CREATE SEQUENCE IF NOT EXISTS refunds_id_seq;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT PRIMARY KEY DEFAULT nextval('payments_id_seq'),
  delivery_id BIGINT NOT NULL UNIQUE REFERENCES deliveries (id),
  customer_id BIGINT NOT NULL REFERENCES users (id),
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL DEFAULT 'MAD',
  method VARCHAR(32) NOT NULL,
  status VARCHAR(32) NOT NULL,
  provider VARCHAR(32) NOT NULL,
  idempotency_key VARCHAR(128) NOT NULL UNIQUE,
  provider_reference VARCHAR(255),
  created_at TIMESTAMP(6) NOT NULL DEFAULT now(),
  updated_at TIMESTAMP(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payments_customer_id ON payments (customer_id);
CREATE INDEX IF NOT EXISTS idx_payments_status ON payments (status);

CREATE TABLE IF NOT EXISTS payment_attempts (
  id BIGINT PRIMARY KEY DEFAULT nextval('payment_attempts_id_seq'),
  payment_id BIGINT NOT NULL REFERENCES payments (id),
  status VARCHAR(32) NOT NULL,
  provider_session_id VARCHAR(255) UNIQUE,
  checkout_url TEXT,
  failure_reason VARCHAR(500),
  created_at TIMESTAMP(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_attempts_payment_id ON payment_attempts (payment_id);

CREATE TABLE IF NOT EXISTS payment_webhook_events (
  id BIGINT PRIMARY KEY DEFAULT nextval('payment_webhook_events_id_seq'),
  provider VARCHAR(32) NOT NULL,
  provider_event_id VARCHAR(255) NOT NULL,
  payment_id BIGINT REFERENCES payments (id),
  payload JSONB NOT NULL,
  processed_at TIMESTAMP(6),
  created_at TIMESTAMP(6) NOT NULL DEFAULT now(),
  CONSTRAINT uq_payment_webhook_provider_event UNIQUE (provider, provider_event_id)
);

CREATE TABLE IF NOT EXISTS refunds (
  id BIGINT PRIMARY KEY DEFAULT nextval('refunds_id_seq'),
  payment_id BIGINT NOT NULL REFERENCES payments (id),
  amount NUMERIC(12, 2) NOT NULL,
  currency VARCHAR(3) NOT NULL,
  status VARCHAR(32) NOT NULL,
  reason VARCHAR(500),
  actor_id BIGINT REFERENCES users (id),
  provider_refund_id VARCHAR(255) UNIQUE,
  created_at TIMESTAMP(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_refunds_payment_id ON refunds (payment_id);

ALTER SEQUENCE payments_id_seq OWNED BY payments.id;
ALTER SEQUENCE payment_attempts_id_seq OWNED BY payment_attempts.id;
ALTER SEQUENCE payment_webhook_events_id_seq OWNED BY payment_webhook_events.id;
ALTER SEQUENCE refunds_id_seq OWNED BY refunds.id;
