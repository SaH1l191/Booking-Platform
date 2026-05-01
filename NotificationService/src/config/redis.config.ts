import Redis from "ioredis";
import { serverConfig } from ".";

let redisConnection: Redis | null = null;

//singleton pattern
export const getRedis = (): Redis => {
    if (!redisConnection) {
        try {
            redisConnection = new Redis({
                port: serverConfig.REDIS_PORT,
                host: serverConfig.REDIS_HOST,
                maxRetriesPerRequest : null,
            });
            redisConnection.on('error', (error) => {
                console.error('Redis connection error:', error);
            });
            console.log('Connected to Redis successfully');
        } catch (error) {
            console.error('Unable to connect to Redis:', error);
            throw error;
        }
    }
    return redisConnection;
}