 
import dotenv from 'dotenv';

type ServerConfig = {
    PORT: number
}

type DBConfig = { 
    DB_HOST :string ,
    DB_USER :string ,
    DB_PASSWORD :string ,
    DB_NAME :string 
}

function loadEnv() {
    dotenv.config();
    console.log(`Environment variables loaded`);
}

loadEnv();

export const serverConfig: ServerConfig = {
    PORT: Number(process.env.PORT) || 3001
};

export const dbConfig: DBConfig = {
    DB_HOST: process.env.DB_HOST!,
    DB_USER: process.env.DB_USER!,
    DB_PASSWORD: process.env.DB_PASSWORD!,
    DB_NAME: process.env.DB_NAME!  
};