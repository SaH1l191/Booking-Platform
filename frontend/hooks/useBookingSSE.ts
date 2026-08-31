"use client";

import { useEffect, useRef } from "react";
import { useBookingsStore } from "@/stores";

const SSE_URL = `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000"}/api/v1/bookings/stream`;
const RECONNECT_DELAY_MS = 3000;

export function useBookingSSE() {
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let active = true;

    async function connect() {
      if (!active) return;

      const controller = new AbortController();
      abortRef.current = controller;

      try {
        const res = await fetch(SSE_URL, {
          credentials: "include",
          signal: controller.signal,
        });

        if (!res.ok || !res.body) {
          throw new Error(`SSE connection failed: ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          console.log("SSE read", { done, value });
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const payload = line.slice(6);
            try {
              const event = JSON.parse(payload);
              if (event.type === "connected") continue;

              if (event.type === "booking.confirmed" || event.type === "booking.cancelled") {
                useBookingsStore.setState((state) => ({
                  bookings: state.bookings.map((b) =>
                    b.id === event.bookingId ? { ...b, status: event.status as typeof b.status } : b
                  ),
                }));
              }
            } catch {
              // ignore malformed events
            }
          }
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError" && active) {
          setTimeout(connect, RECONNECT_DELAY_MS);
        }
      }
    }

    connect();

    return () => {
      active = false;
      abortRef.current?.abort();
    };
  }, []);
}
