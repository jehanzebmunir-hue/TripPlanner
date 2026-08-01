import "dotenv/config";
import {
  DEFAULT_STALE_TRIP_DAYS,
  sweepExpiredPasswordResetTokens,
  sweepStaleAnonymousTrips,
} from "../services/retention.service";

const arg = process.argv.find((a) => a.startsWith("--days="));
const maxAgeDays = arg ? Number(arg.split("=")[1]) : DEFAULT_STALE_TRIP_DAYS;

Promise.all([sweepStaleAnonymousTrips(maxAgeDays), sweepExpiredPasswordResetTokens()])
  .then(([tripCount, tokenCount]) => {
    console.log(`Swept ${tripCount} anonymous trip(s) untouched for over ${maxAgeDays} days.`);
    console.log(`Swept ${tokenCount} expired or already-used password-reset token(s).`);
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
