import IORedis, { Redis } from 'ioredis';
import { serverConfig } from "./index";

 
//singleton pattern
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
        console.error('Error connecting to Redis:', error);
        throw error;
    }
}

export const getRedisConnObject = connectToRedis();
 
export const redisClient = getRedisConnObject();
