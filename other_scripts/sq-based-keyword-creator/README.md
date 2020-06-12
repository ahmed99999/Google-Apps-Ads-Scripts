Search query based ad group creator.
This script takes search queries from bmm campaigns 
(recognized by "(broad)" suffix in the campaign name)
 which have more than zero conversions in the last 90 days 
 and creates new ad groups and keywords in the corresponding exact campaign 
 (the exact campaign has the same name as the broad campaign except the suffix "(exact)"
 instead of the broad-suffix).
The script creates copies of ads, audiences and bids in the new ad groups.
 The successful search query (triggered conversions) will be added as 
 negative keyword to the bmm-campaign.

