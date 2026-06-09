"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { DayPicker } from "react-day-picker";
import { format, differenceInCalendarDays, isBefore, isAfter, startOfDay } from "date-fns";
import Navbar from "../../components/Navbar";
import Footer from "../../components/Footer";
import { useHotelsStore, useBookingsStore, useAuthStore, useRoomCategoriesStore, useRoomsStore, useReviewsStore } from "@/stores";
import type { RoomCategory, RoomType } from "@/stores/types";

const fallbackImages = [
  "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800&h=600&fit=crop",
  "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=400&h=300&fit=crop",
  "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=400&h=300&fit=crop",
];

const amenityIcons: Record<string, string> = {
  "Free WiFi": "📶", "Pool": "🏊", "Spa": "💆", "Gym": "🏋️",
  "Restaurant": "🍽️", "Beach Access": "🏖️", "Bar": "🍸",
  "Water Sports": "🏄", "Fireplace": "🔥", "Ski Access": "⛷️",
  "Hot Tub": "♨️", "Hiking Trails": "🥾", "Business Center": "💼",
  "Parking": "🅿️", "Air conditioning": "❄️", "Heating": "🔥",
};

const roomIcons: Record<RoomType, string> = {
  SINGLE: "🛏️", DOUBLE: "🛏️🛏️", FAMILY: "👨‍👩‍👧‍👦", DELUXE: "⭐", SUITE: "👑",
};

