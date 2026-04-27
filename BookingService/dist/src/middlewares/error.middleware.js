"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.genericErrorHandler = exports.appErrorHandler = void 0;
const appErrorHandler = (err, req, res, next) => {
    if (typeof err.statusCode !== "number") {
        return next(err);
    }
    console.log(err);
    res.status(err.statusCode).json({
        success: false,
        message: err.message
    });
};
exports.appErrorHandler = appErrorHandler;
const genericErrorHandler = (err, req, res, next) => {
    console.log(err);
    res.status(500).json({
        success: false,
        message: "Internal Server Error"
    });
};
exports.genericErrorHandler = genericErrorHandler;
