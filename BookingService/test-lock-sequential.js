const BASE = "http://localhost:3002/api/v1/bookings";
const TOKEN_USER1 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImZyYW5rQGV4YW1wbGUuY29tIiwiZXhwIjoxNzgxMjQzNDQwLCJyb2xlcyI6WyJjdXN0b21lciJdLCJ0eXBlIjoiYWNjZXNzIiwidXNlcklkIjo2MywidXNlcm5hbWUiOiJmcmFuayJ9.9-e27FBPFhddV3srW8jf4Zs3H4jpZy9FPHHqxS9gJWw";
const TOKEN_USER2 = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJlbWFpbCI6ImdyYWNlQGV4YW1wbGUuY29tIiwiZXhwIjoxNzgxMjQzNDgxLCJyb2xlcyI6WyJjdXN0b21lciJdLCJ0eXBlIjoiYWNjZXNzIiwidXNlcklkIjo2NCwidXNlcm5hbWUiOiJncmFjZSJ9.7YOfNjt-Oi2Lp1EBVAtyrXwa5mcKAkxhDqQy1YYoZ3c";

const booking1 = {
  hotelId: 1, roomId: 1, totalGuests: 2, bookingAmount: 5000,
  checkIn: "2026-07-10", checkOut: "2026-07-15",
};

const booking2 = {
  hotelId: 1, roomId: 1, totalGuests: 1, bookingAmount: 4500,
  checkIn: "2026-07-12", checkOut: "2026-07-18",
};

async function createBooking(booking, label, token) {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(booking),
  });
  const data = await res.json();
  console.log(`[${label}] Status ${res.status} -`, JSON.stringify(data));
  return data;
}

(async () => {
  console.log("=== Sequential Test ===");
  console.log("User1 reserves Jul 10-15 (PENDING)");
  console.log("Wait 1s...");
  console.log("User2 tries Jul 12-18 (should fail - overlap with User1's PENDING)\n");

  await createBooking(booking1, "User1", TOKEN_USER1);

  console.log("\n... waiting 1 second ...\n");
  await new Promise(r => setTimeout(r, 1000));

  await createBooking(booking2, "User2", TOKEN_USER2);

  console.log("\n=== Done ===");
})();
