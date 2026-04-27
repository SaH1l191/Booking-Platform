"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateSchemaBody = void 0;
const app_error_1 = require("../utils/errors/app.error");
const validateSchemaBody = (schema) => {
    return (req, res, next) => {
        if (!req.body || Object.keys(req.body).length === 0) {
            return next(new app_error_1.BadRequestError("Request body is required and must be valid JSON"));
        }
        console.log("Validating request body:", req.body);
        const result = schema.safeParse(req.body);
        if (!result.success) {
            const messages = result.error.issues
                .map((issue) => `${issue.path.join(".") || "body"}: ${issue.message}`)
                .join(", ");
            return next(new app_error_1.BadRequestError(messages));
        }
        req.body = result.data;
        return next();
    };
};
exports.validateSchemaBody = validateSchemaBody;
