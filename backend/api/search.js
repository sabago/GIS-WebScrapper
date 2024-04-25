const GOOGLE_MAPS_API_KEY = process.env.GOOGLE_MAPS_API_KEY;

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

  function milesToDegrees(miles, axis, lat = 0) {
    const earthRadius = 3958.8; // in miles
    if (axis === 'lat') {
        return (miles / earthRadius) * (180 / Math.PI);
    } else if (axis === 'lng') {
        return (miles / earthRadius) * (180 / Math.PI) / Math.cos(lat * Math.PI / 180);
    }
}

// This command should return the bounding coordinates for a 25-mile radius around the center of San Francisco
// curl "http://localhost:8888/search?state=California&keyword=landscaping"
