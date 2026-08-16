const BASE = process.env.PAYMENT_SERVICE_URL || 'http://localhost:3005';

function headers(userId: string, email: string, role: string = 'customer'): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-user-id': userId,
    'x-user-email': email,
    'x-user-role': role,
  };
}

export async function createOrder(
  data: { bookingId: number; amount: number },
  userId: string,
  email: string,
) {
  const res = await fetch(`${BASE}/payments/create-order`, {
    method: 'POST',
    headers: headers(userId, email),
    body: JSON.stringify(data),
  });
  const body = await res.json();
  return { status: res.status, data: body };
}

export async function verifyPayment(
  data: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    bookingId: number;
  },
  userId: string,
  email: string,
) {
  const res = await fetch(`${BASE}/payments/verify`, {
    method: 'POST',
    headers: headers(userId, email),
    body: JSON.stringify(data),
  });
  const body = await res.json();
  return { status: res.status, data: body };
}

export async function getPaymentByBookingId(bookingId: number, userId: string, email: string) {
  const res = await fetch(`${BASE}/payments/booking/${bookingId}`, {
    headers: headers(userId, email),
  });
  const body = await res.json();
  return { status: res.status, data: body };
}

export async function healthCheck() {
  const res = await fetch(`${BASE}/health`);
  return res.ok;
}
