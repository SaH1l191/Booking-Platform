import { createHotelDto } from "../dto/hotel.dto";
import { createHotel, deleteHotel, getAllHotels, getHotelById, updateHotel } from "../repositories/hotel.repository";
import { BadRequestError } from "../utils/errors/app.error";
import { geocode } from "../utils/geocoder";
import logger from "../config/logger";


const blockListedAddresses = [
    "123 Fake Street, Springfield",
    "456 Imaginary Road, Gotham",
    "789 Nonexistent Ave, Metropolis"
];

export async function createHotelService(hotelData: createHotelDto) {
    if(blockListedAddresses.includes(hotelData.address)){
        logger.warn("Attempted to create hotel with blocklisted address", { address: hotelData.address });
        throw new BadRequestError("Address is blocklisted");
    }

    if (hotelData.latitude === undefined || hotelData.longitude === undefined) {
        logger.info("Geocoding location", { location: hotelData.location });
        const coords = await geocode(hotelData.location);
        if (coords) {
            hotelData.latitude = coords.lat;
            hotelData.longitude = coords.lng;
            logger.info("Geocoded latitude and longitude", { lat: coords.lat, lng: coords.lng });
        } else {
            logger.warn("Could not geocode location", { location: hotelData.location });
        }
    }

    const hotel = await createHotel(hotelData)
    return hotel;
}

export async function getHotelByIdService(hotelId: number, userId?: number) {
    const hotel = await getHotelById(hotelId, userId)
    return hotel;
}

export async function getAllHotelsService(query: any, userId?: number) {
    logger.info("Searching hotels", { latitude: query.latitude, longitude: query.longitude });
    const hotels = await getAllHotels(query, userId);
    return hotels;
}

export async function updateHotelService(hotelId: number, hotelData: Partial<createHotelDto>) {
    if(hotelData.address && blockListedAddresses.includes(hotelData.address)){
        logger.warn("Attempted to update hotel with blocklisted address", { address: hotelData.address });
        throw new BadRequestError("Address is blocklisted");
    }

    if (hotelData.location && hotelData.latitude === undefined && hotelData.longitude === undefined) {
        logger.info("Geocoding updated location", { location: hotelData.location });
        const coords = await geocode(hotelData.location);
        if (coords) {
            hotelData.latitude = coords.lat;
            hotelData.longitude = coords.lng;
            logger.info("Geocoded updated latitude and longitude", { lat: coords.lat, lng: coords.lng });
        } else {
            logger.warn("Could not geocode updated location", { location: hotelData.location });
        }
    }

    const updatedHotel = await updateHotel(hotelId, hotelData); 
    return updatedHotel;
}

export async function deleteHotelService(hotelId: number) {
    const deletedHotel = await deleteHotel(hotelId);
    return deletedHotel;
}
