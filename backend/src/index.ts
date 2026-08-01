import "dotenv/config";
import cors from "cors";
import express from "express";
import rateLimit from "express-rate-limit";
import helmet from "helmet";
import authRoutes from "./routes/auth.routes";
import citiesRoutes from "./routes/cities.routes";
import exchangeRateRoutes from "./routes/exchangeRate.routes";
import healthRoutes from "./routes/health.routes";
import ingestRoutes from "./routes/ingest.routes";
import placesRoutes from "./routes/places.routes";
import recommendRoutes from "./routes/recommend.routes";
import tripsRoutes from "./routes/trips.routes";
import { errorHandler } from "./middleware/error.middleware";
import { warmPriorityCities } from "./services/ingestion.service";

const app = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(helmet());
app.use(cors({ origin: process.env.CLIENT_URL ?? "http://localhost:5173" }));
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 300, standardHeaders: true, legacyHeaders: false }));

app.get("/api/health", (_req, res) => res.json({ ok: true }));
app.use("/api/auth", authRoutes);
app.use("/api/cities", citiesRoutes);
app.use("/api/places", placesRoutes);
app.use("/api/trips", tripsRoutes);
app.use("/api/ingest", ingestRoutes);
app.use("/api/recommend-destination", recommendRoutes);
app.use("/api/city-health", healthRoutes);
app.use("/api/exchange-rate", exchangeRateRoutes);

app.use(errorHandler as express.ErrorRequestHandler);

app.listen(PORT, () => {
  console.log(`Trip planner API listening on port ${PORT}`);
  warmPriorityCities();
});
