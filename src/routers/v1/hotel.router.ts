import express from 'express';
import { createHotelHandler, getAllHotelsHandler, getHotelByIdHandler, updateHotelHandler } from '../../controllers/hotel.controller'; 
import { hotelSchema } from '../../validators/hotel.validator';
import { validateSchemaBody } from '../../validators';
 

const hotelRouter = express.Router();

   hotelRouter.post('/', validateSchemaBody(hotelSchema) ,createHotelHandler)
   hotelRouter.get('/:id',getHotelByIdHandler)
   hotelRouter.get('/',getAllHotelsHandler)
   hotelRouter.put('/:id',validateSchemaBody(hotelSchema) ,updateHotelHandler)

export default hotelRouter;