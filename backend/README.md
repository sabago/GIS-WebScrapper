PostGIS uses the SRID 4326 for geographic coordinates (WGS 84).

CREATE TABLE search_records (
    id SERIAL PRIMARY KEY,
    state VARCHAR(255),
    region GEOGRAPHY(Point, 4326),
    keyword VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE business_info (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    website VARCHAR(255),
    verified BOOLEAN,
    location GEOGRAPHY(Point, 4326),
    search_keyword VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE business_info
ADD COLUMN region VARCHAR(255),
ADD COLUMN state VARCHAR(255);


This function takes a business object containing all the necessary information and inserts it into the business_info table. Ensure that when you create the ST_MakePoint for the location, the order of coordinates is longitude, latitude.
const { Pool } = require('pg');
const pool = new Pool({
  // your database configuration
});
async function insertBusinessData(business) {
  const query = `
    INSERT INTO business_info(name, address, phone, email, website, verified, location, search_keyword)
    VALUES($1, $2, $3, $4, $5, $6, ST_SetSRID(ST_MakePoint($7, $8), 4326), $9)
  `;

  const values = [
    business.name,
    business.address,
    business.phone,
    business.email,
    business.website,
    business.verified,
    business.longitude, // Ensure longitude comes before latitude in ST_MakePoint
    business.latitude,
    business.search_keyword,
  ];

  try {
    await pool.query(query, values);
    console.log('Data inserted successfully');
  } catch (err) {
    console.error('Error inserting data into the database', err);
  }
}

 For instance, to find all businesses within a 10-mile radius of a given point, you could use:

SELECT name, address, ST_Distance(location, ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326)) AS distance
FROM business_info
WHERE ST_DWithin(location, ST_SetSRID(ST_MakePoint(-122.4194, 37.7749), 4326), 16093.4) -- 10 miles in meters
ORDER BY distance;


With the region and state data included in your database, you can now query the business_info table to return businesses based on these criteria. For example, to get all businesses in a specific region within a state:
SELECT * FROM business_info
WHERE state = 'California' AND region = 'Silicon Valley';


Advanced Query: Businesses within a Region's Geographic Boundary
If you define each region by a geographic boundary (e.g., using a polygon), you could perform more complex queries, like finding all businesses within a specific geographic area. Assuming you have a regions table with geospatial data defining each region:
CREATE TABLE regions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255),
    state VARCHAR(255),
    boundary GEOGRAPHY(Polygon, 4326)
);

-- Example of inserting a region with a polygon boundary
INSERT INTO regions (name, state, boundary)
VALUES ('Silicon Valley', 'California', 'SRID=4326;POLYGON((-122.75 36.8, -121.75 36.8, -121.75 37.8, -122.75 37.8, -122.75 36.8))');


You can then query for businesses within the 'Silicon Valley' region like this:
SELECT b.* FROM business_info b
JOIN regions r ON ST_Within(b.location, r.boundary)
WHERE r.name = 'Silicon Valley' AND r.state = 'California';
This query joins the business_info table with the regions table and uses the ST_Within function to find businesses whose locations are within the 'Silicon Valley' boundary.


If regions are dynamically defined based on a 25-mile radius from central points within each state, and you wish to assign them names or identifiers that reflect the order in which they were searched by the web scraper, you can approach this by creating a structured naming convention for regions. This convention might include a combination of the state abbreviation, a sequential number, and perhaps a central point reference. Here's how you can structure your database and application logic to accommodate this:

### Step 1: Update Database Schema

You'll need to adjust your `business_info` table to include a `region_id` that references a `regions` table where each region's details are stored.

First, create the `regions` table:

