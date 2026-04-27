"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const validators_1 = require("../../validators");
const booking_validator_1 = require("../../validators/booking.validator");
const booking_controller_1 = require("../../controllers/booking.controller");
const bookingRouter = express_1.default.Router();
bookingRouter.post('/', (0, validators_1.validateSchemaBody)(booking_validator_1.createBookingSchema), booking_controller_1.createBookingHandler);
//Create the booking
//Generate the idempotency key
//save the idempotency key with booking id and finalized as false
//return the booking id and idempotency key
bookingRouter.post('/confirm/:idempotencyKey', booking_controller_1.confirmBookingHandler);
//Retrieve the idempotency key
//Check if the idempotency key is valid and not finalized
//Confirm the booking
//Finalize the idempotency ke
exports.default = bookingRouter;
