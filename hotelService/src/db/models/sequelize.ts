import { Sequelize } from "sequelize";
import { dbConfig } from "../../config";




const sequelize = new Sequelize({
    dialect : 'mysql',
    host : dbConfig.DB_HOST,
    username : dbConfig.DB_USER,
    password : dbConfig.DB_PASSWORD,
    database : dbConfig.DB_NAME, 
    pool : {
        max : 5,
        min : 0,
        acquire : 30000,
        idle : 10000
    }
})
export default sequelize;