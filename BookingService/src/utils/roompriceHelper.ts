import axios from "axios";
import { serverConfig } from "../config/index";
import { BadRequestError } from "../utils/errors/app.error";
import logger from "../config/logger";

// Price must come from here, never from the client. Before this existed,
// createBookingService took `bookingAmount` directly from the request body
// (see booking.validator.ts's old `bookingAmount: z.number().min(1)`) — any
// caller could set the total to whatever they wanted regardless of the
// room's actual price, since nothing checked it against hotelService.
export async function getRoomPricePerNight(hotelId: number, roomId: number, requestUserId: string | number): Promise<number> {
    try {
        const response = await axios.get(
            `${serverConfig.HOTEL_SERVICE_URL}/api/v1/rooms/${roomId}`,
            {
                headers: { "x-user-id": String(requestUserId) },
                timeout: 5000,
            }
        );

        const room = response.data?.data;
        if (!room || room.hotelId !== hotelId) {
            throw new BadRequestError("Room not found for the selected hotel");
        }
        const price = room.roomCategory?.price;
        if (typeof price !== "number" || price <= 0) {
            logger.error("Room has no valid category price", { hotelId, roomId });
            throw new BadRequestError("Selected room has no valid price configured");
        }
        return price;
    } catch (error: any) {
        if (error instanceof BadRequestError) throw error;
        logger.error("Failed to fetch room price from hotelService", { hotelId, roomId, error: error.message });
        throw new BadRequestError("Unable to verify room price — please try again");
    }
}