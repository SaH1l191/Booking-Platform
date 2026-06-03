import express from 'express';
import { createHotelHandler, deleteHotelHandler, getAllHotelsHandler, getHotelByIdHandler, updateHotelHandler } from '../../controllers/hotel.controller';
import { hotelQuerySchema, hotelSchema, updatehotelSchema } from '../../validators/hotel.validator';
import { validateSchemaBody, validateSchemaQuery } from '../../validators';
import { getRoomsByHotelHandler } from '../../controllers/room.controller';


const hotelRouter = express.Router();

   
   hotelRouter.get('/', validateSchemaQuery(hotelQuerySchema), getAllHotelsHandler)
   hotelRouter.post('/', validateSchemaBody(hotelSchema), createHotelHandler)

   hotelRouter.get('/:id/rooms', getRoomsByHotelHandler)
   hotelRouter.get('/:id', getHotelByIdHandler)
   hotelRouter.put('/:id', validateSchemaBody(updatehotelSchema), updateHotelHandler)
   hotelRouter.delete('/:id', deleteHotelHandler) 

export default hotelRouter;