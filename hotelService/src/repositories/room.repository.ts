import Room from "../db/models/rooms";
import RoomCategory from "../db/models/roomCategory";
import { createRoomDto } from "../dto/room.dto";
import {   NotFoundError } from "../utils/errors/app.error";
import logger from "../config/logger";

export async function createRoom(data: createRoomDto) {
  const room = await Room.create(data);
  logger.info("Room created", { roomId: room.id });
  return room;
}

export async function getRoomById(id: number) {
  const room = await Room.findByPk(id, {
    include: [{ model: RoomCategory, as: "roomCategory", attributes: ["id", "price", "roomType"] }],
  });
  if (!room) {
    logger.warn("Room not found", { roomId: id });
    throw new NotFoundError("Room not found");
  }
  logger.info("Room found", { roomId: room.id });
  return room;
}

export async function getAllRooms(hotelId?: number, page?: number, limit?: number) {
  const where: any = { deletedAt: null };
  if (hotelId) {
    where.hotelId = hotelId;
  }
  if (page && limit) {
    const offset = (page - 1) * limit;
    const { count, rows } = await Room.findAndCountAll({
      where,
      limit,
      offset,
    });
    logger.info(`Found ${count} rooms (page ${page}, limit ${limit})`);
    return { data: rows, total: count, page, limit, totalPages: Math.ceil(count / limit) };
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