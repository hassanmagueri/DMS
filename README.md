# Delivery Management System

Operations console for a final-year project. Next.js renders the desk. Express is the only API. Prisma reads the existing PostgreSQL database `dms`. The browser never connects to Postgres.

## Screens

| Screen | Tables |
| --- | --- |
| Login and signup | `users`, `users_roles`, `tokens` |
| Overview | `deliveries`, `drivers` |
| Deliveries | `deliveries`, `addresses`, `users`, `drivers` |
| Drivers | `drivers`, `users`, `vehicle` |
| Dispatchers | `users` where `role` is `DISPATCHER` |
| Driver console | the signed-in driver's rows in `deliveries` |

Roles already stored in `users.role` are `ADMIN`, `DISPATCHER`, `DRIVER`, and `CUSTOMER`. Dispatchers use the same operations desk as admins. Customers are selectable on a delivery, and they do not get a console in this MVP. There is no `MANAGER` role in the database.

Delivery statuses: `PENDING` → `ASSIGNED` → `ACCEPTED` → `PICKED_UP` → `IN_TRANSIT` → `DELIVERED`. A driver can reject an assignment, which stores `REJECTED` and returns the job to the dispatcher queue. `CANCELLED` is allowed before pickup. `FAILED` is an operator outcome after pickup. Every change is stored in `delivery_events`. Rules live in `apps/api/src/modules/deliveries/delivery.schema.ts`.

## Run the demo

PostgreSQL is already running in Docker as `dms-postgres` on port **5433** (reachable from WSL as `localhost:5433`).

**WSL (recommended copy):** `\\wsl.localhost\Ubuntu\home\chom\pr` → `/home/chom/pr`

Install Node.js 20+ inside Ubuntu, then:

```bash
cd /home/chom/pr/apps/api && npm install && npx prisma generate && npm run dev
```

```bash
cd /home/chom/pr/apps/web && npm install && npm run dev
```

**Windows copy:** `D:\pr` — same commands in PowerShell from `apps/api` and `apps/web`.

- Web: http://localhost:3000
- API health: http://localhost:4000/health

Copy `apps/api/.env.example` to `apps/api/.env` and `apps/web/.env.local.example` to `apps/web/.env.local` if those files are missing. The checked-in examples match the local Docker database.

## Demo accounts

Password for every existing user: `Admin123!`

| Role | Email |
| --- | --- |
| Admin | admin@dms.io |
| Dispatcher | dispatch@dms.io |
| Driver | john.driver@dms.io |

`apps/api/scripts/set-demo-password.ts` rewrites only the `password` column so these accounts can sign in. It does not insert or delete rows. The original hashes in `dms` did not match any password stored in the project.

## Jury script

1. Sign in as `admin@dms.io`.
2. On Overview, confirm the counts match the database.
3. Open Deliveries, create one for Alice Smith, then assign an available driver.
4. Sign out and sign in as `john.driver@dms.io` if that driver was assigned. Move the delivery to picked up, in transit, then delivered.
5. Sign back in as the admin and confirm the overview counts changed.

## Database rules

`npx prisma db pull` and `npx prisma generate` read the live schema. Do not run `prisma migrate` or `prisma db push`.

The `id` columns do not have a SQL default, even though a sequence is owned by each column. The API allocates ids with `nextval` on `addresses_id_seq`, `deliveries_id_seq`, and `tokens_id_seq`. Existing rows are left in place.

PostgreSQL system columns such as `xmin` and `ctid` are not application fields.

## Out of scope

Live maps, payments, email, notifications, file upload, and a customer portal.
