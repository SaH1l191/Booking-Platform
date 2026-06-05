import express from 'express';
import { createHotelHandler, deleteHotelHandler, getAllHotelsHandler, getHotelByIdHandler, updateHotelHandler } from '../../controllers/hotel.controller';
import { hotelQuerySchema, hotelSchema, updatehotelSchema } from '../../validators/hotel.validator';
import { validateSchemaBody, validateSchemaParams, validateSchemaQuery } from '../../validators';
import { getRoomsByHotelHandler } from '../../controllers/room.controller';
import { idParamSchema } from '../../validators/common.validator';


const hotelRouter = express.Router();

   
   hotelRouter.get('/', validateSchemaQuery(hotelQuerySchema), getAllHotelsHandler)
   hotelRouter.post('/', validateSchemaBody(hotelSchema), createHotelHandler)

   hotelRouter.get('/:id/rooms', validateSchemaParams(idParamSchema), getRoomsByHotelHandler)
   hotelRouter.get('/:id', validateSchemaParams(idParamSchema), getHotelByIdHandler)
   hotelRouter.put('/:id', validateSchemaParams(idParamSchema), validateSchemaBody(updatehotelSchema), updateHotelHandler)
   hotelRouter.delete('/:id', validateSchemaParams(idParamSchema), deleteHotelHandler) 

export default hotelRouter;