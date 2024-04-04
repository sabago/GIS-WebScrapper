import React, { useState, useEffect } from 'react';
import { GoogleMap, useLoadScript, Polygon } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = process.env.REACT_GOOGLE_MAPS_API_KEY;

const mapContainerStyle = {
  height: '100vh',
  width: '100%',
};

const center = {
  lat: 42.407211, // Approximate latitude for Massachusetts
  lng: -71.382439, // Approximate longitude for Massachusetts
};

const MapComponent = () => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey:GOOGLE_MAPS_API_KEY,
  });

  const [gridData, setGridData] = useState([]);

  useEffect(() => {
    // Fetch the grid data from the backend
    const fetchGridData = async () => {
      const response = await fetch('http://localhost:8888/api/grid?stateName=Massachusetts');
      const data = await response.json();
      setGridData(data);
    };

    fetchGridData();
  }, []);

  if (loadError) return "Error loading maps";
  if (!isLoaded) return "Loading Maps";

  // const handleGridClick = (grid) => {
  //   console.log('Grid clicked:', grid);
  //   // You can log any specific information about the grid here
  // };

  const handleGridClick = async (grid) => {
    // Convert the grid object to a JSON string
    const gridJson = JSON.stringify({
      north: grid.north,
      south: grid.south,
      east: grid.east,
      west: grid.west,
    });
  
    const keyword = "landscaping"; 

    const response = await fetch(`http://localhost:8888/api/scrape?grid=${encodeURIComponent(gridJson)}&keyword=${encodeURIComponent(keyword)}`);
    const data = await response.json();
  
    console.log('Scraped data:', data);
  };
  
  
  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      zoom={7}
      center={center}
    >
      {gridData.map((grid, index) => (
        <Polygon
          key={index}
          paths={[
            { lat: grid.north, lng: grid.west },
            { lat: grid.north, lng: grid.east },
            { lat: grid.south, lng: grid.east },
            { lat: grid.south, lng: grid.west },
          ]}
          options={{
            fillColor: "orange",
            fillOpacity: 0.5,
            strokeColor: "green",
            strokeOpacity: 1,
            strokeWeight: 2,
          }}
          onClick={() => handleGridClick(grid)}
        />
      ))}
    </GoogleMap>
  );
};

export default MapComponent;
