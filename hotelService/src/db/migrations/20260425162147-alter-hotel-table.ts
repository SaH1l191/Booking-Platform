import type { QueryInterface } from 'sequelize';
 
/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.sequelize.query(`
      ALTER TABLE hotels
        CHANGE createdAt created_at DATETIME,
        CHANGE updatedAt updated_at DATETIME;
    `);
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.sequelize.query(`
        ALTER TABLE hotels
        CHANGE created_at createdAt DATETIME,
        CHANGE updated_at updatedAt DATETIME;
    `);
  },
};