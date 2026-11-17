-- Optional profile photo. Apply manually. Do not use prisma migrate or prisma db push.

ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar TEXT;
