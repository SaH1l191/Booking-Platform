import express from "express";
import {
  createRoomCategoryHandler,
  deleteRoomCategoryHandler,
  getAllRoomCategoriesHandler,
  getRoomCategoryByIdHandler,
  updateRoomCategoryHandler,
} from "../../controllers/roomCategory.controller";
import { roomCategorySchema, updateRoomCategorySchema } from "../../validators/roomCategory.validator";
import { validateSchemaBody } from "../../validators";

const router = express.Router();

router.post("/", validateSchemaBody(roomCategorySchema), createRoomCategoryHandler);
router.get("/", getAllRoomCategoriesHandler);
router.get("/:id", getRoomCategoryByIdHandler);
router.put("/:id", validateSchemaBody(updateRoomCategorySchema), updateRoomCategoryHandler);
router.delete("/:id", deleteRoomCategoryHandler);

export default router;