import express from "express";
import {
  createRoomHandler,
  deleteRoomHandler,
  getAllRoomsHandler,
  getRoomByIdHandler,
  updateRoomHandler,
} from "../../controllers/room.controller";
import { roomSchema, updateRoomSchema } from "../../validators/room.validator";
import { validateSchemaBody } from "../../validators";

const router = express.Router();

router.post("/", validateSchemaBody(roomSchema), createRoomHandler);
router.get("/", getAllRoomsHandler);
router.get("/:id", getRoomByIdHandler);
router.put("/:id", validateSchemaBody(updateRoomSchema), updateRoomHandler);
router.delete("/:id", deleteRoomHandler);

export default router;