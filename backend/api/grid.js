const { Pool } = require('pg');

const path = require('path');
require("dotenv").config({
  path: (path.join(__dirname, '../.env'))
});

const postgres_db = process.env.POSTGRESQL_DB
const postgres_pass = process.env.POSTGRESQL_PASS

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: postgres_db,
  password: postgres_pass,
  port: 5432,
});

module.exports.getStateBoundaries = async function getStateBoundaries(stateName) {
  try {
    const query = `
      SELECT
        ST_Y(ST_PointN(ST_ExteriorRing(ST_Envelope(geom)), 1)) AS northernmost,
        ST_Y(ST_PointN(ST_ExteriorRing(ST_Envelope(geom)), 3)) AS southernmost,
        ST_X(ST_PointN(ST_ExteriorRing(ST_Envelope(geom)), 2)) AS easternmost,
        ST_X(ST_PointN(ST_ExteriorRing(ST_Envelope(geom)), 4)) AS westernmost
      FROM
        "states-shapes"
      WHERE
        name = $1;
    `;

        // Using parameterized query for security
        const values = [stateName];
        const res = await pool.query(query, values);
        return res.rows.length > 0 ? res.rows : null;
  } catch (err) {
    console.error(err);
    return null;
  }
}
    
module.exports.generateGrid = async function generateGrid(boundaries, stateName) {
  const { northernmost, southernmost, easternmost, westernmost } = boundaries[0];
  const stateHeight = Math.abs(northernmost - southernmost);
  const stateWidth = Math.abs(easternmost - westernmost);

  // Dynamic cell size adjustment
  const baseCellSize = 44 / 69; // Base size for larger states
  let cellSizeLat = baseCellSize;
  let cellSizeLng = baseCellSize;

  // Adjust cell size for smaller/narrower states
  if (stateHeight < 2 || stateWidth < 2) { // Thresholds in degrees for smaller states
    cellSizeLat *= 0.5; // Use smaller cells for height
    cellSizeLng *= 0.5; // Use smaller cells for width
  }

  const medianLat = (northernmost + southernmost) / 2;
  cellSizeLng = cellSizeLng / Math.cos(medianLat * Math.PI / 180); // Adjust for longitude at state's median latitude

  const grid = [];
  const queries = [];

  for (let lat = northernmost; lat < southernmost; lat += cellSizeLat) {
    for (let lng = easternmost; lng < westernmost; lng += cellSizeLng) {
      const cellCenterLat = lat + cellSizeLat / 2;
      const cellCenterLng = lng + cellSizeLng / 2;

     //const query = `SELECT ST_Contains((SELECT geom FROM "states-shapes" WHERE name = '${stateName}'), ST_SetSRID(ST_Point(${cellCenterLng}, ${cellCenterLat}), 4326)) AS is_within;`;
     
     const query = `SELECT ST_Contains((SELECT geom FROM "states-shapes" WHERE name = '${stateName}'), ST_Buffer(ST_SetSRID(ST_Point(${cellCenterLng}, ${cellCenterLat}), 4326), 0.01)) AS is_within;`;
      queries.push(pool.query(query));
    }
  }

  const results = await Promise.all(queries);
  results.forEach((result, index) => {
    if (result.rows[0].is_within) {
      let latIndex = Math.floor(index / ((westernmost - easternmost) / cellSizeLng));
      let lngIndex = index % ((westernmost - easternmost) / cellSizeLng);
      let lat = northernmost + latIndex * cellSizeLat;
      let lng = easternmost + lngIndex * cellSizeLng;
      let gridId = index+1
      grid.push({ id: gridId, name: stateName+'-'+gridId, is_scraped: false, north: lat + cellSizeLat, south: lat, east: lng + cellSizeLng, west: lng });
    }
  });

  // console.log(grid);
  return grid;
}

// To fix  this error: "connection failed: :1), port 5432 failed: FATAL: role "postgres" does not exist"
// brew install postgresql
// createuser -s postgres
// brew services restart postgresql