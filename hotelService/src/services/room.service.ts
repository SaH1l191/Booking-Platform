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
  logger.info("Service: Creating room");
  return await createRoom(data);
}

export async function getRoomByIdService(id: number) {
  logger.info(`Service: Fetching room with id: ${id}`);
  return await getRoomById(id);
}

export async function getAllRoomsService(query: any) {
  const hotelId = query.hotelId ? Number(query.hotelId) : undefined;
  logger.info(`Service: Fetching rooms for hotel id: ${hotelId || 'all'}`);
  return await getAllRooms(hotelId);
}

export async function updateRoomService(id: number, data: Partial<createRoomDto>) {
  logger.info(`Service: Updating room with id: ${id}`);
  return await updateRoom(id, data);
}

export async function deleteRoomService(id: number) {
  logger.info(`Service: Deleting room with id: ${id}`);
  return await deleteRoom(id);
}