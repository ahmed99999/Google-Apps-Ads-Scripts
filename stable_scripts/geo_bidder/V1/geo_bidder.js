

var ACCOUNT_IDS = [];
var NUM_DAYS = 1365;
var MIN_CLICKS = 5;
var MIN_BID = '-10%';
var MAX_BID = '+100%';
var EXCLUDE_CAMPAIGNS = [];
var INCLUDE_CAMPAIGNS = [];
var EXCLUDE_CAMPAIGNS_WHICH_CONTAIN = [];
var TARGET_METRIC = 'ConversionRate';
var LEVELS = [ 'City', 'State', 'Country' ];


// GEOTARGETS_URL is the URL of the CSV containing all possible geo target locations (and IDs) worldwide.
// This CSV resolves location id's to location names. For example the location Berlin has the id 1003854
// This is a URL for https://developers.google.com/adwords/api/docs/appendix/geotargeting
var GEOTARGETS_URL = 'https://developers.google.com/adwords/api/docs/appendix/geo/geotargets-2019-02-11.csv';


// Computed bid modifier is taken to the power of EXPONENT.
// With EXPONENT = 1 bid modifier are proportional to the ratio of location-target metric to campaign target metric.
// For example if campaign conv-rate = 5%, but the location conv-rate = 10% then the bid-modifier is +100%.
// But if the EXPONENT is set to .7 then the bid-modifier is set to +62% instead.
// For EXPONENT of .3 the bid-modifier is set to +23%.
var EXPONENT = 1;

// CONFIDENCE is how conservative shall we estimate the bid-modifier.
// Default is 0.95 = 95%.
// Allowed values are between 0.1 (10%) and .9999 (99.99%).
// High confidence tends to lead to more conservative bid-modifiers (around +-0).
// Low confidence-values lead to more adventurous bid-modifiers (very high or very low).
// For positive (negative) bid-modifiers CONFIDENCE determines how confident we want to be
// that the conversion-rate of a geo-location is higher (lower) than that of the campaign.
// The bid-modifier will be set to +-0 if the campaign-conversion-rate is in the confidence-interval of the geo-location.
var CONFIDENCE = 0.4;


/* 
 *
 * Location-Adder and Geo-Bid-Modifier
 *
 * This script searches for target locations (based on your filter settings) in your campaigns, adds those locations 
 * and sets a bid modifier for them based on their conversion rates.
 * It also sets a bidding modifier for already existing locations. 
 * All changes made by the script will be reported in a report spreadsheet.
 * Created By: Marcel Prothmann, Alexander Tissen, Daniel Bartonitschek
 * Version: 1.2
 * www.pa.ag
 *
 */

// -------- CONSTANTS ---------------------------------------------

var SCRIPT_NAME = 'GeoLocationBidder';

var DEVELOPER_EMAIL = 'a.tissen@pa.ag';

// A small constant used to check equality of float values.
var ETA = .000001;

var LEVEL_KEYS = {
	City : 'CityCriteriaId',
	Metro : 'MetroCriteriaId',
	State : 'RegionCriteriaId',
	Country : 'CountryCriteriaId',
};

// ----------------------------------------------------------------

