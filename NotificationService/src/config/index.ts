 
import dotenv from 'dotenv';
import logger from './logger';

type ServerConfig = {
    PORT: number,
    REDIS_HOST: string,
    REDIS_PORT: number
    MAIL_USER: string
    MAIL_PASS: string
    REDIS_SERVER_URL: string
}

type DBConfig = { 
    DB_HOST :string ,
    DB_USER :string ,
    DB_PASSWORD :string ,
    DB_NAME :string 
}

function loadEnv() {
    dotenv.config();
    logger.info("Environment variables loaded");
}

loadEnv();

export const serverConfig: ServerConfig = {
    PORT: Number(process.env.PORT) || 3001 ,
    REDIS_HOST: process.env.REDIS_HOST!,
    REDIS_PORT: Number(process.env.REDIS_PORT) || 6379,
    MAIL_USER  : process.env.MAIL_USER!,
    MAIL_PASS  : process.env.MAIL_PASS!,
    REDIS_SERVER_URL : process.env.REDIS_SERVER_URL!
};

export const dbConfig: DBConfig = {
    DB_HOST: process.env.DB_HOST!,
    DB_USER: process.env.DB_USER!,
    DB_PASSWORD: process.env.DB_PASSWORD!,
    DB_NAME: process.env.DB_NAME!  
};
