import { createRoomDto } from "../dto/room.dto";
import {
  createRoom,
  deleteRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
} from "../repositories/room.repository";

export async function createRoomService(data: createRoomDto) {
  return await createRoom(data);
}

export async function getRoomByIdService(id: number) {
  return await getRoomById(id);
}

export async function getAllRoomsService() {
  return await getAllRooms();
}

export async function updateRoomService(id: number, data: Partial<createRoomDto>) {
  return await updateRoom(id, data);
}

export async function deleteRoomService(id: number) {
  return await deleteRoom(id);
}