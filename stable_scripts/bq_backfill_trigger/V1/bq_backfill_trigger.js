



var AIRBNB_DEMAND_TRANSFER = '5e7c2345-0000-279d-b97d-24058872342c';
var PEAKACE_TRANSFER = '5b101670-0000-2479-a290-f403043bfb5c';

var PROJECT_NAME = 'biddy-io';
var TRANSFER_ID = AIRBNB_DEMAND_TRANSFER;


// --- CONSTANTS ----------------
var API_ENDPOINT = 'https://bigquerydatatransfer.googleapis.com/v1/';
var SCRIPT_NAME = 'Transfer-Service-Trigger';
var MUTE_HTTP_EXCEPTIONS = true;
// -- END OF CONSTANTS ----------

function hourlyTrigger(){
	main( 0 ); // today only;
}

function dailyTrigger(){
	main( 30 ); // 30 days
}

function main( countDays ){
	try{
		var d = new Date();
		var d2 = new Date( d.getTime() - 1000 * 60 * 60 * 24 * countDays );
		var today = d.getFullYear() + '-' + ( d.getMonth() + 1 ) + '-' + d.getDate();
		var daysAgo = d2.getFullYear() + '-' + ( d2.getMonth() + 1 ) + '-' + d2.getDate();
		Logger.log( 'today: ' + today );
		Logger.log( 'daysAgo' + countDays + ': ' + daysAgo );
		
		var startTime = daysAgo + 'T00:00:00+00:00';
		var endTime = today + 'T00:00:00+00:00';
		Logger.log( 'startTime: ' + startTime );
		Logger.log( 'endTime: ' + endTime );
	
		//var listConfigUrl = API_ENDPOINT + 'projects/biddy-io/transferConfigs';
		//var result = doRequest( listConfigUrl );
		//return;
		
		var scheduleBackfillUrl = API_ENDPOINT
			+ 'projects/' + PROJECT_NAME
			+ '/locations/us/transferConfigs/' + TRANSFER_ID
			+ ':scheduleRuns'
		;
		
		Logger.log( 'url to be requested: ' + scheduleBackfillUrl );
		var result = doRequest(
			scheduleBackfillUrl,
			'post', // http-method
			{
				startTime : startTime,
				endTime   : endTime,
			}
		);
		
		Logger.log( 'result: ' + JSON.stringify( result, null, 2 ) );
	}catch ( error ){
		Logger.log( 'Error in ' + SCRIPT_NAME + ' ' + ' -> ' + error + '\n' + error.stack );
		throw error;
	}
}

function doRequest( apiURL, httpMethod, payload ){
	Logger.log( 'getService' );
	var service = getService();
	if( service.hasAccess() ){
		Logger.log( 'hasAccess' );
		
		var options = {
			headers             : {
				Authorization   : 'Bearer ' + service.getAccessToken(),
			},
			contentType         : 'application/json',
			method              : httpMethod || 'get',
			muteHttpExceptions	: MUTE_HTTP_EXCEPTIONS,
		};
		if( httpMethod == 'post' ){
			options.payload = JSON.stringify( payload ); 
		}
		
		// Logger.log( 'options: ' + JSON.stringify( options, null, 2 ) );
		
		try {
			Logger.log( 'url-fetch' );
			var response = UrlFetchApp.fetch( apiURL, options );
			//Logger.log( 'conent-text: ' + response.getContentText() );
			
			var result = JSON.parse( response.getContentText() );
			
			if( ( response.getResponseCode() >= 400 && response.getResponseCode() < 500 ) ){
				Logger.log( 'Empty response from API. HTTP-Code: ' + response.getResponseCode() );
				return '';
			}
			// log errors
			if( result.error ){
				Logger.log( result.error.errors[ 0 ].message );
			}
			return result;
		}catch( e ){
			Logger.log( e );
			return '';
		}
	} else {
		var authorizationUrl = service.getAuthorizationUrl();
		Logger.log( 'Open the following URL and re-run the script: %s', authorizationUrl );
		return '';
	}
}
