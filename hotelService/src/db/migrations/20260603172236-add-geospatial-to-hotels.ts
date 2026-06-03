import { DataTypes, type QueryInterface } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface: QueryInterface) {
    await queryInterface.addColumn('hotels', 'latitude', {
      type: DataTypes.DECIMAL(10, 8),
      allowNull: true,
    });
    await queryInterface.addColumn('hotels', 'longitude', {
      type: DataTypes.DECIMAL(11, 8),
      allowNull: true,
    });
  },

  async down(queryInterface: QueryInterface) {
    await queryInterface.removeColumn('hotels', 'latitude');
    await queryInterface.removeColumn('hotels', 'longitude');
  }
};
