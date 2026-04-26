import { Sequelize } from "sequelize";
import { dbConfig } from "../../config";




const sequelize = new Sequelize({
    dialect : 'mysql',
    host : dbConfig.DB_HOST,
    username : dbConfig.DB_USER,
    password : dbConfig.DB_PASSWORD,
    database : 'airbnb_development', 
})
export default sequelize;