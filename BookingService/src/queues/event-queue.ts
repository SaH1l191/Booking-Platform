import amqp, { ChannelModel } from 'amqplib';
import logger from '../config/logger';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

let connection: ChannelModel | null = null;
let channel: amqp.Channel | null = null;

export async function getRabbitMQChannel(): Promise<amqp.Channel> {
    if (channel) return channel;

    connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    logger.info('Connected to RabbitMQ');
    return channel;
}

export async function closeRabbitMQ() {
    try {
        if (channel) {
            await channel.close();
            channel = null;
        }
        if (connection) {
            await connection.close();
            connection = null;
        }
        logger.info('RabbitMQ connection closed');
    } catch (error) {
        logger.error('Error closing RabbitMQ connection', { error: (error as Error).message });
    }
}