var _ = (function(){
	// Polyfills
	Object.values = Object.values || ( function( obj ){
		return Object.keys( obj ).map( function( key ){
			return obj[key]
		})
	});
	String.trim = function( value ){
		return value.trim();
	};
	function properties(){
		var args = Array.prototype.slice.call( arguments );
		var f = function( item ){
			return args.map( function( arg ){
				apply( item, arg );
			});
		};
		f.name1 = args.join( '_' ); // this improves groupBy() output
		return f;
	}
	function apply( item, arg ){
		if( typeof arg == 'function' ){
			return arg( item );
		}
		if( typeof item[ arg ] == 'function' ){
			return item[ arg ]();
		}
		if( typeof item[ arg ] != 'undefined' ){
			return item[ arg ];
		}
		if( typeof arg[ item ] != 'undefined' ){
			return arg[ item ];
		}
		throw new Error( 'apply() can\'t determine what to do with ' + item + ' and ' + arg );
	}
	function property(){
		var args = Array.prototype.slice.call( arguments );
		var f = function( item ){
			// do NOT use reduce here, because apply will interpret the third argument :(
			var res = item;
			args.forEach( function( arg ){ res = apply( res, arg ) } );
			return res;
		};
		f.name1 = args.join( '_' ); // this improves groupBy() output
		f.equals = function( value ){
			return function( item ){
				return f( item ) == value;
			}
		};
		f.eq = f.equals;
		f.lt = function( value ){
			return function( item ){
				return f( item ) < value;
			}
		};
		f.le = function( value ){
			return function( item ){
				return f( item ) <= value;
			}
		};
		f.gt = function( value ){
			return function( item ){
				return f( item ) > value;
			}
		};
		f.endsWith = function( value ){
			return function( item ){
				var x = f( item );
				return x.indexOf( value ) == x.length - value.length;
			}
		};
		f.isEmpty = function(){
			return function( item ){
				var x = f( item );
				return x == '';
			}
		};
		f.isNotEmpty = function(){
			return function( item ){
				var x = f( item );
				return x != '';
			}
		};
		f.isDefined = function(){
			return function( item ){
				var x = f( item );
				return typeof x != 'undefined';
			}
		}
		return f;
	}
	function clone( obj ){
		if ( obj === null || typeof( obj ) !== 'object' || 'isActiveClone' in obj ){
			return obj;
		}

		var temp;
		if ( obj instanceof Date ){
			temp = new obj.constructor(); //or new Date( obj );
		} else {
			temp = obj.constructor();
		}

		for ( var key in obj ){
			if ( Object.prototype.hasOwnProperty.call( obj, key ) ){
				obj[ 'isActiveClone' ] = null;
				temp[ key ] = clone( obj[ key ] );
				delete obj[ 'isActiveClone' ];
			}
		}
		return temp;
	}
	function partition( arr ){
		var clone1 = this.clone;
		return {
			clone : clone1,
			by: function( keyName ){
				var res = {};

				for ( var i = 0; i < arr.length; i++ ){
					var obj = this.clone( arr[ i ] );
					var key;
					if ( typeof keyName == 'function' ){
						key = keyName( obj );
					} else {
						key = obj[ keyName ];
					}

					// init
					res[ key ] = ( res[ key ] || [] );
					if( typeof keyName != 'function' ){
						delete obj[ keyName ];
					}
					res[ key ].push( obj );
				}
				return res;
			}
		};
	}
	function iteratorToList( iter ){
		var list = [];
		while( iter.hasNext() ){
			list.push( iter.next() );
		}
		return list;
	}
	return {
		toString		: function(){ return 'my tools class'; },
		property 		: property,
		properties		: properties,
		partition		: partition,
		clone			: clone,
		iteratorToList	: iteratorToList,
	};
})();

// ####################################################
// ####################################################

var MAIL_APP = ( function (){
	var SEND_EMAILS_THROUGH_MAILGUN = true;
	var URL = 'https://api.mailgun.net/v3/mg.peakace.de/messages';
	var FROM = 'adwords_scripts@mg.peakace.de';
	var AUTHORISATION = 'Basic YXBpOmtleS1hYWZmMmI2MGU4MmNkMWYwOTIwYWYxNDUzZWM0MDcyOA==';
	
	function sendEmail( recipient, subject, text, html ){
		if( !text && !html ){
			throw new Error( 'Neither text-body nor html supplied for email.' );
		}
		if( SEND_EMAILS_THROUGH_MAILGUN ){
			return mailGunSender( recipient, subject, text, html );
		}
		mailAppSender( recipient, subject, text, html );
	}

	function mailAppSender( recipient, subject, text, html ){
		MailApp.sendEmail(
			recipient,
			subject,
			text,
			{
				name: subject,
				htmlBody : html
			}
		);
	}

	function mailGunSender( recipient, subject, text, html ){
		if ( html ){
			if ( !text ){
				text = 'this is supposed to be a html email. Seems like your device doesn\'t support html emails.';
			}
			html = '<html><body>' + html + '</body></html>';
		} else {
			html = null;
		}
		Logger.log( 'fetch URL' );

		return UrlFetchApp.fetch(
			URL,
			{
				method : 'post',
				payload : {
					from : FROM,
					to: recipient,
					subject : subject,
					text : text,
					html : html,
				},
				headers : {
					Authorization : AUTHORISATION,
				}
			}
		);
	}
	
	return {
		sendEmail	: sendEmail,
	}
})();

// ####################################################
// ####################################################

function addLeadingZeros( number, digits ){
	var res = '' + number;
	while ( res.length < digits ){
		res = '0' + res;
	}
	return res;
}

// Returns yyyyMMdd-formatted date.
function getDateInThePast( dateReference, numDays ){
	var date1 = new Date( dateReference.getTime() );
	date1.setDate( date1.getDate() - numDays );
	return addLeadingZeros( date1.getFullYear(), 4 ) +
		addLeadingZeros( date1.getMonth() + 1, 2 ) +
		addLeadingZeros( date1.getDate(), 2 );
}

