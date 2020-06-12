# Shopping-Campaign-Split-Negatives
This script reads a list of shopping campaigns and corresponding negative keyword lists 
from a Google Doc and adds these negative keywords to campaigns.

To use this script you need a Google Spreadsheet Document with a
 tab 'config' and at least one more tab with negative keywords 
 which you want to add to your campaigns. The first rows in 
 all tabs are ignored by the script - they can be used for 
 headers. In the config tab the first column should contain
 the campaigns, the second tab should contain the match type
 of the negative keywords to add and the third tab should 
 contain a comma separated list of names of negative 
 keyword lists (which correspond to the names of tabs
 in that document). The script will add all negative 
 keywords from all negative keyword-lists which are 
 specified for a campaign to that campaign. All other
 columns (except 'config') are expected to contain lists 
 of negative keywords in the first column. (Other columns
 may contain anything). The URL of the Google Spreadsheet
 Document must be entered in the AdWords Script on line 16 (spreadsheetUrl).
