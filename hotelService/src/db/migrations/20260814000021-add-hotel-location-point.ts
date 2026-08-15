import type { QueryInterface } from 'sequelize';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface: QueryInterface): Promise<void> {
    /*
     * location_point is NOT NULL because MySQL requires every
     * column in a SPATIAL index to be NOT NULL.
     *
     * (0,0) is used as the initial default for hotels that don't
     * yet have coordinates.
     */
    await queryInterface.sequelize.query(`
      ALTER TABLE hotels
      ADD COLUMN location_point POINT SRID 4326 NOT NULL
      DEFAULT (ST_SRID(POINT(0, 0), 4326));
    `);

    /*
     * Replace the default point with the real hotel coordinates
     * wherever latitude and longitude are available.
     *
     * GeoJSON/MySQL POINT order is:
     * POINT(longitude, latitude)
     */
    await queryInterface.sequelize.query(`
      UPDATE hotels
      SET location_point = ST_SRID(
        POINT(longitude, latitude),
        4326
      )
      WHERE latitude IS NOT NULL
        AND longitude IS NOT NULL;
    `);

    /*
     * Create the spatial index only after location_point is
     * confirmed as NOT NULL.
     */
    await queryInterface.sequelize.query(`
      CREATE SPATIAL INDEX idx_hotels_location_point
      ON hotels (location_point);
    `);
  },

  async down(queryInterface: QueryInterface): Promise<void> {
    await queryInterface.sequelize.query(`
      DROP INDEX idx_hotels_location_point
      ON hotels;
    `);

    await queryInterface.sequelize.query(`
      ALTER TABLE hotels
      DROP COLUMN location_point;
    `);
  },
};
