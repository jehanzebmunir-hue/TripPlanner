import { Router } from "express";
import { getChecklist, toggleChecklistItem } from "../services/checklist.service";
import { estimateTransit } from "../services/transit";
import { AuthedRequest, attachEditToken, optionalAuth, requireAuth } from "../middleware/auth.middleware";
import {
  addTripItem,
  buildItinerary,
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

router.delete("/:id", optionalAuth, attachEditToken, async (req: AuthedRequest, res, next) => {
  try {
    await deleteTrip(req.params.id, { userId: req.userId, editToken: req.editToken });
    res.status(204).end();
  } catch (err) {
    next(err);
  }
});

router.post("/:id/items", optionalAuth, attachEditToken, async (req: AuthedRequest, res, next) => {
  try {
    res.json(
      await addTripItem(req.params.id, req.body.placeId, { userId: req.userId, editToken: req.editToken })
    );
  } catch (err) {
    next(err);
  }
});

router.patch("/:id/items/:placeId", optionalAuth, attachEditToken, async (req: AuthedRequest, res, next) => {
  try {
    res.json(
      await moveTripItem(req.params.id, req.params.placeId, Number(req.body.dayIndex), {
        userId: req.userId,
        editToken: req.editToken,
      })
    );
  } catch (err) {
    next(err);
  }
});

router.delete("/:id/items/:placeId", optionalAuth, attachEditToken, async (req: AuthedRequest, res, next) => {
  try {
    await removeTripItem(req.params.id, req.params.placeId, { userId: req.userId, editToken: req.editToken });
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
    const days = buildItinerary(trip).map((day) => {
      const places = day.items.map((item) => item.place);
      return {
        dayIndex: day.dayIndex, // a clean global position, for display/grouping only
        date: day.date,
        stops: places.map((place, idx) => ({
          place,
          transitFromPrevious: idx === 0 ? null : estimateTransit(places[idx - 1], place),
          // The item's real, leg-relative dayIndex and legId -- what
          // PATCH .../items/:placeId actually expects (see
          // trips.service.ts's moveTripItem), not the global day.dayIndex
          // above. Multi-city trips need both: one number for "which day
          // heading is this under," a different one for "what do I send
          // back when moving this specific item."
          legId: day.items[idx].legId,
          itemDayIndex: day.items[idx].dayIndex,
        })),
      };
    });

    res.json(days);
  } catch (err) {
    next(err);
  }
});

export default router;
