 
import dotenv from 'dotenv';

type ServerConfig = {
    PORT: number
    REDIS_SERVER_URL:string
    LOCK_TTL: number

}

type DBConfig = { 
    DB_HOST :string ,
    DB_USER :string ,
    DB_PASSWORD :string ,
    DB_NAME :string 
}

function loadEnv() {
    dotenv.config({quiet: true});
    console.log(`Environment variables loaded`);
}

loadEnv();

export const serverConfig: ServerConfig = {
    PORT: Number(process.env.PORT) || 3000,
    REDIS_SERVER_URL: process.env.REDIS_SERVER_URL || "redis://localhost:6379",
    LOCK_TTL: Number(process.env.LOCK_TTL) || 900000
};

export const dbConfig: DBConfig = {
    DB_HOST: process.env.DB_HOST!,
    DB_USER: process.env.DB_USER!,
    DB_PASSWORD: process.env.DB_PASSWORD!,
    DB_NAME: process.env.DB_DATABASE!  
};