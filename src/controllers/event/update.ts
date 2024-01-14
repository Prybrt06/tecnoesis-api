import * as Interfaces from "@interfaces";
import { Event } from "@prisma/client";
import { prisma } from "@utils/prisma";
import * as Errors from "@errors";
import * as Utils from "@utils";

const updateEvent: Interfaces.Controller.Async = async (req, res, next) => {
  const {
    description,
    posterImage,
    attendanceIncentive,
    registrationIncentive,
    lat,
    lng,
    maxTeamSize,
    minTeamSize,
    moduleId,
    name,
    prizeDescription,
    registrationEndTime,
    registrationStartTime,
    stagesDescription,
    venue,
    extraQuestions,
  } = req.body as Event;

  const { eventId: EID } = req.params;
  const eventId = String(EID);
  if (!String(eventId) || typeof eventId !== "string")
    return next(Errors.Module.invalidInput);

  if (!(await prisma.event.findFirst({ where: { id: eventId } })))
    return next(Errors.Module.eventNotFound);
  if (!moduleId || typeof moduleId !== "string" || moduleId.length !== 24)
    return next(Errors.Module.invalidInput);
  if (!(await prisma.module.findFirst({ where: { id: moduleId } })))
    return next(Errors.Module.moduleNotFound);

  let regStart;
  if (registrationStartTime) regStart = new Date(registrationStartTime);
  let regEnd;
  if (registrationEndTime) regEnd = new Date(registrationEndTime);
  if (registrationStartTime && JSON.stringify(regStart) === "null")
    return next(Errors.Module.invalidInput);
  if (registrationEndTime && JSON.stringify(regEnd) === "null")
    return next(Errors.Module.invalidInput);

  const {
    organizers = [],
    managers = [],
  }: { organizers: string[]; managers: string[] } = req.body;

  if (
    (registrationIncentive && !(typeof registrationIncentive === "number")) ||
    (attendanceIncentive && !(typeof attendanceIncentive === "number"))
  ) {
    return next(Errors.Module.invalidInput);
  }

  if (extraQuestions && !Array.isArray(extraQuestions)) {
    return next(Errors.Module.invalidInput);
  }

  if (
    (minTeamSize && typeof minTeamSize !== "number") ||
    (maxTeamSize && typeof maxTeamSize !== "number") ||
    (lat && typeof lat !== "string") ||
    (lng && typeof lng !== "string") ||
    (name && typeof name !== "string") ||
    (description && typeof description !== "string") ||
    (prizeDescription && typeof prizeDescription !== "string") ||
    (stagesDescription && typeof stagesDescription !== "string") ||
    (venue && typeof venue !== "string") ||
    (posterImage && typeof posterImage !== "string")
  )
    return next(Errors.Module.invalidInput);

  if (
    (typeof lat === "string" && !lat.length) ||
    (typeof lng === "string" && !lng.length) ||
    (typeof name === "string" && !name.length) ||
    (typeof description === "string" && !description.length) ||
    (typeof prizeDescription === "string" && !prizeDescription.length) ||
    (typeof stagesDescription === "string" && !stagesDescription.length) ||
    (typeof venue === "string" && !venue.length) ||
    (typeof posterImage === "string" && !posterImage.length)
  )
    return next(Errors.Module.invalidInput);

  const userExist = await Promise.all([
    ...organizers.map(async (id: string) => {
      const user = await prisma.user.findFirst({ where: { id: id } });

      if (!user) {
        return false;
      } else {
        return true;
      }
    }),
    ...managers.map(async (id: string) => {
      const user = await prisma.user.findFirst({ where: { id: id } });

      if (!user) {
        return false;
      } else {
        return true;
      }
    }),
  ]);

  if (!userExist.every((result) => result)) {
    return next(Errors.User.userNotFound);
  }

  const eventOrganisers = await prisma.eventOrganiser.findMany({
    where: {
      eventId: eventId,
    },
  });

  const eventOrganiserIds = eventOrganisers.map(
    (organiser) => organiser.userId
  );

  const organiserIdsToRemove = eventOrganiserIds.filter(
    (id) => !organizers.includes(id)
  );

  const eventManagers = await prisma.eventManager.findMany({
    where: {
      eventId: eventId,
    },
  });

  const eventManagersUserId = eventManagers.map((manager) => manager.userId);

  const managerIdsToRemove = eventManagersUserId.filter(
    (id) => !managers.includes(id)
  );

  await Promise.all([
    eventOrganisers,
    eventManagers,
    ...organiserIdsToRemove.map(async (id: string) => {
      await prisma.eventOrganiser.delete({
        where: {
          userId_eventId: { userId: id, eventId: eventId },
        },
      });
    }),
    ...managerIdsToRemove.map(async (id: string) => {
      await prisma.eventManager.delete({
        where: {
          userId_eventId: {
            userId: id,
            eventId: eventId,
          },
        },
      });
    }),
    ...organizers.map(async (id: string) => {
      console.log(id);
      await prisma.eventOrganiser.upsert({
        create: {
          user: { connect: { id: id } },
          event: { connect: { id: eventId } },
        },
        update: {},
        where: {
          userId_eventId: { userId: id, eventId: eventId },
        },
      });
    }),
    ...managers.map(async (id: string) => {
      await prisma.eventManager.upsert({
        create: {
          user: { connect: { id: id } },
          event: { connect: { id: eventId } },
        },
        update: {},
        where: {
          userId_eventId: {
            userId: id,
            eventId: eventId,
          },
        },
      });
    }),
  ]);

  const event = await prisma.event.update({
    where: { id: eventId },
    data: {
      description,
      posterImage,
      attendanceIncentive,
      registrationIncentive,
      lat,
      lng,
      maxTeamSize,
      minTeamSize,
      name,
      prizeDescription,
      registrationEndTime: regEnd,
      registrationStartTime: regStart,
      stagesDescription,
      venue,
      moduleId,
      extraQuestions: extraQuestions,
    },
  });

  if (!event) return next(Errors.System.serverError);
  return res.json(Utils.Response.Success(event));
};

export { updateEvent };
