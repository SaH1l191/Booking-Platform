import { DataTypes, type QueryInterface } from 'sequelize';


/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.addColumn('hotels', 'deleted_at', {
      type: DataTypes.DATE,
      allowNull: true,
      defaultValue: null
    })
  }, 
  async down(queryInterface: QueryInterface) {
    await queryInterface.removeColumn('hotels', 'deleted_at');
  },
};