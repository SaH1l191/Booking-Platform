import Hotel from "./hotel";
import HotelCategory from "./hotelCategory";
import Category from "./category";
import HotelImage from "./hotelImage";
import RoomCategory from "./roomCategory";
import Room from "./rooms";

Hotel.hasMany(HotelCategory, { foreignKey: "hotelId", as: "hotelCategories" });
HotelCategory.belongsTo(Hotel, { foreignKey: "hotelId", as: "hotel" });

HotelCategory.belongsTo(Category, { foreignKey: "categoryId", as: "category" });
Category.belongsToMany(Hotel, { through: HotelCategory, foreignKey: "categoryId", otherKey: "hotelId", as: "hotels" });
Hotel.belongsToMany(Category, { through: HotelCategory, foreignKey: "hotelId", otherKey: "categoryId", as: "categories" });

Hotel.hasMany(HotelImage, { foreignKey: "hotelId", as: "images" });
HotelImage.belongsTo(Hotel, { foreignKey: "hotelId", as: "hotel" });

Hotel.hasMany(RoomCategory, { foreignKey: "hotelId", as: "roomCategories" });
RoomCategory.belongsTo(Hotel, { foreignKey: "hotelId", as: "hotel" });

RoomCategory.hasMany(Room, { foreignKey: "roomCategoryId", as: "rooms" });
Room.belongsTo(RoomCategory, { foreignKey: "roomCategoryId", as: "roomCategory" });