import IORedis, { Redis } from 'ioredis';
import { serverConfig } from "./index.js";
import logger from './logger';
 
function connectToRedis() {
    try {
        let connection: Redis | null = null;

        return () => {
            if (!connection) { 
                connection = new IORedis(serverConfig.REDIS_SERVER_URL);
            }
            return connection;
        };
    } catch (error) {
        logger.error("Error connecting to Redis", { error: (error as Error).message });
        throw error;
    }
}
 
export const getRedisConnObject = connectToRedis();
 
export const redisClient = getRedisConnObject();
