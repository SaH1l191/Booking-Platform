import type { QueryInterface } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface: QueryInterface): Promise<void>  {
    await queryInterface.sequelize.query(
      `ALTER TABLE hotels
      ADD COLUMN rating DECIMAL(3,2) DEFAULT NULL,
      ADD COLUMN rating_count INT DEFAULT NULL`
    )
  },

  async down (queryInterface: QueryInterface, Sequelize: any) {
    await queryInterface.sequelize.query(
      `
      ALTER TABLE hotels
      DROP COLUMN rating,
      DROP COLUMN rating_count
      `
    )
  }
};
