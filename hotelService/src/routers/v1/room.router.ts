import express from "express";
import {
  createRoomHandler,
  deleteRoomHandler,
  getAllRoomsHandler,
  getRoomByIdHandler,
  updateRoomHandler,
  getRoomsByHotelHandler,
} from "../../controllers/room.controller";
import { roomSchema, updateRoomSchema } from "../../validators/room.validator";
import { validateSchemaBody, validateSchemaParams } from "../../validators";
import { idParamSchema, hotelIdParamSchema } from "../../validators/common.validator";
import { authMiddleware, optionalAuth } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/rbac.middleware";

const roomRouter = express.Router();

roomRouter.get("/error-test", (req, res) => {
  res.status(500).json({ success: false, message: "Dummy 500 Internal Server Error" });
});

roomRouter.get("/hotel/:hotelId", optionalAuth, validateSchemaParams(hotelIdParamSchema), getRoomsByHotelHandler);
roomRouter.post("/", authMiddleware, requirePermission("room:create"), validateSchemaBody(roomSchema), createRoomHandler);
roomRouter.get("/", optionalAuth, getAllRoomsHandler);
roomRouter.get("/:id", optionalAuth, validateSchemaParams(idParamSchema), getRoomByIdHandler);
roomRouter.put("/:id", authMiddleware, requirePermission("room:update"), validateSchemaParams(idParamSchema), validateSchemaBody(updateRoomSchema), updateRoomHandler);
roomRouter.delete("/:id", authMiddleware, requirePermission("room:delete"), validateSchemaParams(idParamSchema), deleteRoomHandler);

export default roomRouter;