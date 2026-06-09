import { QueryInterface } from 'sequelize';

module.exports = {
  async up(queryInterface: QueryInterface) {
    await queryInterface.sequelize.query(`
      CREATE TABLE IF NOT EXISTS likes (
        id INT AUTO_INCREMENT PRIMARY KEY,
        user_id BIGINT UNSIGNED NOT NULL,
        hotel_id INT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE KEY unique_user_hotel (user_id, hotel_id)
      );
    `);

    await queryInterface.addConstraint('likes', {
      type: 'foreign key',
      name: 'likes_hotel_fkey',
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
    await queryInterface.removeConstraint('likes', 'likes_hotel_fkey');
    await queryInterface.sequelize.query('DROP TABLE IF EXISTS likes;');
  },
};
