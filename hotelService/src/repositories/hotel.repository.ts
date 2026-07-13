import { Op, literal, where as sequelizeWhere } from "sequelize";
import sequelize from "../db/models/sequelize";
import logger from "../config/logger"
import Hotel from "../db/models/hotel";
import HotelCategory from "../db/models/hotelCategory";
import Category from "../db/models/category";
import HotelImage from "../db/models/hotelImage";
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
        ratingCount: hotelData.ratingCount || 0,
        amenities: hotelData.amenities || null,
    })

    if (hotelData.categoryIds && hotelData.categoryIds.length > 0) {
        const hotelCategoryData = hotelData.categoryIds.map((categoryId) => ({
            hotelId: hotel.id,
            categoryId,
        }));
        await HotelCategory.bulkCreate(hotelCategoryData);
    }

    if (hotelData.images && hotelData.images.length > 0) {
        const imageData = hotelData.images.map((img, index) => ({
            hotelId: hotel.id,
            url: img.url,
            altText: img.altText || null,
            displayOrder: img.displayOrder ?? index,
        }));
        await HotelImage.bulkCreate(imageData);
    }

    logger.info("Hotel created", { hotelId: hotel.id, name: hotel.name });
    return hotel;
}

export async function getHotelById(hotelId: number) {
    const hotel = await Hotel.findByPk(hotelId, {
        include: [
            {
                model: HotelCategory,
                as: "hotelCategories",
                include: [
                    {
                        model: Category,
                        as: "category",
                    }
                ]
            },
            {
                model: HotelImage,
                as: "images"
            }
        ]
    });
    if (!hotel) {
        logger.warn("Hotel not found");
        throw new NotFoundError("Hotel not found");
    }
    const hotelJson = hotel.toJSON() as any;
    return {
        ...hotelJson,
        categories: hotelJson.hotelCategories?.map((hc: any) => hc.category) || [],
        images : hotelJson.images || [],
        amenities: hotel.amenities || [],
    };
}

export async function getAllHotels(query: any) {
    const page = Math.max(1, parseInt(query.page) || 1);
    const limit = Math.max(1, Math.min(100, parseInt(query.limit) || 10));
    const offset = (page - 1) * limit;

    const where: any = { deletedAt: null };

    if (query.search) {
        where.name = { [Op.like]: `%${query.search}%` };
    }

    if (query.minRating) {
        where.rating = where.rating || {};
        where.rating[Op.gte] = parseFloat(query.minRating);
    }
    if (query.maxRating) {
        where.rating = where.rating || {};
        where.rating[Op.lte] = parseFloat(query.maxRating);
    }


    if (query.minPrice) {
        where.price = where.price || {};
        where.price[Op.gte] = parseFloat(query.minPrice);
    }
    if (query.maxPrice) {
        where.price = where.price || {};
        where.price[Op.lte] = parseFloat(query.maxPrice);
    }

    //  (bounding box + distance check)
    let distanceField: ReturnType<typeof literal> | null = null;
    if (query.latitude && query.longitude) {
        const lat = parseFloat(query.latitude);
        const lng = parseFloat(query.longitude);
        const r = parseFloat(query.radius) || 10;

        if (!isNaN(lat) && !isNaN(lng)) {
            const latDelta = r / 111;
            const lngDelta = r / (111 * Math.cos((lat * Math.PI) / 180));

            where.latitude = { [Op.between]: [lat - latDelta, lat + latDelta] };
            where.longitude = { [Op.between]: [lng - lngDelta, lng + lngDelta] };

            distanceField = literal(`
                ST_Distance_Sphere(
                    POINT(longitude, latitude),
                    POINT(${sequelize.escape(lng)}, ${sequelize.escape(lat)})
                ) / 1000
            `);

            where[Op.and] = [
                sequelizeWhere(distanceField, { [Op.lte]: r })
            ];
        }
    }

    const { count, rows } = await Hotel.findAndCountAll({
        where,
        distinct: true,
        limit,
        offset,
        include: [
            {
                model: HotelCategory,
                as: "hotelCategories",
                include: [{ model: Category, as: "category", attributes: ["id", "name", "slug", "icon"] }],
                attributes: [],
            },
            {
                model: HotelImage,
                as: "images",
                attributes: ["id", "url", "altText", "displayOrder"],
                separate: true, //removes the N+1 problem by fetching images in a separate query (instaed of a cartesian product of 1hotel - 3categories,3images => 9 rows)
            },
        ],
    });

    logger.info("Hotels fetched", { count, page, limit, offset, search: query.search, category: query.category });
    return { hotels: rows, total: count, page, limit, totalPages: Math.ceil(count / limit) };
}

export async function updateHotel(hotelId: number, hotelData: Partial<createHotelDto>) {
    const hotel = await getHotelById(hotelId);
    if (!hotel) {
        throw new BadRequestError("Hotel not found");
    }

    const hotelRecord = await Hotel.findByPk(hotelId);

    if (hotelData.name) hotelRecord!.name = hotelData.name;
    if (hotelData.address) hotelRecord!.address = hotelData.address;
    if (hotelData.location) hotelRecord!.location = hotelData.location;
    if (hotelData.latitude !== undefined) hotelRecord!.latitude = hotelData.latitude;
    if (hotelData.longitude !== undefined) hotelRecord!.longitude = hotelData.longitude;
    if (hotelData.rating !== undefined) hotelRecord!.rating = hotelData.rating;
    if (hotelData.ratingCount !== undefined) hotelRecord!.ratingCount = hotelData.ratingCount;
    if (hotelData.amenities !== undefined) hotelRecord!.amenities = hotelData.amenities;

    await hotelRecord!.save();

    // Update categories if provided
    if (hotelData.categoryIds) {
        await HotelCategory.destroy({ where: { hotelId } });
        if (hotelData.categoryIds.length > 0) {
            const hotelCategoryData = hotelData.categoryIds.map((categoryId) => ({
                hotelId,
                categoryId,
            }));
            await HotelCategory.bulkCreate(hotelCategoryData);
        }
    }

    // Update images if provided
    if (hotelData.images) {
        await HotelImage.destroy({ where: { hotelId } });
        if (hotelData.images.length > 0) {
            const imageData = hotelData.images.map((img, index) => ({
                hotelId,
                url: img.url,
                altText: img.altText || null,
                displayOrder: img.displayOrder ?? index,
            }));
            await HotelImage.bulkCreate(imageData);
        }
    }

    return hotelRecord;
}


export async function deleteHotel(hotelId: number) {
    const hotel = await Hotel.findByPk(hotelId);
    if (!hotel) {
        throw new BadRequestError("Hotel not found");
    }
    hotel.deletedAt = new Date();
    await hotel.save();
    logger.info("Hotel soft-deleted", { hotelId: hotel.id });
    return hotel;
}
