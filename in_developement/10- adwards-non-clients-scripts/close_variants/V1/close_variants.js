
var config = {
	"DESCRIPTION" : "" ,
	"INSTRUCTIONS": "Use this if you want to exclude some campaigns. Case insensitive. For example ['Brand'] would ignore any campaigns with 'brand' in the name, while ['Brand','Competitor'] would ignore any campaigns with 'brand' or 'competitor' in the name.Leave as [] to not exclude any campaigns. Use this if you only want to look at some campaigns. Case insensitive.For example ['Brand'] would only look at campaigns with 'brand' in the name,while ['Brand','Generic'] would only look at campaigns with 'brand' or 'generic'in the name.Leave as [] to include all campaigns.Choose whether the negatives are created, or if you just get an email to reviewThese addresses will be emailed when the tool is run, eg 'daniel@example.com'If there are multiple addresses then separate them with commas, eg 'a@a.com, b@b.com'Leave as '' to not send any emailsSet to true to have the script check if keywords and search queries containany of the same words, making a negative if not.Either this or useEditDistance must be set to true.Edit distance is a way of determining whether two words are similar or notbased on how many letters would need to be changed to move from one to the otherSee here: https://en.wikipedia.org/wiki/Levenshtein_distancePlease note that this is computationally expensive and may time out on larger accountsIf using edit distance, how many changes need to be made for words to beconsidered sufficiently distinct.",
	"VERSION" : 1,
	"VERSION_TAG" : "stable",
	"settings" : {
		"campaignNameContains" : [],
		"campaignNameDoesNotContain" : [],
		"makeChanges" : "false",
		"emailAddresses" : "a.bakhabou@pa.ag",
		"useWordInCommon" : "true",
		"useEditDistance" : "false",
		"maxEditDistance" : 3
	}		
};

for( key in config.settings ){
	this[ key ] = config.settings[ key ];
}
/**
*
* Make Exact Match Exact
*
* Adds negatives for any search query that doesn't actually exactly match an exact
* match keyword.
*
* Version: 2.0
* Google AdWords Script maintained on brainlabsdigital.com
*
**/


//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//Options





