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

const categoryRouter = express.Router();

categoryRouter.post("/", validateSchemaBody(categorySchema), createCategoryHandler);
categoryRouter.get("/", getAllCategoriesHandler);
categoryRouter.get("/:id", validateSchemaParams(idParamSchema), getCategoryByIdHandler);
categoryRouter.put("/:id", validateSchemaParams(idParamSchema), validateSchemaBody(updateCategorySchema), updateCategoryHandler);
categoryRouter.delete("/:id", validateSchemaParams(idParamSchema), deleteCategoryHandler);

export default categoryRouter;
