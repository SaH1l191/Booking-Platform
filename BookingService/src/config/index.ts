
import dotenv from 'dotenv';
type ServerConfig = {
    BOOKING_EXPIRY_MS: number;
    port: number;
    REDIS_SERVER_URL: string;
    REDLOCK_TTL: number;
    REDIS_LOCK_TTL: number;
}
function loadEnv(){
    dotenv.config({quiet: true});
}

loadEnv();
export const serverConfig: ServerConfig = {
    port: Number(process.env.PORT) || 3001 ,
    REDIS_SERVER_URL: process.env.REDIS_SERVER_URL || "redis://localhost:6379",
    REDLOCK_TTL: Number(process.env.REDLOCK_TTL) || 900000,
    REDIS_LOCK_TTL: Number(process.env.REDIS_LOCK_TTL) || 900000,
    BOOKING_EXPIRY_MS: Number(process.env.BOOKING_EXPIRY_MS) || 900000 // 15 min hold
}