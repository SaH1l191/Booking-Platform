import express from 'express';
import { validateSchemaBody, validateSchemaParams, validateSchemaQuery } from '../../validators/index';
import { bookingIdParamSchema, checkAvailabilitySchema, createBookingSchema, getBookingsByHotelSchema } from '../../validators/booking.validator';
import { cancelBookingHandler, checkAvailabilityHandler, createBookingHandler, getAllBookingsHandler, getBookingByIdHandler, getBookingsByHotelHandler, getBookingsByUserHandler } from '../../controllers/booking.controller';
import { authMiddleware, optionalAuth } from '../../middlewares/auth.middleware';
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
bookingRouter.get('/availability', optionalAuth, validateSchemaQuery(checkAvailabilitySchema), checkAvailabilityHandler);

// Get own bookings - any authenticated user
bookingRouter.get('/me', authMiddleware, requirePermission("booking:read"), getBookingsByUserHandler);

// Get bookings by hotel - hotel_manager and admin - (here normal user can also read bug - update the permission)
//RBAC permissions also update 
bookingRouter.get('/hotel/:hotelId', authMiddleware, requirePermission("booking:read"), validateSchemaParams(getBookingsByHotelSchema), getBookingsByHotelHandler);

// Get booking by ID - any authenticated user
bookingRouter.get('/:id', authMiddleware, requirePermission("booking:read"), validateSchemaParams(bookingIdParamSchema), getBookingByIdHandler);

// Cancel booking - customer only
bookingRouter.patch('/cancel/:id', authMiddleware, requirePermission("booking:cancel"), validateSchemaParams(bookingIdParamSchema), cancelBookingHandler);


export default bookingRouter;
