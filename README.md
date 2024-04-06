Application Architecture - WIP

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
<<<<<<< Updated upstream         |                   |         |
+------------v------+    +-------v--------------+    |   +-----v-------+
|  PostgreSQL DB    |    |  External APIs       |    |   | Python      |
|  + PostGIS        |    |  (e.g., Google Maps) |<--+    | Web Scraping|
+-------------------+    +----------------------+        | Script      |
      |                                                  +--------------+