import { Op, fn, col, literal, where as sequelizeWhere } from "sequelize";
import logger from "../config/logger"
import Hotel from "../db/models/hotel";
import { createHotelDto } from "../dto/hotel.dto";
import { BadRequestError, NotFoundError } from "../utils/errors/app.error";


export async function createHotel(hotelData: createHotelDto) {
    const coordinates = (hotelData.latitude !== undefined && hotelData.longitude !== undefined) 
        ? { type: 'Point', coordinates: [hotelData.longitude, hotelData.latitude] }
        : null;

    const hotel = await Hotel.create({
        name: hotelData.name,
        address: hotelData.address,
        location: hotelData.location,
        latitude: hotelData.latitude,
        longitude: hotelData.longitude,
        coordinates: coordinates,
        rating: hotelData.rating || 0,
        ratingCount: hotelData.ratingCount || 0
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
        page,
        limit,
        sortBy,
        search, location, minRating, maxRating,
        latitude, longitude, radius
    } = query;

    const offset = (page - 1) * limit;
    const where: any = {
        deletedAt: null
    };

    if (search) {
        where.name = { [Op.like]: `%${search}%` };
    }

    if (location && !latitude && !longitude) {
        where.location = { [Op.like]: `%${location}%` };
    }

    if (minRating || maxRating) {
        where.rating = {};
        if (minRating !== undefined) where.rating[Op.gte] = minRating;
        if (maxRating !== undefined) where.rating[Op.lte] = maxRating;
    }

    const attributes: any = {};
    const sortOrder: any = [];

    // Geospatial search
    if (latitude !== undefined && longitude !== undefined) {
        const distanceField = literal(`ST_Distance_Sphere(coordinates, ST_GeomFromText('POINT(${longitude} ${latitude})', 4326)) / 1000`);
        attributes.include = [[distanceField, 'distance']];
        
        where[Op.and] = [
            sequelizeWhere(distanceField, { [Op.lte]: radius || 10 })
        ];
        
        sortOrder.push([literal('distance'), 'ASC']);
    }

    if (sortBy) {
        const parts = sortBy.split(',');
        parts.forEach((part: string) => {
            const isDesc = part.startsWith('-');
            const field = isDesc ? part.substring(1) : part;
            // If already sorting by distance, don't override unless explicitly requested
            if (field !== 'distance' || sortOrder.length === 0) {
                sortOrder.push([field, isDesc ? 'DESC' : 'ASC']);
            }
        });
    }

    const findOptions: any = {
        where,
        order: sortOrder,
        limit: limit,
        offset,
    };

    if (attributes.include) {
        findOptions.attributes = attributes;
    }

    const { count, rows } = await Hotel.findAndCountAll(findOptions);

    logger.info(`Found ${rows.length} hotels out of ${count}.`);
    return {
        hotels: rows,
        total: count,
        page: page,
        limit: limit,
        totalPages: Math.ceil(count / limit)
    };
}

export async function updateHotel(hotelId: number, hotelData: Partial<createHotelDto>) {
    const hotel = await getHotelById(hotelId);
    if (!hotel) {
        throw new BadRequestError("Hotel not found");
    }
    
    if (hotelData.name) hotel.name = hotelData.name;
    if (hotelData.address) hotel.address = hotelData.address;
    if (hotelData.location) hotel.location = hotelData.location;
    
    if (hotelData.latitude !== undefined && hotelData.longitude !== undefined) {
        hotel.latitude = hotelData.latitude;
        hotel.longitude = hotelData.longitude;
        hotel.coordinates = { type: 'Point', coordinates: [hotelData.longitude, hotelData.latitude] };
    } else if (hotelData.latitude !== undefined || hotelData.longitude !== undefined) {
        // Handle partial update of lat/lng if needed
        const newLat = hotelData.latitude ?? hotel.latitude;
        const newLng = hotelData.longitude ?? hotel.longitude;
        if (newLat !== null && newLng !== null) {
            hotel.latitude = newLat;
            hotel.longitude = newLng;
            hotel.coordinates = { type: 'Point', coordinates: [newLng, newLat] };
        }
    }

    if (hotelData.rating !== undefined) hotel.rating = hotelData.rating;
    if (hotelData.ratingCount !== undefined) hotel.ratingCount = hotelData.ratingCount;
    
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
