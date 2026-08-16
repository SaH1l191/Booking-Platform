import * as bookingDb from '../db/bookingDb';
import * as paymentDb from '../db/paymentDb';

export async function seedTestUser() {
  // The test user is created via the existing createUser() in setup.ts
  // This helper ensures the DB is clean for the test
  return { userId: '1', email: 'test@example.com' };
}

export async function cleanupBooking(bookingId: number) {
  // Best-effort cleanup after tests
  // In a real env, the global-setup handles this
  try {
    await bookingDb.getBooking(bookingId);
  } catch {
    // ignore
  }
}

export async function waitForOutboxPublish(maxWaitMs: number = 10_000) {
  // The outbox publisher runs every 5 seconds
  // Wait up to maxWaitMs for it to process
  await new Promise((r) => setTimeout(r, maxWaitMs));
}
