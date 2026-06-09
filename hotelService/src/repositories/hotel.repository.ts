import { Op, fn, col, literal, where as sequelizeWhere } from "sequelize";
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

export async function getHotelById(hotelId: number, userId?: number) {
    const hotel = await Hotel.findByPk(hotelId);
    if (!hotel) {
        logger.warn("Hotel not found");
        throw new NotFoundError("Hotel not found");
    }

    const categories = await HotelCategory.findAll({
        where: { hotelId },
        include: [{ model: Category, as: "category" }],
    });

    const images = await HotelImage.findAll({
        where: { hotelId },
        order: [["display_order", "ASC"]],
    });
    return {
        ...hotel.toJSON(),
        categories: categories.map((hc: any) => hc.category),
        images,
        amenities: hotel.amenities || [],
    };
}

export async function getAllHotels(query: any, userId?: number) {
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
    const category = query.category;
    const minPrice = query.minPrice;
    const maxPrice = query.maxPrice;

    const where: any = { deletedAt: null };

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

        const distanceField = literal(`
                ST_Distance_Sphere(
                    POINT(longitude, latitude),
                    POINT(${lng}, ${lat})
                ) / 1000
                `);
        attributes.include = [[distanceField, 'distance']];

        where[Op.and] = [
            sequelizeWhere(distanceField, { [Op.lte]: r })
        ];

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
        limit,
        offset,
    };

    if (attributes.include) {
        findOptions.attributes = attributes;
    }

    // Filter by category slug
    if (category) {
        const categorySlugs = category.split(',').map((s: string) => s.trim());
        const categoryRecords = await Category.findAll({
            where: { slug: { [Op.in]: categorySlugs } },
        });
        const categoryIds = categoryRecords.map((c) => c.id);

        if (categoryIds.length > 0) {
            const hotelIdsInCategory = await HotelCategory.findAll({
                where: { categoryId: { [Op.in]: categoryIds } },
                attributes: ["hotelId"],
                group: ["hotelId"],
            });
            const hotelIds = hotelIdsInCategory.map((hc) => hc.hotelId);
            where.id = { [Op.in]: hotelIds };
        } else {
            // No matching categories, return empty
            return { hotels: [], total: 0, page, limit, totalPages: 0 };
        }
    }

    const { count, rows } = await Hotel.findAndCountAll(findOptions);

    // Enrich hotels with categories, images, likes
    const hotelIds = rows.map((h) => h.id);

    const allHotelCategories = await HotelCategory.findAll({
        where: { hotelId: { [Op.in]: hotelIds } },
        include: [{ model: Category, as: "category" }],
    });

    const allHotelImages = await HotelImage.findAll({
        where: { hotelId: { [Op.in]: hotelIds } },
        order: [["display_order", "ASC"]],
    });

    const hotelsEnriched = rows.map((hotel) => {
        const hotelCategories = allHotelCategories
            .filter((hc) => hc.hotelId === hotel.id)
            .map((hc: any) => hc.category);

        const hotelImages = allHotelImages
            .filter((img) => img.hotelId === hotel.id);

        return {
            ...hotel.toJSON(),
            categories: hotelCategories,
            images: hotelImages,
            amenities: hotel.amenities || []
        };
    });

    logger.info("Hotels fetched", { count: hotelsEnriched.length, total: count });
    return {
        hotels: hotelsEnriched,
        total: count,
        page,
        limit,
        totalPages: Math.ceil(count / limit),
    };
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
