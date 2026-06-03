import {
    DataTypes,
    Model,
    type CreationOptional,
    type InferAttributes,
    type InferCreationAttributes,
} from 'sequelize';
import sequelize from './sequelize';

class Hotel extends Model<InferAttributes<Hotel>, InferCreationAttributes<Hotel>> {
    declare id: CreationOptional<number>;
    declare name: string;
    declare address: string;
    declare location: string;
    declare latitude: number | null;
    declare longitude: number | null;
    declare coordinates: any | null; // GEOMETRY('POINT')
    declare createdAt: CreationOptional<Date>;
    declare updatedAt: CreationOptional<Date>;
    declare rating: number;
    declare ratingCount: number;
    declare deletedAt: CreationOptional<Date | null>;
}

Hotel.init(
    {
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true,
        },
        name: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        address: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        location: {
            type: DataTypes.STRING,
            allowNull: false,
        },
        latitude: {
            type: DataTypes.DECIMAL(10, 8),
            allowNull: true,
        },
        longitude: {
            type: DataTypes.DECIMAL(11, 8),
            allowNull: true,
        },
        coordinates: {
            type: DataTypes.GEOMETRY('POINT'),
            allowNull: true,
        },
        rating: {
            type: DataTypes.FLOAT,
            defaultValue: 0,
        },
        ratingCount: {
            type: DataTypes.INTEGER,
            defaultValue: 0
        },
        createdAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        updatedAt: {
            type: DataTypes.DATE,
            defaultValue: DataTypes.NOW
        },
        deletedAt: {
            type: DataTypes.DATE,
            allowNull: true,
            defaultValue: null
        }
    },
    {
        tableName: 'hotels',
        sequelize,
        timestamps: true,
        underscored: true, //converts deletedAt to deleted_at in the db
        indexes: [
            { fields: ['deleted_at'] },
            { fields: ['coordinates'], type: 'SPATIAL' }
        ]
    },
);

export default Hotel;

//insert data : 
// await Hotel.create({
//     name: "Grand Hotel",
//     address: "123 Main St",
//     // GeoJSON: [Longitude, Latitude]
//     location: {
//         type: 'Point',
//         coordinates: [-73.9857, 40.7484], 
//         crs: { type: 'name', properties: { name: 'EPSG:4326' } }
//     }
// });


//query within radius 
// const hotels = await Hotel.findAll({
//     attributes: {
//         include: [
//             [
//                 fn('ST_Distance_Sphere', col('location'), literal(`ST_GeomFromText('POINT(${userLng} ${userLat})', 4326)`)),
//                 'distance'
//             ]
//         ]
//     },
//     where: where(
//         fn('ST_Distance_Sphere', col('location'), literal(`ST_GeomFromText('POINT(${userLng} ${userLat})', 4326)`)),
//         { [Op.lte]: maxDistance }
//     ),
//     order: [[literal('distance'), 'ASC']]
// });

