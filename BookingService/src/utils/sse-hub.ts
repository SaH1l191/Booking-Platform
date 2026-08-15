import { EventEmitter } from "events";
import logger from "../config/logger";

const emitter = new EventEmitter();
emitter.setMaxListeners(0);

export interface BookingEvent {
  type: "booking.confirmed" | "booking.cancelled" | "booking.expired";
  bookingId: number;
  status: string;
}

export function subscribeBooking(userId: number, callback: (event: BookingEvent) => void): () => void {
  const key = String(userId);
  const listener = (event: BookingEvent) => callback(event);
  emitter.on(key, listener);
  return () => {
    emitter.removeListener(key, listener);
  };
}

export function emitBookingEvent(userId: number, event: BookingEvent) {
  const key = String(userId);
  logger.info("Emitting SSE booking event", { userId, type: event.type, bookingId: event.bookingId });
  emitter.emit(key, event);
}
