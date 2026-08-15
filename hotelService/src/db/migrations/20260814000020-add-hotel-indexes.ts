import type { QueryInterface } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.sequelize.query(`
      CREATE INDEX idx_hotels_lat_lng
      ON hotels (latitude, longitude);
    `);

    await queryInterface.sequelize.query(`
      CREATE INDEX idx_rc_hotel_price
      ON room_categories (
        hotel_id,
        price,
        deleted_at
      );
    `);
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.sequelize.query(`
      DROP INDEX idx_hotels_lat_lng
      ON hotels;
    `);

    await queryInterface.sequelize.query(`
      DROP INDEX idx_rc_hotel_price
      ON room_categories;
    `);
  },
};
