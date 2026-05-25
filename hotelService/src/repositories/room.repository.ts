import Room from "../db/models/rooms";
import { createRoomDto } from "../dto/room.dto";
import {   NotFoundError } from "../utils/errors/app.error";

export async function createRoom(data: createRoomDto) {
  const room = await Room.create(data);
  return room;
}

export async function getRoomById(id: number) {
  const room = await Room.findByPk(id);
  if (!room) {
    throw new NotFoundError("Room not found");
  }
  return room;
}

export async function getAllRooms() {
  const rooms = await Room.findAll({ where: { deletedAt: null } });
  return rooms;
}

export async function updateRoom(id: number, data: Partial<createRoomDto>) {
  const room = await getRoomById(id);
  Object.assign(room, data);
  await room.save();
  return room;
}

export async function deleteRoom(id: number) {
  const room = await getRoomById(id);
  room.deletedAt = new Date();
  await room.save();
  return room;
}