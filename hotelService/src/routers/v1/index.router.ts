import express from 'express';
import hotelRouter from './hotel.router';
import roomCategoryRouter from './roomCategory.router';
import roomRouter from './room.router';
const v1Router = express.Router();

v1Router.use('/hotels', hotelRouter);
v1Router.use('/roomCategories', roomCategoryRouter);
v1Router.use('/rooms', roomRouter); 
export default v1Router;