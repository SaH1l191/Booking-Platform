import { DataTypes, Model, CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import sequelize from './sequelize';

type RoomType = 'SINGLE' | 'DOUBLE' | 'FAMILY' | 'DELUXE' | 'SUITE';

class RoomCategory extends Model<InferAttributes<RoomCategory>, InferCreationAttributes<RoomCategory>> {
  declare id: CreationOptional<number>;
  declare roomType: RoomType;
  declare price: number;
  declare hotelId: number | null;
  declare roomCount: number;
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
}

RoomCategory.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    roomType: { type: DataTypes.ENUM('SINGLE', 'DOUBLE', 'FAMILY', 'DELUXE', 'SUITE'), field: 'room_type', allowNull: false },
    price: { type: DataTypes.INTEGER, allowNull: false },
    hotelId: { type: DataTypes.INTEGER, field: 'hotel_id', allowNull: true },
    roomCount: { type: DataTypes.INTEGER, field: 'room_count', allowNull: false },
    createdAt: { type: DataTypes.DATE, field: 'created_at', defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at', defaultValue: DataTypes.NOW },
    deletedAt: { type: DataTypes.DATE, field: 'deleted_at', allowNull: true, defaultValue: null },
  },
  {
    tableName: 'room_categories',
    sequelize,
    timestamps: true,
    underscored: true, 
  }
);

export default RoomCategory;