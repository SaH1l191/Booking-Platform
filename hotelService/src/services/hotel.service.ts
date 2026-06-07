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
        logger.warn(`Attempted to create hotel with blocklisted address: ${hotelData.address}`);
        throw new BadRequestError("Address is blocklisted");
    }

    // Geocode location if latitude and longitude are missing
    if (hotelData.latitude === undefined || hotelData.longitude === undefined) {
        logger.info(`Geocoding location: ${hotelData.location}`);
        const coords = await geocode(hotelData.location);
        if (coords) {
            hotelData.latitude = coords.lat;
            hotelData.longitude = coords.lng;
            logger.info(`Geocoded latitude and longitude: ${coords.lat}, ${coords.lng}`);
        } else {
            logger.warn(`Could not geocode location: ${hotelData.location}`);
        }
    }

    const hotel = await createHotel(hotelData)
    return hotel;
}
export async function getHotelByIdService(hotelId: number) {
    const hotel = await getHotelById(hotelId)
    return hotel;
}

export async function getAllHotelsService(query: any) {
    logger.info(`Searching hotels with lat: ${query.latitude}, lng: ${query.longitude}`);

    const hotels = await getAllHotels(query);
    return hotels;
}

export async function updateHotelService(hotelId: number, hotelData: Partial<createHotelDto>) {
    if(hotelData.address && blockListedAddresses.includes(hotelData.address)){
        logger.warn(`Attempted to update hotel with blocklisted address: ${hotelData.address}`);
        throw new BadRequestError("Address is blocklisted");
    }

    // Geocode location if it's being updated and latitude/longitude are missing
    if (hotelData.location && hotelData.latitude === undefined && hotelData.longitude === undefined) {
        logger.info(`Geocoding updated location: ${hotelData.location}`);
        const coords = await geocode(hotelData.location);
        if (coords) {
            hotelData.latitude = coords.lat;
            hotelData.longitude = coords.lng;
            logger.info(`Geocoded updated latitude and longitude: ${coords.lat}, ${coords.lng}`);
        } else {
            logger.warn(`Could not geocode updated location: ${hotelData.location}`);
        }
    }

    const updatedHotel = await updateHotel(hotelId, hotelData); 
  return updatedHotel;
    
}

export async function deleteHotelService(hotelId: number) {
    const deletedHotel = await deleteHotel(hotelId);
    return deletedHotel;
}