export default function HotelDetailPage() {
  const params = useParams();
  const router = useRouter();
  const hotelId = Number(params.id);

  const { selectedHotel, isLoading, error, fetchHotelById, clearSelectedHotel, toggleLike } = useHotelsStore();
  const { roomCategories, fetchRoomCategoriesByHotel } = useRoomCategoriesStore();
  const { rooms, fetchRoomsByHotel } = useRoomsStore();
  const { hotelReviews, averageRating, totalReviews, fetchReviewsByHotelId, clearReviews } = useReviewsStore();
  const { createBooking, isLoading: bookingLoading } = useBookingsStore();
  const { user } = useAuthStore();

  const [checkIn, setCheckIn] = useState<Date | undefined>();
  const [checkOut, setCheckOut] = useState<Date | undefined>();
  const [guests, setGuests] = useState(2);
  const [selectedCategory, setSelectedCategory] = useState<RoomCategory | null>(null);
  const [bookingError, setBookingError] = useState<string | null>(null);
  const [calendarOpen, setCalendarOpen] = useState<"checkin" | "checkout" | null>(null);

  useEffect(() => {
    if (hotelId) {
      fetchHotelById(hotelId);
      fetchRoomCategoriesByHotel(hotelId);
      fetchRoomsByHotel(hotelId);
      fetchReviewsByHotelId(hotelId);
    }
    return () => { clearSelectedHotel(); clearReviews(); };
  }, [hotelId, fetchHotelById, fetchRoomCategoriesByHotel, fetchRoomsByHotel, fetchReviewsByHotelId, clearSelectedHotel, clearReviews]);

  const today = startOfDay(new Date());

  const nights = checkIn && checkOut ? differenceInCalendarDays(checkOut, checkIn) : 0;

  const availableRoomsByCategory = roomCategories.map((rc) => ({
    ...rc,
    totalRooms: rooms.filter((r) => r.roomCategoryId === rc.id).length,
    availableRooms: rooms.filter((r) => r.roomCategoryId === rc.id && !r.bookingId).length,
  }));

  const enrichedSelected = selectedCategory
    ? availableRoomsByCategory.find((rc) => rc.id === selectedCategory.id) || null
    : null;

  const effectiveCategory = enrichedSelected?.availableRooms === 0
    ? availableRoomsByCategory.find((rc) => rc.availableRooms > 0) || selectedCategory
    : selectedCategory;

  const totalPrice = effectiveCategory && nights > 0 ? effectiveCategory.price * nights : 0;
  const cleaningFee = 75;
  const serviceFee = 50;

  const handleReserve = async () => {
    if (!user) { router.push("/login"); return; }
    if (!effectiveCategory || !checkIn || !checkOut || nights <= 0) {
      setBookingError("Please select dates and a room type"); return;
    }
    const availableRoom = rooms.find((r) => r.roomCategoryId === effectiveCategory.id && !r.bookingId);
    if (!availableRoom) { setBookingError("No rooms available for this category"); return; }
    try {
      setBookingError(null);
      await createBooking({
        hotelId, roomId: availableRoom.id, totalGuests: guests,
        bookingAmount: totalPrice, checkIn: format(checkIn, "yyyy-MM-dd"),
        checkOut: format(checkOut, "yyyy-MM-dd"),
      });
      router.push("/bookings");
    } catch { setBookingError("Failed to create booking. Please try again."); }
  };

  const hotelImages = selectedHotel?.images && selectedHotel.images.length > 0
    ? selectedHotel.images.sort((a, b) => a.displayOrder - b.displayOrder).map((img) => img.url)
    : fallbackImages;

  const amenities = selectedHotel?.amenities || [];
  const lat = selectedHotel?.latitude;
  const lng = selectedHotel?.longitude;

  if (isLoading) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-white">
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20 py-8">
            <div className="animate-pulse space-y-6">
              <div className="h-4 bg-gray-200 rounded w-32" />
              <div className="h-8 bg-gray-200 rounded w-64" />
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                <div className="md:col-span-2 md:row-span-2 h-80 bg-gray-200 rounded-xl" />
                <div className="h-40 bg-gray-200 rounded-xl" />
                <div className="h-40 bg-gray-200 rounded-xl" />
              </div>
            </div>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  if (error || !selectedHotel) {
    return (
      <>
        <Navbar />
        <main className="min-h-screen bg-white">
          <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20 py-24 text-center">
            <h2 className="text-xl font-semibold text-gray-900">Hotel not found</h2>
            <p className="mt-2 text-gray-500">{error || "This property may no longer be available."}</p>
            <Link href="/hotels" className="mt-6 inline-block px-6 py-3 bg-gray-900 text-white rounded-full font-medium hover:bg-gray-800 transition-colors">Browse stays</Link>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="min-h-screen bg-white">
        {/* Breadcrumb */}
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20 py-4">
          <nav className="flex items-center gap-2 text-sm text-gray-500">
            <Link href="/hotels" className="hover:text-gray-900 transition-colors">Stays</Link>
            <span>/</span>
            <span className="text-gray-900">{selectedHotel.location}</span>
          </nav>
        </div>

        {/* Header */}
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20 pb-4">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-[26px] font-semibold text-gray-900">{selectedHotel.name}</h1>
              <div className="flex items-center gap-2 mt-1">
                <div className="flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  <span className="text-sm font-medium">{selectedHotel.rating || "New"}</span>
                </div>
                {totalReviews > 0 && (
                  <><span className="text-gray-300">·</span><span className="text-sm text-gray-500">{totalReviews} reviews</span></>
                )}
                <span className="text-gray-300">·</span>
                <span className="text-sm text-gray-500">{selectedHotel.location}</span>
              </div>
              {selectedHotel.categories?.length > 0 && (
                <div className="flex items-center gap-2 mt-2">
                  {selectedHotel.categories.map((cat) => (
                    <span key={cat.id} className="px-2.5 py-1 bg-gray-100 rounded-full text-xs font-medium text-gray-700">{cat.icon} {cat.name}</span>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button className="p-2.5 hover:bg-gray-100 rounded-full transition-colors">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" /></svg>
              </button>
              <button onClick={() => toggleLike(hotelId)} className="p-2.5 hover:bg-gray-100 rounded-full transition-colors">
                <svg className={`w-4 h-4 ${selectedHotel.isLiked ? "text-red-500 fill-red-500" : "text-gray-800"}`} fill={selectedHotel.isLiked ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>
              </button>
            </div>
          </div>
        </div>

        {/* Image Gallery */}
        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20 pb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-2 rounded-xl overflow-hidden">
            <div className="md:col-span-2 md:row-span-2 aspect-[4/3] md:aspect-auto">
              <img src={hotelImages[0]} alt={selectedHotel.images?.[0]?.altText || selectedHotel.name} className="w-full h-full object-cover hover:opacity-95 transition-opacity" />
            </div>
            {hotelImages.slice(1, 5).map((img, i) => (
              <div key={i} className={`aspect-[4/3] ${i >= 3 ? "hidden md:block" : ""}`}>
                <img src={img} alt={selectedHotel.images?.[i + 1]?.altText || `${selectedHotel.name} view ${i + 2}`} className="w-full h-full object-cover hover:opacity-95 transition-opacity" />
              </div>
            ))}
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 md:px-10 lg:px-20 pb-16">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12">
            {/* Main Content */}
            <div className="lg:col-span-2 space-y-8">
              {/* Hotel Info */}
              <div className="pb-6 border-b border-gray-200">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-semibold text-gray-900">Hotel in {selectedHotel.location}</h2>
                    <p className="text-gray-500 mt-1">{selectedHotel.address}</p>
                  </div>
                  <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-gray-600">SE</span>
                  </div>
                </div>
              </div>

              {/* Amenities */}
              {amenities.length > 0 && (
                <div className="pb-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">What this place offers</h2>
                  <div className="grid grid-cols-2 gap-3">
                    {amenities.map((amenity) => (
                      <div key={amenity} className="flex items-center gap-3 py-2">
                        <span className="text-xl">{amenityIcons[amenity] || "✨"}</span>
                        <span className="text-[15px] text-gray-700">{amenity}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Room Categories with counts */}
              <div className="pb-6 border-b border-gray-200">
                <h2 className="text-xl font-semibold text-gray-900 mb-4">Select room</h2>
                <div className="space-y-3">
                  {availableRoomsByCategory.map((rc) => (
                    <div
                      key={rc.id}
                      onClick={() => rc.availableRooms > 0 && setSelectedCategory(rc)}
                      className={`p-4 border rounded-xl transition-all ${rc.availableRooms > 0 ? selectedCategory?.id === rc.id ? "border-gray-900 bg-gray-50 cursor-pointer" : "border-gray-200 hover:border-gray-400 cursor-pointer" : "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"}`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                            <span className="text-lg">{roomIcons[rc.roomType] || "?"}</span>
                          </div>
                          <div>
                            <h3 className="font-medium text-gray-900">{rc.roomType.charAt(0) + rc.roomType.slice(1).toLowerCase()}</h3>
                            <p className="text-sm text-gray-500">
                              {rc.availableRooms > 0
                                ? `${rc.availableRooms} of ${rc.totalRooms} room${rc.totalRooms !== 1 ? "s" : ""} available`
                                : "Sold out"}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="font-semibold">${rc.price}</span>
                          <span className="text-gray-500 text-sm"> /night</span>
                        </div>
                      </div>
                    </div>
                  ))}
                  {roomCategories.length === 0 && (
                    <p className="text-gray-500 text-sm py-4">No room categories available for this hotel.</p>
                  )}
                </div>
              </div>

              {/* Map */}
              {lat && lng && (
                <div className="pb-6 border-b border-gray-200">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Where you&apos;ll be</h2>
                  <p className="text-gray-500 text-sm mb-3">{selectedHotel.address}, {selectedHotel.location}</p>
                  <div className="rounded-xl overflow-hidden border border-gray-200 h-72">
                    <iframe
                      width="100%"
                      height="100%"
                      frameBorder="0"
                      src={`https://www.openstreetmap.org/export/embed.html?bbox=${Number(lng) - 0.01},${Number(lat) - 0.01},${Number(lng) + 0.01},${Number(lat) + 0.01}&layer=mapnik&marker=${lat},${lng}`}
                      loading="lazy"
                      referrerPolicy="no-referrer-when-downgrade"
                    />
                  </div>
                  <a
                    href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=15/${lat}/${lng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-block mt-3 text-sm font-medium text-gray-900 underline hover:text-gray-600"
                  >
                    View larger map
                  </a>
                </div>
              )}

              {/* Reviews */}
              <div className="pb-6">
                <div className="flex items-center gap-3 mb-4">
                  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                  <h2 className="text-xl font-semibold text-gray-900">
                    {totalReviews > 0 ? `${averageRating} · ${totalReviews} review${totalReviews !== 1 ? "s" : ""}` : "No reviews yet"}
                  </h2>
                </div>

                {hotelReviews.length > 0 ? (
                  <div className="space-y-6">
                    {hotelReviews.map((review) => (
                      <div key={review.id} className="border-b border-gray-100 pb-4 last:border-0">
                        <div className="flex items-center gap-3 mb-2">
                          <div className="w-8 h-8 bg-gray-200 rounded-full flex items-center justify-center">
                            <span className="text-xs font-medium text-gray-600">U{review.user_id}</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">User #{review.user_id}</p>
                            <p className="text-xs text-gray-500">{format(new Date(review.created_at), "MMM yyyy")}</p>
                          </div>
                          <div className="ml-auto flex items-center gap-1 bg-gray-100 px-2 py-1 rounded-full">
                            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" /></svg>
                            <span className="text-xs font-medium">{review.rating}</span>
                          </div>
                        </div>
                        <p className="text-sm text-gray-700 leading-relaxed">{review.comment}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500 text-sm">Be the first to review this hotel.</p>
                )}
              </div>
            </div>

            {/* Booking Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24 border border-gray-200 rounded-2xl p-6 shadow-sm">
                <div className="flex items-baseline gap-1 mb-5">
                  <span className="text-xl font-semibold">${effectiveCategory?.price || "—"}</span>
                  <span className="text-gray-500">night</span>
                </div>

                {/* Calendar-driven date inputs */}
                <div className="border border-gray-200 rounded-xl overflow-hidden mb-4">
                  <div className="grid grid-cols-2 divide-x divide-gray-200">
                    <button
                      onClick={() => setCalendarOpen(calendarOpen === "checkin" ? null : "checkin")}
                      className="p-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-900 mb-1">Check-in</label>
                      <span className={`text-sm ${checkIn ? "text-gray-900" : "text-gray-400"}`}>
                        {checkIn ? format(checkIn, "MMM dd, yyyy") : "Select date"}
                      </span>
                    </button>
                    <button
                      onClick={() => setCalendarOpen(calendarOpen === "checkout" ? null : "checkout")}
                      className="p-3 text-left hover:bg-gray-50 transition-colors"
                    >
                      <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-900 mb-1">Checkout</label>
                      <span className={`text-sm ${checkOut ? "text-gray-900" : "text-gray-400"}`}>
                        {checkOut ? format(checkOut, "MMM dd, yyyy") : "Select date"}
                      </span>
                    </button>
                  </div>
                  <div className="border-t border-gray-200 p-3">
                    <label className="block text-[11px] font-bold uppercase tracking-wide text-gray-900 mb-1">Guests</label>
                    <select value={guests} onChange={(e) => setGuests(Number(e.target.value))} className="w-full text-sm text-gray-900 bg-transparent focus:outline-none">
                      {[1, 2, 3, 4, 5, 6].map((n) => (
                        <option key={n} value={n}>{n} {n === 1 ? "guest" : "guests"}</option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Calendar Popover */}
                {calendarOpen && (
                  <div className="mb-4 p-4 bg-white border border-gray-200 rounded-xl shadow-lg">
                    <DayPicker
                      mode="range"
                      selected={checkIn && checkOut ? { from: checkIn, to: checkOut } : undefined}
                      onSelect={(range) => {
                        if (range?.from) setCheckIn(range.from);
                        if (range?.to) {
                          setCheckOut(range.to);
                          setCalendarOpen(null);
                        }
                      }}
                      defaultMonth={checkIn || new Date()}
                      numberOfMonths={2}
                      disabled={{ before: today }}
                      className="text-sm"
                      classNames={{
                        day: "w-9 h-9 flex items-center justify-center rounded-full text-sm transition-colors",
                        range_start: "bg-gray-900 text-white rounded-l-full",
                        range_end: "bg-gray-900 text-white rounded-r-full",
                        range_middle: "bg-gray-100 text-gray-900",
                        today: "font-bold text-gray-900",
                        selected: "bg-gray-900 text-white",
                      }}
                    />
                    <button onClick={() => setCalendarOpen(null)} className="w-full mt-2 text-sm text-gray-500 hover:text-gray-900">Close</button>
                  </div>
                )}

                {bookingError && <p className="mb-3 text-sm text-red-600">{bookingError}</p>}

                <button
                  onClick={handleReserve}
                  disabled={bookingLoading || !effectiveCategory || (enrichedSelected?.availableRooms ?? 0) === 0 || !checkIn || !checkOut || nights <= 0}
                  className="w-full py-3.5 bg-gradient-to-r from-pink-500 to-rose-500 hover:from-pink-600 hover:to-rose-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl transition-all"
                >
                  {bookingLoading ? "Reserving..." : "Reserve"}
                </button>

                <p className="mt-3 text-center text-sm text-gray-500">You won&apos;t be charged yet</p>

                {nights > 0 && effectiveCategory && (
                  <div className="mt-5 pt-5 border-t border-gray-200 space-y-3">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 underline">${effectiveCategory.price} x {nights} nights</span>
                      <span>${totalPrice}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 underline">Cleaning fee</span>
                      <span>${cleaningFee}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 underline">Service fee</span>
                      <span>${serviceFee}</span>
                    </div>
                    <div className="flex justify-between font-semibold pt-3 border-t border-gray-200">
                      <span>Total</span>
                      <span>${totalPrice + cleaningFee + serviceFee}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
