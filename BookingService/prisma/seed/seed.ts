import { PrismaClient, booking_status } from '@prisma/client'

const prisma = new PrismaClient()

async function lookupHotelIds(): Promise<Record<string, number>> {
  const rows: { id: number; name: string }[] =
    await prisma.$queryRawUnsafe('SELECT id, name FROM hotels WHERE deleted_at IS NULL');
  const map: Record<string, number> = {};
  for (const row of rows) {
    map[row.name] = row.id;
  }
  return map;
}

async function main() {
  console.log('Starting seed...')

  const hotels = await lookupHotelIds();
  const grandHotel = hotels['Grand Hotel'];
  const beachResort = hotels['Beach Resort'];
  const mountainLodge = hotels['Mountain Lodge'];

  if (!grandHotel || !beachResort || !mountainLodge) {
    console.error(
      'HotelService must be seeded first — expected "Grand Hotel", "Beach Resort", "Mountain Lodge".',
      { found: Object.keys(hotels) }
    );
    process.exit(1);
  }

  console.log(`Resolved hotel IDs: Grand Hotel=${grandHotel}, Beach Resort=${beachResort}, Mountain Lodge=${mountainLodge}`);

  // ── Users (matching AuthService seed: IDs 1-27) ────────────────────────
  const users = [
    { id: 1,  email: 'admin@example.com' },
    { id: 2,  email: 'alice@example.com' },
    { id: 3,  email: 'bob@example.com' },
    { id: 4,  email: 'charlie@example.com' },
    { id: 5,  email: 'david@example.com' },
    { id: 6,  email: 'eva@example.com' },
    { id: 7,  email: 'frank@example.com' },
    { id: 8,  email: 'grace@example.com' },
    { id: 9,  email: 'henry@example.com' },
    { id: 10, email: 'irene@example.com' },
    { id: 11, email: 'jack@example.com' },
    { id: 12, email: 'karen@example.com' },
    { id: 13, email: 'leo@example.com' },
    { id: 14, email: 'mia@example.com' },
    { id: 15, email: 'nancy@example.com' },
    { id: 16, email: 'oliver@example.com' },
    { id: 17, email: 'paul@example.com' },
    { id: 18, email: 'queen@example.com' },
    { id: 19, email: 'ryan@example.com' },
    { id: 20, email: 'sophia@example.com' },
    { id: 21, email: 'thomas@example.com' },
    { id: 22, email: 'uma@example.com' },
    { id: 23, email: 'victor@example.com' },
    { id: 24, email: 'wendy@example.com' },
    { id: 25, email: 'xavier@example.com' },
    { id: 26, email: 'yasmin@example.com' },
    { id: 27, email: 'zack@example.com' },
  ]

  // ── Bookings (28 total, matching payment + review seeds exactly) ────────
  // hotel IDs are looked up dynamically from hotelService DB at seed time
  //
  // Status mapping: CAPTURED→CONFIRMED, CREATED→PENDING, FAILED→CANCELLED,
  //                 REFUNDED→CANCELLED, PARTIAL_REFUNDED→CANCELLED

  type BookingDef = {
    user: (typeof users)[number]
    hotelId: number
    roomId: number
    status: booking_status
    daysFromNow: number
    stayNights: number
    guests: number
    amount: number
  }

  const bookingDefs: BookingDef[] = [
    // Bookings 1-8: CONFIRMED, $300 each (Grand Hotel)
    { user: users[1],  hotelId: grandHotel, roomId: 1,  status: 'CONFIRMED', daysFromNow: 1,  stayNights: 2, guests: 2, amount: 300 },
    { user: users[2],  hotelId: grandHotel, roomId: 2,  status: 'CONFIRMED', daysFromNow: 2,  stayNights: 2, guests: 2, amount: 300 },
    { user: users[3],  hotelId: grandHotel, roomId: 3,  status: 'CONFIRMED', daysFromNow: 3,  stayNights: 2, guests: 2, amount: 300 },
    { user: users[4],  hotelId: grandHotel, roomId: 4,  status: 'CONFIRMED', daysFromNow: 4,  stayNights: 2, guests: 2, amount: 300 },
    { user: users[5],  hotelId: grandHotel, roomId: 5,  status: 'CONFIRMED', daysFromNow: 5,  stayNights: 2, guests: 2, amount: 300 },
    { user: users[6],  hotelId: grandHotel, roomId: 6,  status: 'CONFIRMED', daysFromNow: 6,  stayNights: 2, guests: 2, amount: 300 },
    { user: users[7],  hotelId: grandHotel, roomId: 7,  status: 'CONFIRMED', daysFromNow: 7,  stayNights: 2, guests: 2, amount: 300 },
    { user: users[8],  hotelId: grandHotel, roomId: 8,  status: 'CONFIRMED', daysFromNow: 8,  stayNights: 2, guests: 2, amount: 300 },

    // Bookings 9-13: CONFIRMED, $450 each (Beach Resort)
    { user: users[9],  hotelId: beachResort, roomId: 9,  status: 'CONFIRMED', daysFromNow: 9,  stayNights: 3, guests: 2, amount: 450 },
    { user: users[10], hotelId: beachResort, roomId: 10, status: 'CONFIRMED', daysFromNow: 10, stayNights: 3, guests: 2, amount: 450 },
    { user: users[11], hotelId: beachResort, roomId: 11, status: 'CONFIRMED', daysFromNow: 11, stayNights: 3, guests: 2, amount: 450 },
    { user: users[12], hotelId: beachResort, roomId: 12, status: 'CONFIRMED', daysFromNow: 12, stayNights: 3, guests: 2, amount: 450 },
    { user: users[13], hotelId: beachResort, roomId: 13, status: 'CONFIRMED', daysFromNow: 13, stayNights: 3, guests: 2, amount: 450 },

    // Bookings 14-15: PENDING, $450 each (Beach Resort)
    { user: users[14], hotelId: beachResort, roomId: 14, status: 'PENDING',   daysFromNow: 1,  stayNights: 3, guests: 2, amount: 450 },
    { user: users[15], hotelId: beachResort, roomId: 15, status: 'PENDING',   daysFromNow: 2,  stayNights: 3, guests: 2, amount: 450 },

    // Bookings 16-23: CONFIRMED, $400 each (Mountain Lodge)
    { user: users[16], hotelId: mountainLodge, roomId: 16, status: 'CONFIRMED', daysFromNow: 14, stayNights: 2, guests: 2, amount: 400 },
    { user: users[17], hotelId: mountainLodge, roomId: 17, status: 'CONFIRMED', daysFromNow: 15, stayNights: 2, guests: 2, amount: 400 },
    { user: users[18], hotelId: mountainLodge, roomId: 18, status: 'CONFIRMED', daysFromNow: 16, stayNights: 2, guests: 2, amount: 400 },
    { user: users[19], hotelId: mountainLodge, roomId: 19, status: 'CONFIRMED', daysFromNow: 17, stayNights: 2, guests: 2, amount: 400 },
    { user: users[20], hotelId: mountainLodge, roomId: 20, status: 'CONFIRMED', daysFromNow: 18, stayNights: 2, guests: 2, amount: 400 },
    { user: users[21], hotelId: mountainLodge, roomId: 21, status: 'CONFIRMED', daysFromNow: 19, stayNights: 2, guests: 2, amount: 400 },
    { user: users[22], hotelId: mountainLodge, roomId: 22, status: 'CONFIRMED', daysFromNow: 20, stayNights: 2, guests: 2, amount: 400 },
    { user: users[23], hotelId: mountainLodge, roomId: 23, status: 'CONFIRMED', daysFromNow: 21, stayNights: 2, guests: 2, amount: 400 },

    // Bookings 24-25: CANCELLED (failed payments, different hotels)
    { user: users[24], hotelId: grandHotel, roomId: 24, status: 'CANCELLED', daysFromNow: -3, stayNights: 2, guests: 2, amount: 300 },
    { user: users[25], hotelId: beachResort, roomId: 25, status: 'CANCELLED', daysFromNow: -2, stayNights: 3, guests: 2, amount: 450 },

    // Bookings 26-28: CANCELLED (refunded / partial refund, different hotels)
    { user: users[26], hotelId: mountainLodge, roomId: 26, status: 'CANCELLED', daysFromNow: -5, stayNights: 2, guests: 2, amount: 400 },
    { user: users[1],  hotelId: beachResort, roomId: 27, status: 'CANCELLED', daysFromNow: -1, stayNights: 3, guests: 2, amount: 450 },
    { user: users[2],  hotelId: mountainLodge, roomId: 28, status: 'CANCELLED', daysFromNow: -1, stayNights: 2, guests: 2, amount: 400 },

    // Bookings 29-30: COMPLETED stays, CAPTURED payments, NO reviews yet
    { user: users[14], hotelId: grandHotel, roomId: 29, status: 'CONFIRMED', daysFromNow: -10, stayNights: 2, guests: 2, amount: 300 },
    { user: users[15], hotelId: mountainLodge, roomId: 30, status: 'CONFIRMED', daysFromNow: -8,  stayNights: 2, guests: 2, amount: 400 },
  ]

  for (const def of bookingDefs) {
    const checkIn = new Date()
    checkIn.setDate(checkIn.getDate() + def.daysFromNow)
    checkIn.setHours(14, 0, 0, 0)

    const checkOut = new Date(checkIn)
    checkOut.setDate(checkOut.getDate() + def.stayNights)
    checkOut.setHours(11, 0, 0, 0)

    const expiresAt =
      def.status === 'PENDING'
        ? new Date(Date.now() + 30 * 60 * 1000)
        : def.status === 'EXPIRED'
          ? new Date(checkIn.getTime() - 24 * 60 * 60 * 1000)
          : null

    await prisma.booking.create({
      data: {
        userId: def.user.id,
        userEmail: def.user.email,
        hotelId: def.hotelId,
        roomId: def.roomId,
        checkIn,
        checkOut,
        bookingAmount: def.amount,
        status: def.status,
        totalGuests: def.guests,
        expiresAt,
      },
    })
  }

  console.log(`Created ${bookingDefs.length} bookings (22 confirmed, 2 pending, 6 cancelled)`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
