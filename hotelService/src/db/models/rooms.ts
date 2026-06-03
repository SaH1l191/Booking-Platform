import { DataTypes, Model, CreationOptional, InferAttributes, InferCreationAttributes } from 'sequelize';
import sequelize from './sequelize';

class Room extends Model<InferAttributes<Room>, InferCreationAttributes<Room>> {
    declare id: CreationOptional<number>;
    declare roomCategoryId: number | null;
    declare hotelId: number | null;
    declare roomNo: number;
    declare bookingId: number | null;
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
    declare deletedAt: CreationOptional<Date | null>;
}

Room.init(
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        roomCategoryId: { type: DataTypes.INTEGER, field: 'room_category_id', allowNull: true },
        hotelId: { type: DataTypes.INTEGER, field: 'hotel_id', allowNull: true },
        roomNo: { type: DataTypes.INTEGER, field: 'room_no', allowNull: false },
        bookingId: { type: DataTypes.INTEGER, field: 'booking_id', allowNull: true },
        createdAt: { type: DataTypes.DATE, field: 'created_at', defaultValue: DataTypes.NOW },
        updatedAt: { type: DataTypes.DATE, field: 'updated_at', defaultValue: DataTypes.NOW },
        deletedAt: { type: DataTypes.DATE, field: 'deleted_at', allowNull: true, defaultValue: null },
    },
    {
        tableName: 'rooms',
        sequelize,
        timestamps: true,
        underscored: true,
        indexes: [
            { fields: ['hotel_id', 'room_no'], unique: true },
            { fields: ['hotel_id'] },
            { fields: ['room_category_id'] },
            { fields: ['hotel_id', 'deleted_at'] }
        ]

        //          rooms             │ hotel_id            │ Essential for fetching all rooms in a specific hotel.                            │
        //   │ rooms             │ room_category_id    │ Essential for filtering rooms by their type (Single, Deluxe, etc.).              │
        //   │ rooms             │ (hotel_id, room_no) │ Unique Index: Prevents two rooms in the same hotel from having the same room     │
        //   │                   │                     │ number.                                                                          │
        //   │ rooms             │ (hotel_id,          │ Optimizes fetching active rooms for a hotel (since soft deletes are used).  
    }
);

export default Room;