[![npm version](https://badge.fury.io/js/npm.svg)](https://badge.fury.io/js/npm)

## Table of contents

- [GIS-Webscraper Backend](#gis-webscraper-backend)
    * [Table of contents](#table-of-contents)
    * [Search API Endpoint](#search-api-endpoint)
    * [Grid generation API Endpoint](#grid-generation-api-endpoint)
    * [Webscraper Script](#webscraper-script)

# GIS-WebScraper Backend

The backend contains 3 API endpoints and a Python webscraping script.

To learn more about the script and endpoints, please see [this README](../README.md)

Start the local backend by navigating to `/GeoWbescrapper/backend/api` and running  
`node app.js` in your termnal

## Search API endpoint

Returns bounding coordinates for a 25mile radius around the center of a given location (state or state and city)

*NB: REQUIRES GOOGLE MAPS API KEY. SET IT IN THE .env FILE AS `GOOGLE_MAPS_API_KEY=your-goole-maps-key`*

### Usage

 With the server running, navigate to `/GeoWbescrapper/backend/api` and run the following commands:

 - To create boundaries for a city within a state, use:

  `curl "http://localhost:8000/api/search?state=[statename]&city=[cityname]"`

e.g  
 `curl "http://localhost:8000/api/search?state=California&city=sanjose"`

 - To create boundaries around the center of the given state, use:

`curl "http://localhost:8000/api/search?state=[statename]"`

e.g  
`curl "http://localhost:8000/api/search?state=California"`

## Grid Generation API Endpoint

Returns 25 mi radius equivalent grids and their coordinates within a given state.

*NB: THIS ENDPOINT REQUIRES THE APPROPRIATE POSTGRESQL Database setup.*

### Usage

 With the server running, navigate to `/GeoWbescrapper/backend/api` and run the following command:

  `curl "http://localhost:8000/api/grid?stateName=[statename]"`

e.g  
 `curl "http://localhost:8000/api/grid?stateName=California"`

## Webscraper Script

### Usage

The backend does not need to be running in order for the script to be used on its own.

- If you want the scraper to open a chrome browser while running, comment out this line `options.add_argument('--headless')` in the python script

- Open the scraper python script (/backend/api/scraper.py) in an IDE and run it as per the Python instructions of that IDE

- For local scraping, make sure `Example usage` section is not commented out. Pass in variables such as `city` and `state` for gridless scrapping, and pass in `grid coordinates` instead as in the example for grid based scraping. both cases require a `keyword`.

NB: Pass either `city` and `state` or `grid_object` but not both for more controlled results.

- To scrape from the frontend UI, comment out the `Example usage` section, and ensure that the `def main function` is not commented out. And follow the frontend README instructions

- To run the scraper via the API endpoint locally, 

1. Make sure that the backend is running and navigate to `/GeoWbescrapper/backend/api`

2. comment out `Example usage` and ensure that the `def main function` is not commented out

3. Then run:

`curl "http://localhost:8000/api/scrape?keyword=landscaping&city=austin&state=Texas"` for grid-less scrapping. (Replace `keyword`, `city` and `state` values as needed )

or run the below for grid-based scraping. NB: The grid coordinates must be passed a stringified JSON e.g

`curl "http://localhost:8000/api/scrape?keyword=landscaping&grid=%7B%22north%22%3A42.781255898550725%2C%22south%22%3A42.46241531884058%2C%22east%22%3A-71.36323935214256%2C%22west%22%3A-71.79253080465172%7D"`
 (Replace `keyword`, and `grid` as needed)