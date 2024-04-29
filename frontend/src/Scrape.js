import React, { useState, useEffect } from 'react';
import InputsForm from './InputsForm';

const convertToCSV = (objArray) => {
    const array = typeof objArray !== 'object' ? JSON.parse(objArray) : objArray;
    let str = `${Object.keys(array[0]).map(value => `"${value}"`).join(",")}\r\n`;

    return array.reduce((str, next) => {
        str += `${Object.values(next).map(value => `"${value}"`).join(",")}\r\n`;
        return str;
    }, str);
};


const ScrapeComponent = () => {
  const [searchInputs, setSearchInputs] = useState(null);
  const [searchResults, setSearchResults] = useState(null);
  const [isLoading, setIsLoading] = useState(false)

  const stateName = searchInputs?.usState;
  const cityName = searchInputs?.city;
  const keyword = searchInputs?.keyword;

  const handleLocationSubmit = (data) => {
    setSearchInputs(data);
  };

  const downloadCSV = () => {
    const csvData = convertToCSV(searchResults);
    const blob = new Blob([csvData], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${keyword}-businesses-${cityName}-${stateName}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

  useEffect(() => {
    // Fetch the grid data from the backend
    const fetchGridData = async () => {
      setIsLoading(true)
      const response = await fetch(`http://localhost:8000/api/scrape?keyword=${encodeURIComponent(keyword)}&state=${encodeURIComponent(stateName)}&city=${encodeURIComponent(cityName)}`);
      const data = await response.json();
      setSearchResults(data);
    };

    if( stateName && cityName && keyword) {
        fetchGridData();
    }
  }, [cityName, keyword, stateName]);

  useEffect(()=> {
    if(searchResults && isLoading) {
      setIsLoading(false)
    }
  }, [searchResults])

  return (
    <div>
      {!searchInputs ? (<InputsForm onSubmit={handleLocationSubmit} />) 
      :searchInputs && !isLoading && !searchResults? (
        <div>
          <h3>Form Submitted</h3>
          <p>Keyword: {searchInputs.keyword}</p>
          <p>US State: {searchInputs.usState}</p>
          <p>City: {searchInputs.city}</p>
        </div>
      ) : isLoading  && searchInputs && !searchResults? (
        <div>Loading business data...</div>
      ): <div>
        <h3>{searchResults?.length} {keyword} businesses found in {cityName}, {stateName}</h3>
        <button onClick={downloadCSV}> Download CSV</button>
        </div>}
    </div>
  );
};

export default ScrapeComponent;
