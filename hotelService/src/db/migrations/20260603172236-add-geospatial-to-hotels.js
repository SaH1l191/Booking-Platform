'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('hotels', 'latitude', {
      type: Sequelize.DECIMAL(10, 8),
      allowNull: true,
    });
    await queryInterface.addColumn('hotels', 'longitude', {
      type: Sequelize.DECIMAL(11, 8),
      allowNull: true,
    });
    await queryInterface.addColumn('hotels', 'coordinates', {
      type: Sequelize.GEOMETRY('POINT'),
      allowNull: true,
    });

    //  make 'coordinates' NOT NULL.
    await queryInterface.addIndex('hotels', {
      fields: ['coordinates'],
      type: 'SPATIAL',
      name: 'hotels_coordinates_spatial'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeIndex('hotels', 'hotels_coordinates_spatial');
    await queryInterface.removeColumn('hotels', 'latitude');
    await queryInterface.removeColumn('hotels', 'longitude');
    await queryInterface.removeColumn('hotels', 'coordinates');
  }
};
