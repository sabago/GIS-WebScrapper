require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { spawn } = require('child_process');
// const {getStateBoundaries} = require('getStateBoundaries');
// const generateGrid = require('generateGrid');
// import { getStateBoundaries } from './grid';
const app = express();
const port = 8888;

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

// Enable CORS
app.use(cors()); 

const { Pool } = require('pg');

const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'geowebscrapper',
  password: 'graphene',
  port: 5432,
});

// API endpoint to get grid data for a state
app.get('/api/grid', async (req, res) => {
  const stateName = req.query.stateName;
  try {
    const boundaries = await getStateBoundaries(stateName);
    if (!boundaries) {
      return res.status(404).json({ error: 'State boundaries not found' });
    }
    const grid = await generateGrid(boundaries, stateName);
    res.json(grid);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Internal server error' });
  }
});


// API endpoint to trigger the scraping
app.get('/api/scrape', (req, res) => {
  const { grid, keyword } = req.query;  // Assuming grid is a JSON string and keyword is a string

  // Convert the grid JSON string to an object to validate it (optional but recommended)
  let gridObject;
  try {
    gridObject = JSON.parse(grid);
  } catch (error) {
    return res.status(400).json({ error: 'Invalid grid format' });
  }

  const pythonProcess = spawn('python', ['backend/python/scraper.py', JSON.stringify(gridObject), keyword]);

  let dataString = '';

  pythonProcess.stdout.on('data', (data) => {
    dataString += data.toString();
  });

  pythonProcess.stderr.on('data', (data) => {
    console.error(`stderr: ${data}`);
  });

  pythonProcess.on('close', (code) => {
    if (code !== 0) {
      return res.status(500).json({ error: 'Failed to execute Python script' });
    }
    try {
      const results = JSON.parse(dataString);
      res.json(results);
    } catch (error) {
      res.status(500).json({ error: 'Failed to parse Python script output' });
    }
  });
});


app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

function milesToDegrees(miles, axis, lat = 0) {
    const earthRadius = 3958.8; // in miles
    if (axis === 'lat') {
        return (miles / earthRadius) * (180 / Math.PI);
    } else if (axis === 'lng') {
        return (miles / earthRadius) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);
    }
}

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

     // const query = `SELECT ST_Contains((SELECT geom FROM "states-shapes" WHERE name = '${stateName}'), ST_SetSRID(ST_Point(${cellCenterLng}, ${cellCenterLat}), 4326)) AS is_within;`;
     
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
      grid.push({ id: index + 1, north: lat + cellSizeLat, south: lat, east: lng + cellSizeLng, west: lng });
    }
  });

  console.log(grid);
  return grid;
}

app.get('/search', async (req, res) => {
  const {keyword, city, state, country } = req.query;

  if (!state || !keyword) {
      return res.status(400).send('State and keyword are required');
  }

  const region = country|| 'us';

  try {
      // Use the Google Maps Geocoding API to get the latitude and longitude for the location
      const fullLocation = city? `${city}, ${state}, USA`:`${state}, USA`;
      const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(fullLocation)}&region=${region}&key=${GOOGLE_MAPS_API_KEY}`;
      const geocodeResponse = await axios.get(geocodeUrl);
      const geocodeData = geocodeResponse.data;

      if (geocodeData.status !== 'OK' || !geocodeData.results[0]) {
          return res.status(404).send('Location not found');
      }

      const { lat, lng } = geocodeData.results[0].geometry.location;

      // Calculate the bounding coordinates for a 25-mile radius
      const earthRadius = 3958.8; // Radius of the Earth in miles
      const radius = 25; // Radius in miles

      const north = lat + (radius / earthRadius) * (180 / Math.PI);
      const south = lat - (radius / earthRadius) * (180 / Math.PI);
      const east = lng + (radius / earthRadius) * (180 / Math.PI) / Math.cos(lat * Math.PI/180);
      const west = lng - (radius / earthRadius) * (180 / Math.PI) / Math.cos(lat * Math.PI/180);
              // Return the bounding coordinates of circular region
             // res.json({ north, south, east, west });

       // Determine the grid cell for the given point
      // For simplicity, assuming grid cell size is 28 miles (approximately the side length of a square with the same area as a 25-mile radius circle)
      // Adjust as necessary for latitude to maintain consistent area
      const cellSize = 28; // in miles, adjust based on latitude if needed
      const gridCellNorth = lat + milesToDegrees(cellSize / 2, 'lat');
      const gridCellSouth = lat - milesToDegrees(cellSize / 2, 'lat');
      const gridCellEast = lng + milesToDegrees(cellSize / 2, 'lng', lat);
      const gridCellWest = lng - milesToDegrees(cellSize / 2, 'lng', lat);
      // Return the bounding coordinates of the grid cell
      res.json({ north: gridCellNorth, south: gridCellSouth, east: gridCellEast, west: gridCellWest });

  } catch (error) {
      console.error(error);
      res.status(500).send('Internal Server Error');
  }
});