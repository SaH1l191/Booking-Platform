import { createHotelDto } from "../dto/hotel.dto";
import { createHotel, deleteHotel, getAllHotels, getHotelById, updateHotel } from "../repositories/hotel.repository"; 
import logger from "../config/logger";

export async function createHotelService(hotelData: createHotelDto) {

    if (hotelData.latitude === undefined || hotelData.longitude === undefined) {
        logger.info("Geocoding location", { location: hotelData.location }); 
    } 
    const hotel = await createHotel(hotelData)
    return hotel;
}

export async function getHotelByIdService(hotelId: number) {
    const hotel = await getHotelById(hotelId)
    return hotel;
}

export async function getAllHotelsService(query: any, userId?: number) {
    logger.info("Searching hotels", { latitude: query.latitude, longitude: query.longitude });
    const hotels = await getAllHotels(query, userId);
    return hotels;
}

export async function updateHotelService(hotelId: number, hotelData: Partial<createHotelDto>) {

    if (hotelData.location && hotelData.latitude === undefined && hotelData.longitude === undefined) {
        logger.info("Geocoding updated location", { location: hotelData.location });
    }
    const updatedHotel = await updateHotel(hotelId, hotelData); 
    return updatedHotel;
}

export async function deleteHotelService(hotelId: number) {
    const deletedHotel = await deleteHotel(hotelId);
    return deletedHotel;
}
