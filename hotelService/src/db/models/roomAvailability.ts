import { DataTypes, Model, CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import sequelize from './sequelize';

class RoomAvailability extends Model<InferAttributes<RoomAvailability>, InferCreationAttributes<RoomAvailability>> {
  declare id: CreationOptional<number>;
  declare roomId: number;
  declare date: Date;
  declare bookingId: number | null;
  declare status: 'available' | 'booked';
  declare createdAt: CreationOptional<Date>;
  declare updatedAt: CreationOptional<Date>;
  declare deletedAt: CreationOptional<Date | null>;
}

RoomAvailability.init(
  {
    id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
    roomId: { type: DataTypes.INTEGER, field: 'room_id', allowNull: false },
    date: { type: DataTypes.DATEONLY, allowNull: false },
    bookingId: { type: DataTypes.INTEGER, field: 'booking_id', allowNull: true },
    status: { type: DataTypes.ENUM('available', 'booked'), defaultValue: 'available' },
    createdAt: { type: DataTypes.DATE, field: 'created_at', defaultValue: DataTypes.NOW },
    updatedAt: { type: DataTypes.DATE, field: 'updated_at', defaultValue: DataTypes.NOW },
    deletedAt: { type: DataTypes.DATE, field: 'deleted_at', allowNull: true, defaultValue: null },
  },
  {
    tableName: 'room_availabilities',
    sequelize,
    timestamps: true,
    underscored: true,
    paranoid: true,
  }
);

export default RoomAvailability;