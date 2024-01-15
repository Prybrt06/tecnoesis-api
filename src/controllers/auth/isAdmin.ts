import * as Interfaces from "@interfaces";
import * as Utils from "@utils";

const checkAdmin: Interfaces.Controller.Async = async (_req, _res, next) => {
  return next(Utils.Response.Success("admin"));
};

export { checkAdmin };
