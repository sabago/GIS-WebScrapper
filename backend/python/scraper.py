import sys
import json
import time
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from selenium.common.exceptions import NoSuchElementException

import pandas as pd;

def scrape_businesses(grid, keyword):
    base_url = "https://www.google.com/maps/search"
    results = []
    options = webdriver.ChromeOptions()
    options.add_experimental_option("detach", True)
    driver = webdriver.Chrome(options=options)
    # driver = webdriver.Chrome()
    full_url = "{base_url}/?q={keyword}+near+{south},{west}&start={start}".format(
        base_url=base_url,
        keyword=keyword,
        south=grid['south'],
        west=grid['west'],
        start=1
        # start=(page - 1) * 10
    )


    driver.get(full_url)

    # businesses = driver.find_elements_by_class_name('hfpxzc')
    # for business in businesses:
    #     business.click()
      # Wait for the businesses to be loaded and visible
    WebDriverWait(driver, 20).until(
        EC.presence_of_all_elements_located((By.CLASS_NAME, 'hfpxzc'))
    )

    businesses = driver.find_elements_by_class_name('hfpxzc')

    for index, business in enumerate(businesses):
        # Wait for the specific business element to be clickable
        WebDriverWait(driver, 20).until(
            EC.element_to_be_clickable((By.CLASS_NAME, 'hfpxzc'))
        )
        # Click the business to expand details
        businesses = driver.find_elements_by_class_name('hfpxzc')  # Re-fetch the elements to avoid StaleElementReferenceException
        businesses[index].click()
        time.sleep(5)
        business_item = {}
        
        # Use a function to simplify the try-except blocks
        def get_detail_by_xpath(xpath):
            try:
                time.sleep(2)
                return driver.find_element_by_xpath(xpath).text
            except NoSuchElementException:
                return None

        title = get_detail_by_xpath('.//*[@id="QA0Szd"]/div/div/div[1]/div[3]/div/div[1]/div/div/div[2]/div[2]/div/div[1]/div[1]/h1')
        rating = get_detail_by_xpath('.//*[@id="QA0Szd"]/div/div/div[1]/div[3]/div/div[1]/div/div/div[2]/div[2]/div/div[1]/div[2]/div/div[1]/div[2]/span[1]/span[1]')
        reviews = get_detail_by_xpath('.//*[@id="QA0Szd"]/div/div/div[1]/div[3]/div/div[1]/div/div/div[2]/div[2]/div/div[1]/div[2]/div/div[1]/div[2]/span[2]/span/span')
        address = get_detail_by_xpath('.//*[@id="QA0Szd"]/div/div/div[1]/div[3]/div/div[1]/div/div/div[2]/div[7]/div[3]/button/div/div[2]/div[1]')
        closing_time = get_detail_by_xpath('.//*[@id="QA0Szd"]/div/div/div[1]/div[3]/div/div[1]/div/div/div[2]/div[7]/div[4]/div[1]/div[2]/div/span[1]/span/span[2]')
        website_url = get_detail_by_xpath('.//*[@id="QA0Szd"]/div/div/div[1]/div[3]/div/div[1]/div/div/div[2]/div[7]/div[6]/a/div/div[2]/div[1]')
        phone_number = get_detail_by_xpath('.//*[@id="QA0Szd"]/div/div/div[1]/div[3]/div/div[1]/div/div/div[2]/div[7]/div[7]/button/div/div[2]/div[1]')

        business_item.update({
            'Business Title': title,
            'Google Rating': rating,
            'Num Of Reviews': reviews,
            'Business Address': address,
            'Closes At': closing_time,
            'Business Website': website_url,
            'Business Phone #': phone_number
        })

        results.append(business_item)

        # Close the details modal
        close_button = WebDriverWait(driver, 10).until(
            EC.element_to_be_clickable((By.XPATH, "//*[@id='QA0Szd']/div/div/div[1]/div[3]/div/div[1]/div/div/div[1]/div/div/div[3]/span/button"))
        )
        close_button.click()

        # Wait for the modal to close
        WebDriverWait(driver, 10).until(
            EC.invisibility_of_element_located((By.XPATH, "//*[@id='QA0Szd']/div/div/div[1]/div[3]/div/div[1]/div/div/div[1]/div/div/div[3]/span/button"))
        )

    driver.quit()
    df = pd.DataFrame(results)
    return df

if __name__ == "__main__":
    grid_json = sys.argv[1]  # The grid argument as a JSON string
    keyword = sys.argv[2]

    grid = json.loads(grid_json)  # Parse the grid JSON string to a Python dictionary

    df = scrape_businesses(grid, keyword)
    print(df.to_json(orient="records"))  # Convert the dataframe to a JSON string

# Example usage
# grid_object = {
#     "north": 42.781255898550725,
#     "south": 42.46241531884058,
#     "east": -71.36323935214256,
#     "west": -71.79253080465172
# }

# keyword = "landscaping"
# res = scrape_businesses(grid_object, keyword)
# print(res)


if __name__ == "__main__":
    grid_json = sys.argv[1]  # The grid argument as a JSON string
    keyword = sys.argv[2]

    grid = json.loads(grid_json)  # Parse the grid JSON string to a Python dictionary

    df = scrape_businesses(grid, keyword)
    print(df.to_json(orient="records"))  # Convert the dataframe to a JSON string
