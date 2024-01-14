import * as Interfaces from "@interfaces";
import * as Errors from "@errors";
import * as Utils from "@utils";
import { prisma } from "@utils/prisma";
import { EventManager } from "@prisma/client";

const addManager: Interfaces.Controller.Async = async (req, res, next) => {
  const { eventId: EID } = req.params;
  const eventId = String(EID);

  if (!eventId) return next(Errors.Module.invalidInput);

  const { managers }: { managers: [string] } = req.body;

  if (!managers) return next(Errors.Module.invalidInput);

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
  } else {
    const eventManagers: EventManager[] = [];
    await Promise.all(
      managers.map(async (id) => {
        const eventmanager = await prisma.eventManager.upsert({
          create: {
            user: { connect: { id: id } },
            event: { connect: { id: eventId } },
          },
          where: { userId_eventId: { userId: id, eventId: eventId } },
          update: {},
        });

        if (eventmanager) {
          eventManagers.push(eventmanager);
        }
      })
    );

    return res.json(Utils.Response.Success(eventManagers));
  }
};

export { addManager };
