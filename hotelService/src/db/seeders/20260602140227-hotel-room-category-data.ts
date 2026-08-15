import type { QueryInterface } from "sequelize";

module.exports = {
  async up(queryInterface: QueryInterface): Promise<void> {
    const now = new Date();

    // Clear existing data to avoid conflicts
    await queryInterface.bulkDelete("room_availabilities", {}, {});
    await queryInterface.bulkDelete("rooms", {}, {});
    await queryInterface.bulkDelete("room_categories", {}, {});
    await queryInterface.bulkDelete("hotels", {}, {});

    // HOTELS
    await queryInterface.bulkInsert("hotels", [
      {
        id: 1,
        name: "Grand Hotel",
        address: "123 Main St",
        location: "New York",
        latitude: 40.7128,
        longitude: -74.0060,
        rating: 4.5,
        rating_count: 120,
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        name: "Seaside Resort",
        address: "456 Ocean Ave",
        location: "Miami",
        latitude: 25.7617,
        longitude: -80.1918,
        rating: 4.8,
        rating_count: 210,
        created_at: now,
        updated_at: now,
      },
      {
        id: 3,
        name: "Mountain Lodge",
        address: "789 Pine Road",
        location: "Denver",
        latitude: 39.7392,
        longitude: -104.9903,
        rating: 4.2,
        rating_count: 90,
        created_at: now,
        updated_at: now,
      },
      {
        id: 4,
        name: "City Center Inn",
        address: "321 Downtown Blvd",
        location: "Chicago",
        latitude: 41.8781,
        longitude: -87.6298,
        rating: 4.0,
        rating_count: 90,
        created_at: now,
        updated_at: now,
      },
    ], { raw: true });

    // Populate location_point from latitude/longitude
    await queryInterface.sequelize.query(`
      UPDATE hotels
      SET location_point = ST_SRID(POINT(longitude, latitude), 4326)
      WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
    `);

    // ROOM CATEGORIES
    await queryInterface.bulkInsert("room_categories", [
      // Grand Hotel categories (hotel_id: 1)
      {
        id: 1,
        room_type: "SINGLE",
        price: 100,
        hotel_id: 1,
        room_count: 6,
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        room_type: "DOUBLE",
        price: 150,
        hotel_id: 1,
        room_count: 4,
        created_at: now,
        updated_at: now,
      },
      {
        id: 3,
        room_type: "SUITE",
        price: 300,
        hotel_id: 1,
        room_count: 2,
        created_at: now,
        updated_at: now,
      },
      {
        id: 4,
        room_type: "FAMILY",
        price: 200,
        hotel_id: 1,
        room_count: 3,
        created_at: now,
        updated_at: now,
      },

      // Seaside Resort categories (hotel_id: 2)
      {
        id: 5,
        room_type: "SINGLE",
        price: 120,
        hotel_id: 2,
        room_count: 5,
        created_at: now,
        updated_at: now,
      },
      {
        id: 6,
        room_type: "DOUBLE",
        price: 180,
        hotel_id: 2,
        room_count: 4,
        created_at: now,
        updated_at: now,
      },
      {
        id: 7,
        room_type: "DELUXE",
        price: 250,
        hotel_id: 2,
        room_count: 2,
        created_at: now,
        updated_at: now,
      },
      {
        id: 8,
        room_type: "FAMILY",
        price: 220,
        hotel_id: 2,
        room_count: 3,
        created_at: now,
        updated_at: now,
      },

      // Mountain Lodge categories (hotel_id: 3)
      {
        id: 9,
        room_type: "SINGLE",
        price: 90,
        hotel_id: 3,
        room_count: 4,
        created_at: now,
        updated_at: now,
      },
      {
        id: 10,
        room_type: "DOUBLE",
        price: 130,
        hotel_id: 3,
        room_count: 3,
        created_at: now,
        updated_at: now,
      },
      {
        id: 11,
        room_type: "SUITE",
        price: 220,
        hotel_id: 3,
        room_count: 2,
        created_at: now,
        updated_at: now,
      },
      {
        id: 12,
        room_type: "FAMILY",
        price: 180,
        hotel_id: 3,
        room_count: 2,
        created_at: now,
        updated_at: now,
      },

      // City Center Inn categories (hotel_id: 4)
      {
        id: 13,
        room_type: "SINGLE",
        price: 110,
        hotel_id: 4,
        room_count: 5,
        created_at: now,
        updated_at: now,
      },
      {
        id: 14,
        room_type: "DOUBLE",
        price: 160,
        hotel_id: 4,
        room_count: 4,
        created_at: now,
        updated_at: now,
      },
      {
        id: 15,
        room_type: "DELUXE",
        price: 240,
        hotel_id: 4,
        room_count: 2,
        created_at: now,
        updated_at: now,
      },
      {
        id: 16,
        room_type: "SUITE",
        price: 280,
        hotel_id: 4,
        room_count: 1,
        created_at: now,
        updated_at: now,
      },
    ], { raw: true });

    // ROOMS
    await queryInterface.bulkInsert("rooms", [
      // Grand Hotel rooms (hotel_id: 1)
      // SINGLE rooms (room_category_id: 1) - rooms 101-106
      {
        id: 1,
        room_category_id: 1,
        hotel_id: 1,
        room_no: 101,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        room_category_id: 1,
        hotel_id: 1,
        room_no: 102,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 3,
        room_category_id: 1,
        hotel_id: 1,
        room_no: 103,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 4,
        room_category_id: 1,
        hotel_id: 1,
        room_no: 104,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 5,
        room_category_id: 1,
        hotel_id: 1,
        room_no: 105,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 6,
        room_category_id: 1,
        hotel_id: 1,
        room_no: 106,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },

      // DOUBLE rooms (room_category_id: 2) - rooms 107-110
      {
        id: 7,
        room_category_id: 2,
        hotel_id: 1,
        room_no: 107,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 8,
        room_category_id: 2,
        hotel_id: 1,
        room_no: 108,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 9,
        room_category_id: 2,
        hotel_id: 1,
        room_no: 109,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 10,
        room_category_id: 2,
        hotel_id: 1,
        room_no: 110,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },

      // SUITE rooms (room_category_id: 3) - rooms 111-112
      {
        id: 11,
        room_category_id: 3,
        hotel_id: 1,
        room_no: 111,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 12,
        room_category_id: 3,
        hotel_id: 1,
        room_no: 112,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },

      // FAMILY rooms (room_category_id: 4) - rooms 113-115
      {
        id: 13,
        room_category_id: 4,
        hotel_id: 1,
        room_no: 113,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 14,
        room_category_id: 4,
        hotel_id: 1,
        room_no: 114,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 15,
        room_category_id: 4,
        hotel_id: 1,
        room_no: 115,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },

      // Seaside Resort rooms (hotel_id: 2)
      // SINGLE rooms (room_category_id: 5) - rooms 201-205
      {
        id: 16,
        room_category_id: 5,
        hotel_id: 2,
        room_no: 201,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 17,
        room_category_id: 5,
        hotel_id: 2,
        room_no: 202,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 18,
        room_category_id: 5,
        hotel_id: 2,
        room_no: 203,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 19,
        room_category_id: 5,
        hotel_id: 2,
        room_no: 204,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 20,
        room_category_id: 5,
        hotel_id: 2,
        room_no: 205,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },

      // DOUBLE rooms (room_category_id: 6) - rooms 206-209
      {
        id: 21,
        room_category_id: 6,
        hotel_id: 2,
        room_no: 206,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 22,
        room_category_id: 6,
        hotel_id: 2,
        room_no: 207,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 23,
        room_category_id: 6,
        hotel_id: 2,
        room_no: 208,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 24,
        room_category_id: 6,
        hotel_id: 2,
        room_no: 209,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },

      // DELUXE rooms (room_category_id: 7) - rooms 210-211
      {
        id: 25,
        room_category_id: 7,
        hotel_id: 2,
        room_no: 210,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 26,
        room_category_id: 7,
        hotel_id: 2,
        room_no: 211,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },

      // FAMILY rooms (room_category_id: 8) - rooms 212-214
      {
        id: 27,
        room_category_id: 8,
        hotel_id: 2,
        room_no: 212,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 28,
        room_category_id: 8,
        hotel_id: 2,
        room_no: 213,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 29,
        room_category_id: 8,
        hotel_id: 2,
        room_no: 214,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },

      // Mountain Lodge rooms (hotel_id: 3)
      // SINGLE rooms (room_category_id: 9) - rooms 301-304
      {
        id: 30,
        room_category_id: 9,
        hotel_id: 3,
        room_no: 301,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 31,
        room_category_id: 9,
        hotel_id: 3,
        room_no: 302,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 32,
        room_category_id: 9,
        hotel_id: 3,
        room_no: 303,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 33,
        room_category_id: 9,
        hotel_id: 3,
        room_no: 304,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },

      // DOUBLE rooms (room_category_id: 10) - rooms 305-307
      {
        id: 34,
        room_category_id: 10,
        hotel_id: 3,
        room_no: 305,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 35,
        room_category_id: 10,
        hotel_id: 3,
        room_no: 306,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 36,
        room_category_id: 10,
        hotel_id: 3,
        room_no: 307,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },

      // SUITE rooms (room_category_id: 11) - rooms 308-309
      {
        id: 37,
        room_category_id: 11,
        hotel_id: 3,
        room_no: 308,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 38,
        room_category_id: 11,
        hotel_id: 3,
        room_no: 309,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },

      // FAMILY rooms (room_category_id: 12) - rooms 310-311
      {
        id: 39,
        room_category_id: 12,
        hotel_id: 3,
        room_no: 310,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 40,
        room_category_id: 12,
        hotel_id: 3,
        room_no: 311,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },

      // City Center Inn rooms (hotel_id: 4)
      // SINGLE rooms (room_category_id: 13) - rooms 401-405
      {
        id: 41,
        room_category_id: 13,
        hotel_id: 4,
        room_no: 401,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 42,
        room_category_id: 13,
        hotel_id: 4,
        room_no: 402,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 43,
        room_category_id: 13,
        hotel_id: 4,
        room_no: 403,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 44,
        room_category_id: 13,
        hotel_id: 4,
        room_no: 404,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 45,
        room_category_id: 13,
        hotel_id: 4,
        room_no: 405,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },

      // DOUBLE rooms (room_category_id: 14) - rooms 406-409
      {
        id: 46,
        room_category_id: 14,
        hotel_id: 4,
        room_no: 406,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 47,
        room_category_id: 14,
        hotel_id: 4,
        room_no: 407,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 48,
        room_category_id: 14,
        hotel_id: 4,
        room_no: 408,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 49,
        room_category_id: 14,
        hotel_id: 4,
        room_no: 409,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },

      // DELUXE rooms (room_category_id: 15) - rooms 410-411
      {
        id: 50,
        room_category_id: 15,
        hotel_id: 4,
        room_no: 410,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
      {
        id: 51,
        room_category_id: 15,
        hotel_id: 4,
        room_no: 411,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },

      // SUITE rooms (room_category_id: 16) - room 412
      {
        id: 52,
        room_category_id: 16,
        hotel_id: 4,
        room_no: 412,
        booking_id: null,
        created_at: now,
        updated_at: now,
      },
    ], { raw: true });

    // ROOM AVAILABILITIES
    await queryInterface.bulkInsert("room_availabilities", [
      // Make some rooms booked for specific dates to simulate real scenarios
      {
        id: 1,
        room_id: 1,  // Grand Hotel SINGLE room 101
        date: "2026-06-01",
        booking_id: 101,
        status: "booked",
        created_at: now,
        updated_at: now,
      },
      {
        id: 2,
        room_id: 7,  // Grand Hotel DOUBLE room 107
        date: "2026-06-01",
        booking_id: 102,
        status: "booked",
        created_at: now,
        updated_at: now,
      },
      {
        id: 3,
        room_id: 16, // Seaside Resort SINGLE room 201
        date: "2026-06-01",
        booking_id: 103,
        status: "booked",
        created_at: now,
        updated_at: now,
      },
      {
        id: 4,
        room_id: 30, // Mountain Lodge SINGLE room 301
        date: "2026-06-01",
        booking_id: 104,
        status: "booked",
        created_at: now,
        updated_at: now,
      },
      {
        id: 5,
        room_id: 41, // City Center Inn SINGLE room 401
        date: "2026-06-01",
        booking_id: 105,
        status: "booked",
        created_at: now,
        updated_at: now,
      },

      // Same rooms booked for next day
      {
        id: 6,
        room_id: 1,
        date: "2026-06-02",
        booking_id: 101,
        status: "booked",
        created_at: now,
        updated_at: now,
      },
      {
        id: 7,
        room_id: 7,
        date: "2026-06-02",
        booking_id: 102,
        status: "booked",
        created_at: now,
        updated_at: now,
      },
      {
        id: 8,
        room_id: 16,
        date: "2026-06-02",
        booking_id: 103,
        status: "booked",
        created_at: now,
        updated_at: now,
      },
      {
        id: 9,
        room_id: 30,
        date: "2026-06-02",
        booking_id: 104,
        status: "booked",
        created_at: now,
        updated_at: now,
      },
      {
        id: 10,
        room_id: 41,
        date: "2026-06-02",
        booking_id: 105,
        status: "booked",
        created_at: now,
        updated_at: now,
      },

      // Some rooms available for testing
      {
        id: 11,
        room_id: 2,  // Grand Hotel SINGLE room 102
        date: "2026-06-01",
        booking_id: null,
        status: "available",
        created_at: now,
        updated_at: now,
      },
      {
        id: 12,
        room_id: 2,
        date: "2026-06-02",
        booking_id: null,
        status: "available",
        created_at: now,
        updated_at: now,
      },
      {
        id: 13,
        room_id: 52, // City Center Inn SUITE room 412
        date: "2026-06-01",
        booking_id: null,
        status: "available",
        created_at: now,
        updated_at: now,
      },
      {
        id: 14,
        room_id: 52,
        date: "2026-06-02",
        booking_id: null,
        status: "available",
        created_at: now,
        updated_at: now,
      },
    ], { raw: true });
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.bulkDelete("room_availabilities", {}, {});
    await queryInterface.bulkDelete("rooms", {}, {});
    await queryInterface.bulkDelete("room_categories", {}, {});
    await queryInterface.bulkDelete("hotels", {}, {});
  },
};

//Data understanding 

// hotelId	Hotel Name
// 1	Grand Hotel
// 2	Seaside Resort
// 3	Mountain Lodge
// 4	City Center Inn


// hotelId = 1 → Grand Hotel
// roomId	room_no	type
// 1	101	SINGLE
// 2	102	SINGLE
// 3	103	SINGLE
// 4	104	SINGLE
// 5	105	SINGLE
// 6	106	SINGLE
// 7	107	DOUBLE
// 8	108	DOUBLE
// 9	109	DOUBLE
// 10	110	DOUBLE
// 11	111	SUITE
// 12	112	SUITE
// 13	113	FAMILY
// 14	114	FAMILY
// 15	115	FAMILY

// hotelId = 2 → Seaside Resort
// roomId	room_no	type
// 16	201	SINGLE
// 17	202	SINGLE
// 18	203	SINGLE
// 19	204	SINGLE
// 20	205	SINGLE
// 21	206	DOUBLE
// 22	207	DOUBLE
// 23	208	DOUBLE
// 24	209	DOUBLE
// 25	210	DELUXE
// 26	211	DELUXE
// 27	212	FAMILY
// 28	213	FAMILY
// 29	214	FAMILY

// hotelId = 3 → Mountain Lodge
// roomId	room_no	type
// 30	301	SINGLE
// 31	302	SINGLE
// 32	303	SINGLE
// 33	304	SINGLE
// 34	305	DOUBLE
// 35	306	DOUBLE
// 36	307	DOUBLE
// 37	308	SUITE
// 38	309	SUITE
// 39	310	FAMILY
// 40	311	FAMILY

// hotelId = 4 → City Center Inn
// roomId	room_no	type
// 41	401	SINGLE
// 42	402	SINGLE
// 43	403	SINGLE
// 44	404	SINGLE
// 45	405	SINGLE
// 46	406	DOUBLE
// 47	407	DOUBLE
// 48	408	DOUBLE
// 49	409	DOUBLE
// 50	410	DELUXE
// 51	411	DELUXE
// 52	412	SUITE
