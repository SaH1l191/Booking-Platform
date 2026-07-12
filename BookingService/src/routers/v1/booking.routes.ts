import express from 'express';
import { validateSchemaBody, validateSchemaParams, validateSchemaQuery } from '../../validators/index';
import { bookingIdParamSchema, checkAvailabilitySchema, createBookingSchema, getBookingsByHotelSchema } from '../../validators/booking.validator';
import { cancelBookingHandler, checkAvailabilityHandler, createBookingHandler, getBookingByIdHandler, getBookingsByHotelHandler, getBookingsByUserHandler } from '../../controllers/booking.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';


const bookingRouter = express.Router();

// Create booking - customer only
bookingRouter.post('/', authMiddleware, requirePermission("booking:create"), validateSchemaBody(createBookingSchema), createBookingHandler);

// Check availability - any authenticated user
bookingRouter.get('/availability', authMiddleware, requirePermission("booking:read"), validateSchemaQuery(checkAvailabilitySchema), checkAvailabilityHandler);

// Get own bookings - any authenticated user
bookingRouter.get('/me', authMiddleware, requirePermission("booking:read"), getBookingsByUserHandler);

// Get bookings by hotel - hotel_manager and admin
bookingRouter.get('/hotel/:hotelId', authMiddleware, requirePermission("booking:read"), validateSchemaParams(getBookingsByHotelSchema), getBookingsByHotelHandler);

// Get booking by ID - any authenticated user
bookingRouter.get('/:id', authMiddleware, requirePermission("booking:read"), validateSchemaParams(bookingIdParamSchema), getBookingByIdHandler);

// Cancel booking - customer only
bookingRouter.patch('/cancel/:id', authMiddleware, requirePermission("booking:cancel"), validateSchemaParams(bookingIdParamSchema), cancelBookingHandler);


export default bookingRouter;
