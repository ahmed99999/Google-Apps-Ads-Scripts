Anomaly Detector

Goal

Detects abnormal performance fluctuations and sends an email with unexpected KPI values

Features

        suspend checks until yyyy-mm-dd
            In case of a seasonal pausing of an account
        suspend checks for 1 day after anomaly
        ignore last 3 hours
            according to AdWords the data of the last 3 hours is not reliable
        don't execute until XX am (working hours e.g.
            too few data in the night - not reliable, false warnings
        Checks
            Clicks
            Impressions
            Cost
            Conversions
            Conversion-Value
            Compound metrics
                CTR
                CPC
                CVR
                CPO
                Search Impression Share
                Search Rank Lost Impression Share
                Search Budget Lost Impression Share
        Dependencies with KPIs which caused the issue
        Emails for Managers (real time emails) and Executives (1 summary email per day)
        Conversion-Lag
            daily ( used for forcasting in anomaly detector )
                use only corresponding week-days for forcasting ( e.g. don't compare delayed conversions of wednesdays to thursdays)
                #ongoingDevelopement
        compare the averge of the last 12 weeks for each metric with value of the current day
            use standard deviation of metrics to compute allowed intervals for values
                if a value exceeds the interval then issue a warning
                sensitivity can be set in the script for each metric
            take into account that not all data for current day is available yet
        outputs conversions-lag separately "Revenue 8800€ (+190€)"
        contains links to the respective account
        only calculates with conversions greater than or equal to one
        setup sheet contains executive email column
        compute warnings for intervals of days (not only the current day)
            for example: too few clicks today+yesterday compared to two day intervals (same weeks days) in the last 12 weeks (taking into account variance of click values in the last 12 weeks)



Planned improvements

    consider time zone
    exclude tracking periods (Christmas, Easter etc.)
    serverity dependend Alerts (yellow Alerts summed up for 1 alert per day, red alerts all the time)
    Campaign level alerts (give campaign with greatest anomaly)
    only checks accounts if there is data to compare
    Conversion value is not transferred, default value is used
    Dashboard for anomalys



improvements for Airbnb

    Output anomaly detector message in slack
    Send relevant info to specific managers (impressions to Search team, CVR to conversion team, etc)
    Segment accounts into groups of campaigns (brand, shopping, display, ...) and detect anomalies on these groups instead of the whole account. This could detect anomalies on sub-account level which are too small to be detected on account-level: Anomaly detection on groups of campaigns
            label
            naming (Shopping, Brand, DSA, GDN, SUCH)

How to set up

    Log in into your MCC AdWords account and open "bulk operations", "Scripts"
    create a new script by clicking on the button "+ Script"
    copy paste the script into the editor, save it and authorize it

    create a settings google-sheet document as follows and enter its url in the SETTINGS_SHEET_URL variable to connect the script to this google sheet.

        with following headers:
        Account-Name	Account-Id	Emails (comma-separated)	pause until yyyy-mm-dd
        The first column "Account-Name" can be left empty. It has only a descriptive purpose for the users. Script ignores this column.
        The second column is important. Enter the account-ids here which you want to be monitored by the Anomaly Detector script. Pls use following format: 111-111-1111. Script can't handle empty or broken account-ids.
        The third column contains the comma separated email adresses which gets notified if an anomaly is detected in an account. Script can't handle broken email adresses.
        The last column "pause until yyyy-mm-dd" is optional and can be let empty. Script will issue no warnings for an account until this date is reached. This can be helpfull if an account is paused/suspended for some time.

        Example for a row: 
        Sample AdWords Account	123-123-1234	smith@company.com, jack@ripper.com	 2017-12-01


        After the first execution of the script the script will create additional columns with blue background - one for each metric
            usually there is no need to edit these columns
            these columns purpose is to show when the last warning was issued for a combination of account and metric
            you can set a value "yyyy-mm-dd" in a blue column to a future date to disable warning for this metric and this account until that date
    create a second google sheet for lag-data and enter its url into the LAG_DATA_SHEET_URL variable.
        set up a conversion-lag script which gathers lag-data into this google-sheet
            create a new script in adwords>bulk_operations>scripts and call it conv-lag-script
            copy the conv-lag script into AdWords interface editor, save it and authorize it
            put the url of the google sheet (lag-data) into the SHEET_URL variable in the conversion-lag script
            adjust time zone as needed
            you can choose the metric "AllConversions" instead of "Conversions" in the METRIC variable.
            add all account ids you want to track the conversion lag for in the ACCOUNT_IDS variable.
            it should run daily at 10 pm
        you don't need to edit the "conv-lag" google sheet. It will be filled daily with adwords data to track the conversion lags by the script
    you can customize the script
        in the COLUMNS_ you can adjust the "down" and "up" values to make the script more or less sensitive to outliers of the repective metric.
            "down"-setting is responsible for down deviations from usual/expected values
            "up"-setting is responsible for up deviations from usual/expected values
            these settings determines how many standard deviations an outlier-value may deviate from the historical mean without a warning being issued
        adjust TIME_ZONE. Set it to your time zone or the the time zone of the account
        if you need to manage more than 50 accounts in an MCC account then create several copies of this script and set the SCRIPT_INSTANCE settings for these copies to consequtive values starting with one (e.g. 1,2,3...)
            the script with SCRIPT_INSTANCE = 1 will take the first 50 accounts from settings-sheet, the script with SCRIPT_INSTANCE = 2 will take the next 50 ( rows 51 to 100) accounts and so foth.
        you can set a value for SUSPEND_FOR variable to the number of days for which warnings for a combination of account/metric should be muted after a warning was issued for this combination
            this can be used to prevent too frequent warnings of the same anomaly
        you can customize the WEEKS variable to use more or less historical data. Default is 12 weeks
        ROOT_HACK reduces the likelihood of warnings on metrics with very small variance.
            If your account has always had 0 or 1 conversion per day and one day you see 3 conversions then a potentially unwanted warning would be issued because this is a strong deviation from histrorical performance. To prevent this, additional small variance is artificially added to historical data to prevent warnings.
        MIN_HACK enables warning if a metric is going down to (near) zero, even if normal standard deviation computation would not trigger a warning. 
            this emphasises the special meaning of near zero values of metrics. For example: if it is normal for an account to have 100 clicks and 1900 clicks with an average of 1000 clicks then 0 clicks would be nothing special from the deviations point of view. But it can be desireable to be notified if a metric drops to zero. MIN_HACK greatly increases the likelihood that you get notified in the event of a metric going down to zero.
        DONT_RUN_UNTIL_HOUR: early in the morning accounts usually have few data which can cause false positive warnings. To prevent this you can set a starting hour for checks.

 
