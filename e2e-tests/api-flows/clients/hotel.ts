const BASE = process.env.HOTEL_SERVICE_URL || 'http://localhost:3001';

export async function getAllHotels() {
  const res = await fetch(`${BASE}/api/v1/hotels/`);
  if (!res.ok) throw new Error(`GET /hotels failed: ${res.status}`);
  const json = await res.json();
  return json?.data?.hotels || json?.hotels || json;
}

export async function getHotelById(id: number) {
  const res = await fetch(`${BASE}/api/v1/hotels/${id}`);
  if (!res.ok) throw new Error(`GET /hotels/${id} failed: ${res.status}`);
  const json = await res.json();
  return json?.data || json;
}

export async function getRoomsByHotel(hotelId: number) {
  const res = await fetch(`${BASE}/api/v1/rooms/hotel/${hotelId}`);
  if (!res.ok) throw new Error(`GET /rooms/hotel/${hotelId} failed: ${res.status}`);
  const json = await res.json();
  return json?.data || json;
}

export async function healthCheck() {
  const res = await fetch(`${BASE}/health`);
  return res.ok;
}
