Application Architecture

                       +-------------------+
                       |   Web Browser     |
                       | (React Frontend)  |
                       +---------+---------+
                                 |
                                 | HTTP Requests (e.g., REST API)
                                 |
                       +---------v---------+
                       |   Node.js Server  |-------------------+
                       |   (Backend)       |                   |
                       +---------+---------+                   |
                                 |                             |
             +-------------------+-------------------+         |
             |                   |                   |         |
             |                   | HTTP Requests     |         |
<<<<<<< Updated upstream
+------------v------+    +-------v--------------+    |   +-----v-------+
|  PostgreSQL DB    |    |  External APIs       |    |   | Python      |
|  + PostGIS        |    |  (e.g., Google Maps) |<--+    | Web Scraping|
+-------------------+    +----------------------+        | Script      |
      |                                                  +--------------+
=======
+------------v------+    +------v----------------+   |   +-----v-------+
|  PostgreSQL DB    |    |  External APIs       |    |   | Python      |
|  + PostGIS        |    |  (e.g., Google Maps) |<--+    | Web Scraping|
+-------------------+    +-----------------------+       | Script      |
      |                                                +--------------+
>>>>>>> Stashed changes
      |
      | Data Retrieval & Storage
      |
+-----v------+
| Data       |
| Analysis & |
| Reporting  |
+------------+

<<<<<<< Updated upstream
WIP
=======

API Endpoint for Scraping:
An API endpoint in the application that accepts a geographic location and a keyword (e.g., "landscaping").
Use the Google Maps API to identify the central point of the requested region and calculate the bounding coordinates for a 25-mile radius.

Web Scraping Logic
Use Beautiful Soup in Python to search Google Maps for the specified keyword within the identified region.
Extract the necessary details from the search results, such as business names, websites, phone numbers, emails, and verification status.
NB: 
- Ensure scraper respects robots.txt files and Google's Terms of Service to avoid legal issues or being blocked by Google.
- Rate Limiting and IP Blocking: Be mindful of Google's rate limiting. Implement delays between requests and consider rotating IP addresses if necessary.

Data Storage:
Store the extracted data in the DB with a well-defined schema that includes fields for all the information you're collecting, plus geographic coordinates and search keywords for future queries or analytics.

Frontend :
a simple frontend using that interacts with the  backend via API calls. 

Further Steps
Implement error handling and logging to manage and debug issues that arise during scraping.
Consider setting up a cron job or a similar scheduling mechanism to run the scraping tasks at regular intervals.
Explore additional features, such as user accounts, saved searches, notifications for new or updated listings, etc.

curl "http://localhost:8888/search?state=California&keyword=landscaping"
This command should return the bounding coordinates for a 25-mile radius around the center of San Francisco

To fix  this error: "connection failed: :1), port 5432 failed: FATAL: role "postgres" does not exist"
brew install postgresql
createuser -s postgres
brew services restart postgresql

