import { Op, fn, col, literal, where as sequelizeWhere } from "sequelize";
import logger from "../config/logger"
import Hotel from "../db/models/hotel";
import { createHotelDto } from "../dto/hotel.dto";
import { BadRequestError, NotFoundError } from "../utils/errors/app.error";


export async function createHotel(hotelData: createHotelDto) {
    const hotel = await Hotel.create({
        name: hotelData.name,
        address: hotelData.address,
        location: hotelData.location,
        latitude: hotelData.latitude,
        longitude: hotelData.longitude,
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

    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(query.limit) || 10));
    const offset = (page - 1) * limit;

    const sortBy = query.sortBy || '-createdAt';
    const search = query.search;
    const minRating = query.minRating;
    const maxRating = query.maxRating;
    const latitude = query.latitude;
    const longitude = query.longitude;
    const radius = query.radius;

    const where: any = {
        deletedAt: null
    };

    if (search) {
        where.name = { [Op.like]: `%${search}%` };
    }

    if (minRating || maxRating) {
        where.rating = {};
        if (minRating !== undefined && minRating !== '') where.rating[Op.gte] = minRating;
        if (maxRating !== undefined && maxRating !== '') where.rating[Op.lte] = maxRating;
    }

    const attributes: any = {};
    const sortOrder: any = [];

    
    if (latitude !== undefined && longitude !== undefined && latitude !== '' && longitude !== '') {
        const lat = parseFloat(latitude);
        const lng = parseFloat(longitude);
        const r = parseFloat(radius || 10);
        
        const latDelta = r / 111;
        const lngDelta = r / (111 * Math.cos(lat * Math.PI / 180));

        where.latitude = { [Op.between]: [lat - latDelta, lat + latDelta] };
        where.longitude = { [Op.between]: [lng - lngDelta, lng + lngDelta] };

        // Exact distance calculation using MySQL's ST_Distance_Sphere

        const distanceField = literal(`
                ST_Distance_Sphere(
                    POINT(longitude, latitude),
                    POINT(${lng}, ${lat})
                ) / 1000
                `);
        attributes.include = [[distanceField, 'distance']];

        // Apply radius filter on the exact distance
        where[Op.and] = [
            sequelizeWhere(distanceField, { [Op.lte]: r })
        ];

        // Sort by distance (nearest first)
        sortOrder.push([literal('distance'), 'ASC']);
    }

    if (sortBy) {
        const parts = sortBy.split(',');
        parts.forEach((part: string) => {
            const isDesc = part.startsWith('-');
            const field = isDesc ? part.substring(1) : part;
            if (field !== 'distance' || sortOrder.length === 0) {
                sortOrder.push([field, isDesc ? 'DESC' : 'ASC']);
            }
        });
    }

    const findOptions: any = {
        where,
        order: sortOrder,
        limit: limit,
        offset: offset,
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

    if (hotelData.latitude !== undefined) hotel.latitude = hotelData.latitude;
    if (hotelData.longitude !== undefined) hotel.longitude = hotelData.longitude;

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
