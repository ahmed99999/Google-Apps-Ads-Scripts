# Peak Ace Location Adder Geo Bidmodifier Adwords Script

## Installation

1. Go to your AdWords account: bulk operations and scripts
2. Click on: + Script to add a script
3. Copy & paste the whole script
4. Adjust settings:    
    1. Adjust the period to be checked. All possible variations are listed in the script.
    2. Use the existing location spreadsheet or create a new one.
        1. In Google Drive, create a Google spreadsheet
        2. From the URL "https://developers.google.com/adwords/api/docs/appendix/geotargeting", upload all locations to the first tab of the Google spreadsheet.
        3. Name the sheet
        4. Copy the URL and paste it into LOCATIONS_URL
    3. For LOCATIONS_SHEET_NAME, specify the name of the sheet (See section 4.2.3.)
    4. Create a reporting sheet
        1. In Google Drive, create a new and empty Google spreadsheet
        2. Copy the URL and paste it into REPORTING_URL
    5. For MIN_CONVERSIONS, MIN_CLICKS, MIN_IMPRESSIONS, and MIN_COST, specify the minimum data for the locations.
    6. Specify the minimum and maximum bid the script may set. The minimum bid is 0.1 and the maximum bid is 10 (0.1 = -90%, 0.2 = -80%, 1= 0%, 2 = 100% and so on).
    7. Exclude the campaigns that the script should not edit. Each campaign must be separated by commas.
    8. Specify the minimum number of clicks a new campaign must have, in order for bidding to commence.
5. Name the script
6. Authorize the script by clicking the "Authorize Now" button.
7. Start the preview and check whether the script runs properly.
8. After the preview, save and close the script.
9. Go to:  +Create Schedule
10. Specify frequency as "daily" and specify the time when the script should run.
11. Authorize the script again. 
12. Save the script and run it.
13. After the first run of the script, you can delete the first tab named "Tab 1" in your report (see section 4.4).

## Explanation to the report
1. The script creates a separate tab for each campaign, for which it finds locations to addand/or an for already added locations available for bidding.
2. In each tab, the days of the week are specified.
3. Every day, when the script is running, the column with the corresponding weekday is deleted and the current changes are added.
5. Values that are showing location and a numeric value in brackets are new locations added by this script for the first time.
4. Values that are only showing the location and the adjustment (no brackets), are locations that were already in the account or where created by this script before. So the script just sets the correct modifier. 
