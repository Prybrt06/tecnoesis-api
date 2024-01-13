import * as Interfaces from "@interfaces";
import * as Errors from "@errors";
import * as Utils from "@utils";
import { prisma } from "@utils/prisma";

const addOrganizer: Interfaces.Controller.Async = async (req, res, next) => {
  const { eventId: EID } = req.params;
  const eventId = String(EID);

  if (!eventId) return next(Errors.Module.invalidInput);

  const { organizers }: { organizers: [string] } = req.body;

  if (!organizers) return next(Errors.Module.invalidInput);

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
  } else {
    let eventOrganisers;
    const result = await Promise.all(
      organizers.map(async (id) => {
        const eventOrganizer = await prisma.eventOrganiser.upsert({
          create: {
            user: { connect: { id: id } },
            event: { connect: { id: eventId } },
          },
          where: { userId_eventId: { userId: id, eventId: eventId } },
          update: {},
        });

        if (eventOrganizer) {
          return eventOrganizer;
        } else {
          return null;
        }
      })
    );

    result.every((result) => {
      eventOrganisers?.push(result);
    });

    return res.json(Utils.Response.Success(eventOrganisers));
  }
};

export { addOrganizer };
