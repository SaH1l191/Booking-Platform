import logger from "../config/logger"
import Hotel from "../db/models/hotel";
import { createHotelDto } from "../dto/hotel.dto";
import { BadRequestError, NotFoundError } from "../utils/errors/app.error";


export async function createHotel(hotelData: createHotelDto) {
    const hotel = await Hotel.create({
        name: hotelData.name,
        address: hotelData.address,
        location: hotelData.location,
        rating: hotelData.rating,
        ratingCount: hotelData.ratingCount
    })
    logger.info("Hotel created:", hotel.toJSON());
    return hotel;
}

export async function getHotelById(hotelId: number) {
    const hotel = await Hotel.findByPk(hotelId);
    if (!hotel) {
        logger.warn("Hotel not found");
        throw new NotFoundError("Hotel not found");
    }
    logger.info("Hotel found:", hotel.toJSON());
    return hotel;
}

export async function getAllHotels(query: any) {

    const {
        page = "1",
        limit = "10",
        sortBy = "-createdAt",
        search, ratingGte, ratingLte, location, minRating, maxRating
    } = query;

    

    const hotels = await Hotel.findAll({
        where: {
            deletedAt: null
        }
    });
    logger.info(`Found ${hotels.length} hotels.`);
    return hotels;
}

export async function updateHotel(hotelId: number, hotelData: createHotelDto) {
    const hotel = await getHotelById(hotelId);
    if (!hotel) {
        throw new BadRequestError("Hotel not found");
    }
    if (hotelData.name) hotel.name = hotelData.name;
    if (hotelData.address) hotel.address = hotelData.address;
    if (hotelData.location) hotel.location = hotelData.location;
    if (hotelData.rating) hotel.rating = hotelData.rating;
    if (hotelData.ratingCount) hotel.ratingCount = hotelData.ratingCount;
    await hotel.save();
    return hotel;
}


export async function deleteHotel(hotelId: number) {
    const hotel = await getHotelById(hotelId);
    if (!hotel) {
        throw new BadRequestError("Hotel not found");
    }
    hotel.deletedAt = new Date();
    await hotel.save();
    logger.info("Hotel soft-deleted:", hotel.toJSON());
    return hotel;
}