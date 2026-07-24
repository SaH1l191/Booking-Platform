import express from 'express';
import { createHotelHandler, deleteHotelHandler, getAllHotelsHandler, getHotelByIdHandler, updateHotelHandler } from '../../controllers/hotel.controller';
import { hotelQuerySchema, hotelSchema, updatehotelSchema } from '../../validators/hotel.validator';
import { validateSchemaBody, validateSchemaParams, validateSchemaQuery } from '../../validators';
import { getRoomsByHotelHandler } from '../../controllers/room.controller';
import { idParamSchema } from '../../validators/common.validator';
import { authMiddleware, optionalAuth } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';


const hotelRouter = express.Router();


hotelRouter.get('/', optionalAuth, validateSchemaQuery(hotelQuerySchema), getAllHotelsHandler)
hotelRouter.post('/', authMiddleware, requirePermission("hotel:create"), validateSchemaBody(hotelSchema), createHotelHandler)
hotelRouter.get('/error-test', (req, res) => {
  res.status(500).json({ success: false, message: "Dummy 500 Internal Server Error" });
});
hotelRouter.get('/:id/rooms', optionalAuth, validateSchemaParams(idParamSchema), getRoomsByHotelHandler)
hotelRouter.get('/:id', optionalAuth, validateSchemaParams(idParamSchema), getHotelByIdHandler)
hotelRouter.put('/:id', authMiddleware, requirePermission("hotel:update"), validateSchemaParams(idParamSchema), validateSchemaBody(updatehotelSchema), updateHotelHandler)
hotelRouter.delete('/:id', authMiddleware, requirePermission("hotel:delete"), validateSchemaParams(idParamSchema), deleteHotelHandler)

export default hotelRouter;