import shape files
`shp2pgsql -s [SRID] -I -D -W [encoding] myfile.shp mytable | psql -U [username] -d mydb` [source](https://mapscaping.com/loading-spatial-data-into-postgis/#:~:text=One%20common%20way%20to%20load,load%20a%20shapefile%20called%20%E2%80%9Cmyfile.)
`shp2pgsql -s 4326 -I -D -W "UTF-8" your_shapefile.shp state-shapes | psql -U your_username -d your_database`



Frontend: A user interface built with React or another framework that allows users to input a geographic location and a keyword, and displays search results.
Backend: A Node.js server that handles API requests, interacts with external services like the Google Maps API, performs web scraping, and communicates with the PostGIS-enabled PostgreSQL database.
Database: A PostgreSQL database with the PostGIS extension, designed to store and query geospatial data alongside other business information.

Determine State Boundaries: Use an API (like Google Maps or another GIS service) to determine the geographical boundaries of the state. You'll need the northernmost, southernmost, easternmost, and westernmost points.

Calculate Grid Size: Given that each grid cell aims to represent an area equivalent to a circle with a 25-mile radius, you need to calculate the dimensions of each grid cell. Since the area of a circle is πr², and you want each grid cell to have an equivalent area, the side length of each square grid cell would be sqrt(πr²). For a 25-mile radius, this would be approximately sqrt(π*25²) ≈ 28 miles. However, to simplify calculations and avoid overlap, you might round this down slightly.

Create the Grid: Starting from the westernmost point, create vertical grid lines at intervals equal to the grid cell size until you reach the easternmost boundary of the state. Then, starting from the southernmost point, create horizontal grid lines at the same intervals until you reach the northernmost boundary. Each intersection of horizontal and vertical lines defines a grid cell.

API Logic Adjustment: In your existing API, you calculate the bounding coordinates for a 25-mile radius from a given point. To adapt this for the grid-based approach:

Determine the grid cell in which the given point (city, state) falls. This requires converting the latitude and longitude to the corresponding grid cell coordinates.
Return the bounding coordinates of this grid cell instead of the 25-mile radius. This would involve returning the latitude and longitude of the four corners of the grid cell.
Implementation Note: Since the Earth is not flat, the distance represented by a degree of latitude is fairly constant, but the distance represented by a degree of longitude varies with latitude. You may need to adjust the width of your grid cells based on their latitude to keep the area of the cells consistent. A common approach is to calculate the grid cell width in longitude degrees at the equator and then adjust this width as you move north or south to account for the change in the Earth's circumference.
#####
To fully divide a state into the desired grid, you would need to:

Determine the entire state's boundaries: You'd need the northernmost, southernmost, easternmost, and westernmost points of the state. This could be achieved by using a GIS service or a database containing these boundaries.

Generate the grid covering the state: Starting from the westernmost boundary, you'd create vertical lines at intervals equal to your grid cell size (adjusted for the curvature of the Earth, as mentioned before) until you reach the easternmost boundary. Similarly, from the southernmost boundary, create horizontal lines at the same intervals until you reach the northernmost boundary. This creates a grid that overlays the entire state.

Iterate over the grid to identify all cells: For each cell, you would calculate the bounding coordinates (as done in the provided code for a single cell) and store these. You might also assign each cell an identifier for ease of reference.

Handle edge cases: Near the boundaries of the state, some grid cells will partially lie outside the state's borders. Depending on your requirements, you may need to handle these cells differently, such as by clipping them to the state boundary or by excluding them altogether if they fall mostly outside the state.

graph TD
    UI[React Frontend<br>(Web Browser)] -->|HTTP Requests| Server[Node.js Backend Server]
    Server -->|Geocoding| GoogleMapsAPI[Google Maps API]
    Server -->|Invoke| PythonScript[Python Web Scraping Script]
    Server -->|CRUD Operations| DB[PostgreSQL + PostGIS Database]
    PythonScript -->|Return Data| Server
    GoogleMapsAPI -->|Return Coordinates| Server
    DB -->|Data Storage & Retrieval| Server

    classDef component fill:#f9f,stroke:#333,stroke-width:2px;
    classDef database fill:#ff9,stroke:#333,stroke-width:2px;
    classDef external fill:#bbf,stroke:#333,stroke-width:2px;
    classDef interaction stroke:#333,stroke-width:2px,stroke-dasharray: 5, 5;

    class UI component;
    class Server component;
    class PythonScript,GoogleMapsAPI external;
    class DB database;

    linkStyle 0 stroke:#f66,stroke-width:2px,color:red;
    linkStyle 1 stroke:#f66,stroke-width:2px,color:red;
    linkStyle 2 stroke:#f66,stroke-width:2px,color:red;
    linkStyle 3 stroke:#f66,stroke-width:2px,color:red;
    linkStyle 4 stroke:#f66,stroke-width:2px,color:red;
    linkStyle 5 stroke:#f66,stroke-width:2px,color:red;


graph TD
    UI[React Frontend<br>(Web Browser)] -->|HTTP Requests| Server[Node.js Backend Server]
    Server -->|Geocoding| GoogleMapsAPI[Google Maps API]
    Server -->|Invoke| PythonScript[Python Web Scraping Script]
    Server -->|CRUD Operations| DB[PostgreSQL + PostGIS Database]
    PythonScript -->|Return Data| Server
    GoogleMapsAPI -->|Return Coordinates| Server
    DB -->|Data Storage & Retrieval| Server
    UI -->|Auth Requests| AuthService[Authentication Service]
    AuthService -->|User Management| DB

    classDef component fill:#f9f,stroke:#333,stroke-width:2px;
    classDef database fill:#ff9,stroke:#333,stroke-width:2px;
    classDef external fill:#bbf,stroke:#333,stroke-width:2px;
    classDef interaction stroke:#333,stroke-width:2px,stroke-dasharray: 5, 5;

    class UI component;
    class Server,AuthService component;
    class PythonScript,GoogleMapsAPI external;
    class DB database;

    linkStyle 0 stroke:#f66,stroke-width:2px,color:red;
    linkStyle 1 stroke:#f66,stroke-width:2px,color:red;
    linkStyle 2 stroke:#f66,stroke-width:2px,color:red;
    linkStyle 3 stroke:#f66,stroke-width:2px,color:red;
    linkStyle 4 stroke:#f66,stroke-width:2px,color:red;
    linkStyle 5 stroke:#f66,stroke-width:2px,color:red;
    linkStyle 6 stroke:#f66,stroke-width:2px,color:red;


                              +-------------------+
                              |   Web Browser     |
                              | (React Frontend)  |
                              +---------+---------+
                                        |
                                        | HTTP Requests
                                        |
                              +---------v---------+
                              | Node.js Backend   |
                              |      Server       |
       +----------------------+-------------------+---------------------+
       |                      |                   |                     |
HTTP Requests          Invoke |           CRUD Operations         Auth Requests
       |                      |                   |                     |
       |                      |                   |                     |
       v                      v                   v                     v
+------+-+            +-------+-+         +-------v------+       +------v------+
|Google Maps|          |Python Scraping| |PostgreSQL +  |       |Authentication|
|    API    |          |     Script    | |   PostGIS    |       |   Service    |
+-----------+          +---------------+ |   Database   |       +--------------+
                                         +--------------+
>>>>>>> Stashed changes