function isEligible( campaign ){
	if( INCLUDE_CAMPAIGNS.length > 0 ){
		return INCLUDE_CAMPAIGNS.indexOf( campaign.getName() ) >= 0;
	}
	if( EXCLUDE_CAMPAIGNS.indexOf( campaign.getName() ) >= 0 ){
		return false;
	}
	var exclude = false;
	EXCLUDE_CAMPAIGNS_WHICH_CONTAIN.forEach( function( str ){
		if( campaign.getName().indexOf( str ) >= 0 ){
			exclude = true;
		}
	});
	return !exclude;
}

function combineIterators( iterator1, iterator2 ){
	return {
		hasNext : function(){ return iterator1.hasNext() || iterator2.hasNext() },
		next : function(){
			if( iterator1.hasNext() ){
				return iterator1.next();
			}
			return iterator2.next();
		}
	};
}

function main(){
	try{
		Logger.log( 'start' );
		// Logger.log( GEOTARGETS_URL );
		// return;
		if( typeof MccApp == 'undefined' ){
			Logger.log( 'Process this (single) account.' );
			processAccount();
		}else{
			var accountIds = ACCOUNT_IDS;
			if( accountIds.length == 0 ){
				Logger.log( 'No accounts for geo bidding. Terminate.' );
				return;
			}
			Logger.log( 'accounts: ' + accountIds );
			
			var app = MccApp
				.accounts()
				.withIds( accountIds )
				//.withLimit( 1 )
				//.withIds( account )
				.executeInParallel( 'processAccount' );
		}
	}catch( error ){
		var accountName = AdWordsApp.currentAccount().getName();
		MAIL_APP.sendEmail( DEVELOPER_EMAIL, 'Error in ' + SCRIPT_NAME + ' ' + accountName, error + '\n' + error.stack );
		Logger.log( 'Error in ' + SCRIPT_NAME + ' ' + accountName + ' -> ' + error + '\n' + error.stack );
		throw error;
	}
}

function parseMetric( value ){
	value = value.replace( ',', '' );
	if( value.substring( value.length - 1 ) == '%' ){
		value = value.substring( 0, value.length - 1 ) / 100;
	}
	return parseFloat( value );
}

function computeMetric( row ){
	switch( TARGET_METRIC ){
		case 'ConversionRate' : return parseMetric( row[ 'ConversionRate' ] );
		//case 'ReturnOnAdvertisingSpend' : return parseFloat( row[ 'ConversionValue' ].replace( /,/, '' ) ) / parseFloat( row[ 'Cost' ].replace( /,/, '' ) );
		//case 'RevenuePerClick' : return parseFloat( row[ 'ConversionValue' ].replace( /,/, '' ) ) / parseInt( row[ 'Clicks' ] );
		case 'AveragePosition' : return parseFloat( row[ 'AveragePosition' ] );
		default : throw new Error( ' illegal target metric: ' + TARGET_METRIC );
	}
}

