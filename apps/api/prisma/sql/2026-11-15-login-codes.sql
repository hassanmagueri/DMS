-- One-time sign-in codes emailed after the password is accepted.
-- Apply manually. Safe to run more than once.
-- Do not use prisma migrate or prisma db push.

CREATE SEQUENCE IF NOT EXISTS login_codes_id_seq;

CREATE TABLE IF NOT EXISTS login_codes (
  id BIGINT PRIMARY KEY DEFAULT nextval('login_codes_id_seq'),
  user_id BIGINT NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  code_hash VARCHAR(64) NOT NULL,
  expires_at TIMESTAMP(6) NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP(6) NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_login_codes_user_id ON login_codes (user_id);
