const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'geowebscrapper',
  password: 'graphene',
  port: 5432,
});

async function getStateBoundaries(stateName) {
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
    
async function generateGrid(boundaries, stateName) {
    const { northernmost, southernmost, easternmost, westernmost } = boundaries[0];
    const cellSizeLat = 44 / 69;
    const medianLat = (northernmost + southernmost) / 2;
    const cellSizeLng = 44 / (69 * Math.cos(medianLat * Math.PI / 180));
    const grid = [];
    const queries = [];
  
    for (let lat = northernmost; lat < southernmost; lat += cellSizeLat) {
      for (let lng = easternmost; lng < westernmost; lng += cellSizeLng) {
            const cellCenterLat = lat + cellSizeLat / 2;
            const cellCenterLng = lng + cellSizeLng / 2;
           // const query = `SELECT ST_Contains((SELECT geom FROM "states-shapes" WHERE name = '${stateName}'), ST_SetSRID(ST_Point(${cellCenterLng}, ${cellCenterLat}), 4326)) AS is_within;`;
         
                   const query = `
        SELECT ST_Intersects(
          (SELECT geom FROM "states-shapes" WHERE name = 'Massachusetts'),
          ST_SetSRID(ST_MakeEnvelope(${cellWestLng}, ${cellSouthLat}, ${cellEastLng}, ${cellNorthLat}), 4326)
        ) AS is_within;
      `;  
        queries.push(pool.query(query));
      }
    }
    const results = await Promise.all(queries);
    results.forEach((result, index) => {
      if (result.rows[0].is_within) {
        let latIndex = Math.floor(index / ((westernmost - easternmost) / cellSizeLng));
        let lngIndex = index % ((westernmost - easternmost) / cellSizeLng);
        let lat = northernmost + latIndex * cellSizeLat;
        let lng = easternmost+ lngIndex * cellSizeLng;
        grid.push({ id: index + 1, north: lat + cellSizeLat, south: lat, east: lng + cellSizeLng, west: lng });
      }
    });
  
    console.log(grid);
    return grid;
  }

module.exports.getStateBoundaries = getStateBoundaries