function processAccount(){
	var locations = getLocations();
	//locations = JSON.parse( arg );
	var TIME_ZONE = AdWordsApp.currentAccount().getTimeZone();
	
	var campaignIterator = AdWordsApp.campaigns().withCondition( 'Status = "ENABLED"' ).get();
	var shoppingCampaignIterator = AdWordsApp.shoppingCampaigns().withCondition( 'Status = "ENABLED"' ).get();
	var campaigns = _.iteratorToList( combineIterators( campaignIterator, shoppingCampaignIterator ) )
		.filter( isEligible );
		
	var isPreview = AdWordsApp.getExecutionInfo().isPreview();
	
	var now = new Date( Utilities.formatDate( new Date(), TIME_ZONE, 'MMM dd,yyyy HH:mm:ss' ) );
	var during = getDateInThePast( now, NUM_DAYS ) + ', ' + getDateInThePast( now, 0 );
	
	var query = 'SELECT '
			+ 'CampaignId, '
			+ 'CityCriteriaId, '
			+ 'MetroCriteriaId, '
			+ 'RegionCriteriaId, '
			+ 'CountryCriteriaId, '
			//+ 'IsTargetingLocation, '
			//+ 'MostSpecificCriteriaId, ' // acts like a segment. adds postal codes to result set
			+ 'Impressions, '
			+ 'AveragePosition, '
			+ 'Clicks, '
			+ 'Cost, '
			+ 'Conversions, '
			+ 'ConversionValue, '
			+ 'ConversionRate '
		+ 'FROM GEO_PERFORMANCE_REPORT '
		+ 'WHERE '
			+ 'CampaignId IN [' + campaigns.map( _.property( 'getId' ) ).join( ',' ) + '] '
			+ 'AND Clicks >= ' + MIN_CLICKS + ' '
		+ 'DURING ' + during;
	Logger.log( query );
	
	var campaignQuery = 'SELECT '
			+ 'CampaignId, '
			+ 'Impressions, '
			+ 'AveragePosition, '
			+ 'Clicks, '
			+ 'Cost, '
			+ 'Conversions, '
			+ 'ConversionValue, '
			+ 'ConversionRate '
		+ 'FROM CAMPAIGN_PERFORMANCE_REPORT '
		+ 'WHERE '
			+ 'CampaignId IN [' + campaigns.map( _.property( 'getId' ) ).join( ',' ) + '] '
		+ 'DURING ' + during;
	Logger.log( campaignQuery );
	
	var campaignRows = _.iteratorToList( AdWordsApp.report( campaignQuery ).rows() );
	campaignRows	= _.partition( campaignRows	).by( 'CampaignId' );
	
	var allRows = _.iteratorToList( AdWordsApp.report( query, { resolveGeoNames : false } ).rows() );
	Logger.log( 'count report rows: ' + allRows.length );
	
	var myRows = {};
	
	myRows.City = allRows.filter( _.property( 'CityCriteriaId' ).gt( 0 ) );
	allRows = allRows.filter( _.property( 'CityCriteriaId' ).eq( 0 ) );
	
	myRows.Metro = allRows.filter( _.property( 'MetroCriteriaId' ).gt( 0 ) );
	allRows = allRows.filter( _.property( 'MetroCriteriaId' ).eq( 0 ) );
	
	myRows.State = allRows.filter( _.property( 'RegionCriteriaId' ).gt( 0 ) );
	allRows = allRows.filter( _.property( 'RegionCriteriaId' ).eq( 0 ) );
	
	myRows.Country = allRows.filter( _.property( 'CountryCriteriaId' ).gt( 0 ) );
	allRows = allRows.filter( _.property( 'CountryCriteriaId' ).eq( 0 ) );
	
	if( allRows.length > 0 ){
		Logger.log( 'WARNING: found rows which could not be assigned to a level' );
	}
	
	myRows.City		= _.partition( myRows.City 		).by( 'CampaignId' );
	myRows.Metro	= _.partition( myRows.Metro		).by( 'CampaignId' );
	myRows.State	= _.partition( myRows.State 	).by( 'CampaignId' );
	myRows.Country	= _.partition( myRows.Country 	).by( 'CampaignId' );
	
	campaigns.forEach( function( campaign ){
		Logger.log( '---------------------> campaign: ' + campaign.getName() );

		var campaignRows2 = campaignRows[ campaign.getId() ];
		if( !campaignRows2 || campaignRows2.length == 0 ){
			throw new Error( 'no metrics for campaign ' + campaign.getName() + ' found ' + campaignRows.length + ' ' + campaignRows );
		}
		if( campaignRows2.length > 1 ){
			throw new Error( 'too many metrics for campaign ' + campaign.getName() + ' found ' + campaignRows2.length + ' ' + campaignRows2 );
		}
		//Logger.log( 'campaignRow: ' + JSON.stringify( campaignRows2[ 0 ], null, 2 ) );
		
		var campaignMetric = computeMetric( campaignRows2[ 0 ] );

		if( campaignMetric == 0 ){
			Logger.log( '' + campaign.getName() + ' - Campaign\'s target metric ' + TARGET_METRIC + ' is zero. Skip.' );
			return;
		}
		
		var campaignLocations = _.iteratorToList( campaign.targeting().targetedLocations().get() );
		var campaignLocations2 = _.partition( campaignLocations ).by( 'getId' );
		
		var campaignLocationIds = campaignLocations.map( _.property( 'getId' ) );
		
		LEVELS.forEach( function( level ){
			if( ! myRows[ level ] ){
				throw new Error( 'unknown level: ' + level );
			}
			Logger.log( '--> level: ' + level );
			
			if( typeof myRows[ level ][ campaign.getId() ] == 'undefined' ){
				Logger.log( 'no geo data. Skip.' );
				return;
			}
			
			var levelKey = LEVEL_KEYS[ level ];
			
			myRows[ level ][ campaign.getId() ].forEach( function( row ){
				var id = row[ levelKey ] / 1;
				
				var locationMetric = computeMetric( row );
				
				var bidModifier = 1;
				
				if( TARGET_METRIC == 'ConversionRate' ){
					if( parseMetric( row[ 'Conversions' ] ) < 0 ){
						Logger.log( 'negative conversions (' + row[ 'Conversions' ] + ') for ' + campaign.getName() + ' row: ' + JSON.stringify( row ) );
						return;
                    }
					bidModifier = intervalEstimate( campaignMetric, 1 - CONFIDENCE, row[ 'Clicks' ] / 1, parseMetric( row[ 'Conversions' ] ) )[ 2 ];
				}else{
					bidModifier = locationMetric / campaignMetric;
				}
				
				bidModifier = Math.pow( bidModifier, EXPONENT );
				
				var minBid = MIN_BID.substring( 0, MIN_BID.length - 1 ) / 100 + 1;
				var maxBid = MAX_BID.substring( 0, MAX_BID.length - 1 ) / 100 + 1;
				
				bidModifier = Math.max( bidModifier, minBid );
				bidModifier = Math.min( bidModifier, maxBid );
				
				if( bidModifier != bidModifier ){
					throw new Error( 'Computed bidModifier is NaN.' );
					return;
				}
				var oldBidModifier = '';
				
				function formatModifier( modifier ){
					var res = ( Math.round( ( modifier - 1 ) * 100 ) + '%' );
					if( modifier > 1 ){
						res = '+' + res;
					}
					return res;
				}
				function formatAsPercent( value ){
					var res = ( Math.round( value * 1000 ) / 10 ) + '%';
					return res;
				}
				
				if( campaignLocationIds.indexOf( id ) >= 0 ){
					var loc = campaignLocations.filter( function( x ){ return x.getId() == id } )[ 0 ];
					//Logger.log( 'targeted location: ' + locations[ id ] ); // + ' - ' + row.Impressions + ' - ' + stats.getImpressions() );
					oldBidModifier = loc.getBidModifier();
					if( Math.abs( oldBidModifier - bidModifier ) > .01 ){
						loc.setBidModifier( bidModifier );
						//if( Math.abs( bidModifier - 1 ) > ETA ){
							Logger.log( locations[ id ] + ' (' + id + ') '
								+ '^ ' + TARGET_METRIC + ': ' + formatAsPercent( locationMetric )
								+ '^ Campaign-' + TARGET_METRIC + ': ' + formatAsPercent( campaignMetric )
								+ '^ Clicks: ' + row[ 'Clicks' ]
								+ '^ Conversions: ' + row[ 'Conversions' ]
								+ '^ Old-BidModifier: ' + formatModifier( oldBidModifier )
								+ '^ New-BidModifier: ' + formatModifier( bidModifier )
							);
						//}	
					}
				}else{
					//Logger.log( 'add new location' + locations[ id ] );
					if( Math.abs( bidModifier - 1 ) > ETA ){
						campaign.addLocation( id, bidModifier );
						Logger.log( '---> ' + locations[ id ] + ' (' + id + ') '
							+ '^ ' + TARGET_METRIC + ': ' + formatAsPercent( locationMetric )
							+ '^ Campaign-' + TARGET_METRIC + ': ' + formatAsPercent( campaignMetric )
							+ '^ Clicks: ' + row[ 'Clicks' ]
							+ '^ Conversions: ' + row[ 'Conversions' ]
							+ '^'
							+ '^ BidModifier: ' + formatModifier( bidModifier )
						);
					}
				}
			});
		});
	});
	Logger.log( 'End ' + AdsApp.currentAccount().getName() );
}

