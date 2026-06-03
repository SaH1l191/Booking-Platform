import { Request, Response } from "express";
import {
  createRoomService,
  deleteRoomService,
  getAllRoomsService,
  getRoomByIdService,
  updateRoomService,
} from "../services/room.service";
import logger from "../config/logger";

export async function createRoomHandler(req: Request, res: Response) {
  logger.info("Creating room with data:", req.body);
  const result = await createRoomService(req.body);
  logger.info("Room created successfully");
  res.status(201).json({ message: "Room created", data: result, success: true });
}

export async function getRoomByIdHandler(req: Request, res: Response) {
  const roomId = Number(req.params.id);
  logger.info(`Fetching room with id: ${roomId}`);
  const result = await getRoomByIdService(roomId);
  logger.info(`Room with id: ${roomId} fetched successfully`);
  res.status(200).json({ message: "Room fetched", data: result, success: true });
}

export async function getAllRoomsHandler(req: Request, res: Response) {
  logger.info("Fetching all rooms with query:", req.query);
  const result = await getAllRoomsService(req.query);
  logger.info("Rooms fetched successfully");
  res.status(200).json({ message: "Rooms fetched", data: result, success: true });
}

export async function updateRoomHandler(req: Request, res: Response) {
  const roomId = Number(req.params.id);
  logger.info(`Updating room with id: ${roomId}`);
  const result = await updateRoomService(roomId, req.body);
  logger.info(`Room with id: ${roomId} updated successfully`);
  res.status(200).json({ message: "Room updated", data: result, success: true });
}

export async function deleteRoomHandler(req: Request, res: Response) {
  const roomId = Number(req.params.id);
  logger.info(`Deleting room with id: ${roomId}`);
  const result = await deleteRoomService(roomId);
  logger.info(`Room with id: ${roomId} deleted successfully`);
  res.status(200).json({ message: "Room deleted", data: result, success: true });
}

export async function getRoomsByHotelHandler(req: Request, res: Response) {
  const hotelId = Number(req.params.id || req.params.hotelId);
  logger.info(`Fetching rooms for hotel id: ${hotelId}`);
  const result = await getAllRoomsService({ hotelId: hotelId });
  logger.info(`Rooms for hotel id: ${hotelId} fetched successfully`);
  res.status(200).json({ message: "Hotel rooms fetched", data: result, success: true });
}