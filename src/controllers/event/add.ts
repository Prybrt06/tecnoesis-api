import * as Interfaces from "@interfaces";
import { Event } from "@prisma/client";
import { prisma } from "@utils/prisma";
import * as Errors from "@errors";
import * as Utils from "@utils";

const createEvent: Interfaces.Controller.Async = async (req, res, next) => {
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
  // const { organisers, managers }: { organisers: [User]; managers: [User] } =
  //   req.body;
  if (
    !(
      description &&
      posterImage &&
      // incentive &&
      // isIncentivised &&
      lat &&
      lng &&
      maxTeamSize &&
      minTeamSize &&
      moduleId &&
      name &&
      prizeDescription &&
      registrationEndTime &&
      registrationStartTime &&
      stagesDescription &&
      venue
    )
  )
    return next(Errors.Module.invalidInput);

  if (moduleId.length != 24) return next(Errors.Module.invalidInput);

  if (extraQuestions && !Array.isArray(extraQuestions)) {
    return next(Errors.Module.invalidInput);
  }

  if (
    !(registrationIncentive && typeof registrationIncentive === "number") ||
    !(attendanceIncentive && typeof attendanceIncentive === "number")
  ) {
    return next(Errors.Module.invalidInput);
  }
  if (!String(moduleId + "")) return next(Errors.Module.invalidInput);
  if (
    typeof maxTeamSize !== "number" ||
    typeof minTeamSize !== "number" ||
    typeof lat !== "string" ||
    typeof lng !== "string" ||
    typeof name !== "string" ||
    typeof description !== "string" ||
    typeof prizeDescription !== "string" ||
    typeof stagesDescription !== "string" ||
    typeof venue !== "string" ||
    typeof posterImage !== "string"
  )
    return next(Errors.Module.invalidInput);

  const regStart = new Date(registrationStartTime);
  const regEnd = new Date(registrationEndTime);
  if (JSON.stringify(regStart) === "null" || JSON.stringify(regEnd) === "null")
    return next(Errors.Module.invalidInput);

  if (
    !(await prisma.module.findFirst({
      where: { id: moduleId },
    }))
  )
    return next(Errors.Module.moduleNotFound);

  const { organizers, managers }: { organizers: [string]; managers: [string] } =
    req.body;

  if (organizers) {
    if (!organizers.every((organizer) => organizer.length === 24)) {
      return next(Errors.Module.invalidInput);
    }

    const results = await Promise.all(
      organizers.map(async (organizer) => {
        const user = await prisma.user.findFirst({ where: { id: organizer } });
        if (!user) {
          return false;
        }
        return true;
      })
    );

    if (!results.every((result) => result)) {
      return next(Errors.User.userNotFound);
    }
  }

  if (managers) {
    if (!managers.every((manager) => manager.length === 24)) {
      return next(Errors.Module.invalidInput);
    }

    const results = await Promise.all(
      managers.map(async (manager) => {
        const user = await prisma.user.findFirst({ where: { id: manager } });
        if (!user) {
          return false;
        }
        return true;
      })
    );

    if (!results.every((result) => result)) {
      return next(Errors.User.userNotFound);
    }
  }

  const event = await prisma.event.create({
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
      extraQuestions,
      module: {
        connect: { id: moduleId },
      },
    },
  });

  if (organizers) {
    try {
      organizers.map(async (id: string) => {
        await prisma.eventOrganiser.create({
          data: {
            userId: id,
            eventId: event.id,
          },
        });
      });
    } catch (e) {
      await prisma.event.delete({ where: { id: event.id } });
      return next(Errors.Event.unableToCreate);
    }
  }

  if (managers) {
    try {
      managers.map(async (id: string) => {
        await prisma.eventManager.create({
          data: {
            userId: id,
            eventId: event.id,
          },
        });
      });
    } catch (e) {
      await prisma.event.delete({ where: { id: event.id } });
      return next(Errors.Event.unableToCreate);
    }
  }

  if (!event) return next(Errors.System.serverError);
  return res.json(Utils.Response.Success(event));
};

export { createEvent };