```sql
CREATE TABLE regions (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) UNIQUE,
    state VARCHAR(255),
    central_latitude NUMERIC(9,6),
    central_longitude NUMERIC(9,6),
    search_order INT,
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- `id` is a unique identifier for each region.
- `name` could be a unique name or identifier for the region, generated based on the state and the order in which the region was searched.
- `state` is the state where the region is located.
- `central_latitude` and `central_longitude` represent the central point from which the 25-mile radius is calculated.
- `search_order` is a numeric field that indicates the order in which the region was searched.

Then, add a reference to this `regions` table in your `business_info` table:

```sql
ALTER TABLE business_info
ADD COLUMN region_id INT,
ADD CONSTRAINT fk_region
    FOREIGN KEY (region_id)
    REFERENCES regions (id);
```

### Step 2: Generating Region Names and Storing Region Data

When a search is initiated, determine if the region has already been searched by checking against the central points and state in the `regions` table. If it's a new region, generate a unique name and store the new region's details.

Here's a simplified example of how you might generate a unique name and insert a new region into the `regions` table:

```javascript
async function findOrCreateRegion(state, centralLat, centralLng) {
  // Check if the region already exists
  const existingRegionQuery = `SELECT * FROM regions WHERE state = $1 AND central_latitude = $2 AND central_longitude = $3`;
  const existing = await pool.query(existingRegionQuery, [state, centralLat, centralLng]);

  if (existing.rows.length > 0) {
    return existing.rows[0]; // Region already exists
  } else {
    // Get the next search order number for the new region in this state
    const searchOrderQuery = `SELECT MAX(search_order) + 1 AS next_order FROM regions WHERE state = $1`;
    const orderResult = await pool.query(searchOrderQuery, [state]);
    const nextOrder = orderResult.rows[0].next_order || 1;

    // Generate a unique region name, e.g., "CA-001-37.7749-122.4194"
    const regionName = `${state}-${String(nextOrder).padStart(3, '0')}-${centralLat}-${centralLng}`;

    // Insert the new region
    const insertRegionQuery = `INSERT INTO regions (name, state, central_latitude, central_longitude, search_order) VALUES ($1, $2, $3, $4, $5) RETURNING *`;
    const newRegion = await pool.query(insertRegionQuery, [regionName, state, centralLat, centralLng, nextOrder]);

    return newRegion.rows[0];
  }
}
```

### Step 3: Linking Businesses to Regions

When inserting business information, link each business to its corresponding region by setting the `region_id` field. This requires calling `findOrCreateRegion` before inserting a new business record to ensure the region exists and to get its `id`.

```javascript
async function insertBusinessData(business) {
  // Find or create the region and get its ID
  const region = await findOrCreateRegion(business.state, business.centralLat, business.centralLng);

  // Insert the business data with the region ID
  const query = `INSERT INTO business_info (name, address, phone, email, website, verified, location, search_keyword, region_id) VALUES (...)`;
  // Your existing insertion logic here, with the addition of region.id
}
```

### Note

This approach allows you to dynamically create regions based on search activity, assign them meaningful identifiers, and associate businesses with these regions. When querying, you can easily filter businesses by state, region, or the order in which regions were searched. Ensure that when generating region names or identifiers, they remain unique and meaningful for your use case.




With authentication added to the system, the database structure on the backend needs to accommodate user credentials and possibly session information if session-based authentication is used. Here's how the database and SQL side might be structured:

### Database Structure

1. **Users Table:**

This table stores user credentials along with any other necessary user information.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

- `password_hash` stores the hashed password. Never store plain-text passwords.

2. **Business Information Table:**

This is the `business_info` table mentioned previously, but it's good practice to link business entries to user accounts to track who added or modified the information, assuming users can contribute or edit business info.

```sql
ALTER TABLE business_info ADD COLUMN user_id INT;

ALTER TABLE business_info ADD CONSTRAINT fk_user
    FOREIGN KEY (user_id)
    REFERENCES users (id);
