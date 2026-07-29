import { createRoomDto } from "../dto/room.dto";
import {
  createRoom,
  deleteRoom,
  getAllRooms,
  getRoomById,
  updateRoom,
} from "../repositories/room.repository";

export async function createRoomService(data: createRoomDto) {
  console.log("Creating room in service");
  return await createRoom(data);
}

export async function getRoomByIdService(id: number) {
  console.log("Fetching room by ID in service", { roomId: id });
  return await getRoomById(id);
}

export async function getAllRoomsService(query: any) {
  const hotelId = query.hotelId ? Number(query.hotelId) : undefined;
  const page = query.page ? Number(query.page) : undefined;
  const limit = query.limit ? Number(query.limit) : undefined;
  console.log("Fetching rooms in service", { hotelId: hotelId || 'all', page, limit });
  return await getAllRooms(hotelId, page, limit);
}

export async function updateRoomService(id: number, data: Partial<createRoomDto>) {
  console.log("Updating room in service", { roomId: id });
  return await updateRoom(id, data);
}

export async function deleteRoomService(id: number) {
  console.log("Deleting room in service", { roomId: id });
  return await deleteRoom(id);
}
