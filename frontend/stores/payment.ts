import { create } from "zustand";
import api from "@/lib/api";

declare global {
  interface Window {
    Razorpay: any;
  }
}

export interface PaymentState {
  isLoading: boolean;

  verifyPayment: (payload: {
    razorpay_order_id: string;
    razorpay_payment_id: string;
    razorpay_signature: string;
    bookingId: number;
  }) => Promise<void>;
  getPaymentByBookingId: (bookingId: number) => Promise<any>;
}

export const usePaymentStore = create<PaymentState>()((set) => ({
  isLoading: false,

  verifyPayment: async (payload) => {
    set({ isLoading: true });
    try {
      await api.post("/api/v1/payments/verify", payload);
      set({ isLoading: false });
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  getPaymentByBookingId: async (bookingId) => {
    try {
      const { data } = await api.get(`/api/v1/payments/booking/${bookingId}`);
      return data;
    } catch {
      return null;
    }
  },
}));

let razorpayLoadPromise: Promise<void> | null = null;

function loadRazorpayScript(): Promise<void> {
  if (razorpayLoadPromise) return razorpayLoadPromise;
  if (window.Razorpay) return Promise.resolve();
  razorpayLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.onload = () => resolve();
    script.onerror = () => { razorpayLoadPromise = null; reject(new Error("Failed to load Razorpay script")); };
    document.body.appendChild(script);
  });
  return razorpayLoadPromise;
}

export async function openRazorpayCheckout(options: {
  orderId: string;
  amount: number;
  keyId: string;
  bookingId: number;
  userName?: string;
  userEmail?: string;
}): Promise<{ razorpay_order_id: string; razorpay_payment_id: string; razorpay_signature: string }> {
  await loadRazorpayScript();
  return new Promise((resolve, reject) => {
    const rzp = new window.Razorpay({
      key: options.keyId,
      amount: options.amount,
      currency: "INR",
      name: "Haven",
      description: `Booking #${options.bookingId}`,
      order_id: options.orderId,
      prefill: {
        name: options.userName,
        email: options.userEmail,
      },
      handler: function (response: any) {
        resolve(response);
      },
      theme: {
        color: "#0f172a",
      },
      modal: {
        ondismiss: function () {
          reject(new Error("Payment cancelled"));
        },
      },
    });
    rzp.open();
  });
}
