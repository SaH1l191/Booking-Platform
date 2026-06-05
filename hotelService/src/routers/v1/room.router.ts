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

const roomRouter = express.Router();

roomRouter.get("/hotel/:hotelId", validateSchemaParams(hotelIdParamSchema), getRoomsByHotelHandler);
roomRouter.post("/", validateSchemaBody(roomSchema), createRoomHandler);
roomRouter.get("/", getAllRoomsHandler);
roomRouter.get("/:id", validateSchemaParams(idParamSchema), getRoomByIdHandler);
roomRouter.put("/:id", validateSchemaParams(idParamSchema), validateSchemaBody(updateRoomSchema), updateRoomHandler);
roomRouter.delete("/:id", validateSchemaParams(idParamSchema), deleteRoomHandler);



export default roomRouter;