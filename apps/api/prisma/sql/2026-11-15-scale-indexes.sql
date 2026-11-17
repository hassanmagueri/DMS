-- Indexes for paged delivery and driver lists.
-- Apply manually. Safe to run more than once.
-- Do not use prisma migrate or prisma db push.

CREATE INDEX IF NOT EXISTS idx_deliveries_status_created ON deliveries (status, created_at);
CREATE INDEX IF NOT EXISTS idx_deliveries_driver_status ON deliveries (driver_id, status);
CREATE INDEX IF NOT EXISTS idx_driver_ratings_driver_id ON driver_ratings (driver_id);
