const BASE = "http://localhost:3002/api/v1/bookings";
const TOKEN_USER1 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImZyYW5rQGV4YW1wbGUuY29tIiwiZXhwIjoxNzgxMjQzNDQwLCJyb2xlcyI6WyJjdXN0b21lciJdLCJ0eXBlIjoiYWNjZXNzIiwidXNlcklkIjo2MywidXNlcm5hbWUiOiJmcmFuayJ9.9-e27FBPFhddV3srW8jf4Zs3H4jpZy9FPHHqxS9gJWw";
const TOKEN_USER2 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImdyYWNlQGV4YW1wbGUuY29tIiwiZXhwIjoxNzgxMjQzNDgxLCJyb2xlcyI6WyJjdXN0b21lciJdLCJ0eXBlIjoiYWNjZXNzIiwidXNlcklkIjo2NCwidXNlcm5hbWUiOiJncmFjZSJ9.7YOfNjt-Oi2Lp1EBVAtyrXwa5mcKAkxhDqQy1YYoZ3c";

const booking1 = {
  hotelId: 1,
  roomId: 1,
  totalGuests: 2,
  bookingAmount: 5000,
  checkIn: "2026-07-01",
  checkOut: "2026-07-05",
};

const booking2 = {
  hotelId: 1,
  roomId: 1,
  totalGuests: 1,
  bookingAmount: 4500,
  checkIn: "2026-07-03",
  checkOut: "2026-07-07",
};

async function createBooking(booking, label, token) {
  const start = Date.now();
  console.log(`[${label}] Sending request...`);
  try {
    const res = await fetch(BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
      body: JSON.stringify(booking),
    });
    const data = await res.json();
    const elapsed = Date.now() - start;
    console.log(`[${label}] ${elapsed}ms - Status ${res.status} -`, JSON.stringify(data));
  } catch (err) {
    console.log(`[${label}] ERROR -`, err.message);
  }
}

(async () => {
  console.log("=== Lock Test: 2 concurrent bookings for same room, overlapping dates ===");
  console.log("User1 (frank): Jul 1-5 | User2 (grace): Jul 3-7 (overlap on Jul 3-4)");
  console.log("Expected: one succeeds, one fails with conflict\n");

  await Promise.allSettled([
    createBooking(booking1, "User1", TOKEN_USER1),
    createBooking(booking2, "User2", TOKEN_USER2),
  ]);

  console.log("\n=== Done ===");
})();
