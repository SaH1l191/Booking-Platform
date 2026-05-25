import express from 'express';
import {
  createRoomAvailabilityHandler,
  deleteRoomAvailabilityHandler,
  getRoomAvailabilityByIdHandler,
  getRoomAvailabilityByRoomAndDateHandler,
  updateRoomAvailabilityHandler,
} from '../../controllers/roomAvailability.controller';
import { roomAvailabilitySchema, updateRoomAvailabilitySchema } from '../../validators/roomAvailability.validator';
import { validateSchemaBody } from '../../validators';

const router = express.Router();

router.post('/', validateSchemaBody(roomAvailabilitySchema), createRoomAvailabilityHandler);
router.get('/', getRoomAvailabilityByRoomAndDateHandler); // expects ?roomId=&date=
router.get('/:id', getRoomAvailabilityByIdHandler);
router.put('/:id', validateSchemaBody(updateRoomAvailabilitySchema), updateRoomAvailabilityHandler);
router.delete('/:id', deleteRoomAvailabilityHandler);

export default router;