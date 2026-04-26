import express from 'express';
import hotelRouter from './hotel.router';
const v1Router = express.Router();
 
v1Router.use('/hotels', hotelRouter)
export default v1Router;