import type { QueryInterface } from "sequelize";

module.exports = {
  async up(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.bulkDelete("hotel_images", {}, {});
    const now = new Date();

    await queryInterface.bulkInsert("hotel_images", [
      // Grand Hotel (id: 1)
      { id: 1,  hotel_id: 1, url: "https://images.unsplash.com/photo-1566073771259-6a8506099945?w=800", alt_text: "Grand Hotel exterior", display_order: 0, created_at: now },
      { id: 2,  hotel_id: 1, url: "https://images.unsplash.com/photo-1582719508461-905c673771fd?w=800", alt_text: "Grand Hotel lobby", display_order: 1, created_at: now },
      { id: 3,  hotel_id: 1, url: "https://images.unsplash.com/photo-1590490360182-c33d57733427?w=800", alt_text: "Grand Hotel suite", display_order: 2, created_at: now },
      { id: 4,  hotel_id: 1, url: "https://images.unsplash.com/photo-1584132967334-10e028bd69f7?w=800", alt_text: "Grand Hotel pool", display_order: 3, created_at: now },

      // Seaside Resort (id: 2)
      { id: 5,  hotel_id: 2, url: "https://images.unsplash.com/photo-1520250497591-112f2f40a3f4?w=800", alt_text: "Seaside Resort beach view", display_order: 0, created_at: now },
      { id: 6,  hotel_id: 2, url: "https://images.unsplash.com/photo-1571896349842-33c89424de2d?w=800", alt_text: "Seaside Resort pool", display_order: 1, created_at: now },
      { id: 7,  hotel_id: 2, url: "https://images.unsplash.com/photo-1584132915807-fd1f5fbc078f?w=800", alt_text: "Seaside Resort room", display_order: 2, created_at: now },
      { id: 8,  hotel_id: 2, url: "https://images.unsplash.com/photo-1551882547-ff40c63fe5fa?w=800", alt_text: "Seaside Resort restaurant", display_order: 3, created_at: now },
      { id: 9,  hotel_id: 2, url: "https://images.unsplash.com/photo-1540541338287-41700207dee6?w=800", alt_text: "Seaside Resort spa", display_order: 4, created_at: now },

      // Mountain Lodge (id: 3)
      { id: 10, hotel_id: 3, url: "https://images.unsplash.com/photo-1518602164578-cd0074062767?w=800", alt_text: "Mountain Lodge exterior", display_order: 0, created_at: now },
      { id: 11, hotel_id: 3, url: "https://images.unsplash.com/photo-1470770841497-7b3200e18cdb?w=800", alt_text: "Mountain Lodge fireplace", display_order: 1, created_at: now },
      { id: 12, hotel_id: 3, url: "https://images.unsplash.com/photo-1520986606214-8b456906c813?w=800", alt_text: "Mountain Lodge bedroom", display_order: 2, created_at: now },

      // City Center Inn (id: 4)
      { id: 13, hotel_id: 4, url: "https://images.unsplash.com/photo-1564501049412-61c2a3083791?w=800", alt_text: "City Center Inn exterior", display_order: 0, created_at: now },
      { id: 14, hotel_id: 4, url: "https://images.unsplash.com/photo-1590381105924-c72589b1ef3f?w=800", alt_text: "City Center Inn room", display_order: 1, created_at: now },
      { id: 15, hotel_id: 4, url: "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=800", alt_text: "City Center Inn bathroom", display_order: 2, created_at: now },
      { id: 16, hotel_id: 4, url: "https://images.unsplash.com/photo-1571003123894-1f0594d2b5d9?w=800", alt_text: "City Center Inn lounge", display_order: 3, created_at: now },
    ], { raw: true });
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.bulkDelete("hotel_images", {}, {});
  },
};
