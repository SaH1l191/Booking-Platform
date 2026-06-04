
import express from 'express';
import { validateSchemaBody } from '../../validators/index';
import { createBookingSchema } from '../../validators/booking.validator'; 
import { cancelBookingHandler, confirmBookingHandler, createBookingHandler, getBookingByIdHandler, getBookingsByHotelHandler, getBookingsByUserHandler } from '../../controllers/booking.controller';
import { requireAuth } from '../../middlewares/auth.middleware';


const bookingRouter = express.Router(); 

//create book->create idempotency key 
//single operation -> single db transaction
bookingRouter.post('/',requireAuth, validateSchemaBody(createBookingSchema), createBookingHandler);
//Create the booking
//Generate the idempotency key
//save the idempotency key with booking id and finalized as false
//return the booking id and idempotency key


bookingRouter.post('/confirm/:idempotencyKey', requireAuth, confirmBookingHandler);
//Retrieve the idempotency key
//Check if the idempotency key is valid and not finalized
//Confirm the booking
//Finalize the idempotency key

bookingRouter.get('/user', requireAuth, getBookingsByUserHandler);
bookingRouter.get('/hotel/:hotelId', requireAuth, getBookingsByHotelHandler);
bookingRouter.get('/:id', requireAuth, getBookingByIdHandler);
bookingRouter.patch('/cancel/:id', requireAuth, cancelBookingHandler);

export default bookingRouter;