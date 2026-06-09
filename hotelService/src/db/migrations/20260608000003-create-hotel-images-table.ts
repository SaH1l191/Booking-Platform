import { QueryInterface } from 'sequelize';

module.exports = {
  async up(queryInterface: QueryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS hotel_images (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hotel_id INT NOT NULL,
        url VARCHAR(500) NOT NULL,
        alt_text VARCHAR(255) NULL,
        display_order INT NOT NULL DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    await queryInterface.addConstraint('hotel_images', {
      type: 'foreign key',
      name: 'hotel_images_hotel_fkey',
      fields: ['hotel_id'],
      references: {
        table: 'hotels',
        field: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  },

  async down(queryInterface: QueryInterface) {
    await queryInterface.removeConstraint('hotel_images', 'hotel_images_hotel_fkey');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS hotel_images;');
  },
};
