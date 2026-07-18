import { useState } from "react";
import { useReviewsStore, useAuthStore } from "@/stores";
import { toast } from "sonner";

interface ReviewModalProps {
  bookingId: number;
  hotelId: number;
  onClose: () => void;
}

export default function ReviewModal({ bookingId, hotelId, onClose }: ReviewModalProps) {
  const { user } = useAuthStore();
  const { createReview } = useReviewsStore();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!comment.trim() || !user) return;
    setSubmitting(true);
    try {
      await createReview({
        user_id: user.id,
        booking_id: bookingId,
        hotel_id: hotelId,
        comment: comment.trim(),
        rating,
      });
      toast.success("Review submitted!");
      onClose();
    } catch {
      toast.error("Failed to submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-6 w-full max-w-md mx-4 shadow-luxury-lg">
        <h3 className="text-lg font-serif font-semibold text-navy mb-4">Leave a Review</h3>

        <div className="mb-4">
          <label className="block text-sm text-muted mb-2">Rating</label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                className={`text-2xl ${star <= rating ? "text-gold" : "text-border-light"}`}
              >
                ★
              </button>
            ))}
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm text-muted mb-2">Comment</label>
          <textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={4}
            className="w-full px-4 py-3 border border-border-light rounded-xl text-sm text-navy focus:outline-none focus:border-gold resize-none"
            placeholder="Share your experience..."
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 px-4 py-2.5 border border-border-light text-primary-soft text-sm font-medium rounded-xl hover:bg-cream-dark transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !comment.trim()}
            className="flex-1 px-4 py-2.5 bg-navy text-white text-sm font-medium rounded-xl hover:bg-navy-light transition-colors disabled:opacity-50"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
        </div>
      </div>
    </div>
  );
}
