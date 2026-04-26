import { createHotelDto } from "../dto/hotel.dto";
import { createHotel, deleteHotel, getAllHotels, getHotelById, updateHotel } from "../repositories/hotel.repository";
import { BadRequestError } from "../utils/errors/app.error";


const blockListedAddresses = [
    "123 Fake Street, Springfield",
    "456 Imaginary Road, Gotham",
    "789 Nonexistent Ave, Metropolis"
];

export async function createHotelService(hotelData: createHotelDto) {
    if(blockListedAddresses.includes(hotelData.address)){
        throw new BadRequestError("Address is blocklisted");
    }
    const hotel = await createHotel(hotelData)
    return hotel;
}
export async function getHotelByIdService(hotelId: number) {
    const hotel = await getHotelById(hotelId)
    return hotel;
}

export async function getAllHotelsService() {
    const hotels = await getAllHotels();
    return hotels;
}

export async function updateHotelService(hotelId: number, hotelData: createHotelDto) {
    if(blockListedAddresses.includes(hotelData.address)){
        throw new BadRequestError("Address is blocklisted");
    }
    const updatedHotel = await updateHotel(hotelId, hotelData); 
  return updatedHotel;
    
}

export async function deleteHotelService(hotelId: number) {
    const deletedHotel = await deleteHotel(hotelId);
    return deletedHotel;
}