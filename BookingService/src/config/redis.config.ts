import IORedis, { Redis } from 'ioredis';
import Redlock from "redlock";
import { serverConfig } from "./index";
 
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
        console.error('Error connecting to Redis:', error);
        throw error;
    }
}
 
export const getRedisConnObject = connectToRedis();
 
const redisClient = getRedisConnObject();
 
export const redlock = new Redlock([redisClient as any], {
    driftFactor: 0.01,
    retryCount: 10,
    retryDelay: 200,
    retryJitter: 200
});