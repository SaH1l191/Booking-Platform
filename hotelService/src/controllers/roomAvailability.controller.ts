import { Request, Response } from 'express';
import {
  createRoomAvailabilityService,
  deleteRoomAvailabilityService,
  getRoomAvailabilityService,
  getRoomAvailabilityByRoomAndDateService,
  updateRoomAvailabilityService,
} from '../services/roomAvailability.service';

export async function createRoomAvailabilityHandler(req: Request, res: Response) {
  const result = await createRoomAvailabilityService(req.body);
  res.status(201).json({ message: 'Room availability created', data: result, success: true });
}

export async function getRoomAvailabilityByIdHandler(req: Request, res: Response) {
  const result = await getRoomAvailabilityService(Number(req.params.id));
  res.status(200).json({ message: 'Room availability fetched', data: result, success: true });
}

export async function getRoomAvailabilityByRoomAndDateHandler(req: Request, res: Response) {
  const { roomId, date } = req.query as { roomId: string; date: string };
  const result = await getRoomAvailabilityByRoomAndDateService(Number(roomId), date);
  res.status(200).json({ message: 'Room availability fetched', data: result, success: true });
}

export async function updateRoomAvailabilityHandler(req: Request, res: Response) {
  const result = await updateRoomAvailabilityService(Number(req.params.id), req.body);
  res.status(200).json({ message: 'Room availability updated', data: result, success: true });
}

export async function deleteRoomAvailabilityHandler(req: Request, res: Response) {
  const result = await deleteRoomAvailabilityService(Number(req.params.id));
  res.status(200).json({ message: 'Room availability deleted', data: result, success: true });
}