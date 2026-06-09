import { QueryInterface } from 'sequelize';

module.exports = {
  async up(queryInterface: QueryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS hotel_categories (
        id INT AUTO_INCREMENT PRIMARY KEY,
        hotel_id INT NOT NULL,
        category_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_hotel_category (hotel_id, category_id)
      );
    `);

    await queryInterface.addConstraint('hotel_categories', {
      type: 'foreign key',
      name: 'hotel_categories_hotel_fkey',
      fields: ['hotel_id'],
      references: {
        table: 'hotels',
        field: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });

    await queryInterface.addConstraint('hotel_categories', {
      type: 'foreign key',
      name: 'hotel_categories_category_fkey',
      fields: ['category_id'],
      references: {
        table: 'categories',
        field: 'id',
      },
      onDelete: 'CASCADE',
      onUpdate: 'CASCADE',
    });
  },

  async down(queryInterface: QueryInterface) {
    await queryInterface.removeConstraint('hotel_categories', 'hotel_categories_hotel_fkey');
    await queryInterface.removeConstraint('hotel_categories', 'hotel_categories_category_fkey');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS hotel_categories;');
  },
};
