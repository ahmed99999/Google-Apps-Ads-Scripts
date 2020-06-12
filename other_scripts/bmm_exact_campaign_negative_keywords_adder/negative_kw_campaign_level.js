
var EXACT = '[EXACT]';
var BMM = '[BMM]';
var SPREADSHEET_URL = '[https://docs.google.com/spreadsheets/d/1QSXAYjdpegcEhA-cUkp4zgWZrrDMlSIGQRDx4s1yc8k/edit?usp=sharing]';


function getCampaignByName( campaignName ){
	var campaignIterator = AdWordsApp.campaigns()
	.withCondition( 'Name = "' + campaignName + '"' )
	.get();
	if( campaignIterator.hasNext() ){
		return campaignIterator.next();
	}
}

function getFrom( spreadsheet, row, col ){
	var range = '';
	if( col >= 1 && col <= 27 ){
		range = String.fromCharCode( 96 + col ) + row;
	}else{
		throw new Error( 'columns > 27 not supported yet' );
	}
	return spreadsheet.getRange( range ).getValue();
}

function getExactKeywords( campaignName ){
	var exactKeywords = [];
    
    var iter = getCampaignByName( campaignName ).keywords()
    .withCondition( "CampaignStatus = 'ENABLED'" )
    .withCondition( "KeywordMatchType = 'EXACT'" )
    .get();
    
    while( iter.hasNext() ){
		exactKeywords.push( iter.next() );
    }
	return exactKeywords;
}

function findCampaignPairs(){
	var res = [];
	
	var exactMap = {};
	var broadMap = {};

	var campaignIterator = AdWordsApp.campaigns().get();
	while( campaignIterator.hasNext() ){
		var campaign = campaignIterator.next();
		var name = campaign.getName();
		if( name.indexOf( EXACT ) == name.length - EXACT.length ){
			exactMap[ name ] = 1;
			
			var broadName = name.split( EXACT )[ 0 ] + BMM;
			
			if( broadMap[ broadName ] ){
				res.push( [ name, broadName ] );
			}
		}
		if( name.indexOf( BMM ) == name.length - BMM.length ){
			broadMap[ name ] = 1;
			
			var exactName = name.split( BMM )[ 0 ] + EXACT;
			
			if( exactMap[ exactName ] ){
				res.push( [ exactName, name ] );
			}
		}
	}
	return res;
}


function main(){
	Logger.log( 'start' );

	var spreadsheet = SpreadsheetApp.openByUrl( SPREADSHEET_URL );

	for( var row = 1; row <= spreadsheet.getLastRow(); row++ ){
		var accountId = getFrom( spreadsheet, row, 1 );

		accountId = ( accountId + '' ).replace( /-/g, '' );

		var accountIterator = MccApp
			.accounts()
			.withIds( [ accountId ] )
			.get()
		;

		if( accountIterator.hasNext() ){
			account = accountIterator.next(); 
			MccApp.select( account );
		}else{
			Logger.log( 'Account not Found: ' + accountId );
			continue;
		}

		var pairs = findCampaignPairs();

		Logger.log( pairs );

		for( var pairIndex in pairs ){ // for each Campaign-pair
			var pair = pairs[ pairIndex ];
			
			var exactKeywords = getExactKeywords( pair[ 0 ] );
			var broadCampaignName = pair[ 1 ];
			var broadCampaign = getCampaignByName( broadCampaignName );
			for( var j = 0; j < exactKeywords.length; j++ ){
				var currentKeyword = exactKeywords[ j ];
				broadCampaign.createNegativeKeyword( currentKeyword.getText() );
			}
		}
	}
}

