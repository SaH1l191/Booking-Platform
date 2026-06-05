import express from "express";
import {
  createRoomCategoryHandler,
  deleteRoomCategoryHandler,
  getAllRoomCategoriesHandler,
  getRoomCategoryByIdHandler,
  updateRoomCategoryHandler,
} from "../../controllers/roomCategory.controller";
import { roomCategorySchema, updateRoomCategorySchema } from "../../validators/roomCategory.validator";
import { validateSchemaBody, validateSchemaParams } from "../../validators";
import { idParamSchema } from "../../validators/common.validator";

const router = express.Router();

router.post("/", validateSchemaBody(roomCategorySchema), createRoomCategoryHandler);
router.get("/", getAllRoomCategoriesHandler);
router.get("/:id", validateSchemaParams(idParamSchema), getRoomCategoryByIdHandler);
router.put("/:id", validateSchemaParams(idParamSchema), validateSchemaBody(updateRoomCategorySchema), updateRoomCategoryHandler);
router.delete("/:id", validateSchemaParams(idParamSchema), deleteRoomCategoryHandler);

export default router;