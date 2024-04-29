document.getElementById('location-form').addEventListener('submit', function(event) {
    event.preventDefault();
  
    const keyword = document.getElementById('keyword').value;
    const city = document.getElementById('city').value;
    const state = document.getElementById('state').value;
    // const apiKey = document.getElementById('api-key').value;
  
    // Hide form and show loading spinner
    document.getElementById('location-form').style.display = 'none';
    document.getElementById('loading-spinner').style.display = 'block';
  
    const fetchUrl = `http://localhost:8000/api/scrape?keyword=${encodeURIComponent(keyword)}&state=${encodeURIComponent(stateName)}&city=${encodeURIComponent(cityName)}`;
  
    fetch(mapsUrl)
      .then(response => response.json())
      .then(data => {
        const summaryElement = document.getElementById('summary');
        const csvButton = document.getElementById('download-csv');
  
        // Hide spinner and show results summary and download button
        document.getElementById('loading-spinner').style.display = 'none';
        document.getElementById('results-summary').style.display = 'block';
  
        if (data.results && data.results.length > 0) {
          summaryElement.textContent = `Found ${data.results.length} results.`;
  
          // Prepare CSV data and URL
          const csvData = convertResultsToCSV(data.results);
          const blob = new Blob([csvData], { type: 'text/csv' });
          const url = window.URL.createObjectURL(blob);
  
          csvButton.href = url;
          csvButton.download = `${city}-${state}-${keyword}-businesses.csv`;
        } else {
          summaryElement.textContent = 'No results found.';
          csvButton.style.display = 'none'; // Hide the button if no data
        }
      })
      .catch(error => {
        console.error('Error fetching data from Google Maps API:', error);
        document.getElementById('summary').textContent = 'Error fetching results.';
        document.getElementById('results-summary').style.display = 'none'; // Hide results summary on error
      });
  });
  
  function convertResultsToCSV(results) {
    const header = "Name,Address\n";
    const rows = results.map(result => `"${result.name}","${result.formatted_address}"`);
    return header + rows.join("\n");
  }
  