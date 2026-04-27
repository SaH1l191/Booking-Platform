"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const booking_routes_1 = __importDefault(require("./booking.routes"));
const v1Router = express_1.default.Router();
v1Router.use('/api/v1/bookings', booking_routes_1.default);
exports.default = v1Router;
