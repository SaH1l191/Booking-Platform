import logger from "../config/logger";
import { expireStaleBookings } from "../repositories/booking.repository";

const POLL_INTERVAL_MS = 60_000;
let isRunning = false;

export function startBookingExpiryWorker() {
    if (isRunning) return;
    isRunning = true;
    logger.info("Booking expiry worker started", { pollInterval: POLL_INTERVAL_MS });
    poll();
}

export function stopBookingExpiryWorker() {
    isRunning = false;
    logger.info("Booking expiry worker stopped");
}

function poll() {
    if (!isRunning) return;
    setTimeout(async () => {
        try {
            await expireStaleBookings();
        } catch (error) {
            logger.error("Error in booking expiry worker", { error: (error as Error).message });
        }
        poll();
    }, POLL_INTERVAL_MS);
}