import {
    DataTypes,
    Model,
    type CreationOptional,
    type InferAttributes,
    type InferCreationAttributes,
} from 'sequelize';
import sequelize from './sequelize';

class HotelCategory extends Model<InferAttributes<HotelCategory>, InferCreationAttributes<HotelCategory>> {
    declare id: CreationOptional<number>;
    declare hotelId: number;
    declare categoryId: number;
    declare createdAt: CreationOptional<Date>;
}

HotelCategory.init(
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        hotelId: { type: DataTypes.INTEGER, allowNull: false, field: 'hotel_id' },
        categoryId: { type: DataTypes.INTEGER, allowNull: false, field: 'category_id' },
        createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
    },
    {
        tableName: 'hotel_categories',
        sequelize,
        timestamps: false,
        underscored: true,
        indexes: [
            { fields: ['hotel_id', 'category_id'], unique: true },
            { fields: ['hotel_id'] },
            { fields: ['category_id'] },
        ],
    },
);

export default HotelCategory;
