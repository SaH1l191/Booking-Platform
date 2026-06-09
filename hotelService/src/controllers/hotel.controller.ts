import { Request, Response } from 'express';
import { createHotelService, deleteHotelService, getAllHotelsService, getHotelByIdService, updateHotelService } from '../services/hotel.service';
import logger from '../config/logger';

export async function createHotelHandler(req: Request , res: Response) {
    logger.info("Creating hotel", { body: req.body });
    const hotelResponse =  await createHotelService(req.body)
    logger.info("Hotel created successfully");
    res.status(201).json({
        message : "Hotel created successfully",
        data : hotelResponse,
        success : true
    })
}
export async function getHotelByIdHandler(req: Request , res: Response) { 
    const hotelId = Number(req.params.id);
    const userId = (req as any).user?.userId;
    logger.info("Fetching hotel by ID", { hotelId });
    const hotelResponse =  await getHotelByIdService(hotelId, userId)
    logger.info("Hotel fetched successfully", { hotelId });
    res.status(200).json({
        message : "Hotel fetched successfully",
        data : hotelResponse,
        success : true
    })
}

export async function getAllHotelsHandler(req: Request , res: Response) {
    const userId = (req as any).user?.userId;
    logger.info("Fetching all hotels", { query: req.query });
    const hotelResponse =  await getAllHotelsService(req.query, userId)
    logger.info("Hotels fetched successfully");
    res.status(200).json({
        message : "Hotels fetched successfully",
        data : hotelResponse,
        success : true
    })
}

export async function updateHotelHandler(req: Request , res: Response) {
    const hotelId = Number(req.params.id);
    logger.info("Updating hotel", { hotelId });
    const hotelResponse =  await updateHotelService(hotelId, req.body)
    logger.info("Hotel updated successfully", { hotelId });
    res.status(200).json({
        message : "Hotel updated successfully",
        data : hotelResponse,
        success : true
    })
}

export async function deleteHotelHandler(req: Request , res: Response) {
    const hotelId = Number(req.params.id);
    logger.info("Deleting hotel", { hotelId });
    const hotelReponse =  await deleteHotelService(hotelId)
    logger.info("Hotel deleted successfully", { hotelId });
    res.status(200).json({
        message : "Hotel deleted successfully",
        data : hotelReponse,
        success : true
    })
}
