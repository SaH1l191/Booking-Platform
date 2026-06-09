import type { QueryInterface } from "sequelize";

module.exports = {
  async up(queryInterface: QueryInterface): Promise<void> {
    const now = new Date();

    await queryInterface.bulkInsert("hotel_categories", [
      // Grand Hotel (NYC) → Modern, Historic
      { id: 1, hotel_id: 1, category_id: 13, created_at: now },
      { id: 2, hotel_id: 1, category_id: 12, created_at: now },
      // Seaside Resort (Miami) → Beachfront, Tropical
      { id: 3, hotel_id: 2, category_id: 1,  created_at: now },
      { id: 4, hotel_id: 2, category_id: 9,  created_at: now },
      // Mountain Lodge (Denver) → Mountain, Cabin
      { id: 5, hotel_id: 3, category_id: 7,  created_at: now },
      { id: 6, hotel_id: 3, category_id: 4,  created_at: now },
      // City Center Inn (Chicago) → Modern
      { id: 7, hotel_id: 4, category_id: 13, created_at: now },
    ]);
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.bulkDelete("hotel_categories", {}, {});
  },
};
