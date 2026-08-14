// 'SINGLE', 'DOUBLE', 'FAMILY', 'DELUXE', 'SUITE'
enum RoomType {
  SINGLE = 'SINGLE',
  DOUBLE = 'DOUBLE',
  FAMILY = 'FAMILY',
  DELUXE = 'DELUXE',
  SUITE = 'SUITE'
}

export type createRoomCategoryDto ={
    roomType:RoomType;
    price: number;
    hotelId: number;
    roomCount : number;
}