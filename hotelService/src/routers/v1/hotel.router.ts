import express from 'express';
import { createHotelHandler, deleteHotelHandler, getAllHotelsHandler, getHotelByIdHandler, updateHotelHandler } from '../../controllers/hotel.controller';
import { hotelQuerySchema, hotelSchema, updatehotelSchema } from '../../validators/hotel.validator';
import { validateSchemaBody, validateSchemaParams, validateSchemaQuery } from '../../validators';
import { getRoomsByHotelHandler } from '../../controllers/room.controller';
import { idParamSchema } from '../../validators/common.validator';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';


const hotelRouter = express.Router();


hotelRouter.get('/', authMiddleware, requirePermission("hotel:read"), validateSchemaQuery(hotelQuerySchema), getAllHotelsHandler)
hotelRouter.post('/', authMiddleware, requirePermission("hotel:create"), validateSchemaBody(hotelSchema), createHotelHandler)
hotelRouter.get('/error-test', (req, res) => {
  res.status(500).json({ success: false, message: "Dummy 500 Internal Server Error" });
});
hotelRouter.get('/:id/rooms', authMiddleware, requirePermission("hotel:read"), validateSchemaParams(idParamSchema), getRoomsByHotelHandler)
hotelRouter.get('/:id', authMiddleware, requirePermission("hotel:read"), validateSchemaParams(idParamSchema), getHotelByIdHandler)
hotelRouter.put('/:id', authMiddleware, requirePermission("hotel:update"), validateSchemaParams(idParamSchema), validateSchemaBody(updatehotelSchema), updateHotelHandler)
hotelRouter.delete('/:id', authMiddleware, requirePermission("hotel:delete"), validateSchemaParams(idParamSchema), deleteHotelHandler)

export default hotelRouter;