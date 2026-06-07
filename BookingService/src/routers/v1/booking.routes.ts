import express from 'express';
import { validateSchemaBody, validateSchemaParams, validateSchemaQuery } from '../../validators/index';
import { bookingIdParamSchema, checkAvailabilitySchema, confirmBookingSchema, createBookingSchema, getBookingsByHotelSchema } from '../../validators/booking.validator';
import { cancelBookingHandler, checkAvailabilityHandler, confirmBookingHandler, createBookingHandler, getBookingByIdHandler, getBookingsByHotelHandler, getBookingsByUserHandler } from '../../controllers/booking.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';


const bookingRouter = express.Router();

//create book->create idempotency key
//single operation -> single db transaction
bookingRouter.post('/',authMiddleware, validateSchemaBody(createBookingSchema), createBookingHandler);
//Create the booking
//Generate the idempotency key
//save the idempotency key with booking id and finalized as false


bookingRouter.post('/confirm/:idempotencyKey', authMiddleware, validateSchemaParams(confirmBookingSchema), confirmBookingHandler);
//Retrieve the idempotency key
//Check if the idempotency key is valid and not finalized
//Confirm the booking
//Finalize the idempotency key
bookingRouter.get('/availability', authMiddleware,validateSchemaQuery(checkAvailabilitySchema), checkAvailabilityHandler); 
//GET /checkAvailability?hotelId=2&roomId=4&checkIn=2026-12-20&checkOut=2026-12-25

bookingRouter.get('/me', authMiddleware, getBookingsByUserHandler);
bookingRouter.get('/hotel/:hotelId', authMiddleware, validateSchemaParams(getBookingsByHotelSchema), getBookingsByHotelHandler);
bookingRouter.get('/:id', authMiddleware, validateSchemaParams(bookingIdParamSchema), getBookingByIdHandler);
bookingRouter.patch('/cancel/:id', authMiddleware, validateSchemaParams(bookingIdParamSchema), cancelBookingHandler);


export default bookingRouter;
