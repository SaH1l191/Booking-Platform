import { prisma } from "../lib/prisma";
import { getRabbitMQChannel } from "../queues/event-queue";
import logger from "../config/logger";



// If  tried to publish to RabbitMQ directly inside the transaction and RabbitMQ was down, the whole transaction would fail.
//  The outbox decouples it — the transaction only writes to the local DB (always succeeds), and the publisher handles delivery asynchronously.
//  If the server crashes between commit and publish, the publisher picks it up on restart.
// In short: DB transaction guarantees atomicity of data + event. Publisher guarantees eventual delivery of the event.



const POLL_INTERVAL_MS = 5000;

let isRunning = false;

export function startOutboxPublisher() {
    if (isRunning) return;
    isRunning = true;
    logger.info("Booking outbox publisher started");
    poll();
}

function poll() {
    if (!isRunning) return;
    setTimeout(async () => {
        await processPendingEvents();
        poll();
    }, POLL_INTERVAL_MS);
}

async function processPendingEvents() {
    try {
        await prisma.$transaction(async (tx: any) => {
            const events = await tx.outbox.findMany({
                where: { published: false },
                orderBy: { createdAt: 'asc' },
                take: 50,
            });

            if (events.length === 0) return;

            const channel = await getRabbitMQChannel();
            await channel.assertExchange("booking_events_exchange", "fanout", { durable: true });

            for (const event of events) {
                const message = {
                    eventType: event.eventType,
                    payload: event.payload,
                };

                const sent = channel.publish("booking_events_exchange", "", Buffer.from(JSON.stringify(message)), {
                    persistent: true,
                    contentType: 'application/json',
                });

                if (sent) {
                    await tx.outbox.update({
                        where: { id: event.id },
                        data: { published: true },
                    });
                    logger.info("Booking outbox event published", { eventId: event.id, eventType: event.eventType });
                } else {
                    logger.warn("Channel buffer full, stopping outbox processing", { eventId: event.id });
                    break;
                }
            }
        });
    } catch (error) {
        logger.error("Failed to process booking outbox", { error: (error as Error).message });
    }
}


