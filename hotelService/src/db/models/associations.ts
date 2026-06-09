import Hotel from "./hotel";
import HotelCategory from "./hotelCategory";
import Category from "./category";
import HotelImage from "./hotelImage";

HotelCategory.belongsTo(Category, { foreignKey: "categoryId", as: "category" });
Category.belongsToMany(Hotel, { through: HotelCategory, foreignKey: "categoryId", otherKey: "hotelId", as: "hotels" });
Hotel.belongsToMany(Category, { through: HotelCategory, foreignKey: "hotelId", otherKey: "categoryId", as: "categories" });

Hotel.hasMany(HotelImage, { foreignKey: "hotelId", as: "images" });
HotelImage.belongsTo(Hotel, { foreignKey: "hotelId", as: "hotel" });

