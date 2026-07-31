import api from "./api";

const userCache: Record<number, string> = {};

export async function getUsername(userId: number): Promise<string> {
  if (userCache[userId]) return userCache[userId];
  try {
    const { data } = await api.get(`/users/${userId}`);
    const name = data?.username || data?.email || `User #${userId}`;
    userCache[userId] = name;
    return name;
  } catch {
    userCache[userId] = `User #${userId}`;
    return userCache[userId];
  }
}

export function getCachedUsername(userId: number): string {
  return userCache[userId] || `User #${userId}`;
}
