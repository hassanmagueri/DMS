import "dotenv/config";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { errorHandler } from "./middleware/errorHandler";
import authRoutes from "./modules/auth/auth.routes";
import customerRoutes from "./modules/customers/customer.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import deliveryRoutes from "./modules/deliveries/delivery.routes";
import dispatcherRoutes from "./modules/dispatchers/dispatcher.routes";
import driverRoutes from "./modules/drivers/driver.routes";
import userRoutes from "./modules/users/user.routes";
import vehicleRoutes from "./modules/vehicles/vehicle.routes";

const app = express();
const port = Number(process.env.PORT) || 4000;
const origin = process.env.CORS_ORIGIN || "http://localhost:3000";

app.use(helmet());
app.use(cors({ origin }));
app.use(express.json());
app.use((req, res, next) => {
  const started = Date.now();
  res.on("finish", () => {
    console.log(
      JSON.stringify({
        level: "info",
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        ms: Date.now() - started,
      }),
    );
  });
  next();
});

app.get("/health", (_req, res) => {
  res.json({ ok: true });
});

app.use("/api/auth", authRoutes);
app.use("/api/deliveries", deliveryRoutes);
app.use("/api/drivers", driverRoutes);
app.use("/api/dispatchers", dispatcherRoutes);
app.use("/api/customers", customerRoutes);
app.use("/api/users", userRoutes);
app.use("/api/vehicles", vehicleRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use((_req, res) => {
  res.status(404).json({ message: "Not found" });
});

app.use(errorHandler);

app.listen(port, () => {
  console.log(`API listening on http://localhost:${port}`);
});
