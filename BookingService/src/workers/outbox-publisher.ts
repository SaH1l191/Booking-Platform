import { prisma } from "../lib/prisma";
import { getRabbitMQChannel } from "../queues/event-queue";
import logger from "../config/logger";

// The outbox decouples publish from transaction — the transaction only writes to the local DB,
// and the publisher handles delivery asynchronously.

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
        const events = await prisma.$transaction(async (tx: any) => {
            return await tx.$queryRaw`
                SELECT * FROM outbox
                WHERE published = false
                ORDER BY \`createdAt\` ASC
                LIMIT 50
                FOR UPDATE SKIP LOCKED
            `;
        });

        if (!events || events.length === 0) return;

        const channel = await getRabbitMQChannel();
        await channel.assertExchange("booking_events_exchange", "fanout", { durable: true });

        const publishedIds: number[] = [];
        for (const event of events) {
            const message = {
                eventId: event.eventId,
                eventType: event.eventType,
                payload: event.payload,
            };

            const sent = channel.publish(
                "booking_events_exchange",
                "",
                Buffer.from(JSON.stringify(message)),
                { persistent: true, contentType: 'application/json' }
            );

            if (sent) {
                publishedIds.push(event.id);
                logger.info("Booking outbox event published", { eventId: event.id, eventType: event.eventType });
            } else {
                logger.warn("Channel buffer full, stopping outbox processing", { eventId: event.id });
                break;
            }
        }

        if (publishedIds.length > 0) {
            await prisma.$transaction(async (tx: any) => {
                await tx.outbox.updateMany({
                    where: { id: { in: publishedIds } },
                    data: { published: true },
                });
            });
        }
        // consumer should dedup this msg in case of crash after publish but before marking as published
    } catch (error) {
        logger.error("Failed to process booking outbox", { error: (error as Error).message });
    }
}