function getLocations(){
	var map = {};
	try{
		var geo = UrlFetchApp.fetch( GEOTARGETS_URL, { method: 'get' } ).getContentText();
	  
		geo = geo.split( '\n' );
		geo.shift(); // remove headers
		geo.forEach( function( row ){
			var values = row.split( '","' );
			var id = values[ 0 ].substring( 1 );
			var canonicalName = values[ 2 ];
			map[ id ] = canonicalName;
		});
	}catch( error ){
		Logger.log( 'Could not get Geo-Targets from CSV: ' + error + ' <-> ' + error.stack );
		Logger.log( 'Since this is used only for prettier logging we skip this step and proceed.' );
	}
	return map;
}

// -----------------------------------------------------|
//	Beta-Distribution									|

function LogGamma( Z ){
	var S = 1
		+ 76.18009173 / Z
		- 86.50532033 / ( Z + 1 )
		+ 24.01409822 / ( Z + 2 )
		- 1.231739516/ ( Z + 3 )
		+ .00120858003 / ( Z + 4 )
		- .00000536382 / ( Z + 5 )
	;
	var LG = ( Z - .5 ) * Math.log( Z + 4.5 ) - ( Z + 4.5 ) + Math.log( S * 2.50662827465 );
	return LG;
}

function Betinc( X, A, B ){
	var A0 = 0;
	var B0 = 1;
	var A1 = 1;
	var B1 = 1;
	var M9 = 0;
	var A2 = 0;
	var C9;
	while( Math.abs( ( A1 - A2 ) / A1 ) > .00001 ){
		A2 = A1;
		C9 = -( A + M9 ) * ( A + B + M9 ) * X / ( A + 2 * M9 ) / ( A + 2 * M9 + 1 );
		A0 = A1 + C9 * A0;
		B0 = B1 + C9 * B0;
		M9 = M9 + 1;
		C9 = M9 * ( B - M9 ) * X / ( A + 2 * M9 - 1 ) / ( A + 2 * M9 );
		A1 = A0 + C9 * A1;
		B1 = B0 + C9 * B1;
		A0 = A0 / B1;
		B0 = B0 / B1;
		A1 = A1 / B1;
		B1 = 1;
	}
	return A1 / A;
}

