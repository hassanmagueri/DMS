# Delivery Management System

Operations desk for deliveries, drivers, and pay on delivery. Next.js renders the desk. Express is the only API. Prisma reads the PostgreSQL database `dms`. The browser never connects to Postgres.

Roles stored on `users.role` are `ADMIN`, `DISPATCHER`, `DRIVER`, and `CUSTOMER`. There is no `MANAGER` role.

| Role | What they can do |
| --- | --- |
| Admin | Full desk. Creates dispatchers, drivers, and deliveries. Edits and deletes deliveries. Blocks or removes users who have no delivery history. Sees every open action and can filter it by role. |
| Dispatcher | Same operations desk for deliveries, customers, and drivers. Assigns drivers and updates status. Can block a customer or a driver. Cannot manage dispatcher accounts, and cannot edit or delete a delivery. |
| Driver | Sees assigned work. Accepts or rejects a job. Moves it through pickup and transit, marks a failed stop with a reason, and collects cash. Confirming delivery asks for the customer's 6-digit code. |
| Customer | Requests a delivery, keeps a private address book, follows status, pays the driver in cash, and rates the driver after the code is confirmed. |

## Screens

| Screen | Who |
| --- | --- |
| Login and signup | Everyone |
| Dashboard | Admin, dispatcher. Pending deliveries are first, oldest first, with waiting time. A stop older than 24 hours is marked Late. |
| Deliveries, customers, drivers, dispatchers, vehicles | Admin, dispatcher |
| Actions | Admin sees open actions and filters by customer, driver, or dispatcher. The page keeps the latest open work when the queue is large. Dispatcher sees the queue that still needs a driver. |
| Reports | Admin, dispatcher. Status counts and a spreadsheet of the visible rows. |
| Users | Admin |
| Settings and profile photo | The signed-in user |
| Driver console | Driver |
| Customer deliveries, new request, addresses, payments | Customer |

## Delivery flow

`PENDING` → `ASSIGNED` → `ACCEPTED` → `PICKED_UP` → `IN_TRANSIT` → `DELIVERED`.

A driver can reject an assignment. That stores `REJECTED`, clears the driver, and returns the job to the queue. `CANCELLED` is allowed before pickup. From pickup or transit, the driver or an operator can mark the stop `FAILED` and must choose a reason: nobody home, wrong address, refused, or unreachable. A dispatcher can send that delivery out again, which returns it to `PENDING`.

Every change is stored in `delivery_events`. The transition rules live in `apps/api/src/modules/deliveries/delivery.schema.ts`.

Delivered stops need the customer's 6-digit confirmation code. The customer can rate the driver from 1 to 5 only after that code is confirmed. One rating per delivery. Driver lists show the average as stars.

## Driver presence

A driver's status follows the session. Signed in, with no accepted, picked-up, or in-transit stop, the driver is `AVAILABLE`. Signed in with one of those stops, the driver is `ON_DELIVERY`. Signed out, disabled, or holding an expired token, the driver is `OFFLINE`. A new driver stays `OFFLINE` until the first sign-in. Operators do not set this status by hand. A session lasts 12 hours, so closing the browser does not sign the driver out. A driver whose deliveries are all finished can be removed. A driver with a delivery still in progress cannot.

## Pay on delivery

Price is calculated on the server: 20.00 MAD plus 5.00 MAD per kilogram. Currency is MAD. Card checkout is not offered. A new delivery gets a pending cash payment, and assignment does not wait for that payment. The assigned driver, a dispatcher, or an admin records the cash when the parcel is handed over. Refunds are admin-only.

## Run the demo

From the project root, one command starts Postgres, the API, and the desk in production mode:

```bash
docker compose up --build
```

- Desk: http://localhost:3000
- API health: http://localhost:4000/health

That command runs the API and the desk in production. Postgres stays on the compose network and is not published on the host. Stop the stack with `docker compose down`. The database volume is kept, so the next start reuses the same data. `docker compose down -v` deletes that data and loads the init script again on the following start.

The database is created on first start from `docker/postgres/init/01-dms.sql`, including the demo accounts. Sign in with the usernames in the table below. Password for every seeded account: `Admin123!`

To run the API and the desk on the host instead, install Node.js 22 or newer and use the existing Postgres on port 5433:

```bash
cd apps/api && npm install && npx prisma generate && npm run dev
```

```bash
cd apps/web && npm install && npm run dev
```

Copy `apps/api/.env.example` to `apps/api/.env` and `apps/web/.env.local.example` to `apps/web/.env.local` if those files are missing.

