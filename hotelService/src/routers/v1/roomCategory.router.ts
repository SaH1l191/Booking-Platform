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
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/rbac.middleware";

const router = express.Router();

router.get("/error-test", (req, res) => {
  res.status(500).json({ success: false, message: "Dummy 500 Internal Server Error" });
});

router.post("/", authMiddleware, requirePermission("roomCategory:create"), validateSchemaBody(roomCategorySchema), createRoomCategoryHandler);
router.get("/", authMiddleware, requirePermission("roomCategory:read"), getAllRoomCategoriesHandler);
router.get("/:id", authMiddleware, requirePermission("roomCategory:read"), validateSchemaParams(idParamSchema), getRoomCategoryByIdHandler);
router.put("/:id", authMiddleware, requirePermission("roomCategory:update"), validateSchemaParams(idParamSchema), validateSchemaBody(updateRoomCategorySchema), updateRoomCategoryHandler);
router.delete("/:id", authMiddleware, requirePermission("roomCategory:delete"), validateSchemaParams(idParamSchema), deleteRoomCategoryHandler);

export default router;