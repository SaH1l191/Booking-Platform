import dotenv from 'dotenv';

type ServerConfig = {
    PORT: number
}

export function loadEnv() {
    dotenv.config();
    console.log(`Environment variables loaded`);
}

loadEnv(); 

export const dbConfig = {
    development: { 
        username : process.env.DB_USER,
        password : process.env.DB_PASSWORD,
        database : process.env.DB_NAME,
        host : process.env.DB_HOST,
        dialect : process.env.DB_DIALECT,
    },
}
export const serverConfig: ServerConfig = {
    PORT: Number(process.env.PORT) || 3000
};