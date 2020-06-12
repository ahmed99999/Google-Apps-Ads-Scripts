/**
*
* Shopping Campaign Split Negatives
*
* This script reads a list of shopping campaigns and corresponding negative keyword lists from a Google Doc
* and adds these negative keywords to campaigns.
*
*
* Version: 1.0
* Google AdWords Script maintained by Peak Ace AG ( www.peakace.de )
*
**/

function main() {
  // Put your spreadsheet's URL here:
  var spreadsheetUrl = "https://docs.google.com/YOUR-SPREADSHEET-URL-HERE";
  // Name of the config sheet in the spreadsheet
  var configSheetName = "config";
  var allowedMatchTypes = ["exact","phrase","broad"];
  var openChar  = { "exact" : "[", "phrase" : "\"", "broad" : "" };
  var closeChar = { "exact" : "]", "phrase" : "\"", "broad" : "" };
  
  // Read the spreadsheet
  try {
    var spreadsheet = SpreadsheetApp.openByUrl(spreadsheetUrl);
  } catch (e) {
    Logger.log("Problem with the spreadsheet URL: '" + e + "'");
    Logger.log("Make sure you have correctly copied in your own spreadsheet URL.");
    return;
  }
  
  // find the config-tab
  var config = spreadsheet.getSheetByName( configSheetName );
  if( config == null ){
    Logger.log("Can't find a config sheet");
    Logger.log("Make sure your spreadsheet contains a sheet named '" + configSheetName + "'");
    return;
  }
  
  // treat all other tabs as negative keyword lists
  var negativeLists = spreadsheet.getSheets()
  .filter( function(x){ return x.getName().trim().toLowerCase() != configSheetName.trim().toLowerCase(); } );
  if( negativeLists.length == 0 ){
    Logger.log("WARNIG: No lists found. There should be at least one list with negative keywords");
  }

  // count of negative keywords added to campaings
  var countNegatives = 0;
  
  var configData = config.getDataRange().getValues();
  
  // for each campaign in the config
  for(var i = 1; i < configData.length; i++) {
    // fist column contains campaing names
    var campaignName = configData[i][0];
    // second column contains match type
    var matchType = parseMatchType(configData[i][1], allowedMatchTypes );
    // third column contains comma separated list of keyword lists ( corresponding sheet names )
    var negatives = configData[i][2].split(",").map(function(x){return x.toLowerCase().trim();});
    
    if( matchType == null ){
      Logger.log("WARNING: " + configData[i][1] + " is not a valid match type");
      Logger.log("Only following match types are allowed: " + allowedMatchTypes );
      continue;
    }
    // find campaign by campaign name
    var campaign = findCampaignByName( campaignName );
    
    if( campaign != null ){
      
      // for each negative list
      for(var j = 0; j < negatives.length; j++ ) {
        // find negative list
        var negList = negativeLists.filter( function(x){ return x.getName().toLowerCase().trim() == negatives[j] } );
        
        if( negList.length > 0 ){
        
          list = negList[0].getDataRange().getValues();
          
          // for each negative keyword
          for( var k = 1; k < list.length; k++ ){
            // negative keywords are in the first column
            var negativeKeyword = list[k][0];
            if( negativeKeyword == "" ){
              // discard empty keywords
              // this can happen if first column is empty for this row
              continue;
            }
            // add negative keyword with choosen match type
            campaign.createNegativeKeyword(openChar[matchType] + negativeKeyword + closeChar[matchType]);
            countNegatives++;
          }
        }else{
          Logger.log("WARNING: List-tab '" + negatives[j] + "' not found");
        }
      }
     // Logger.log(""+count+" negative keywords created for campaign "+ campaignName);
    }else{ Logger.log("WARNING: Campaign not found: " +  campaignName); }
  }
  
  Logger.log(""+countNegatives+" negative keywords created");
}



function parseMatchType( str, allowedMatchTypes ){
  var option = str.toLowerCase().trim();
  if( allowedMatchTypes.indexOf( option ) >= 0 ){
    return option; 
  }
  return null;
}


function findCampaignByName( campaignName ){
  var campaigns = AdWordsApp.shoppingCampaigns().get();
  
  while( campaigns.hasNext() ){
    var campaign = campaigns.next();
    if( campaign.getName().toLowerCase().trim() == campaignName.toLowerCase().trim() ){
      // found
      return campaign;
    }
  }
  // not found
  return null;
}
