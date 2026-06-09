import logger from "../config/logger";
import HotelImage from "../db/models/hotelImage";
import { createHotelImageDto } from "../dto/hotelImage.dto";
import { NotFoundError } from "../utils/errors/app.error";

export async function createHotelImage(data: createHotelImageDto) {
    const image = await HotelImage.create({
        hotelId: data.hotelId,
        url: data.url,
        altText: data.altText || null,
        displayOrder: data.displayOrder || 0,
    });
    return image;
}

export async function getHotelImageById(id: number) {
    const image = await HotelImage.findByPk(id);
    if (!image) {
        throw new NotFoundError("Hotel image not found");
    }
    return image;
}

export async function getImagesByHotelId(hotelId: number) {
    const images = await HotelImage.findAll({
        where: { hotelId },
        order: [["display_order", "ASC"]],
    });
    return images;
}

export async function updateHotelImage(id: number, data: Partial<createHotelImageDto>) {
    const image = await getHotelImageById(id);
    if (data.url) image.url = data.url;
    if (data.altText !== undefined) image.altText = data.altText;
    if (data.displayOrder !== undefined) image.displayOrder = data.displayOrder;
    await image.save();
    return image;
}

export async function deleteHotelImage(id: number) {
    const image = await getHotelImageById(id);
    await image.destroy();
    return image;
}

export async function deleteImagesByHotelId(hotelId: number) {
    await HotelImage.destroy({ where: { hotelId } });
}
