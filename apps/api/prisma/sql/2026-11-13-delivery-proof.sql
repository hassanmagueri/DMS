-- Confirmation code and proof of delivery on existing delivery rows.
-- Apply manually. Do not use prisma migrate or prisma db push.

ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS confirmation_code VARCHAR(6);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS proof_confirmed_at TIMESTAMP(6);
ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS proof_confirmed_by BIGINT;

DO $$
DECLARE
  row_id BIGINT;
  candidate VARCHAR(6);
BEGIN
  FOR row_id IN SELECT id FROM deliveries WHERE confirmation_code IS NULL LOOP
    LOOP
      candidate := lpad((floor(random() * 1000000))::int::text, 6, '0');
      EXIT WHEN NOT EXISTS (SELECT 1 FROM deliveries WHERE confirmation_code = candidate);
    END LOOP;
    UPDATE deliveries SET confirmation_code = candidate WHERE id = row_id;
  END LOOP;
END $$;

ALTER TABLE deliveries ALTER COLUMN confirmation_code SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS uq_deliveries_confirmation_code ON deliveries (confirmation_code);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'deliveries_proof_confirmed_by_fkey'
  ) THEN
    ALTER TABLE deliveries
      ADD CONSTRAINT deliveries_proof_confirmed_by_fkey
      FOREIGN KEY (proof_confirmed_by) REFERENCES users (id) ON DELETE SET NULL;
  END IF;
END $$;
