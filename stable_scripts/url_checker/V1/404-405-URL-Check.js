
/* possible improvements:
	- check sitelink URLs
	- QUOTA behaviour ( what happens if quata limit is hit? )
		- backoff factor
		- max tries?
	- Mcc-Level Support?
	- fix Performance issues?
		- 24h split?
	- followRedirects?
	- reporting
		- limit amount of items per broken url => NO
			- use "and X other" => NO
		- report entities without a final-URL?
		- maybe report the url without valueTrackParams?
	- add comments, descriptions, documentation
	- find a way around the 10k limit
	
	- use reports? ✓
	- send one Email with Ads and Keywords (instead of 2 emails) ✓
	- add error-handling/reporting ✓
	- check for double-slashes in URLs ✓
	- Label entities ✓
	- Pause entities ✓
	- Check Landing page Content ✓
	- Positive and negative conditions ✓
*/

// https://en.wikipedia.org/wiki/List_of_HTTP_status_codes
var RULES = [
	{
		WHAT_TO_CHECK  : 'URL',
		// if does not start with http:// or https://
		CONDITION      : /^https?:\/\/.+/,
		CONDITION_TYPE : 'NEGATIVE', // trigger this action if regex test is NEGATIVE
		LABEL          : 'url_error',
		PAUSE          : true,
		REPORT         : 'URL must start with http:// or https://',
	},
	{
		WHAT_TO_CHECK  : 'URL',
		// two or more consecutive slashes which are not preceeded by a colon
		CONDITION      : /[^:]\/{2,}/,
		CONDITION_TYPE : 'POSITIVE', // trigger this action if regex test is POSITIVE
		LABEL          : 'url_error',
		PAUSE          : true,
		REPORT         : 'multiple consecutive slashes found in URL',
	},
	{
		WHAT_TO_CHECK  : 'URL_FETCH_ERROR', // an error during url fetch happend
		CONDITION      : /^$/, // placeholder regex for epty string. it will never be checked
		CONDITION_TYPE : 'POSITIVE', // trigger this action if regex test is POSITIVE
		LABEL          : false,
		PAUSE          : false,
		REPORT         : 'Error during URL fetch', // hopefully this is a transient error
	},
	{
		WHAT_TO_CHECK  : 'HTTP_CODE',
		CONDITION      : /4../, // 4xx (for example: 404, 401)
		CONDITION_TYPE : 'POSITIVE', // trigger this action if regex test is POSITIVE
		LABEL          : 'HTTP_4XX',
		PAUSE          : true,
		REPORT         : true,
	},
	{
		WHAT_TO_CHECK  : 'HTTP_CODE',
		CONDITION      : /5../, // 50x (for example: 500, 503)
		CONDITION_TYPE : 'POSITIVE', // trigger this action if regex test is POSITIVE
		LABEL          : false,
		PAUSE          : false,
		REPORT         : true,
	},
	{
		WHAT_TO_CHECK  : 'HTTP_CODE',
		CONDITION      : /301/, // 301
		CONDITION_TYPE : 'POSITIVE', // trigger this action if regex test is POSITIVE
		LABEL          : false,
		PAUSE          : false,
		REPORT         : true,
	},
	/*
	{
		WHAT_TO_CHECK  : 'HTML_TEXT',
		CONDITION      : /Out of stock/, // regex to test
		CONDITION_TYPE : 'POSITIVE', // trigger this action if regex test is POSITIVE
		LABEL          : false,
		PAUSE          : false,
		REPORT         : 'Landing page contains text "Out of stock"',
	},
	{
		WHAT_TO_CHECK  : 'HTML_TEXT',
		CONDITION      : /In stock/, // regex to test
		CONDITION_TYPE : 'NEGATIVE', // trigger this action if regex test is NEGATIVE
		LABEL          : false,
		PAUSE          : false,
		REPORT         : 'Landing page does not contain text "In stock"',
	},
	*/
];

