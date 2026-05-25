


import express from 'express'
import bookingRouter from './booking.routes.js';


const v1Router = express.Router();
v1Router.use('/api/v1/bookings',bookingRouter)

export default v1Router; 