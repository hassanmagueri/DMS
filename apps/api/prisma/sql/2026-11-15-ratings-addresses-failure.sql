-- Avatars, failure reasons, driver ratings, and saved addresses.
-- Apply manually. Safe to run more than once.
-- Do not use prisma migrate or prisma db push.

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS failure_reason VARCHAR(32);

CREATE SEQUENCE IF NOT EXISTS driver_ratings_id_seq;
CREATE SEQUENCE IF NOT EXISTS saved_addresses_id_seq;

CREATE TABLE IF NOT EXISTS driver_ratings (
  id BIGINT PRIMARY KEY DEFAULT nextval('driver_ratings_id_seq'),
  delivery_id BIGINT NOT NULL UNIQUE REFERENCES deliveries (id) ON DELETE CASCADE,
  driver_id BIGINT NOT NULL REFERENCES drivers (id),
  customer_id BIGINT NOT NULL REFERENCES users (id),
  score SMALLINT NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS saved_addresses (
  id BIGINT PRIMARY KEY DEFAULT nextval('saved_addresses_id_seq'),
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  label VARCHAR(80) NOT NULL,
  street VARCHAR(255) NOT NULL,
  city VARCHAR(255) NOT NULL,
  state VARCHAR(255),
  postal_code VARCHAR(255),
  country VARCHAR(255) NOT NULL,
  created_at TIMESTAMP(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_saved_addresses_user_id ON saved_addresses (user_id);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'driver_ratings_score_check'
  ) THEN
    ALTER TABLE driver_ratings
      ADD CONSTRAINT driver_ratings_score_check CHECK (score BETWEEN 1 AND 5);
  END IF;
END $$;
