require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const { spawn } = require('child_process');
const { getStateBoundaries, generateGrid } = require('./grid');

const path = require('path');
const scriptPath = path.join(__dirname, 'scraper.py');


const app = express();
const port = 8000;

// Enable CORS
app.use(cors()); 

// API endpoint to get grid data for a state
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
app.get('/api/scrape', (req, res) => {
   // Disable caching for this endpoint
   res.set('Cache-Control', 'no-store');
  const { keyword, grid } = req.query;

  if (!keyword || !grid) {
    return res.status(400).send({ error: 'Keyword and grid parameters are required' });
  }

  // Define the command to run your Python script
  const pythonCommand = 'python'; // or 'python3' depending on your environment
  // const scriptPath = 'backend/python/scraper.py';

  // Spawn a child process to run your Python script
  const process = spawn(pythonCommand, [scriptPath, keyword, grid]);

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

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});
