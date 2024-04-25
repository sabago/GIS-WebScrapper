import React, { useState, useEffect } from 'react';
import { GoogleMap, useLoadScript, Polygon } from '@react-google-maps/api';

const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY;

const mapContainerStyle = {
  height: '100vh',
  width: '100%',
};


const MapComponent = ({stateName}) => {
  const { isLoaded, loadError } = useLoadScript({
    googleMapsApiKey:GOOGLE_MAPS_API_KEY,
  });

  const [gridData, setGridData] = useState([]);
  const [center, setCenter] = useState({ lat: 0, lng: 0 });

  useEffect(() => {
    // Fetch the grid data from the backend
    const fetchGridData = async () => {
      const response = await fetch(`http://localhost:8000/api/grid?stateName=${encodeURIComponent(stateName)}`);
      const data = await response.json();
      setGridData(data);
    };

    fetchGridData();
  }, [stateName]);

  useEffect(() => {
    if(isLoaded){
    const geocoder = new window.google.maps.Geocoder();
    geocoder.geocode({ 'address': stateName }, (results, status) => {
      if (status === 'OK') {
        setCenter({
          lat: results[0].geometry.location.lat(),
          lng: results[0].geometry.location.lng(),
        });
      } else {
        console.error(`Geocode was not successful for the following reason: ${status}`);
      }
    });
  }
  }, [isLoaded, stateName]);

  if (loadError) return "Error loading maps";
  if (!isLoaded) return "Loading Maps";

  const handleGridClick = async (grid) => {
    console.log('Grid clicked:', grid);
  
    const gridJson = JSON.stringify({
      north: grid.north,
      south: grid.south,
      east: grid.east,
      west: grid.west,
    });
  
    const keyword = "dog walking";
  
    try {
      const url = `http://localhost:8000/api/scrape?grid=${encodeURIComponent(gridJson)}&keyword=${encodeURIComponent(keyword)}&t=${new Date().getTime()}`;
      // Log the URL to confirm it's dynamic
      console.log('Fetching URL:', url);
      const response = await fetch(url)
  
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
  
      const data = await response.json();
      console.log('Scraped data:', data);
    } catch (error) {
      console.error('Failed to fetch scraped data:', error);
    }
  };
  
  
  
  return (
    <GoogleMap
      mapContainerStyle={mapContainerStyle}
      zoom={7}
      center={center}
    >
      {gridData.map((mapGrid, index) => (
        <Polygon
          key={index}
          paths={[
            { lat: mapGrid.north, lng: mapGrid.west },
            { lat: mapGrid.north, lng: mapGrid.east },
            { lat: mapGrid.south, lng: mapGrid.east },
            { lat: mapGrid.south, lng: mapGrid.west },
          ]}
          options={{
            fillColor: "orange",
            fillOpacity: 0.5,
            strokeColor: "green",
            strokeOpacity: 1,
            strokeWeight: 2,
          }}
          onClick={() => handleGridClick(mapGrid)}
        />
      ))}
    </GoogleMap>
  );
};

export default MapComponent;
