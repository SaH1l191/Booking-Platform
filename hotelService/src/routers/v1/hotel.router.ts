import express from 'express';
import { createHotelHandler, deleteHotelHandler, getAllHotelsHandler, getHotelByIdHandler, updateHotelHandler } from '../../controllers/hotel.controller';
import { hotelQuerySchema, hotelSchema, updatehotelSchema } from '../../validators/hotel.validator';
import { validateSchemaBody, validateSchemaParams, validateSchemaQuery } from '../../validators';
import { getRoomsByHotelHandler } from '../../controllers/room.controller';
import { idParamSchema } from '../../validators/common.validator';
import { authMiddleware } from '../../middlewares/auth.middleware';


const hotelRouter = express.Router();


hotelRouter.get('/', authMiddleware, validateSchemaQuery(hotelQuerySchema), getAllHotelsHandler)
hotelRouter.post('/', authMiddleware, validateSchemaBody(hotelSchema), createHotelHandler)

hotelRouter.get('/:id/rooms', authMiddleware, validateSchemaParams(idParamSchema), getRoomsByHotelHandler)
hotelRouter.get('/:id', authMiddleware, validateSchemaParams(idParamSchema), getHotelByIdHandler)
hotelRouter.put('/:id', authMiddleware, validateSchemaParams(idParamSchema), validateSchemaBody(updatehotelSchema), updateHotelHandler)
hotelRouter.delete('/:id', authMiddleware, validateSchemaParams(idParamSchema), deleteHotelHandler)

export default hotelRouter;