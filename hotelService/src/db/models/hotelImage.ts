import {
    DataTypes,
    Model,
    type CreationOptional,
    type InferAttributes,
    type InferCreationAttributes,
} from 'sequelize';
import sequelize from './sequelize';

class HotelImage extends Model<InferAttributes<HotelImage>, InferCreationAttributes<HotelImage>> {
    declare id: CreationOptional<number>;
    declare hotelId: number;
    declare url: string;
    declare altText: string | null;
    declare displayOrder: number;
    declare createdAt: CreationOptional<Date>;
}

HotelImage.init(
    {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true },
        hotelId: { type: DataTypes.INTEGER, allowNull: false, field: 'hotel_id' },
        url: { type: DataTypes.STRING(500), allowNull: false },
        altText: { type: DataTypes.STRING(255), allowNull: true, field: 'alt_text' },
        displayOrder: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0, field: 'display_order' },
        createdAt: { type: DataTypes.DATE, defaultValue: DataTypes.NOW, field: 'created_at' },
    },
    {
        tableName: 'hotel_images',
        sequelize,
        timestamps: false,
        underscored: true,
        indexes: [
            { fields: ['hotel_id'] },
            { fields: ['hotel_id', 'display_order'] },
        ],
    },
);

export default HotelImage;
