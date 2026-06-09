import { createRoomDto } from "../dto/room.dto";
import {
  createRoom,
  deleteRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
} from "../repositories/room.repository";
import logger from "../config/logger";

export async function createRoomService(data: createRoomDto) {
  logger.info("Creating room in service");
  return await createRoom(data);
}

export async function getRoomByIdService(id: number) {
  logger.info("Fetching room by ID in service", { roomId: id });
  return await getRoomById(id);
}

export async function getAllRoomsService(query: any) {
  const hotelId = query.hotelId ? Number(query.hotelId) : undefined;
  logger.info("Fetching rooms in service", { hotelId: hotelId || 'all' });
  return await getAllRooms(hotelId);
}

export async function updateRoomService(id: number, data: Partial<createRoomDto>) {
  logger.info("Updating room in service", { roomId: id });
  return await updateRoom(id, data);
}

export async function deleteRoomService(id: number) {
  logger.info("Deleting room in service", { roomId: id });
  return await deleteRoom(id);
}
