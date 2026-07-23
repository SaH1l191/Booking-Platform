import { Request, Response } from "express";
import {
  createRoomService,
  deleteRoomService,
  getAllRoomsService,
  getRoomByIdService,
  updateRoomService,
} from "../services/room.service";

export async function createRoomHandler(req: Request, res: Response) {
  console.log("Creating room", { body: req.body });
  const result = await createRoomService(req.body);
  console.log("Room created successfully");
  res.status(201).json({ message: "Room created", data: result, success: true });
}

export async function getRoomByIdHandler(req: Request, res: Response) {
  const roomId = Number(req.params.id);
  console.log("Fetching room by ID", { roomId });
  const result = await getRoomByIdService(roomId);
  console.log("Room fetched successfully", { roomId });
  res.status(200).json({ message: "Room fetched", data: result, success: true });
}

export async function getAllRoomsHandler(req: Request, res: Response) {
  console.log("Fetching all rooms", { query: req.query });
  const result = await getAllRoomsService(req.query);
  console.log("Rooms fetched successfully");
  res.status(200).json({ message: "Rooms fetched", data: result, success: true });
}

export async function updateRoomHandler(req: Request, res: Response) {
  const roomId = Number(req.params.id);
  console.log("Updating room", { roomId });
  const result = await updateRoomService(roomId, req.body);
  console.log("Room updated successfully", { roomId });
  res.status(200).json({ message: "Room updated", data: result, success: true });
}

export async function deleteRoomHandler(req: Request, res: Response) {
  const roomId = Number(req.params.id);
  console.log("Deleting room", { roomId });
  const result = await deleteRoomService(roomId);
  console.log("Room deleted successfully", { roomId });
  res.status(200).json({ message: "Room deleted", data: result, success: true });
}

export async function getRoomsByHotelHandler(req: Request, res: Response) {
  const hotelId = Number(req.params.id || req.params.hotelId);
  console.log("Fetching rooms for hotel", { hotelId });
  const result = await getAllRoomsService({ hotelId: hotelId });
  console.log("Hotel rooms fetched successfully", { hotelId });
  res.status(200).json({ message: "Hotel rooms fetched", data: result, success: true });
}
