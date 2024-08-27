import { Router } from "express";
import * as Controllers from "@controllers";
import * as Middlewares from "@middlewares";

const router: Router = Router({ mergeParams: true });

router.post(
  "/create",
  Middlewares.Auth.isOrganizerOrAdmin,
  Controllers.Event.createEvent
);

router.post(
  "/add/organiser/:eventId",
  Middlewares.Auth.isAdmin,
  Controllers.Event.addOrganizer
);

router.post(
  "/add/manager/:eventId",
  Middlewares.Auth.isOrganizerOrAdmin,
  Controllers.Event.addManager
);

router.get("/:eventId", Controllers.Event.getEventById);
router.get("/", Controllers.Event.getAllEvents);
router.patch(
  "/:eventId/",
  Middlewares.Auth.isOrganizerOrAdmin,
  Controllers.Event.updateEvent
);
router.delete(
  "/:eventId/",
  Middlewares.Auth.isOrganizerOrAdmin,
  Controllers.Event.deleteEvent
);

export default router;
