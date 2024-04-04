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
+------------v------+    +-------v----------------+   |   +----v-------+
|  PostgreSQL DB    |    |  External APIs       |    |   | Python      |
|  + PostGIS        |    |  (e.g., Google Maps) |<--+    | Web Scraping|
+-------------------+    +-----------------------+       | Script      |
      |                                                +--------------+
      |
      | Data Retrieval & Storage
      |
+-----v------+
| Data       |
| Analysis & |
| Reporting  |
+------------+

WIP