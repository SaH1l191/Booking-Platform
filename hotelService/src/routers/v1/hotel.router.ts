import express from 'express';
import { createHotelHandler, deleteHotelHandler, getAllHotelsHandler, getHotelByIdHandler, updateHotelHandler } from '../../controllers/hotel.controller'; 
import { hotelSchema, updatehotelSchema } from '../../validators/hotel.validator';
import { validateSchemaBody } from '../../validators';
 

const hotelRouter = express.Router();

   hotelRouter.post('/', validateSchemaBody(hotelSchema) ,createHotelHandler)
   hotelRouter.get('/:id',getHotelByIdHandler)
   hotelRouter.get('/',getAllHotelsHandler)
   hotelRouter.put('/:id',validateSchemaBody(updatehotelSchema) ,updateHotelHandler)
   hotelRouter.delete('/:id',deleteHotelHandler)
export default hotelRouter;