```

3. **Sessions Table (Optional):**

If you're using session-based authentication, you might need a table to store session data. This is more common in traditional web applications but can be adapted for APIs.

```sql
CREATE TABLE sessions (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    session_token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE sessions ADD CONSTRAINT fk_session_user
    FOREIGN KEY (user_id)
    REFERENCES users (id);
```

### SQL Operations

1. **User Registration:**

When a new user registers, insert their information into the `users` table. Ensure the password is hashed using a library like `bcrypt` before insertion.

```sql
INSERT INTO users (username, email, password_hash) VALUES ('johndoe', 'john@example.com', 'hashed_password_here');
```

2. **User Authentication:**

For logging in, query the `users` table by username or email, and use your chosen library to compare the provided password with the stored hash.

```sql
SELECT password_hash FROM users WHERE username = 'johndoe';
```

The application logic (not SQL) should then handle the password comparison and the creation of a session or token for the authenticated user.

3. **Linking Business Information to Users:**

When business information is added or edited, link the `business_info` entry to the `user_id` of the user responsible for the addition or modification.

```sql
INSERT INTO business_info (name, address, user_id, ...) VALUES ('Business Name', 'Business Address', 1, ...);
```

4. **Session Management (Optional):**

If using session-based authentication, you'll manage session creation, expiration, and deletion. When a user logs in, insert a new session into the `sessions` table.

```sql
INSERT INTO sessions (user_id, session_token, expires_at) VALUES (1, 'session_token_here', '2023-12-31 23:59:59');
```

### Considerations

- **Security:** Always use parameterized queries or prepared statements to prevent SQL injection. Never store plain-text passwords; always use a strong hashing function like those provided by `bcrypt`.
- **Scalability:** As your application grows, consider scalability and performance optimizations, such as indexing frequently queried columns.
- **Data Privacy:** Ensure your application complies with data protection regulations relevant to your user base, such as GDPR.

This setup provides a foundation for user authentication and management in your application, linking user actions to their accounts and securing user credentials.


Choosing between Python and Node.js for the web scraping aspect of your project depends on several factors, including the complexity of the scraping tasks, library support, execution environment, and your familiarity with the languages.

### Python for Web Scraping:

**Advantages:**
- **Rich Libraries:** Python offers a wealth of libraries specifically designed for web scraping, such as Beautiful Soup, Scrapy, and lxml, making it easier to parse HTML and XML documents.
- **Ease of Use:** Python's syntax is generally considered more straightforward and readable, which can be particularly beneficial for complex data extraction logic.
- **Data Processing:** Python excels in data manipulation and analysis, with libraries like Pandas and NumPy, which can be handy if your scraping involves significant data processing.

**Considerations:**
- **Execution Speed:** While Python is incredibly flexible and powerful for data manipulation, its execution speed might not be as fast as Node.js for I/O-bound tasks due to its single-threaded nature. However, this is often mitigated by its powerful libraries and the nature of web scraping tasks, which are typically I/O-bound rather than CPU-bound.

### Node.js for Web Scraping:

**Advantages:**
- **Asynchronous Nature:** Node.js is inherently asynchronous and non-blocking, making it efficient for handling multiple simultaneous web scraping tasks, especially when dealing with high volumes of requests and responses.
- **JavaScript Ecosystem:** If your application's frontend and backend are already JavaScript/TypeScript-based, using Node.js for scraping keeps the entire stack consistent, which can simplify development and reduce context switching.
- **Performance:** For I/O-bound tasks, Node.js can offer excellent performance due to its event-driven architecture.

**Considerations:**
- **Callback Hell:** While modern JavaScript (with Promises and async/await) has largely addressed the issues with callback hell, managing complex asynchronous flows can still be more challenging than in Python's synchronous, blocking model.
- **Library Support:** While Node.js has libraries like Cheerio, Puppeteer, and jsdom for web scraping, the ecosystem might not be as mature or extensive as Python's for this specific task.

### Conclusion:

- **For Simple to Medium Complexity:** If your web scraping tasks are straightforward and your project is already heavily JavaScript-based, Node.js could be a seamless fit. Its non-blocking nature and the ability to share types and models across the backend, scraping layer, and frontend can be significant advantages.
- **For Medium to High Complexity:** If your scraping tasks involve complex data processing, or if you anticipate needing the advanced capabilities of Python's scraping libraries, Python might be the better choice. Its ease of use, powerful libraries, and strengths in data manipulation make it a popular choice for scraping projects.

Ultimately, the best choice depends on your specific project requirements, existing tech stack, and team expertise. Both languages are capable of handling web scraping effectively, so consider the factors mentioned above in relation to your project's needs.


To address the requirements of defining non-overlapping regions and systematically processing each region without relying on Bull and Redis, you can utilize PostGIS for spatial calculations and Node.js with a simple queueing mechanism for task management. Here's how these components fit into your architecture:

### Defining Non-Overlapping Regions with PostGIS

1. **Calculate Grid Dimensions:**
   First, determine the dimensions of the square regions based on the desired area equivalent to a 25-mile radius circle. The area of such a circle is π*(25^2). Since you want a square with the same area, each side of the square should be √(π*(25^2)).

   ```sql
   -- Calculate the side length of the square
   SELECT SQRT(PI() * POWER(25 * 1609.34, 2)) AS side_length;
   ```

2. **Generate Grid:**
   Use PostGIS to generate a grid over your area of interest. This example assumes you have a bounding box (`bbox`) that defines this area.

   ```sql
   WITH grid AS (
     SELECT ST_SquareGrid(
       (SELECT SQRT(PI() * POWER(25 * 1609.34, 2))),  -- side length calculated above
       bbox  -- Your bounding box geometry
     ) AS geom
   )
   SELECT geom FROM grid;
   ```

### Systematic Region Processing with Node.js

1. **Simple Queueing Mechanism:**
   Implement a basic queue in Node.js to manage the processing of each region. You can use an array to hold the tasks (regions to process) and async functions to process them sequentially.

   ```javascript
   const regionsQueue = [];  // Queue to hold regions to process

   async function processRegion(region) {
     // Your region processing logic, e.g., web scraping
     console.log(`Processing region: ${region.id}`);
     // Update region as processed in your database
   }

   async function processQueue() {
     while (regionsQueue.length > 0) {
       const region = regionsQueue.shift();  // Get the next region from the queue
       await processRegion(region);
     }
   }

   // Function to add a region to the queue
   function enqueueRegion(region) {
     regionsQueue.push(region);
     if (regionsQueue.length === 1) {
       // If the queue was empty, start processing
       processQueue();
     }
   }
   ```

2. **Iterate Over Regions:**
   Fetch the list of regions from your database, and enqueue them for processing. You might trigger this through an API endpoint or a scheduled task.

   ```javascript
   app.get('/enqueue-regions', async (req, res) => {
     const regions = await getRegions();  // Fetch regions from the database
     regions.forEach(enqueueRegion);
     res.send('Regions enqueued for processing');
   });
   ```

### Integration into Your Architecture

- **Backend (Node.js):** Hosts the API endpoints, manages the queue of regions to process, and handles the logic for web scraping or data analysis within each region.
- **Database (PostGIS):** Stores the defined non-overlapping regions and any results from the processing of each region. It also supports any spatial queries you need to perform.
- **Frontend (Optional):** If your application includes a user interface, it can interact with the backend to trigger the processing of regions, display the progress, or visualize the results.

This approach provides a straightforward method to systematically process geographical regions without external dependencies like Bull and Redis. It leverages the geospatial capabilities of PostGIS for defining regions and Node.js for managing and executing tasks, fitting seamlessly into the discussed architecture.

Shapes used can be found [here](https://www.census.gov/geographies/mapping-files/time-series/geo/tiger-line-file.2023.html#list-tab-790442341)

More references
https://postgis.net/docs/ST_Intersects.html

curl "http://localhost:8888/api/grid?stateName=California"

curl "http://localhost:8888/api/scrape-businesses?keyword=landscaping&grid=%7B%22north%22%3A42.781255898550725%2C%22south%22%3A42.46241531884058%2C%22east%22%3A-71.36323935214256%2C%22west%22%3A-71.79253080465172%7D"