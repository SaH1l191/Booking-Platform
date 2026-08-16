const BASE = process.env.BOOKING_SERVICE_URL || 'http://localhost:3002';

function headers(userId: string, email: string, role: string = 'customer'): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-user-id': userId,
    'x-user-email': email,
    'x-user-role': role,
  };
}

export async function createBooking(
  data: {
    hotelId: number;
    roomId: number;
    totalGuests: number;
    checkIn: string;
    checkOut: string;
    idempotencyKey?: string;
  },
  userId: string,
  email: string,
) {
  const res = await fetch(`${BASE}/api/v1/bookings/`, {
    method: 'POST',
    headers: headers(userId, email),
    body: JSON.stringify(data),
  });
  const body = await res.json();
  return { status: res.status, data: body };
}

export async function getBooking(bookingId: number, userId: string, email: string) {
  const res = await fetch(`${BASE}/api/v1/bookings/${bookingId}`, {
    headers: headers(userId, email),
  });
  const body = await res.json();
  return { status: res.status, data: body };
}

export async function cancelBooking(bookingId: number, userId: string, email: string) {
  const res = await fetch(`${BASE}/api/v1/bookings/cancel/${bookingId}`, {
    method: 'PATCH',
    headers: headers(userId, email),
  });
  const body = await res.json();
  return { status: res.status, data: body };
}

export async function checkAvailability(
  params: { hotelId: number; roomId: number; checkIn: string; checkOut: string },
  userId: string,
  email: string,
) {
  const qs = new URLSearchParams({
    hotelId: String(params.hotelId),
    roomId: String(params.roomId),
    checkIn: params.checkIn,
    checkOut: params.checkOut,
  });
  const res = await fetch(`${BASE}/api/v1/bookings/availability?${qs}`, {
    headers: headers(userId, email),
  });
  const body = await res.json();
  return { status: res.status, data: body };
}

export async function listMyBookings(userId: string, email: string) {
  const res = await fetch(`${BASE}/api/v1/bookings/me`, {
    headers: headers(userId, email),
  });
  const body = await res.json();
  return { status: res.status, data: body };
}

export async function healthCheck() {
  const res = await fetch(`${BASE}/health`);
  return res.ok;
}
