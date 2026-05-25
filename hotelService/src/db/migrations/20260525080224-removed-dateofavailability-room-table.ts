import { DataTypes, type QueryInterface } from 'sequelize';


/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.removeColumn('rooms', 'date_of_availability')
  },
  async down(queryInterface: QueryInterface) {
    await queryInterface.addColumn('rooms', 'date_of_availability', {
      type: DataTypes.DATE,
      allowNull: true
    });
  },
};