function betaDist( cr, clicks, conv ){
	var Z = cr;
	var A = conv + 1;
	var B = clicks - conv + 1;
	if( A <= 0 ){
		throw new Error( 'alpha must be positive' );
	}else if( B <= 0 ){
		throw new Error( 'beta must be positive' );
	}else if ( Z <= 0 ){
		Betacdf = 0;
	}else if( Z >= 1 ){
		Betacdf = 1;
	}else{
		S = A + B;
		BT = Math.exp( LogGamma( S ) - LogGamma( B ) - LogGamma( A ) + A * Math.log( Z ) + B * Math.log( 1 - Z ) );
		if( Z < ( A + 1 ) / ( S + 2 ) ){
			Betacdf = BT * Betinc( Z, A, B );
		}else{
			Betacdf = 1 - BT * Betinc( 1 - Z, B, A );
		}
	}
	Betacdf = Betacdf + .000005;
    return Betacdf;
}

function search( alpha, clicks, conv, min, max, eta ){
	//Logger.log( '[' + min + ',' + max + ']' );
	var x = min + ( max - min ) / 2;
	var value = betaDist( x, clicks / 1, conv / 1 );
	if( Math.abs( alpha - value ) < eta ){
		return x;
	}
	if( value > alpha ){
		return search( alpha, clicks, conv, min, x, eta );
	}
	if( value < alpha ){
		return search( alpha, clicks, conv, x, max, eta );
	}
	throw new Error( 'should not happen. Alpha: ' + alpha 
		+ ', value: ' + value 
		+ ', eta: ' + eta 
		+ ', min: ' + min 
		+ ', max: ' + max 
		+ ', clicks: ' 
		+ clicks 
		+ ', conv: ' + conv
		+ ', x: ' + x
	);
}

function intervalEstimate( campaignCr, alpha, clicks, conv ){
	if( conv > clicks ){
		Logger.log( 'WARNING: conv > clicks. clicks: ' + clicks + ', conv: ' + conv );
		Logger.log( 'Adjust conv to clicks.' );
		conv = clicks;
	}
	var ETA = .0001; // a small constant
	var lowerBound = Math.min( conv / clicks, search( alpha / 2, clicks, conv, 0, 1, ETA ) );
	var upperBound = Math.max( conv / clicks, search( 1 - alpha / 2, clicks, conv, 0, 1, ETA ) );

	var x = upperBound / campaignCr;
	var y = lowerBound / campaignCr;
	
	//var x = Math.round( x * 100 - 100 );
	//var y = Math.round( y * 100 - 100 );
	//var z = Math.round( ( x + y ) / 2 * 100 ) / 100;

	if( upperBound < campaignCr ){
		return [ lowerBound, upperBound, x ];
	}
	else if( lowerBound > campaignCr ){
		return [ lowerBound, upperBound, y ];
	}else{
		return [ lowerBound, upperBound, 1 ];
	}
}

// [ lowerBound, upperBound, bidModifier ] = intervalEstimate( campaignCr, alpha, clicks, conv );

//														|
// -----------------------------------------------------|