//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
function main() {
	
	var campaigns = {};
	var adGroups = {};
	var exactKeywords = [];
	var exactGroupIds = {};
	
	if (!useWordInCommon && !useEditDistance) {
		throw("Must check for either word in common or edit distance");
	}
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
	//Pull a list of all exact match keywords in the account
	var campaignIds = getCampaignIds();
	
	var report = AdWordsApp.report(
		"SELECT AdGroupId, Id, Criteria, Clicks, Impressions, CpcBid, Cost, Conversions " +
		"FROM KEYWORDS_PERFORMANCE_REPORT " +
		"WHERE Impressions > 0 AND KeywordMatchType = EXACT " +
		"AND CampaignId IN [" + campaignIds.join(",") + "] " +
		"AND AdGroupStatus IN [ENABLED, PAUSED] " +
		"AND Status IN [ENABLED, PAUSED] " +
		"DURING LAST_30_DAYS");
	
	var rows = report.rows();
	while( rows.hasNext() ){
		var row = rows.next();
		var keywordId = row[ 'Id' ];
		var adGroupId = row[ 'AdGroupId' ];
		exactKeywords.push( adGroupId + "#" + keywordId );
		exactGroupIds[ adGroupId ] = true;
		
		if( ! adGroups.hasOwnProperty( adGroupId ) ){
			adGroups[ adGroupId ] = [ [], [], [] ];
		}
		adGroups[ adGroupId ][ 2 ].push( row[ 'Criteria' ].toLowerCase().trim() );
	}
	
	exactGroupIds = Object.keys( exactGroupIds );
	
	
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
	// Remove ad groups with non-exact keywords
	
	var nonExactGroupIds = {};
	for( var i = 0; i < exactGroupIds.length; i += 10000 ){
		var exactGroupIdsChunk = exactGroupIds.slice( i, i + 10000 );
		var report = AdWordsApp.report(
			"SELECT AdGroupId, Id, Criteria, Clicks, Impressions, CpcBid, Cost, Conversions " +
			"FROM KEYWORDS_PERFORMANCE_REPORT " +
			"WHERE KeywordMatchType != EXACT AND IsNegative = FALSE " +
			"AND AdGroupId IN [" + exactGroupIdsChunk.join(",") + "] " +
			"AND Status IN [ ENABLED, PAUSED ] " +
			"DURING LAST_30_DAYS" );
		
		var rows = report.rows();
		while (rows.hasNext()) {
			var row = rows.next();
			var adGroupId = row[ 'AdGroupId' ];
			nonExactGroupIds[ adGroupId ] = true;
		}
	}
	
	var onlyExactGroupIds = [];
	for( var i = 0; i < exactGroupIds.length; i++ ){
		if ( nonExactGroupIds[ exactGroupIds[ i ] ] == undefined ) {
			onlyExactGroupIds.push( exactGroupIds[ i ] );
		}
	}
	Logger.log( onlyExactGroupIds.length + " ad groups (with only exact keywords) were found." );
	
	
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
	//Pull a list of all exact (close variant) search queries
	
	for (var i=0; i<onlyExactGroupIds.length; i+=10000) {
		var onlyExactGroupIdsChunk = onlyExactGroupIds.slice(i, i+10000);
		var report = AdWordsApp.report(
			"SELECT Query, AdGroupId, CampaignId, KeywordId, KeywordTextMatchingQuery, Clicks, Impressions, AverageCpc, Cost, Conversions, QueryMatchTypeWithVariant, AdGroupName " +
			"FROM SEARCH_QUERY_PERFORMANCE_REPORT " +
			"WHERE AdGroupId IN [" + onlyExactGroupIdsChunk.join(",") + "] " +
			"DURING LAST_30_DAYS" );
		
		var rows = report.rows();
		while( rows.hasNext() ){
			var row = rows.next();
			var adGroupId = parseInt( row['AdGroupId'] );
			var campaignId = parseInt( row['CampaignId'] );
			var keywordId = parseInt( row['KeywordId'] );
			var searchQuery = row[ 'Query' ].toLowerCase().trim();
			var keyword = row[ 'KeywordTextMatchingQuery' ].toLowerCase().trim();
			var matchType = row[ 'QueryMatchTypeWithVariant' ].toLowerCase().trim();
			var clicks =  row[ 'Clicks' ];
			var impressions = row[ 'Impressions' ];
			var averageCpc = row[ 'AverageCpc' ];
			var cost = row[ 'Cost' ];
			var Conversions = row[ 'Conversions' ];

			if( keyword !== searchQuery && matchType.indexOf( "exact (close variant)" ) !== -1 ){
				
				if( adGroups[ adGroupId ][ 2 ].indexOf( searchQuery ) > -1 ){
					// This query is a positive keyword in the ad group
					// so we don't want to add it as a negative
					continue;
				}
				
				if (
					( useWordInCommon && hasWordInCommon( searchQuery, keyword ) )
					|| ( useEditDistance && editDistance( searchQuery, keyword ) <= maxEditDistance )
				){
					continue;
				}
				
				if( ! campaigns.hasOwnProperty( campaignId ) ){
					campaigns[ campaignId ] = [ [], [] ];
				}				
				campaigns[ campaignId ][ 0 ].push( searchQuery );
				campaigns[ campaignId ][ 1 ].push( adGroupId + "#" + keywordId );

				// if( ! adGroups.hasOwnProperty( adGroupId ) ){
				// adGroups[ adGroupId ] = [ [], [] ];	
				// }
				adGroups[ adGroupId ] = [ [], [] , [] , [] ,[] , [] , [] ];		
				adGroups[ adGroupId ][ 0 ].push( searchQuery + ">-&#->" + keyword );
				adGroups[ adGroupId ][ 1 ].push( adGroupId + "#" + keywordId );
				adGroups[ adGroupId ][ 2 ].push( clicks );
				adGroups[ adGroupId ][ 3 ].push( impressions );
				adGroups[ adGroupId ][ 4 ].push( averageCpc );
				adGroups[ adGroupId ][ 5 ].push( cost );
				adGroups[ adGroupId ][ 6 ].push( Conversions );
			}
		}
	}
		
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
	//Parse data correctly
	
	var adGroupIds = [];
	var adGroupNegatives = [];
	
	for( var x in adGroups ){
		adGroupIds.push( parseInt( x ) );
		adGroupNegatives.push( [] );
		for( var y = 0; y < adGroups[ x ][ 0 ].length; y++ ){
			var keywordId = adGroups[ x ][ 1 ][ y ];
			var queryAndKeyword = adGroups[ x ][ 0 ][ y ];
			var clicks = adGroups[ x ][ 2 ][ y ];
			var impressions = adGroups[ x ][ 3 ][ y ];
			var averageCpc = adGroups[ x ][ 4 ][ y ];
			var cost = adGroups[ x ][ 5 ][ y ];
			var Conversions = adGroups[ x ][ 6 ][ y ];

			if( exactKeywords.indexOf( keywordId ) !== -1 ){
				adGroupNegatives[ adGroupIds.indexOf( parseInt( x ) ) ].push( [ queryAndKeyword, clicks, impressions, averageCpc, cost, Conversions ] );
			}
		}
	}
	
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
	//Create the new negative exact keywords
	
	var results = [];
	for( var i = 0; i < adGroupIds.length; i += 10000 ){
		var adGroupIdsChunk = adGroupIds.slice( i, i + 10000 );
		var adGroupIterator = AdWordsApp.adGroups()
			.withIds(adGroupIdsChunk)
			.get();
		while( adGroupIterator.hasNext() ){
			var adGroup = adGroupIterator.next();
			var adGroupId = adGroup.getId();
			var adGroupName = adGroup.getName();
			var adGroupIndex = adGroupIds.indexOf( adGroupId );
			var campaignName = adGroup.getCampaign().getName();
			for( var j = 0; j < adGroupNegatives[ adGroupIndex ].length; j++ ){
				var queryAndKeyword = adGroupNegatives[ adGroupIndex ][ j ][0].split( ">-&#->" );
				var NClicka = adGroupNegatives[ adGroupIndex ][ j ][1];
				var NImpressions = adGroupNegatives[ adGroupIndex ][ j ][2];
				var NCpcBid = adGroupNegatives[ adGroupIndex ][ j ][3];
				var NCost = adGroupNegatives[ adGroupIndex ][ j ][4];
				var NConversions = adGroupNegatives[ adGroupIndex ][ j ][5];

				var searchQuery = queryAndKeyword[ 0 ];
				var keyword = queryAndKeyword[ 1 ];
				
				if( makeChanges ){
					adGroup.createNegativeKeyword( "[" + searchQuery + "]" );
				}
				results.push( [ campaignName, adGroupName, keyword, searchQuery, NClicka, NImpressions, NCpcBid, NCost, NConversions ] );
			}
		}
	}

	//Logger.log( JSON.stringify( results , null, 2)) ;
	if( !makeChanges || AdWordsApp.getExecutionInfo().isPreview() ){
		Logger.log( results.length + " new negatives were found." );
	} else {
		Logger.log( results.length + " new negatives were created." );
	}
	
	//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
	//Email the results
	
	if (emailAddresses == "") {
		Logger.log("No email addresses given - not sending email.");
	} else if( results.length == 0 ){
		Logger.log( "No changes to email." );
	} else {
		var attachments = [];
		var headers = [ "Campaign", "Ad Group", "Keyword", "SearchQuery [to be added as Negative]", "Clicks", "Impressions", "AverageCpc", "Cost", "Conversions" ];
		attachments.push( createEscapedCsv( [ headers ].concat( results ), "Ad-Group-Negatives.csv" ) );
		
		if( !makeChanges || AdWordsApp.getExecutionInfo().isPreview() ){
			var verb = "would be";
		} else {
			var verb = "were";
		}
		var subject = AdWordsApp.currentAccount().getName() + " - Making Exact Match Exact - " + Utilities.formatDate( new Date(), "GMT", "yyyy-MM-dd" );
		var body = "Please find attached a list of the " + results.length + " negative keywords that " + verb + " added to your account.";
		
		var options = { attachments: attachments };
		MailApp.sendEmail( emailAddresses, subject, body, options );
	}
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
// Prepare an array to be made into a CSV
function createEscapedCsv( array, csvName ){
	var cells = [];
	for( var i = 0; i < array.length; i++ ){
		var row = [];
		for( var j = 0; j < array[ i ].length; j++ ){
			row.push( array[ i ][ j ].replace( /"/g, '""' ));
		}
		cells.push( '"' + row.join( '","' ) + '"' );
	}
	return Utilities.newBlob( "\ufeff" + cells.join( "\n" ), 'text/csv', csvName );
}

//~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~//
// Get the IDs of campaigns which match the given options
function getCampaignIds() {
	var whereStatement = "";
	var whereStatementsArray = [];
	var campaignIds = [];
	
	for (var i=0; i<campaignNameDoesNotContain.length; i++) {
		whereStatement += "AND CampaignName DOES_NOT_CONTAIN_IGNORE_CASE '" + campaignNameDoesNotContain[i].replace(/"/g,'\\\"') + "' ";
	}
	
	if (campaignNameContains.length == 0) {
		whereStatementsArray = [whereStatement];
	} else {
		for (var i=0; i<campaignNameContains.length; i++) {
			whereStatementsArray.push(whereStatement + 'AND CampaignName CONTAINS_IGNORE_CASE "' + campaignNameContains[i].replace(/"/g,'\\\"') + '" ');
		}
	}
	
	for (var i=0; i<whereStatementsArray.length; i++) {
		var campaignReport = AdWordsApp.report(
			"SELECT CampaignId " +
			"FROM	 CAMPAIGN_PERFORMANCE_REPORT " +
			"WHERE	CampaignStatus = ENABLED " +
			whereStatementsArray[i] +
			"DURING LAST_30_DAYS");
		
		var rows = campaignReport.rows();
		while (rows.hasNext()) {
			var row = rows.next();
			campaignIds.push(row['CampaignId']);
		}
	}
	
	if (campaignIds.length == 0) {
		throw("No campaigns found with the given settings.");
	}
	
	Logger.log(campaignIds.length + " campaigns were found.");
	return campaignIds;
}

function hasWordInCommon(searchQuery, keyword) {
	var searchQueryWords = searchQuery.split(" ");
	var keywordWords = keyword.split(" ");

	var wordsInCommon = searchQueryWords.filter(function(word) {
		return (keywordWords.indexOf(word) > -1);
	});
	
	return (wordsInCommon.length > 0);
}

function editDistance(searchQuery, keyword) {
	var matrix = [[0]];
	for (var i=1; i<=searchQuery.length; i++) {
		matrix[i] = [];
		matrix[i][0] = i;
	}
	for (var j=1; j<=keyword.length; j++) {
		matrix[0][j] = j;
	}

	for (var j=1; j<=keyword.length; j++) {
		for (var i=1; i<=searchQuery.length; i++) {
			var substitutionCost = ((searchQuery[i] === keyword[j]) ? 0 : 1);

			matrix[i][j] = Math.min(
				matrix[i-1][j] + 1,
				matrix[i][j-1] + 1,
				matrix[i-1][j-1] + substitutionCost
			);
		}
	}

	return matrix[searchQuery.length][keyword.length];
}