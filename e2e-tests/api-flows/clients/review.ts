const BASE = process.env.REVIEW_SERVICE_URL || 'http://localhost:3004';

function headers(userId: string, email: string, role: string = 'customer'): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'X-User-ID': userId,
    'X-User-Email': email,
    'X-User-Role': role,
  };
}

export async function createReview(
  data: { user_id: number; booking_id: number; hotel_id: number; comment: string; rating: number },
  userId: string,
  email: string,
) {
  const res = await fetch(`${BASE}/reviews/`, {
    method: 'POST',
    headers: headers(userId, email),
    body: JSON.stringify(data),
  });
  const body = await res.json();
  return { status: res.status, data: body };
}

export async function getReviewsByBookingId(bookingId: number) {
  const res = await fetch(`${BASE}/reviews/booking/${bookingId}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  const body = await res.json();
  return { status: res.status, data: body };
}

export async function getReviewsByHotelId(hotelId: number) {
  const res = await fetch(`${BASE}/reviews/hotels/${hotelId}`, {
    headers: { 'Content-Type': 'application/json' },
  });
  const body = await res.json();
  return { status: res.status, data: body };
}

export async function healthCheck() {
  const res = await fetch(`${BASE}/health`);
  return res.ok;
}
