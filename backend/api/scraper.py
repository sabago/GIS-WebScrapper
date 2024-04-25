#!/usr/bin/env python3

import sys
import json
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
    
def scrape_businesses(grid, keyword):
    
    base_url = "https://www.google.com/maps/search"
    results = []
    processed_businesses = set()  # Keep track of processed businesses
    options = webdriver.ChromeOptions()
    options.add_experimental_option("detach", True)
    # options.add_argument('--headless')
    options.add_argument("--incognito")  # Add incognito mode to ensure a fresh session
    temp_dir = tempfile.mkdtemp()
    options.add_argument("--user-data-dir={}".format(temp_dir))
    options.add_argument('--disable-geolocation')
    user_agent = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
    options.add_argument("--user-agent=" + user_agent)
    options.add_argument("--lang=en-US")  # Or any other language as needed


    driver = webdriver.Chrome(options=options)
    coordinates = {"latitude":  grid["south"], "longitude": grid["west"], "accuracy": 1}  # Example: San Francisco
    driver.execute_cdp_cmd("Emulation.setGeolocationOverride", coordinates)
    driver.execute_cdp_cmd('Network.clearBrowserCookies', {})
    driver.execute_cdp_cmd('Network.clearBrowserCache', {})
 
    # full_url = "{base_url}/{keyword} in {state}/@{south},{west},13z".format(
    #     base_url=base_url,
    #     keyword=keyword,
    #     state=stateName,
    #     south=grid['south'],
    #     west=grid['west']
    # )
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
        for index,business in enumerate(businesses):
            if business not in processed_businesses:
                business_item = {}
                business_item['Business'] = get_class_details(business, "NrDZNb")
                business_item['Google Reviews'] = get_class_details(business, "AJB7ye")
                business_item['Business Phone'] = get_class_details(business, "UsdlK")
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

# Example usage
# grid_object = {
#     "north": 37.63095727536232,
#     "south": 36.99327611594203,
#     "east": -118.40892657075584,
#     "west": -119.21023902411547
# }
# keyword = "plumber"
# # stateName = "Indiana"
# df = scrape_businesses(grid_object, keyword)
# print(df)

def main(keyword, grid):
    # Convert the grid string back to a dictionary
    grid_dict = json.loads(grid)
    # Call your existing scraping function with the keyword and grid dictionary
    df = scrape_businesses(grid_dict, keyword)
    # Print the DataFrame in JSON format to stdout
    print(df.to_json(orient='records'))

if __name__ == '__main__':
    # Check if the correct number of arguments are provided
    if len(sys.argv) != 3:
        print("Usage: python scraper.py 'keyword' 'grid_as_json_string'")
        sys.exit(1)
    
    keyword = sys.argv[1]
    grid = sys.argv[2]
    main(keyword, grid)




# {
#     "id": 98,
#     "name": "California-98",
#     "is_scraped": false,
#     "north": 37.63095727536232,
#     "south": 36.99327611594203,
#     "east": -118.40892657075584,
#     "west": -119.21023902411547
# }
# def get_aria_label(class_name):
#     try:
#         time.sleep(2)
#         return driver.find_element_by_class_name(class_name).get_attribute('aria-label')
#     except NoSuchElementException:
#         return None
# Wait for the specific business element to be clickable
# WebDriverWait(driver, 20).until(
#     EC.element_to_be_clickable((By.CLASS_NAME, 'hfpxzc'))
# )
# Click the business to expand details
# businessLinks = driver.find_elements_by_class_name('hfpxzc')  # Re-fetch the elements to avoid StaleElementReferenceException
# if businessLinks[index]:
#     businessLinks[index].click()
#     time.sleep(5)

#     business_item['Business Description'] = get_class_details(driver, 'DkEaL')
#     business_item['Business Website'] = get_css_details(driver, '.rogA2c.ITvuef .Io6YTe.fontBodyMedium.kR99db')
#     # hours_element = driver.find_element(By.CLASS_NAME, "t39EBf.GUrTXd")
#     # open_hours_info = hours_element.get_attribute('aria-label')
#     business_item['Open Hours'] = get_aria_label('t39EBf.GUrTXd')
