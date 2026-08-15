import { Request, Response, NextFunction } from 'express';
import { createHotelService, deleteHotelService, getAllHotelsService, getHotelByIdService, updateHotelService } from '../services/hotel.service';
import { createHotelImage } from '../repositories/hotelImage.repository';

export async function createHotelHandler(req: Request, res: Response, next: NextFunction) {
    try {
        console.log("Creating hotel", { body: req.body });
        const hotelResponse = await createHotelService(req.body)
        console.log("Hotel created successfully");
        res.status(201).json({
            message: "Hotel created successfully",
            data: hotelResponse,
            success: true
        })
    } catch (error) {
        next(error);
    }
}

export async function getHotelByIdHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const hotelId = Number(req.params.id);
        console.log("Fetching hotel by ID", { hotelId });
        const hotelResponse = await getHotelByIdService(hotelId)
        console.log("Hotel fetched successfully", { hotelId });
        res.status(200).json({
            message: "Hotel fetched successfully",
            data: hotelResponse,
            success: true
        })
    } catch (error) {
        next(error);
    }
}

export async function getAllHotelsHandler(req: Request, res: Response, next: NextFunction) {
    try {
        console.log("Fetching all hotels", { query: req.query });
        const hotelResponse = await getAllHotelsService(req.query)
        console.log("Hotels fetched successfully");
        res.status(200).json({
            message: "Hotels fetched successfully",
            data: hotelResponse,
            success: true
        })
    } catch (error) {
        next(error);
    }
}

export async function updateHotelHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const hotelId = Number(req.params.id);
        console.log("Updating hotel", { hotelId });
        const hotelResponse = await updateHotelService(hotelId, req.body)
        console.log("Hotel updated successfully", { hotelId });
        res.status(200).json({
            message: "Hotel updated successfully",
            data: hotelResponse,
            success: true
        })
    } catch (error) {
        next(error);
    }
}

export async function deleteHotelHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const hotelId = Number(req.params.id);
        console.log("Deleting hotel", { hotelId });
        const hotelReponse = await deleteHotelService(hotelId)
        console.log("Hotel deleted successfully", { hotelId });
        res.status(200).json({
            message: "Hotel deleted successfully",
            data: hotelReponse,
            success: true
        })
    } catch (error) {
        next(error);
    }
}

export async function uploadHotelImageHandler(req: Request, res: Response, next: NextFunction) {
    try {
        const hotelId = Number(req.params.id);
        const file = req.file as any;

        if (!file) {
            res.status(400).json({ success: false, message: "No image provided" });
            return;
        }

        const image = await createHotelImage({
            hotelId,
            url: file.path,
            altText: req.body.altText || "Hotel image",
            displayOrder: req.body.displayOrder || 0,
        });

        res.status(201).json({
            success: true,
            message: "Image uploaded successfully",
            data: image,
        });
    } catch (error) {
        next(error);
    }
}
