import amqp from 'amqplib';

const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://localhost:5672';

let channel: amqp.Channel | null = null;

export async function getRabbitMQChannel(){
    if (channel) return channel;

    const connection = await amqp.connect(RABBITMQ_URL);
    channel = await connection.createChannel();

    console.log('Connected to RabbitMQ');
    return channel;
}
