import amqp from 'amqplib';
import logger from '../config/logger';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

let channel: amqp.Channel | null = null;

export async function getRabbitMQChannel(){
    if (channel) return channel;

    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    logger.info('Connected to RabbitMQ');
    return channel;
}
