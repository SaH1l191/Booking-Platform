import Room from "../db/models/rooms";
import { createRoomDto } from "../dto/room.dto";
import {   NotFoundError } from "../utils/errors/app.error";
import logger from "../config/logger";

export async function createRoom(data: createRoomDto) {
  const room = await Room.create(data);
  logger.info("Room created", { roomId: room.id });
  return room;
}

export async function getRoomById(id: number) {
  const room = await Room.findByPk(id);
  if (!room) {
    logger.warn("Room not found", { roomId: id });
    throw new NotFoundError("Room not found");
  }
  logger.info("Room found", { roomId: room.id });
  return room;
}

export async function getAllRooms(hotelId?: number) {
  const where: any = { deletedAt: null };
  if (hotelId) {
    where.hotelId = hotelId;
  }
  const rooms = await Room.findAll({ where });
  logger.info(`Found ${rooms.length} rooms`);
  return rooms;
}

export async function updateRoom(id: number, data: Partial<createRoomDto>) {
  const room = await getRoomById(id);
  Object.assign(room, data);
  await room.save();
  logger.info("Room updated", { roomId: room.id });
  return room;
}

export async function deleteRoom(id: number) {
  const room = await getRoomById(id);
  room.deletedAt = new Date();
  await room.save();
  logger.info("Room soft-deleted", { roomId: room.id });
  return room;
}