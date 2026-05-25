import type { QueryInterface } from 'sequelize';

module.exports = {
  async up(queryInterface: QueryInterface) {
    await queryInterface.addConstraint('room_availabilities', {
      fields: ['room_id', 'date'],
      type: 'unique',
      name: 'unique_room_date',
    });
  },
  async down(queryInterface: QueryInterface) {
    await queryInterface.removeConstraint('room_availabilities', 'unique_room_date');
  },
};