The scripts under `apps/api/prisma/sql` record columns added after the first database. The compose database already includes them. Apply the scripts only to an older Postgres that was created before those files. Do not run `prisma migrate` or `prisma db push`.

```bash
docker exec -i dms-postgres psql -U dms -d dms -v ON_ERROR_STOP=1 < apps/api/prisma/sql/2026-11-01-payments.sql
docker exec -i dms-postgres psql -U dms -d dms -v ON_ERROR_STOP=1 < apps/api/prisma/sql/2026-11-13-delivery-proof.sql
docker exec -i dms-postgres psql -U dms -d dms -v ON_ERROR_STOP=1 < apps/api/prisma/sql/2026-11-15-ratings-addresses-failure.sql
docker exec -i dms-postgres psql -U dms -d dms -v ON_ERROR_STOP=1 < apps/api/prisma/sql/2026-11-15-scale-indexes.sql
docker exec -i dms-postgres psql -U dms -d dms -v ON_ERROR_STOP=1 < apps/api/prisma/sql/2026-11-15-login-codes.sql
docker exec -i dms-postgres psql -U dms -d dms -v ON_ERROR_STOP=1 < apps/api/prisma/sql/2026-11-16-email-verified.sql
docker exec -i dms-postgres psql -U dms -d dms -v ON_ERROR_STOP=1 < apps/api/prisma/sql/2026-11-16-optional-staff-email.sql
docker exec -i dms-postgres psql -U dms -d dms -v ON_ERROR_STOP=1 < apps/api/prisma/sql/2026-11-17-must-change-password.sql
```

`npm test` in `apps/api` checks the price quote and the cash payment rules.

Delivery and driver lists are paged. The dashboard shows the oldest 40 pending stops and links to the full list. Driver ratings and active counts are aggregated in SQL, so a desk with thousands of deliveries and drivers does not load every row into the page.

## Demo accounts

Password for every seeded account: `Admin123!`

Sign-in uses a username and password for every role. A session lasts 12 hours and stays available in other browser tabs. Closing the browser does not sign the user out. Seeded accounts are already set up, so they open straight away. An account an admin creates starts unfinished: the first sign-in asks for an email, a 6-digit code, and a new password before the desk opens. The code expires in 10 minutes. Customer sign-up asks for a username, email, and password. A 6-digit code confirms the email before the account opens. An admin creates a dispatcher or driver without an email.

Set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, and `SMTP_FROM` in `apps/api/.env` so messages are delivered. Until mail is configured, the code is shown on the form. Dispatchers are emailed when a delivery is waiting for a driver. The assigned driver is emailed when a dispatcher assigns the stop. The customer is emailed when the delivery arrives.

| Role | Username | Email | Name |
| --- | --- | --- | --- |
| Admin | admin | admin@dms.io | Alex Vance |
| Dispatcher | dispatcher1 | dispatch@dms.io | Marcus Brody |
| Driver | driver_john | john.driver@dms.io | John Doe |
| Customer | cust_alice | alice.smith@example.com | Alice Smith |
| Customer | cust_bob | bob.jones@example.com | Bob Jones |
| Customer | cust_charlie | charlie.brown@example.com | Charlie Brown |

`apps/api/scripts/set-demo-password.ts` rewrites only the `password` column so these accounts can sign in. It does not insert or delete rows.

## Jury walkthrough

1. Sign in as `admin`. On the dashboard, open a pending delivery from the first table.
2. Open Actions and switch the filter between customers, drivers, and dispatchers.
3. Open Drivers and read the star rating. Open a delivery and assign an available driver.
4. Sign in as that driver. Accept the job, then move it to picked up and in transit. Leave the failed-stop panel unused unless you intend to fail that delivery.
5. Sign in as the customer on that delivery. Open Addresses, then open the delivery, confirm it with the code, and rate the driver.
6. Sign back in as the admin. Reports shows the new counts. Download spreadsheet writes the visible status table.

## Database rules

`npx prisma db pull` and `npx prisma generate` read the live schema. Do not run `prisma migrate` or `prisma db push`.

The API allocates ids with `nextval` before insert. Sequences include `addresses_id_seq`, `deliveries_id_seq`, `tokens_id_seq`, `users_id_seq`, `drivers_id_seq`, `vehicle_id_seq`, `delivery_events_id_seq`, the payment sequences, `driver_ratings_id_seq`, and `saved_addresses_id_seq`. Existing rows are left in place.

PostgreSQL system columns such as `xmin` and `ctid` are not application fields.

## Project report

The written report is `Project-Report.docx` in this folder.

## Left out

Live driver maps and card checkout. Mail is sent when `SMTP_HOST` is set. Until then, a verification code is shown on the form.
