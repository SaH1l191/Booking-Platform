import { createHotelDto } from "../dto/hotel.dto";
import { createHotel, deleteHotel, getAllHotels, getHotelById, updateHotel } from "../repositories/hotel.repository"; 

export async function createHotelService(hotelData: createHotelDto) {

    if (hotelData.latitude === undefined || hotelData.longitude === undefined) {
        console.log("Geocoding location", { location: hotelData.location }); 
    } 
    const hotel = await createHotel(hotelData)
    return hotel;
}

export async function getHotelByIdService(hotelId: number) {
    const hotel = await getHotelById(hotelId)
    return hotel;
}

export async function getAllHotelsService(query: any) {
    console.log("Searching hotels", { search: query.search, category: query.category });
    const hotels = await getAllHotels(query);
    return hotels;
}

export async function updateHotelService(hotelId: number, hotelData: Partial<createHotelDto>) {

    if (hotelData.location && hotelData.latitude === undefined && hotelData.longitude === undefined) {
        console.log("Geocoding updated location", { location: hotelData.location });
    }
    const updatedHotel = await updateHotel(hotelId, hotelData); 
    return updatedHotel;
}

export async function deleteHotelService(hotelId: number) {
    const deletedHotel = await deleteHotel(hotelId);
    return deletedHotel;
}
