import { createRoomAvailabilityDto } from "../dto/roomAvailability.dto";
import {
  createAvailability,
  deleteAvailability,
  getAvailability,
  getAvailabilityById,
  updateAvailability,
} from "../repositories/roomAvailability.repository";

export async function createRoomAvailabilityService(data: createRoomAvailabilityDto) {
  return await createAvailability(data);
}

export async function getRoomAvailabilityService(id: number) {
  return await getAvailabilityById(id);
}

export async function getRoomAvailabilityByRoomAndDateService(roomId: number, date: string) {
  return await getAvailability(roomId, date);
}

export async function updateRoomAvailabilityService(id: number, data: Partial<createRoomAvailabilityDto>) {
  return await updateAvailability(id, data);
}

export async function deleteRoomAvailabilityService(id: number) {
  return await deleteAvailability(id);
}