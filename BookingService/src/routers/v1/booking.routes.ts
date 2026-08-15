import express from 'express';
import { validateSchemaBody, validateSchemaParams, validateSchemaQuery } from '../../validators/index';
import { bookingIdParamSchema, checkAvailabilitySchema, createBookingSchema, getBookingsByHotelSchema } from '../../validators/booking.validator';
import { cancelBookingHandler, checkAvailabilityHandler, createBookingHandler, getAllBookingsHandler, getBookingByIdHandler, getBookingsByHotelHandler, getBookingsByUserHandler, streamBookingsHandler } from '../../controllers/booking.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';


const bookingRouter = express.Router();

// Test 500 error route 
bookingRouter.get('/error-test', (req, res) => {
  res.status(500).json({
    success: false,
    message: "Dummy 500 Internal Server Error"
  });
});

// Get all bookings - admin only
bookingRouter.get('/', authMiddleware, requirePermission("booking:read"), getAllBookingsHandler);

// Create booking - customer only
bookingRouter.post('/', authMiddleware, requirePermission("booking:create"), validateSchemaBody(createBookingSchema), createBookingHandler);

// Check availability - public
bookingRouter.get('/availability', authMiddleware, validateSchemaQuery(checkAvailabilitySchema), checkAvailabilityHandler);

// Get own bookings - any authenticated user
bookingRouter.get('/me', authMiddleware, requirePermission("booking:read"), getBookingsByUserHandler);

// SSE stream for real-time booking updates - any authenticated user
bookingRouter.get('/stream', authMiddleware, requirePermission("booking:read"), streamBookingsHandler);

// Get bookings by hotel - hotel_manager and admin only
bookingRouter.get('/hotel/:hotelId', authMiddleware, requirePermission("booking:read-by-hotel"), validateSchemaParams(getBookingsByHotelSchema), getBookingsByHotelHandler);

// Get booking by ID - any authenticated user
bookingRouter.get('/:id', authMiddleware, requirePermission("booking:read"), validateSchemaParams(bookingIdParamSchema), getBookingByIdHandler);

// Cancel booking - customer only
bookingRouter.patch('/cancel/:id', authMiddleware, requirePermission("booking:cancel"), validateSchemaParams(bookingIdParamSchema), cancelBookingHandler);


export default bookingRouter;
