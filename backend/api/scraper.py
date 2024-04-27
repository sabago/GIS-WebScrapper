#!/usr/bin/env python3

# you might need to google how to install these libs if they are throwin errors
import sys
import json
from simplejson import JSONDecodeError
import codecs  # Required for explicit UTF-8 handling
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException
import tempfile

import pandas as pd;

def get_class_details(element, classname):
    try:
        return element.find_element(By.CLASS_NAME, classname).text
    except NoSuchElementException:
        return None
def get_css_details(driver_type, css):
    try:
        time.sleep(2)
        return driver_type.find_element_by_css_selector(css).text
    except NoSuchElementException:
        return None
    
def scrape_businesses(city, state, keyword, grid):
    
    base_url = "https://www.google.com/maps/search"
    results = []
    processed_businesses = set()  # Keep track of processed businesses
    options = webdriver.ChromeOptions()
    options.add_experimental_option("detach", True)
    # comment the below --headless option out in order for the scraper to open a browser
    options.add_argument('--headless')
    options.add_argument("--incognito")  # Add incognito mode to ensure a fresh session
    temp_dir = tempfile.mkdtemp()
    options.add_argument("--user-data-dir={}".format(temp_dir))
    options.add_argument('--disable-geolocation')
    user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    options.add_argument("--user-agent=" + user_agent)
    options.add_argument("--lang=en-US")  # Or any other language as needed


    driver = webdriver.Chrome(options=options)
    driver.execute_cdp_cmd('Network.clearBrowserCookies', {})
    driver.execute_cdp_cmd('Network.clearBrowserCache', {})

    if (city and state):
        full_url="{base_url}/{keyword} in {city},{state}".format(
        base_url=base_url,
        keyword=keyword,
        city=city,
        state=state
        )
    else:
        coordinates = {"latitude":  grid["south"], "longitude": grid["west"], "accuracy": 1}  
        driver.execute_cdp_cmd("Emulation.setGeolocationOverride", coordinates)
        full_url = "{base_url}/{keyword}/@{latitude},{longitude},13z".format(
            base_url=base_url,
            keyword=keyword,
            latitude=grid['south'],  # Use the correct latitude
            longitude=grid['west']   # Use the correct longitude
        )

    driver.get(full_url)
    time.sleep(10)
    WebDriverWait(driver, 20).until(EC.presence_of_all_elements_located((By.CLASS_NAME, 'lI9IFe')))
    time.sleep(10)

    while True:
        businesses = driver.find_elements(By.CLASS_NAME, 'lI9IFe')
        for business in businesses:
            if business not in processed_businesses:
                business_item = {}
                business_item['Business'] = get_class_details(business, "NrDZNb")
                business_item['Google Reviews'] = get_class_details(business, "AJB7ye")
                business_item['phone_number'] = get_class_details(business, "UsdlK")
                results.append(business_item)
                processed_businesses.add(business)

        # Find the scrollable container (this selector might need adjustment)
        scroll_container = driver.find_element(By.CSS_SELECTOR, 'div[role="feed"]')
        
        # Scroll the container
        driver.execute_script('arguments[0].scrollTop = arguments[0].scrollHeight', scroll_container)
        
        # Wait for more businesses to load
        time.sleep(3)

        # Check if new businesses have been loaded
        updated_businesses = driver.find_elements(By.CLASS_NAME, 'lI9IFe')
        if len(updated_businesses) == len(processed_businesses):
            sys.stderr.write("No new businesses loaded; assumed end of list.\n")
            break

    driver.quit()
    return pd.DataFrame(results)

# ## Example usage - update keyword (Required) as needed
# keyword = "plumber"
# ## For gridless scraping - comment the below out for grid based scraping
# state="Texas"
# city="Houston"
# grid_object = {}
# ## For grid based scraping - comment the below out for gridless scraping
# # grid_object = {
# #     "north": 37.63095727536232,
# #     "south": 36.99327611594203,
# #     "east": -118.40892657075584,
# #     "west": -119.21023902411547
# # }
# # state= ""
# # city = ""
# ## Run the scraper on its own (Required)
# df = scrape_businesses(city, state, keyword, grid_object )
# print(df)
# # Save the DataFrame to CSV
# csv_path = "businesses.csv"  # File path where CSV will be saved
# df.to_csv(csv_path, index=False, header=True)  # Write to CSV without index, with header

# print("CSV data has been saved to " + csv_path)


## Comment out to run the scraper outside this context, e.g via an API
def main(city, state, keyword, grid):
    # Convert the grid string back to a dictionary
    grid_dict = {}
    if grid:
        grid = grid.strip()  # Remove leading/trailing spaces
        if len(grid) > 0:  # Ensure there's content to parse
            try:
                # Try to parse the grid into a dictionary
                grid_dict = json.loads(grid)
            except (JSONDecodeError, ValueError):
                # Output error message to stderr and continue without grid
                sys.stderr.write("Invalid JSON in 'grid', scraping without it.\n")
                grid_dict = {}  # Default to an empty dictionary
        else:
            sys.stderr.write("Empty 'grid', scraping without it.\n")
    else:
        sys.stderr.write("No 'grid' provided, scraping without it.\n")

    # Call your existing scraping function with the keyword and grid dictionary
    df = scrape_businesses(city, state, keyword,grid_dict)
    # # Print the DataFrame in JSON format to stdout
    print(df.to_json(orient='records'))
    # # Output the resulting DataFrame in JSON format to stdout
    # # Use sys.stdout.write to avoid additional newlines or unexpected characters
    # sys.stdout.write(df.to_json(orient='records'))
    # # Save the resulting DataFrame to a CSV file with UTF-8 encoding
    # Explicitly encode string data in the DataFrame
    # for col in df.columns:
    #     df[col] = df[col].apply(lambda x: x.encode('utf-8') if isinstance(x, str) else x)
    #     # # Write DataFrame to CSV with UTF-8 encoding to avoid Unicode issues
    # with codecs.open(csv_path, 'w', 'utf-8') as csv_file:  # Explicit UTF-8 handling
    #     df.to_csv(csv_file, index=False, header=True)
    # Output to stdout to confirm CSV generation
    # sys.stdout.write("CSV data has been saved to " + csv_path + "\n")

if __name__ == '__main__':
    # Check if the correct number of arguments are provided
    if len(sys.argv) != 5:
        print("Usage: python scraper.py 'city' 'state' 'keyword' 'grid_as_json_string'")
        sys.stderr.write("Usage: python scraper.py 'city' 'state' 'keyword' 'grid_as_json_string' 'csv_path'\n")
        sys.exit(1)
    
    city = sys.argv[1]
    state = sys.argv[2]
    keyword = sys.argv[3]
    grid = sys.argv[4]
    # csv_path = sys.argv[5]  # Path for the CSV file to save the results

    main(city, state, keyword, grid)  # Run the main function with the provided arguments
