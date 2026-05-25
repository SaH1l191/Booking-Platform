
import express from 'express';
import { validateSchemaBody } from '../../validators/index.js';
import { createBookingSchema } from '../../validators/booking.validator.js'; 
import { confirmBookingHandler, createBookingHandler } from '../../controllers/booking.controller.js';


const bookingRouter = express.Router(); 

//create book->create idempotency key 
//single operation -> single db transaction
bookingRouter.post('/', validateSchemaBody(createBookingSchema), createBookingHandler);
//Create the booking
//Generate the idempotency key
//save the idempotency key with booking id and finalized as false
//return the booking id and idempotency key


bookingRouter.post('/confirm/:idempotencyKey', confirmBookingHandler);
//Retrieve the idempotency key
//Check if the idempotency key is valid and not finalized
//Confirm the booking
//Finalize the idempotency ke

export default bookingRouter;