var SEND_EMAILS_TO = [
	'a.tissen@pa.ag',
];
var ERROR_REPORTING_EMAILS = [ 'a.tissen@pa.ag' ];

var SUBJECT = AdsApp.currentAccount().getName() + ' Broken Urls ';

var LEVELS = [
	//'keywords',
	'ads',
];

// -------------------------------------------
// --- START OF CONSTANTS --------------------
var HTTP_OPTIONS = {
	muteHttpExceptions : true,
	followRedirects    : false,
};
var SCRIPT_NAME = 'url_checker';
var COLUMN_SEPARATOR = ';';
var LINE_SEPARATOR = '\n';

var LEVEL_SPECIFICS = {
	keywords : {
		report    : 'KEYWORDS_PERFORMANCE_REPORT',
		urlColumn : 'FinalUrls',
	},
	ads : {
		report    : 'AD_PERFORMANCE_REPORT',
		urlColumn : 'CreativeFinalUrls',
	},
	getText       : function( entity ){
		if( entity.getEntityType() == 'Ad' ){
			var ad = entity;
			if( ad.isType().expandedTextAd() ){
				var expandedTextAd = ad.asType().expandedTextAd();
				var h1 = expandedTextAd.getHeadlinePart1();
				var h2 = expandedTextAd.getHeadlinePart2();
				var h3 = expandedTextAd.getHeadlinePart3();
				return h1 + ' / ' + h2 + ' / ' + h3;
			}
			return ad.getType();
		}
		if( entity.getEntityType() == 'Keyword' ){
			return entity.getText();
		}
		throw new Error( 'unexpexcted entity type: ' + entity.getEntityType() );
	},
};
// --- END OF CONSTANTS ----------------------
// -------------------------------------------

var URL_CHECKER = (function(){
	var alreadyChecked = {};
	var count = 0;
	var SMALL_CONSTANT = .1;
	var lastLogarithm = -1;
	return {
		check : function( url ){
			if( typeof alreadyChecked[ url ] == 'undefined' ){
				var result = checkCondition( url, 'URL' );
				
				if( result.length == 0 ){ // if url is ok
					try {
						var fetchResult = UrlFetchApp.fetch(
							url,
							HTTP_OPTIONS
						);
						var httpCode = fetchResult.getResponseCode();
						
						var nextLog = Math.round(
							Math.log( 1 + count )
							/ SMALL_CONSTANT
						);
						if( nextLog != lastLogarithm ){
							lastLogarithm = nextLog;
							Logger.log(
								'Testing '
								+ ( count + 1 )
								+ '-th url: '
								+ url
								+ ' => '
								+ httpCode
							);
						}
						count++;
						result = checkCondition( httpCode, 'HTTP_CODE' );
						
						if( result.length == 0 ){
							var contentText = fetchResult.getContentText( 'UTF-8' );
							result = checkCondition( contentText, 'HTML_TEXT' );
						}
					} catch( e ){
						// Something is wrong here, we should know about it.
						result = RULES
							.filter( 'WHAT_TO_CHECK', equals( 'URL_FETCH_ERROR' ) )
							.map({
								triggerType : 'WHAT_TO_CHECK',
								setting     : identity,
								trigger     : function(){
									return 'Error during URL-fetch: ' + e.message;
								},
							})
							.slice( 0, 1 )
						;
					}
				}
				alreadyChecked[ url ] = result;
			}
			return alreadyChecked[ url ];
		},
		checkFromCache : function( url ){
			url = removeValueTrackParams( url );
			if( typeof alreadyChecked[ url ] == 'undefined' ){
				throw new Error( 'Expected ' + url + ' already being checked, but it isn\'t.' );
			}
			// It is possible that several rules were broken.
			// Take the first.
			return alreadyChecked[ url ][ 0 ];
		},
	};
})();

function checkCondition( triggerString, triggerType ){
	var result = RULES
		.filter( 'WHAT_TO_CHECK', equals( triggerType ) )
		.filter(
			{
				regexCheck : [ 'CONDITION', regExpTest( triggerString ) ],
				typeCheck  : [ 'CONDITION_TYPE', equals( 'POSITIVE' ) ],
			},
			equals2( 'regexCheck', 'typeCheck' )
		)
		.map({
			triggerType : 'WHAT_TO_CHECK',
			setting     : identity,
			trigger     : function( setting ){
				return setting.WHAT_TO_CHECK + ': ' + triggerString;
			},
		})
	;
	return result;
}

function removeValueTrackParams( url ){
	//Let's remove the value track parameters
	return url.replace( /\{[0-9a-zA-Z]+\}/g, '' );
}

function isBad( issues ){
	return issues.length > 0;
}

function computeAWQLQuery( level ){
	var specifics = LEVEL_SPECIFICS[ level ];
	var query = ''
		+ 'SELECT'
			+ ' AdGroupId'
			+ ', Id'
			+ ', ' + specifics.urlColumn
		+ ' FROM'
		+ ' ' + specifics.report
		+ ' WHERE'
			+ ' CampaignStatus = "ENABLED"'
			+ ' AND AdGroupStatus = "ENABLED"'
			+ ' AND Status = "ENABLED"'
			+ ' AND ' + specifics.urlColumn + ' != ""'
	;
	Logger.log( 'query: ' + query );
	return query;
}

function processLevel( level ){
	
	// keyword- or ad-specific AWQL query
	var query = computeAWQLQuery( level );
	var rows = toList( AdsApp.report( query ).rows() );
	
	Logger.log( level + '-Report returned ' + rows.length + ' ' + level );
	
	rows.forEach( function( row ){
		// use specific column names for keywords and/or ads
		var url = row[ LEVEL_SPECIFICS[ level ].urlColumn ];
		// urls are a JSON encoded list of strings
		// take the first ( hopefully the list is not empty - I mean, 
		// AWQL-WHERE condition should prevent this, but who knows )
		row.Url = JSON.parse( url )[ 0 ];
		row.CleanUrl = removeValueTrackParams( row.Url );
	});
	
	var uniqueUrls = rows.map( 'CleanUrl' ).filter( onlyUnique );
	Logger.log( 'found ' + uniqueUrls.length + ' unique urls on ' + level + ' level ' );
	if( uniqueUrls.length > 0 ){
		Logger.log( 'examples: ' + uniqueUrls.slice( 0, 3 ).join( '\n' ) );
	}
	
	// check HTTP-code
	rows.forEach( function( row ){
		row.Result = URL_CHECKER.check( row.CleanUrl );
	});
	
	Logger.log( 'finished checks' );
	
	// keep only rows with bad HTTP-code
	rows = rows.filter( 'Result', isBad );
	
	var ids = rows.map(
			function( row ){
				return [ row.AdGroupId, row.Id ];
			}
		)
		// withIds() can take up to 10000 ids
		.slice( 0, 10000 )
	;
	if( rows.length > ids.length ){
		Logger.log(
			'WARN: '
			+ ( rows.length - ids.length )
			+ ' rows can not be processed due to 10k limit.'
		);
	}
	
	var badEntities = toList(
		AdsApp[ level ]()
			.withCondition( 'CampaignStatus = "ENABLED"' )
			.withCondition( 'AdGroupStatus = "ENABLED"' )
			.withCondition( 'Status = "ENABLED"' )
			.withIds( ids )
			.get()
	);
	
	var groupedRows = group( rows ).byAll( [ 'AdGroupId', 'Id' ] );
	badEntities.forEach( function( badEntity ){
		var row = groupedRows[
				badEntity.getAdGroup().getId()
			][
				badEntity.getId()
			]
		;
		var setting = row.Result[ 0 ].setting; // first come first served
		
		// Pause bad entities
		if( setting.PAUSE ){
			badEntity.pause();
		}
		
		// Label bad entities
		if( setting.LABEL ){
			var label = getLabel( setting.LABEL );
			if( !label ){
				if( AdWordsApp.getExecutionInfo().isPreview() ){
					printOnce( 'labeling doesn\'t work in preview mode. Skip it.' );
				}else{
					AdsApp.createLabel( setting.LABEL );
				}
			}
			label = getLabel( setting.LABEL );
			if( label ){
				badEntity.applyLabel( setting.LABEL );
			}
		}
	});
	
	return badEntities;
}

function getLabel( name ){
	return toList(
		AdsApp
			.labels()
			.withCondition( 'Name = ' + name )
			.get()
	)[ 0 ];
}

function reporting( badEntities ){
	var badEntitiesForReporting = badEntities
		.map({
			'Type'                 : [ 'getEntityType' ],
			'CampaignName'         : [ 'getCampaign', 'getName' ],
			'AdGroupName'          : [ 'getAdGroup',  'getName' ],
			'Headline/KeywordText' : [ LEVEL_SPECIFICS.getText ],
			'Trigger'              : [
				'urls',
				'getFinalUrl',
				URL_CHECKER.checkFromCache,
				function( triggerObj ){
					if( typeof triggerObj.setting.REPORT == 'undefined' ){
						return false;
					}
					// if REPORT is not true then it contains a message for reporting
					if( triggerObj.setting.REPORT === true ){
						return triggerObj.trigger;
					}
					return triggerObj.setting.REPORT;
				}
			],
			'FinalUrl'             : [ 'urls', 'getFinalUrl' ],
		})
		.filter( function( badEntity ){
			return badEntity.Trigger !== false
		})
	;
	if( badEntitiesForReporting.length == 0 ){
		// nothing to report
		return;
	}
	var grouped = group( badEntitiesForReporting ).by( 'Trigger' ).any();
	var grouped2 = group( badEntitiesForReporting ).by( 'Trigger' ).count();
	
	Logger.log(
		'count of badEntities: '
		+ badEntitiesForReporting.length
		+ '\n'
		+ 'counts: '
		+ JSON.stringify( grouped2, null, 2 )
		+ '\nSome examples: \n'
		+ JSON.stringify( grouped, null, 2 )
	);
	sendEmail( badEntitiesForReporting );
}

function sendEmail( badEntitiesForReporting ){
	var attachment = [ Object.keys( badEntitiesForReporting[ 0 ] ) ]
		.concat( badEntitiesForReporting.map( Object.values ) )
		.map( join( COLUMN_SEPARATOR ) )
		.join( LINE_SEPARATOR )
	;
	
	var options = {
		attachments: [
			Utilities.newBlob(
				attachment,
				'text/csv',
				'bad_urls_' + todaysDate() + '.csv'
			)
		]
	};
	var emailBody = 'There are '
		+ badEntitiesForReporting.length
		+ ' flawed URLS. See Excel-Sheet for more information.'
	;
	Logger.log( 'send emails to : ' + SEND_EMAILS_TO );
	
	SEND_EMAILS_TO.forEach( function( email ){
		MailApp.originalMailApp.sendEmail(
			email,
			SUBJECT,
			emailBody,
			options
		);
	});
}

function main(){
	try{
		Logger.log( 'start' );
		/*
		var badEntitiesForReporting = [
			{
    "Type": "Ad",
    "CampaignName": "DK - Search - Generic - Payments General",
    "AdGroupName": "Payments - Cheap",
    "Headline/KeywordText": "Betalingsløsning fra Nets / Stabil, pålidelig og sikker / Til butik og onlinehandel",
    "Trigger": "multiple consecutive slashes found in URL",
    "FinalUrl": "https://www.nets.eu/dk/payments//"
  },
  {
    "Type": "Ad",
    "CampaignName": "DK - Search - Brand - 360",
    "AdGroupName": "360",
    "Headline/KeywordText": "Nets 360 / Omnichannel fra Nets / Styrk din virksomhed",
    "Trigger": "HTTP_CODE: 301",
    "FinalUrl": "http://nets.eu/dk/payments/360/"
}
		];
		sendEmail( badEntitiesForReporting );
		return;
		*/
		/*
		if( typeof MccApp != 'undefined' ){
			var account = MccApp.accounts().withIds( [ ACCOUNT_ID_IF_IN_MCC_MODE ] ).get().next();
			MccApp.select( account );
			Logger.log( AdsApp.currentAccount().getName() );
		}
		*/
		
		// do for all keywords and/or ads:
		var badEntities = LEVELS
			.map( processLevel )
			.reduce( concat, [] )
		;
		
		// Reporting
		if( badEntities.length > 0 ){
			reporting( badEntities );
		}
		
		Logger.log( 'end' );
		
	}catch( error ){
		var accountName = AdWordsApp.currentAccount().getName();
		var subject = 'Error in ' + SCRIPT_NAME + ' ' + accountName;
		var message = error + '\n' + error.stack;
		Logger.log( subject + ' -> ' + message );
		if ( ! AdWordsApp.getExecutionInfo().isPreview() ){
			( ERROR_REPORTING_EMAILS || [] ).forEach( function( email ){
				MailApp.sendEmail( email, subject, message );
			});
		} else {
			Logger.log( 'don\'t send error-emails in preview-mode' );
		}
		throw error;
	}
}

// Helper functions --------------------

var printedOnce = {};

function printOnce( str ){
	if( ! printedOnce[ str ] ){
		printedOnce[ str ] = true;
		Logger.log( str );
	}
}

function first( arr ){
	return arr[ 0 ];
}

function print(){
	var args = [].slice.call( arguments );
	var mapper = deepApply( args );
	return function( item ){
		Logger.log( mapper( item ) );
		return item;
	};
}

function join( separator ){
	return function( arr ){
		return arr.join( separator );
	}
}

function isIn( arr ){
	return function( item ){
		return arr.indexOf( item ) >= 0;
	}
}

function concat( a, b ){
	return a.concat( b );
}

function todaysDate(){
	return Utilities.formatDate(
		new Date(),
		AdWordsApp.currentAccount().getTimeZone(),
		'yyyy-MM-dd'
	);
}

function toList( iterator ){
	var list = [];
	while( iterator.hasNext() ){
		list.push( iterator.next() );
	}
	return list;
}

function identity( x ){ return x }

function onlyUnique( value, index, self ){
	return self.indexOf( value ) === index;
};

function equals( value ){
	return function( item ){
		return item == value;
	};
}

function equals2( mapper1, mapper2 ){
	return function( item ){
		return apply1( item, mapper1 ) == apply1( item, mapper2 );
	}
}

function isDefined( value ){
	return value != null;
}

function and( a, b ){
	return a && b;
}

function or( a, b ){
	return a || b;
}

function call( method, params ){
	return function( item ){
		return item[ method ].apply( item, params );
	}
}

function apply( method ){
	var args = [].slice.call( arguments, 1 );
	return function( item ){
		return item[ method ].apply( item, args );
	}
}

function regExpTest( triggerString ){
	return apply( 'test', triggerString );
}

function group( rows ){
	if( ! rows ){
		throw new Error( 'rows is undefined' );
	}
	if( ! Array.isArray( rows ) ){
		throw new Error( 'rows must be an array' );	
	}
	return {
		byAll : function( keys, finalKey ){
			function recursive( keys, res, row ){
				var key = keys[ 0 ];
				var value = row[ key ];
				
				var otherKeys = keys.slice( 1 );
				if( otherKeys.length > 0 ){
					res[ value ] = res[ value ] || {};
					recursive( otherKeys, res[ value ], row );
				}else{
					if( finalKey ){
						res[ value ] = row[ finalKey ];
					}else{
						res[ value ] = row;	
					}
				}
			}
			var res = {};
			rows.forEach( function( row ){ recursive( keys, res, row ) } );
			return res;
		},
		by : function(){
			var keyMapper = deepApply( [].slice.call( arguments ) );
			return {
				sum : function( value ){
					var res = {};
					rows.forEach( function( row ){
						var key = keyMapper( row );
						res[ key ] = ( res[ key ] || 0 ) + row[ value ];
					});
					return res;
				},
				count : function(){
					var res = {};
					rows.forEach( function( row ){
						var key = keyMapper( row );
						res[ key ] = ( res[ key ] || 0 ) + 1;
					});
					return res;
				},
				any : function(){
					var res = {};
					rows.forEach( function( row ){
						var key = keyMapper( row );
						res[ key ] = row;
					});
					return res;
				},
				all : function(){
					var res = {};
					rows.forEach( function( row ){
						var key = keyMapper( row );
						res[ key ] = res[ key ] || [];
						res[ key ].push( row );
					});
					return res;
				},
			};
		}
	};
}

// --------- Enchance Functionals ----------
Array.prototype.map    = enchanceFunctional( Array.prototype.map );
Array.prototype.filter = enchanceFunctional( Array.prototype.filter );

function apply1( item, mapper, index, array ){
	if( typeof mapper == 'function' ){
		return mapper( item, index, array );
	}
	if(
		typeof mapper == 'string'
		&& typeof item[ mapper ] == 'function'
	){
		return item[ mapper ]();
	}
	if(
		typeof mapper == 'string'
		&& typeof item[ mapper ] != 'undefined'
	){
		return item[ mapper ];
	}
	
	if( typeof mapper[ item ] != 'undefined' ){
		return mapper[ item ];
	}
	
	if(
		typeof mapper == 'object'
		&& Object.prototype.toString.call( mapper ) == '[object Object]'
	){
		//console.log( 'obj' );
		var res = {};
		Object.keys( mapper ).forEach( function( key ){
			res[ key ] = apply1( item, mapper[ key ] );
		});
		return res;
	}
	
	if(
		typeof mapper == 'object'
		&& Object.prototype.toString.call( mapper ) == '[object Array]'
	){
		//console.log( 'arr' );
		
		var finalMapper = function( item, index, array ){
			var res = item;
			mapper.forEach( function( mapper1 ){
				res = apply1( res, mapper1, index, array );
			});
			return res;
		};
		return apply1( item, finalMapper, index, array );
	}
	throw new Error(
		'apply1() can\'t determine what to do with '
		+ JSON.stringify( item, null, 2 )
		+ ' and '
		+ mapper
	);
}

function deepApply( mapperList ){
	return function( item, index, array ){
		var res = item;
		mapperList.forEach( function( mapper ){
			res = apply1( res, mapper, index, array );
		} );
		return res;
	};
}

function enchanceFunctional( originalFunctional ){
	return function(){
		var mapperList = [].slice.call( arguments );
		var finalMapper = deepApply( mapperList );
		return originalFunctional.call( this, finalMapper );
	};
}


// --------- Polyfills ---------------------
Object.values = Object.values || ( function( obj ){
	return Object.keys( obj ).map( function( key ){
		return obj[ key ];
	});
});

Object.entries = Object.entries || ( function( obj ){
	return Object.keys( obj ).map( function( key ){
		return [ key, obj[ key ] ];
	});
});

console = typeof console != 'undefined' ? console : Logger;
Logger = typeof Logger != 'undefined' ? Logger : console;


var nonce = new Date().getTime(); // circumvent cache
var url = 'https://storage.googleapis.com/adwords-scripts-144712.appspot.com/email.js' + '?v=' + nonce;
eval( UrlFetchApp.fetch( url ).getContentText() );

