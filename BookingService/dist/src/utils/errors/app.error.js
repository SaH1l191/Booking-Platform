"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotImplementedError = exports.ConflictError = exports.ForbiddenError = exports.UnauthorizedError = exports.NotFoundError = exports.BadRequestError = exports.InternalServerError = void 0;
class InternalServerError {
    constructor(message) {
        this.statusCode = 500;
        this.message = message;
        this.name = "InternalServerError";
    }
}
exports.InternalServerError = InternalServerError;
class BadRequestError {
    constructor(message) {
        this.statusCode = 400;
        this.message = message;
        this.name = "BadRequestError";
    }
}
exports.BadRequestError = BadRequestError;
class NotFoundError {
    constructor(message) {
        this.statusCode = 404;
        this.message = message;
        this.name = "NotFoundError";
    }
}
exports.NotFoundError = NotFoundError;
class UnauthorizedError {
    constructor(message) {
        this.statusCode = 401;
        this.message = message;
        this.name = "UnauthorizedError";
    }
}
exports.UnauthorizedError = UnauthorizedError;
class ForbiddenError {
    constructor(message) {
        this.statusCode = 403;
        this.message = message;
        this.name = "ForbiddenError";
    }
}
exports.ForbiddenError = ForbiddenError;
class ConflictError {
    constructor(message) {
        this.statusCode = 409;
        this.message = message;
        this.name = "ConflictError";
    }
}
exports.ConflictError = ConflictError;
class NotImplementedError {
    constructor(message) {
        this.statusCode = 501;
        this.message = message;
        this.name = "NotImplementedError";
    }
}
exports.NotImplementedError = NotImplementedError;
