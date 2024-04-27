const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { spawn } = require('child_process');
const { getStateBoundaries, generateGrid } = require('./grid');

const path = require('path');
const e = require('express');
require("dotenv").config({
  path: (path.join(__dirname, '../.env'))
});
const scriptPath = path.join(__dirname, 'scraper.py');

const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

const app = express();
const port = 8000;

// Enable CORS
app.use(cors()); 

// API endpoint to get grid data for a state
// curl "http://localhost:8000/api/grid?stateName=California"
app.get('/api/grid', async (req, res) => {
  const stateName = req.query.stateName;
  if(!stateName) {
    return res.status(404).json({ error: 'State is required' });
  }
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


// API endpoint to scrape businesses
// curl "http://localhost:8000/api/scrape?keyword=landscaping&city=austin&state=Texas"
// curl "http://localhost:8000/api/scrape?keyword=landscaping&grid=%7B%22north%22%3A42.781255898550725%2C%22south%22%3A42.46241531884058%2C%22east%22%3A-71.36323935214256%2C%22west%22%3A-71.79253080465172%7D"
app.get('/api/scrape', (req, res) => {
   // Disable caching for this endpoint
   res.set('Cache-Control', 'no-store');

  const { keyword, grid, state, city } = req.query;
  if (!keyword) {
    return res.status(400).send({ error: 'Keyword is required' });
  }

  // Define the command to run your Python script
  const pythonCommand = 'python'; // or 'python3' depending on your environment
  // const scriptPath = 'backend/python/scraper.py';
  // Spawn a child process to run your Python script
  // const csvPath = `${city}-${state}-businesses.csv`
  const process = spawn(pythonCommand, [scriptPath, city, state, keyword, grid]);

  let data = '';
  process.stdout.on('data', (chunk) => {
    data += chunk.toString(); // Convert Buffer to string
  });

  let errorOutput = '';
  process.stderr.on('data', (chunk) => {
    console.error(`stderr: ${chunk.toString()}`);
    errorOutput += chunk.toString();
  });

  process.on('close', (code) => {
    if (code !== 0) {
      return res.status(500).send({ error: 'Failed to execute Python script' });
    }
    try {
      const jsonData = JSON.parse(data);
      res.json(jsonData);
    } catch (error) {
      console.error('Failed to parse Python script output:', error);
      res.status(500).send({ error: 'Failed to parse Python script output' });
    }
  });
});

// This command should return the bounding coordinates for a 25-mile radius around the center of California
// curl "http://localhost:8888/search?state=California"
app.get('/api/search', async (req, res) => {
    const { city, state, country } = req.query;
  
    if (!state) {
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

 const milesToDegrees = (miles, axis, lat = 0) => {
    const earthRadius = 3958.8; // in miles
    if (axis === 'lat') {
        return (miles / earthRadius) * (180 / Math.PI);
    } else if (axis === 'lng') {
        return (miles / earthRadius) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);
    }
}

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
