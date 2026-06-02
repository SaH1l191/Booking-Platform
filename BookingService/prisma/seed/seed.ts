import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  console.log('Starting seed...')
  
  const hotelData = [
    { name: 'Grand Hotel', address: '123 Luxury Ave, New York', location: 'New York', rating: 4.5, ratingCount: 120 },
    { name: 'Beach Resort', address: '456 Ocean Blvd, Miami', location: 'Miami', rating: 4.2, ratingCount: 85 },
    { name: 'Mountain Lodge', address: '789 Peak St, Denver', location: 'Denver', rating: 4.0, ratingCount: 60 }
  ]

  for (const hotel of hotelData) {
    await prisma.hotel.upsert({
      where: { name: hotel.name },
      update: hotel,
      create: hotel
    })
  }
  
  console.log('Created/updated sample hotels')
  
  // Get the hotel IDs
  const hotelRecords = await prisma.hotel.findMany()
  const hotelIds = hotelRecords.map(h => h.id)
  
  // Create room categories for each hotel if they don't exist
  const roomTypes = ['SINGLE', 'DOUBLE', 'FAMILY', 'DELUXE', 'SUITE']
  const prices = [100, 150, 250, 350, 500]
  
  for (const hotelId of hotelIds) {
    for (let i = 0; i < roomTypes.length; i++) {
      await prisma.roomCategory.upsert({
        where: { 
          hotelId_roomType: {
            hotelId: hotelId,
            roomType: roomTypes[i]
          }
        },
        update: { price: prices[i], roomCount: 10 },
        create: {
          roomType: roomTypes[i],
          price: prices[i],
          hotelId: hotelId,
          roomCount: 10
        }
      });
    }
  }
  
  console.log(`Created/updated room categories for ${hotelIds.length} hotels`)
  
  // Get all room category IDs
  const categoryRecords = await prisma.roomCategory.findMany()
  const categoryIds = categoryRecords.map(c => c.id)
  
  // Create sample rooms for each hotel if they don't exist (2 rooms per category)
  for (const hotelId of hotelIds) {
    // Get categories for this hotel
    const hotelCategories = await prisma.roomCategory.findMany({
      where: { hotelId: hotelId }
    });
    
    for (const category of hotelCategories) {
      // Create two rooms per category with unique room numbers
      const roomNum1 = Math.floor(Math.random() * 900) + 100;
      const roomNum2 = Math.floor(Math.random() * 900) + 100;
      
      // Ensure room numbers are unique
      let roomNum2Unique = roomNum2;
      while (roomNum2Unique === roomNum1) {
        roomNum2Unique = Math.floor(Math.random() * 900) + 100;
      }
      
      await prisma.room.upsert({
        where: { 
          hotelId_roomNo: {
            hotelId: hotelId,
            roomNo: roomNum1
          }
        },
        update: { roomCategoryId: category.id },
        create: {
          hotelId: hotelId,
          roomNo: roomNum1,
          roomCategoryId: category.id
        }
      });
      
      await prisma.room.upsert({
        where: { 
          hotelId_roomNo: {
            hotelId: hotelId,
            roomNo: roomNum2Unique
          }
        },
        update: { roomCategoryId: category.id },
        create: {
          hotelId: hotelId,
          roomNo: roomNum2Unique,
          roomCategoryId: category.id
        }
      });
    }
  }
  
  console.log(`Created/updated rooms for ${hotelIds.length} hotels`)
  
  // Get all room IDs
  const roomRecords = await prisma.room.findMany()
  const roomIds = roomRecords.map(r => r.id)
  
  // Create confirmed bookings for users 57-84 (from AuthService)
  // Using user IDs 57-84 as referenced in the question
  const userIds = Array.from({length: 28}, (_, i) => 57 + i); // 57 to 84
  
  // Create bookings for each user
  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    const roomId = roomIds[i % roomIds.length]; // Cycle through rooms
    
    // Get room details to find hotel
    const room = await prisma.room.findUnique({
      where: { id: roomId }
    });
    
    // Calculate dates (check-in tomorrow, check-out 3 days later)
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 1);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 3);
    
    await prisma.booking.upsert({
      where: { 
        userId_checkIn: {
          userId: userId,
          checkIn: checkIn
        }
      },
      update: {
        hotelId: room.hotelId,
        roomId: roomId,
        checkOut: checkOut,
        status: 'CONFIRMED',
        totalGuests: 2,
        bookingAmount: 300, // $300 for 3 nights
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expires in 24 hours
      },
      create: {
        userId: userId,
        hotelId: room.hotelId,
        roomId: roomId,
        checkIn: checkIn,
        checkOut: checkOut,
        status: 'CONFIRMED',
        totalGuests: 2,
        bookingAmount: 300, // $300 for 3 nights
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // Expires in 24 hours
      }
    });
  }
  
  console.log(`Created/updated ${userIds.length} confirmed bookings`)
  
  // Create room availability entries for booked rooms
  for (let i = 0; i < userIds.length; i++) {
    const userId = userIds[i];
    const roomId = roomIds[i % roomIds.length];
    const checkIn = new Date();
    checkIn.setDate(checkIn.getDate() + 1);
    const checkOut = new Date(checkIn);
    checkOut.setDate(checkOut.getDate() + 3);
    
    // Create availability entries for each night of the stay
    let currentDate = new Date(checkIn);
    while (currentDate < checkOut) {
      await prisma.roomAvailability.upsert({
        where: { 
          roomId_date: {
            roomId: roomId,
            date: currentDate
          }
        },
        update: { status: 'booked' },
        create: {
          roomId: roomId,
          date: currentDate,
          status: 'booked'
        }
      });
      
      // Move to next day
      currentDate.setDate(currentDate.getDate() + 1);
    }
  }
  
  console.log('Created/updated room availability entries')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })