

function crawlErrorsIntoBigquery(){
  	
	var crawlErrorsSchema = {
		page_url 		: 'STRING',
		last_crawled 	: 'DATETIME',
		first_detected 	: 'DATETIME',
		response_code 	: 'INTEGER',
		linked_from_url : 'STRING',
	};
	
	dropTable( CRAWL_ERRORS_TABLE_NAME );
	createTable( CRAWL_ERRORS_TABLE_NAME, crawlErrorsSchema );
	
	// +++++++++++++++++++
	
	var errorSamples = listCrawlErrors( SITE_NAME, CRAWL_ERROR_CATEGORIES, CRAWL_ERROR_PLATFORMS );
	
	function formatDateTime( value ){
		var res = value.replace( /T/, ' ' ).replace( /\.000Z/, '' );
		return res;
	}
	
	errorSamples = errorSamples.map( function( item ){
		var lastCrawled   = formatDateTime( item.last_crawled );
		var firstDetected = formatDateTime( item.first_detected );

		return [
			item.pageUrl,
			lastCrawled,
			firstDetected,
			item.responseCode,
			item.urlDetails && item.urlDetails.linkedFromUrls && item.urlDetails.linkedFromUrls.length > 0 ? item.urlDetails.linkedFromUrls[ 0 ] : null,
		];
	});
	
	//Logger.log( JSON.stringify( errorSamples[ 0 ], null, 2 ) );
	
	loadIntoBigquery( toCsvChunks( errorSamples ), CRAWL_ERRORS_TABLE_NAME );
}

function searchAnalyticsIntoBigquery(){
	
	var searchAnalyticsSchema = {};
	SEARCH_ANALYTICS_DIMENSIONS.forEach( function( dim ){
		searchAnalyticsSchema[ dim ] 		= 'STRING';
	});
	searchAnalyticsSchema.impressions 		= 'INTEGER';
	searchAnalyticsSchema.clicks		 	= 'INTEGER';
	searchAnalyticsSchema.position			= 'FLOAT';
	
	dropTable( SEARCH_ANALYTICS_TABLE_NAME );
	createTable( SEARCH_ANALYTICS_TABLE_NAME, searchAnalyticsSchema );
	
	// +++++++++++++++++++
	
	var searchAnalytics = getGSCSearchAnalytics( SITE_NAME, START_DATE, END_DATE, SEARCH_ANALYTICS_DIMENSIONS, SEARCH_ANALYTICS_ROW_LIMIT );
	
	searchAnalytics = searchAnalytics.map( function( item ){
		return item.keys.concat([
			item.impressions,
			item.clicks,
			item.position,
		]);
	});
	
	Logger.log( JSON.stringify( searchAnalytics[ 0 ], null, 2 ) );
	
	loadIntoBigquery( toCsvChunks( searchAnalytics ), SEARCH_ANALYTICS_TABLE_NAME );
}


//---------------------------------------------------------------------------------------------------------------------------------------------
// for URL encoding to utf-8
function URLEncode( URL ){
	URL = URL.replace( /{/g, '%7B' );
	URL = URL.replace( /}/g, '%7D' );
	URL = URL.replace( /:/g, '%3A' );
	URL = URL.replace( /\//g, '%2F' );
	URL = URL.replace( /\?/g, '%3F' );
	URL = URL.replace( /\&/g, '%26' );
	return URL;
}

function getGSCSearchAnalytics( site, startDate, endDate, dimensions, rowLimit ){
	var service = getService();
	if( service.hasAccess() ){
		if( !site || site == '' ){
			throw new Error( 'Please, choose site and rerun script.' );
		}
		
		var apiURL = 'https://www.googleapis.com/webmasters/v3/sites/' + URLEncode( site ) + '/searchAnalytics/query?fields=rows&alt=json';
		
		var options = {
			headers		: {
				Authorization : 'Bearer ' + service.getAccessToken(),
			},
			contentType	: 'application/json',
			method		: 'post',
			payload		: JSON.stringify({
				startDate 	: startDate,
				endDate 	: endDate,
				dimensions 	: dimensions,
				rowLimit 	: rowLimit,
			}),
			muteHttpExceptions	: MUTE_HTTP_EXCEPTIONS,
		};
		
		try {
			var response = UrlFetchApp.fetch( apiURL, options );
			var result = JSON.parse( response.getContentText() );
			
			if( ( response.getResponseCode() >= 400 && response.getResponseCode() < 500 ) || ! result.rows ){
				Logger.log( 'Empty response from GSC. HTTP-Code: ' + response.getResponseCode() );
				return [];
			}
			
			Logger.log( 'count results: ' + result.rows.length );
			// log errors
			if( result.error ){
				Logger.log( result.error.errors[ 0 ].message );
			}
			return result.rows; // [ { ctr=0.4642709624122264, keys = [ peak ace, https://www.pa.ag/de/, DESKTOP ], clicks=1124, impressions=2421, position=1.0743494423791822 }, ... ]
			
		}catch( e ){
			Logger.log( e );
			return [];
		}
	} else {
		var authorizationUrl = service.getAuthorizationUrl();
		Logger.log( 'Open the following URL and re-run the script: %s', authorizationUrl );
		return [];
	}
}


function urlFetch( options ){
	return function( url ){
		return UrlFetchApp.fetch( url, options );
	};
}

function listCrawlErrors( site, categories, platforms ){
	var service = getService();
	if( service.hasAccess() ){
		var encodedUrl = URLEncode( site );
		
		var urls = [];
		categories.forEach( function( category ){
			platforms.forEach( function( platform ){
				urls.push(
					'https://www.googleapis.com/webmasters/v3/sites/'
					+ encodedUrl
					+ '/urlCrawlErrorsSamples'
					+ '?'
					+ 'category=' + category
					+ '&platform=' + platform
				);
			});
		});
		
		var options = {
			headers : {
				Authorization : 'Bearer ' + service.getAccessToken(),
			},
			contentType 		: 'application/json',
			method 				: 'get',
			muteHttpExceptions 	: MUTE_HTTP_EXCEPTIONS,
		};
		
		try {
			var errorSamples = urls.map( urlFetch( options ) )
				.map( 	 _.property( 'getContentText', JSON.parse ) )
				.filter( _.hasNoProperty( 'error' ) ) // skip errors
				.filter( _.hasProperty( 'urlCrawlErrorSample' ) ) // skip empty results
				.map( 	 _.property( 'urlCrawlErrorSample' ) )
				.reduce( _.concat, [] )
			;
			/*
			Example: 
			[
				{
					"pageUrl": "en/job/online-marketing-assistant-ppc-chinese-language-skills-m-f/?amp",
					"last_crawled": "2018-08-07T23:56:58.000Z",
					"first_detected": "2018-08-07T23:56:58.000Z",
					"responseCode": 404,
					"urlDetails": {
						"linkedFromUrls": [
							"https://www.pa.ag/en/job/online-marketing-assistant-ppc-chinese-language-skills-m-f/"
						]
					}
				},
			]
			*/
			
			//Logger.log( JSON.stringify( errorSamples, null, 2 ) );
			Logger.log( 'count error-samples: ' + errorSamples.length );
			return errorSamples;
		}catch( e ){
			Logger.log( e );
			return [];
		}
	}else{
		var authorizationUrl = service.getAuthorizationUrl();
		Logger.log( 'Open the following URL and re-run the script: %s', authorizationUrl );
		return [];
	}
}

