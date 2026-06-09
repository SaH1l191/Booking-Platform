import type { QueryInterface } from "sequelize";

module.exports = {
  async up(queryInterface: QueryInterface): Promise<void> {
    // Add amenities to existing hotels
    await queryInterface.sequelize.query(`
      UPDATE hotels SET amenities = '["Free WiFi", "Pool", "Spa", "Gym", "Restaurant"]' WHERE id = 1;
    `);
    await queryInterface.sequelize.query(`
      UPDATE hotels SET amenities = '["Free WiFi", "Beach Access", "Pool", "Bar", "Water Sports"]' WHERE id = 2;
    `);
    await queryInterface.sequelize.query(`
      UPDATE hotels SET amenities = '["Free WiFi", "Fireplace", "Ski Access", "Hot Tub", "Hiking Trails"]' WHERE id = 3;
    `);
    await queryInterface.sequelize.query(`
      UPDATE hotels SET amenities = '["Free WiFi", "Gym", "Restaurant", "Business Center", "Parking"]' WHERE id = 4;
    `);
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.sequelize.query(`
      UPDATE hotels SET amenities = NULL WHERE id IN (1, 2, 3, 4);
    `);
  },
};
