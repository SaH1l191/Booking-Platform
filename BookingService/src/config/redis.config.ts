import IORedis, { Redis } from 'ioredis';
import Redlock from "redlock";
import { serverConfig } from "./index";
import logger from './logger';
 
function connectToRedis() {
    try {
        let connection: Redis | null = null;

        return () => {
            if (!connection) { 
                connection = new IORedis(serverConfig.REDIS_SERVER_URL,{ maxRetriesPerRequest: null,});
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
 
export const redlock = new Redlock([redisClient as any], {
    driftFactor: 0.01,
    retryCount: 10,
    retryDelay: 200,
    retryJitter: 200
});
