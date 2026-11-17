import cors from "cors";
import express, { type Request } from "express";
import helmet from "helmet";
import { errorHandler } from "./middleware/errorHandler";
import addressRoutes from "./modules/addresses/address.routes";
import authRoutes from "./modules/auth/auth.routes";
import customerRoutes from "./modules/customers/customer.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import deliveryRoutes from "./modules/deliveries/delivery.routes";
import dispatcherRoutes from "./modules/dispatchers/dispatcher.routes";
import driverRoutes from "./modules/drivers/driver.routes";
import notificationRoutes from "./modules/notifications/notification.routes";
import paymentRoutes from "./modules/payments/payment.routes";
import profileRoutes from "./modules/profiles/profile.routes";
import pricingRoutes from "./modules/pricing/pricing.routes";
import userRoutes from "./modules/users/user.routes";
import vehicleRoutes from "./modules/vehicles/vehicle.routes";

export function createApp() {
  const app = express();
  const origin = process.env.CORS_ORIGIN || "http://localhost:3000";

  app.use(helmet());
  app.use(cors({ origin }));
  app.use(
    express.json({
      verify(req, _res, buf) {
        (req as Request).rawBody = Buffer.from(buf);
      },
    }),
  );
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
  app.use("/api/addresses", addressRoutes);
  app.use("/api/deliveries", deliveryRoutes);
  app.use("/api/drivers", driverRoutes);
  app.use("/api/dispatchers", dispatcherRoutes);
  app.use("/api/customers", customerRoutes);
  app.use("/api/users", userRoutes);
  app.use("/api/vehicles", vehicleRoutes);
  app.use("/api/dashboard", dashboardRoutes);
  app.use("/api/notifications", notificationRoutes);
  app.use("/api/pricing", pricingRoutes);
  app.use("/api/payments", paymentRoutes);
  app.use("/api/profiles", profileRoutes);

  app.use((_req, res) => {
    res.status(404).json({ message: "Not found" });
  });

  app.use(errorHandler);
  return app;
}
