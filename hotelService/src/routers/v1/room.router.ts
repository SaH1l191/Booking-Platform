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
import { validateSchemaBody } from "../../validators";

const roomRouter = express.Router();

roomRouter.get("/hotel/:hotelId", getRoomsByHotelHandler);
roomRouter.post("/", validateSchemaBody(roomSchema), createRoomHandler);
roomRouter.get("/", getAllRoomsHandler);
roomRouter.get("/:id", getRoomByIdHandler);
roomRouter.put("/:id", validateSchemaBody(updateRoomSchema), updateRoomHandler);
roomRouter.delete("/:id", deleteRoomHandler);



export default roomRouter;