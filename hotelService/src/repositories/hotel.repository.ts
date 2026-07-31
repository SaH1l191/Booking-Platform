import { Op, literal, where as sequelizeWhere, col } from "sequelize";
import sequelize from "../db/models/sequelize";
import logger from "../config/logger"
import Hotel from "../db/models/hotel";
import HotelCategory from "../db/models/hotelCategory";
import Category from "../db/models/category";
import HotelImage from "../db/models/hotelImage";
import RoomCategory from "../db/models/roomCategory";
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
const page = Math.max(1, parseInt(query.page, 10) || 1);
const limit = Math.max(1, Math.min(100, parseInt(query.limit, 10) || 10));
    const offset = (page - 1) * limit;

    const where: any = { deletedAt: null };
    const andClauses: any[] = [];
    const order: any[] = [];

    if (query.search) {
        where[Op.or] = [
            { name: { [Op.like]: `%${query.search}%` } },
            { location: { [Op.like]: `%${query.search}%` } },
        ];
    }

    if (query.minRating) {
        where.rating = { ...where.rating, [Op.gte]: parseFloat(query.minRating) };
    }
    if (query.maxRating) {
        where.rating = { ...where.rating, [Op.lte]: parseFloat(query.maxRating) };
    }

    if (query.minPrice || query.maxPrice) {
        const clause = `EXISTS (SELECT 1 FROM room_categories WHERE hotel_id = Hotel.id AND deleted_at IS NULL`;
        const conditions: string[] = [];
        if (query.minPrice) conditions.push(`price >= ${sequelize.escape(parseFloat(query.minPrice))}`);
        if (query.maxPrice) conditions.push(`price <= ${sequelize.escape(parseFloat(query.maxPrice))}`);
        andClauses.push(literal(`${clause} AND ${conditions.join(' AND ')})`));
    }

    let distanceField: ReturnType<typeof literal> | null = null;
    if (query.latitude && query.longitude) {
        const lat = parseFloat(query.latitude);
        const lng = parseFloat(query.longitude);
        const r = parseFloat(query.radius) || 10;

        if (!isNaN(lat) && !isNaN(lng)) {
            const latDelta = r / 111;
            const lngDelta = r / (111 * Math.cos((lat * Math.PI) / 180));

            andClauses.push(
                literal(`${sequelize.escape(lat - latDelta)} <= CAST(latitude AS DECIMAL(10,8)) AND CAST(latitude AS DECIMAL(10,8)) <= ${sequelize.escape(lat + latDelta)}`),
                literal(`${sequelize.escape(lng - lngDelta)} <= CAST(longitude AS DECIMAL(11,8)) AND CAST(longitude AS DECIMAL(11,8)) <= ${sequelize.escape(lng + lngDelta)}`)
            );

            distanceField = literal(`
                ST_Distance_Sphere(
                    POINT(longitude, latitude),
                    POINT(${sequelize.escape(lng)}, ${sequelize.escape(lat)})
                ) / 1000
            `);

            andClauses.push(sequelizeWhere(distanceField, { [Op.lte]: r }));
        }
    }

    if (andClauses.length > 0) {
        where[Op.and] = andClauses;
    }

    const sortBy = query.sortBy || '-createdAt';
    const sortMap: Record<string, [any, string]> = {
        'createdAt': ['createdAt', 'ASC'],
        '-createdAt': ['createdAt', 'DESC'],
        'rating': ['rating', 'ASC'],
        '-rating': ['rating', 'DESC'],
        'price': [literal(`(SELECT COALESCE(MIN(price), 0) FROM room_categories WHERE hotel_id = Hotel.id AND deleted_at IS NULL)`), 'ASC'],
        '-price': [literal(`(SELECT COALESCE(MIN(price), 0) FROM room_categories WHERE hotel_id = Hotel.id AND deleted_at IS NULL)`), 'DESC'],
    };
    order.push(sortMap[sortBy] || sortMap['-createdAt']!);

    if (query.category) {
        andClauses.push(
            literal(`EXISTS (SELECT 1 FROM hotel_categories hc INNER JOIN categories c ON hc.category_id = c.id WHERE hc.hotel_id = Hotel.id AND c.slug = ${sequelize.escape(query.category)})`)
        );
    }

    const hotelCategoryInclude: any = {
        model: HotelCategory,
        as: "hotelCategories",
        include: [{ model: Category, as: "category", attributes: ["id", "name", "slug", "icon"] }],
        attributes: [],
    };

    const { count, rows } = await Hotel.findAndCountAll({
        where,
        distinct: true,
        limit,
        offset,
        order,
        include: [
            hotelCategoryInclude,
            {
                model: HotelImage,
                as: "images",
                attributes: ["id", "url", "altText", "displayOrder"],
                separate: true,
            },
            {
                model: RoomCategory,
                as: "roomCategories",
                attributes: ["id", "price", "roomType"],
                separate: true,
            },
        ],
    });

    logger.info("Hotels fetched", { count, page, limit, offset, search: query.search, category: query.category, sortBy });

    const hotels = rows.map((hotel: any) => {
        const hotelJson = hotel.toJSON() as any;
        return {
            ...hotelJson,
            categories: hotelJson.hotelCategories?.map((hc: any) => hc.category) || [],
            images: hotelJson.images || [],
            roomCategories: hotelJson.roomCategories || [],
        };
    });

    return { hotels, total: count, page, limit, totalPages: Math.ceil(count / limit) };
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
