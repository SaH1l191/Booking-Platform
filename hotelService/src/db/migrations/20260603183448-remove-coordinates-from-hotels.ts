import { type QueryInterface } from 'sequelize';

module.exports = {
  async up(queryInterface: QueryInterface) {
    // Already removed in previous state
  },

  async down(queryInterface: QueryInterface) {
    // No-op: we don't want coordinates back
  }
};
