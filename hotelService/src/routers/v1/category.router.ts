import express from "express";
import {
    createCategoryHandler,
    deleteCategoryHandler,
    getAllCategoriesHandler,
    getCategoryByIdHandler,
    updateCategoryHandler,
} from "../../controllers/category.controller";
import { categorySchema, updateCategorySchema } from "../../validators/category.validator";
import { validateSchemaBody, validateSchemaParams } from "../../validators";
import { idParamSchema } from "../../validators/common.validator";
import { authMiddleware } from "../../middlewares/auth.middleware";
import { requirePermission } from "../../middlewares/rbac.middleware";

const categoryRouter = express.Router();

categoryRouter.get("/error-test", (req, res) => {
  res.status(500).json({ success: false, message: "Dummy 500 Internal Server Error" });
});

categoryRouter.post("/", authMiddleware, requirePermission("category:create"), validateSchemaBody(categorySchema), createCategoryHandler);
categoryRouter.get("/", authMiddleware, getAllCategoriesHandler);
categoryRouter.get("/:id", authMiddleware, validateSchemaParams(idParamSchema), getCategoryByIdHandler);
categoryRouter.put("/:id", authMiddleware, requirePermission("category:update"), validateSchemaParams(idParamSchema), validateSchemaBody(updateCategorySchema), updateCategoryHandler);
categoryRouter.delete("/:id", authMiddleware, requirePermission("category:delete"), validateSchemaParams(idParamSchema), deleteCategoryHandler);

export default categoryRouter;
