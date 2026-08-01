import { Router } from "express";
import { getChecklist, toggleChecklistItem } from "../services/checklist.service";
import { estimateTransit } from "../services/transit";
import { AuthedRequest, optionalAuth, requireAuth } from "../middleware/auth.middleware";
import {
  addTripItem,
  createTrip,
  deleteTrip,
  getTrip,
  getUserTrips,
  moveTripItem,
  removeTripItem,
} from "../services/trips.service";

const router = Router();

const DAY_MS = 24 * 60 * 60 * 1000;

router.get("/", requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    res.json(await getUserTrips(req.userId!));
  } catch (err) {
    next(err);
  }
});

router.post("/", optionalAuth, async (req: AuthedRequest, res, next) => {
  try {
    res.json(await createTrip({ ...req.body, userId: req.userId }));
  } catch (err) {
    next(err);
  }
});

router.get("/:id", async (req, res, next) => {
  try {
    res.json(await getTrip(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.delete("/:id", optionalAuth, async (req: AuthedRequest, res, next) => {
  try {
    await deleteTrip(req.params.id, req.userId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.post("/:id/items", async (req, res, next) => {
  try {
    res.json(await addTripItem(req.params.id, req.body.placeId));
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/items/:placeId", async (req, res, next) => {
  try {
    res.json(await moveTripItem(req.params.id, req.params.placeId, Number(req.body.dayIndex)));
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/items/:placeId", async (req, res, next) => {
  try {
    await removeTripItem(req.params.id, req.params.placeId);
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.get("/:id/checklist", async (req, res, next) => {
  try {
    res.json(await getChecklist(req.params.id));
  } catch (err) {
    next(err);
  }
});

router.post("/:id/checklist/:itemKey/toggle", async (req, res, next) => {
  try {
    res.json(await toggleChecklistItem(req.params.id, req.params.itemKey, Boolean(req.body.checked)));
  } catch (err) {
    next(err);
  }
});

router.get("/:id/itinerary", async (req, res, next) => {
  try {
    const trip = await getTrip(req.params.id);
    const totalDays = trip.items.reduce((max, i) => Math.max(max, i.dayIndex), 1);

    const days = Array.from({ length: totalDays }, (_, i) => i + 1).map((dayIndex) => {
      const dayItems = trip.items.filter((i) => i.dayIndex === dayIndex);
      const places = dayItems.map((i) => i.place);
      const date = trip.startDate ? new Date(trip.startDate.getTime() + (dayIndex - 1) * DAY_MS) : null;

      return {
        dayIndex,
        date,
        stops: places.map((place, idx) => ({
          place,
          transitFromPrevious: idx === 0 ? null : estimateTransit(places[idx - 1], place),
        })),
      };
    });

    res.json(days.filter((d) => d.stops.length > 0));
  } catch (err) {
    next(err);
  }
});

export default router;
