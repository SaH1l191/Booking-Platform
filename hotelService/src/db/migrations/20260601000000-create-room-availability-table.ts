import type { QueryInterface } from 'sequelize';

module.exports = {
  async up(queryInterface: QueryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS room_availabilities (
        id INT AUTO_INCREMENT PRIMARY KEY,
        room_id INT NOT NULL,
        date DATE NOT NULL,
        booking_id INT NULL,
        status ENUM('available','booked') DEFAULT 'available',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        deleted_at TIMESTAMP NULL
      );
    `);
  },
  async down(queryInterface: QueryInterface) {
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS room_availabilities;');
  }
};