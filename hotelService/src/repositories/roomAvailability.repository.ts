import RoomAvailability from "../db/models/roomAvailability";
import { createRoomAvailabilityDto } from "../dto/roomAvailability.dto";
import { NotFoundError } from "../utils/errors/app.error";

export async function createAvailability(data: createRoomAvailabilityDto) {
  const availability = await RoomAvailability.create(data as any);
  return availability;
}

export async function getAvailabilityById(id: number) {
  const av = await RoomAvailability.findByPk(id);
  if (!av) throw new NotFoundError('RoomAvailability not found');
  return av;
}

export async function getAvailability(roomId: number, date: string) {
  const av = await RoomAvailability.findOne({ where: { roomId, date } });
  if (!av) throw new NotFoundError('RoomAvailability not found');
  return av;
}

export async function updateAvailability(id: number, data: Partial<createRoomAvailabilityDto>) {
  const av = await getAvailabilityById(id);
  Object.assign(av, data);
  await av.save();
  return av;
}

export async function deleteAvailability(id: number) {
  const av = await getAvailabilityById(id);
  await av.destroy();
  return av;
}