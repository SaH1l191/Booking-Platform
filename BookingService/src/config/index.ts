
import dotenv from 'dotenv';
type ServerConfig = {
    BOOKING_EXPIRY_MS: number;
    port: number;
    REDIS_SERVER_URL: string;
    LOCK_TTL: number;
}
function loadEnv(){
    dotenv.config({quiet: true});
}

loadEnv();
export const serverConfig: ServerConfig = {
    port: Number(process.env.PORT) || 3001 ,
    REDIS_SERVER_URL: process.env.REDIS_SERVER_URL || "redis://localhost:6379",
    LOCK_TTL: Number(process.env.LOCK_TTL) || 900000,
    BOOKING_EXPIRY_MS: Number(process.env.BOOKING_EXPIRY_MS) || 900000
}