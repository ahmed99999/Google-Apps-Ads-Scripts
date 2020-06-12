/*
TODOS:
	- display ads => works as intended (not a bug)
	- feature request: sitelink URLs
	- pause the ad/keyword instead of ad-group
	- catch "broken" urls?? ( double trailing slash )
	- fixed: bug: REQUIRED_PERCENTAGE_OF_WORKING_URLS_IN_AD_GROUP == 1 pauses all adgroups
	- 
*/

// -- Settings

// 0 = ignore this feature
var MIN_PRODUCTS = 0;

// This is the specific text (or texts) to search for
// on the page that indicates the item 
// is out of stock. If ANY of these match the html
// on the page, the item is considered "out of stock"
var TRIGGER = {
	IGNORE			: [],
	OUT_OF_STOCK	: [],
	IN_STOCK		: [],
	PRODUCT			: [],
};

// possible values: [ 0.0 - 1.0 ]
// One item with working URL is always required. Even if this setting is set to 0.0
var REQUIRED_PERCENTAGE_OF_WORKING_URLS_IN_AD_GROUP = .99;

// LEVEL can be 'keywords' or 'ads'
var LEVEL = 'ads';
var COMPUTE_ONLY_A_FRACTION_OF_CAMPAIGNS_EACH_HOUR = false;
var CAMPAIGN_NAME_CONTAINS = [ '', '', '', ];
var CAMPAIGN_NAME_DOESNT_CONTAIN = [];
		
var AD_GROUP_CONTAINS_ANY = [];
var AD_GROUP_CONTAINS_NONE = [];

var ONLY_ENABLED_ITEMS = true;

var EXCLUDED_CAMPAIGNS = [ '', '', '', ];

var URL_ERROR_LABEL = 'url_error';
var OUT_OF_STOCK_LABEL = 'No products';
var HTTP_4XX_LABEL = 'HTTP_4XX';

var SUBJECT = AdWordsApp.currentAccount().getName();
var TO = [ 'a.tissen@pa.ag' ];
var SEND_ERROR_MESSAGES_TO = 'a.tissen@pa.ag';

var MAILGUN_URL = 'https://api.mailgun.net/v3/mg.peakace.de/messages';
var MAILGUN_AUTH = 'Basic YXBpOmtleS1hYWZmMmI2MGU4MmNkMWYwOTIwYWYxNDUzZWM0MDcyOA==';
var MAILGUN_FROM = 'adwords_scripts@mg.peakace.de';

var STRIP_QUERY_STRING = false; //true; // set this to false if the stuff that comes after the question mark is important
var WRAPPED_URLS = false; // set this to true if you use a 3rd party like Marin or Kenshoo for managing you account

var ACTIONS = {
	ERROR : {
		applyLabel	: [ URL_ERROR_LABEL ],
		removeLabel : [ OUT_OF_STOCK_LABEL, HTTP_4XX_LABEL ],
		status		: 'pause',
	},
	ENABLE : {
		labelConditions : [ OUT_OF_STOCK_LABEL, HTTP_4XX_LABEL, URL_ERROR_LABEL ],
		applyLabel	: [],
		removeLabel : [ OUT_OF_STOCK_LABEL, HTTP_4XX_LABEL, URL_ERROR_LABEL ],
		status		: 'enable',
	},
	PAUSE 			: {
		applyLabel 	: [ OUT_OF_STOCK_LABEL ],
		removeLabel	: [ HTTP_4XX_LABEL, URL_ERROR_LABEL ],
		status		: 'pause',
	},
	IGNORE 			: {
		applyLabel 	: [],
		removeLabel	: [ HTTP_4XX_LABEL, URL_ERROR_LABEL ],
	},
	LABEL_4XX		: {
		applyLabel 	: [ HTTP_4XX_LABEL ],
		removeLabel	: [ OUT_OF_STOCK_LABEL, URL_ERROR_LABEL ],
		status		: 'pause'
	}
};

function logic( found ){
	if( found.error ){
														found.actionName = 'ERROR';
	}else if( found.httpCode >= 400 && found.httpCode < 500 ){
														found.actionName = 'LABEL_4XX';
	}else if( found.trigger.IGNORE > 0 ){ 				found.actionName = 'IGNORE';
	}else if( found.trigger.IN_STOCK > 0 && found.trigger.OUT_OF_STOCK > 0 ){
														found.actionName = 'IGNORE';
	}else if( found.trigger.IN_STOCK > 0 ){ 			found.actionName = 'ENABLE';
	}else if( found.trigger.OUT_OF_STOCK > 0 ){			found.actionName = 'PAUSE';
	}else if( found.trigger.PRODUCT >= MIN_PRODUCTS ){ 	found.actionName = 'ENABLE'; // assume that URL is a category page
	}else if( found.trigger.PRODUCT < MIN_PRODUCTS ){ 	found.actionName = 'PAUSE';
	}else{												found.actionName = 'IGNORE'; }
	found.action = ACTIONS[ found.actionName ];
	return found;
}

function check( url ){
	var res = {
		url		 : url,
		error	 : false,
		httpCode : undefined,
		trigger  : {
			IGNORE			: 0,
			OUT_OF_STOCK	: 0,
			IN_STOCK		: 0,
			PRODUCT			: 0,
		},
	};
	var response;
	try{
		response = UrlFetchApp.fetch( url, { muteHttpExceptions : true } );
	}catch( error ){
		Logger.log( 'Error during fetch: ' + error );
		res.error = true;
		return res;
	}
	res.httpCode = response.getResponseCode();
	
	if( res.httpCode >= 400 && res.httpCode < 500 ){
		return res;
	}
	if( res.httpCode < 200 || res.httpCode >= 500 ){
		res.error = true;
		return res;
	}

	var html = response.getContentText();

	res.trigger = Object.keys( TRIGGER ).map( function( triggerType ){
		return {
			triggerType : triggerType,
			count		: TRIGGER[ triggerType ].map( function( text ){
				// compute the number of occurrences
				return ( html.match( new RegExp( text, 'g' ) ) || [] ).length;
			}).reduce( sum, 0 ),
		};
	}).reduce( function( a, b ){ a[ b.triggerType ] = b.count; return a }, {} );
	
	return res;
}

function checkLabelConditions( labeledAdGroupIds ){
	return function( item ){
		item.action = ACTIONS[ item.actionName ];
		item.labelConditionsFullfilled =
				! item.action.labelConditions
			|| 	item.action.labelConditions.length == 0
			||	item.action.labelConditions.reduce( function( boolSoFar, label ){
				return boolSoFar || labeledAdGroupIds[ label ].indexOf( adgroupId ) >= 0;
			}, false )
		;
		return item;
	};
}

var SCRIPT_NAME = 'Nicht auf Lager Check';

// ---- Constants ---------

var SEPARATOR = ';';

var HOURS_PER_DAY = 24;
if( !COMPUTE_ONLY_A_FRACTION_OF_CAMPAIGNS_EACH_HOUR ){
	HOURS_PER_DAY = 1;
}

// ------------------------

// Inspired by java.util.Optional
// returns an object which either has a value (which can be retrieved by .get() )
// or has an error-message. 'optional' can be used to represent missing values (instead of returning null).
function optional( value, message ){
	var error = message ? new Error( message ) : new Error( 'No such value!' );
	var isNull = ( value === undefined || value === null );
	return {
	  get : 			function()						{ if( isNull ){ throw error; } return value; },
	  ifPresent : 		function( consumer )			{ if( !isNull ){ consumer( value ) } },
	  peek : 			function( consumer )			{ if( !isNull ){ consumer( value ) } return this },
	  map : 			function(){
		var args = Array.prototype.slice.call( arguments );
		// first argument is the method to call
		var method = args.splice( 0, 1 );
		// all other arguments are arguments of the method
		if( isNull ){
		  return this;
		}
		if( typeof method == 'function' ){
		  return optional( method.apply( value, args ) );
		}else if( typeof value[ method ] == 'function' ){
		  return optional( value[ method ].apply( value, args ) );
		}else{
		  return optional( value[ method ] );
		}
	  },
	  call : function(){ 
		var args = Array.prototype.slice.call( arguments );
		// first argument is the method to call
		var method = args.splice( 0, 1 );
		// all other arguments are arguments of the method
		if( !isNull ){
		  value[ method ].apply( value, args );
		}
		return this;
	  },
	  filter : 		function( predicate )			{ return isNull || predicate( value ) ? this : optional() },
	  onlyIf : 		function( method )				{ return isNull || value[ method ]() ? this : optional() },
	  isPresent : 	function()						{ return !isNull },
	  hasFailed :	function()						{ return isNull },
	  isEmpty :		function()						{ return isNull },
	  orElse : 		function( other )				{ return isNull ? other : value },
	  orElseGet : 	function( supplier )			{ return isNull ? supplier.get() : value },
	  orElseThrow : 	function( exceptionSupplier )	{ if( isNull ) throw exceptionSupplier(); return value; },
	  equals : 		function( otherValue )			{ return !isNull && value == otherValue },
		getMessage : function(){ return message },
	  forEach :	 	function( consumer )			{
		if( this.isPresent() ){
		  var iterator = this.get();
		  while( iterator.hasNext() ){
			consumer( iterator.next() );
		  }
		}
	  },
	  toString : 		function()						{ return isNull ? 'Empty' : 'Optional< ' + value + ' >' },
	};
}

function onlyUnique( value, index, self ){
	return self.indexOf( value ) === index;
}

function onlyUnique2(){
	var map = {};
	return function( item ){
		if( map[ item ] ){
			return false;
		}
		map[ item ] = 1;
		return true;
	};
}

function or( bool1, bool2 ){
	return bool1 || bool2;
}

function sum( value1, value2 ){
	return value1 + value2;
}

function findLabel( labelName ){
	var labelSelector = AdWordsApp.labels()
		.withCondition('Name = "' + labelName + '"');
	
	var labelIterator = labelSelector.get();
	if( labelIterator.hasNext() ){
		return labelIterator.next();
	}
}

function findOrCreateLabel( labelName ){
	var label = findLabel( labelName );
	if( ! label ){
		//return AdWordsApp.createLabel( labelName );
		return findLabel( labelName );
	}else{
		return label;
	}
}

function iteratorToList( iter ){
	var list = [];
	while( iter.hasNext() ){
		list.push( iter.next() );
	}
	return list;
}

function apply( item, arg, arg2 ){
	if( Array.isArray( arg ) ){
		return deepApply( arg )( item );
	}
	if( typeof arg == 'function' ){
		if( typeof arg2 != 'undefined' ){
			return arg( item, arg2 );
		}
		return arg( item );
	}
	if( typeof item[ arg ] == 'function' ){
		if( typeof arg2 != 'undefined' ){
			return arg[ arg ]( arg2 );
		}
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
	f.unequalTo = function( value ){
		return function( item ){
			return f( item ) != value;
		}
	};
	f.eq = f.equals;
	f.lt = function( value ){
		return function( item ){
			return f( item ) < value;
		}
	};
	f.lessThan = f.lt;
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

function group( rows ){
	function extract( obj, selector ){
		if( typeof selector == 'undefined' ){
			return obj;
		}
		if( typeof selector == 'function' ){
			return selector( obj );
		}
		if( typeof obj[ selector ] == 'function' ){
			return obj[ selector ]();
		}
		if( typeof obj[ selector ] != 'undefined' ){
			return obj[ selector ];
		}
		throw new Error( 'Can\'t extract ' + selector + ' from ' + obj );
	}

	return {
		by : function( keyMapper ){
			return {
				sum : function( valueMapper ){
					var res = {};
					rows.forEach( function( row ){
						var key = extract( row, keyMapper );
						res[ key ] = ( res[ key ] || 0 ) + extract( row, valueMapper );
					});
					return res;
				},
				count : function(){
					var res = {};
					rows.forEach( function( row ){
						var key = extract( row, keyMapper );
						res[ key ] = ( res[ key ] || 0 ) + 1;
					});
					return res;
				},
				any : function( valueMapper ){
					var res = {};
					rows.forEach( function( row ){
						var key = extract( row, keyMapper );
						res[ key ] = extract( row, valueMapper );
					});
					return res;
				},
				all : function( valueMapper){
					var res = {};
					rows.forEach( function( row ){
						var key = extract( row, keyMapper );
						res[ key ] = res[ key ] || [];
						res[ key ].push( extract( row, valueMapper ) );
					});
					return res;
				},
				keys : function(){
					var res = {};
					rows.forEach( function( row ){
						var key = extract( row, keyMapper );
						res[ key ] = 1
					});
					return Object.keys( res );
				}
			};
		}
	};
}

function flatten( matrix ){
	return [].concat.apply( [], matrix );
}

function notIn( list ){
	return function( item ){
		return list.indexOf( item ) == -1;
	};
}

function containedIn( list ){
	return function( item ){
		return list.indexOf( item ) > -1;
	};
}

function invert( mapOfLists ){
	var res = {};
	for( var key in mapOfLists ){
		for( var index in mapOfLists[ key ] ){
			var value = mapOfLists[ key ][ index ];
			res[ value ] = res[ value ] || [];
			res[ value ].push( key );
		}
	}
	return res;
}

function findLabeledAdGroups( campaignIds ){
	var labeledAdGroupIds = {};
	[ OUT_OF_STOCK_LABEL, HTTP_4XX_LABEL, URL_ERROR_LABEL ].forEach( function( labelName ){
		labeledAdGroupIds[ labelName ] =
			iteratorToList(
				AdWordsApp.adGroups()
				.withCondition( 'LabelNames CONTAINS_ANY [ "' + labelName + '" ]' )
				.withCondition( 'CampaignId IN [' + campaignIds.join( ',' ) + ']' )
				.get()
			)
			.map( property( 'getId' ) )
		;
		Logger.log( labeledAdGroupIds[ labelName ].length + ' ad groups are labeled as "' + labelName + '"' );
		//Logger.log( labeledAdGroupIds[ labelName ] );
	});
	return labeledAdGroupIds;
}

function computeCheckResults( items ){
	// compute checkResults
	var checkResults = items
		.map( property( 'urls', 'getFinalUrl' ) )
		.map( cleanUrl )
		.filter( onlyUnique2() )
		.map( check )
		.map( logic )
		//.map( checkLabelConditions( labeledAdGroupIds ) )
	;
	checkResults = group( checkResults ).by( 'url' ).any();
	
	//Logger.log( 'result: ' + JSON.stringify( checkResults, null, 2 ) );
	Object.keys( checkResults ).filter( function( url ){ return checkResults[ url ].actionName != 'ENABLE' } )
		.forEach( function( url ){
		Logger.log( 'result: ' + JSON.stringify( checkResults[ url ], null, 2 ) );
	});
	return checkResults;
}

function intersection( arr1, arr2 ){
	return arr1.filter( function( x ){ return arr2.indexOf( x ) >= 0 } );
}

function main(){
	var accountName = AdWordsApp.currentAccount().getName();
	try{
		Logger.log( 'start' );
		if( MIN_PRODUCTS ){
			Logger.log( 'Goal: pause ad groups with less than ' + MIN_PRODUCTS + ' products ' );
		}
		[ OUT_OF_STOCK_LABEL, HTTP_4XX_LABEL, URL_ERROR_LABEL ].forEach( findOrCreateLabel );
		
		var campaignIdsOptional = getCurrentCampaignIds();
		if( campaignIdsOptional.isEmpty() ){
			Logger.log( campaignIdsOptional.getMessage() );
			return;
		}
		var campaignIds = campaignIdsOptional.get();
	
		var items = getItems( campaignIds );
	
		var labeledAdGroupIds = findLabeledAdGroups( campaignIds );
		var labelsOf = invert( labeledAdGroupIds );
		
		var checkResults = computeCheckResults( items );
		
		var reporting = [];
		var statusChange = {
			enable : 0,
			pause : 0,
		};
		
		var groupedItems = group( items ).by( property( 'getAdGroup', 'getId' ) ).all();
		
		Logger.log( Object.keys( groupedItems ).length + ' ad groups' );
		
		Logger.log( '' + items.length + ' ' + LEVEL + ' in current campaigns with final URLs .' );
		Logger.log( Object.keys( checkResults ).length + ' unique final urls' );
		
		Object.keys( groupedItems ).forEach( function( adGroupId ){
			var firstItem = groupedItems[ adGroupId ][ 0 ];
			var adGroup = firstItem.getAdGroup();
			var campaignName = firstItem.getCampaign().getName();
			var statusBefore = adGroup.isPaused() ? 'pause' : 'enable';
			
			var adGroupResults = groupedItems[ adGroupId ]
				.map( property( 'urls', 'getFinalUrl' ) )
				.map( cleanUrl )
				.map( function( finalUrl ){ return checkResults[ finalUrl ] } )
			;
			
			var statusCounts = group(
					adGroupResults.map( property( 'action', 'status' ) )
				)
				.by()
				.count()
			;
			statusCounts[ 'enable' ] = statusCounts[ 'enable' ] || 0;
			statusCounts[ 'pause' ] = statusCounts[ 'pause' ] || 0;
			
			if( statusCounts[ 'enable' ] > 0 &&
				statusCounts[ 'enable' ] / Math.max( adGroupResults.length , 1 )
					>= REQUIRED_PERCENTAGE_OF_WORKING_URLS_IN_AD_GROUP ){
				if( adGroup.isPaused() ){
					statusChange[ 'enable' ]++;
					reporting.push(
						campaignName
						+ SEPARATOR + adGroup.getName()
						+ SEPARATOR + 'enable'
						+ SEPARATOR + statusCounts[ 'enable' ] + ' good urls '
						+ SEPARATOR + 'out of ' + adGroupResults.length
					);
					Logger.log( 'enable' + ' ' + adGroup.getName()
						+ ' | ' + statusCounts[ 'enable' ] + ' good urls '
						+ 'out of ' + adGroupResults.length );
					adGroup.enable();
				}
			}else{
				if( adGroup.isEnabled() ){
					statusChange[ 'pause' ]++;
					reporting.push(
						campaignName
						+ SEPARATOR + adGroup.getName()
						+ SEPARATOR + 'pause'
						+ SEPARATOR + statusCounts[ 'enable' ] + ' good urls '
						+ SEPARATOR + 'out of ' + adGroupResults.length
					);
					Logger.log( 'pause' + ' ' + adGroup.getName()
						+ ' | ' + statusCounts[ 'enable' ] + ' good urls '
						+ 'out of ' + adGroupResults.length );
					adGroup.pause();
				}
			}
			
			var labelsOfThisAdGroup = labelsOf[ adGroupId ] || [];
			var labelsToApply = flatten( adGroupResults.map( property( 'action', 'applyLabel' ) ) ).filter( onlyUnique2() );
			var labelsToRemove = flatten( adGroupResults.map( property( 'action', 'removeLabel' ) ) )
				.filter( onlyUnique2() )
				.filter( notIn( labelsToApply ) )
				.filter( containedIn( labelsOfThisAdGroup ) )
			;
			// the order of statements is important!
			labelsToApply = labelsToApply.filter( notIn( labelsOfThisAdGroup ) );
			
			if( labelsToApply.length ){
				Logger.log( 'labels to apply to ' + adGroup.getCampaign().getName() + ' > ' + adGroup.getName() + ': ' + labelsToApply.join( ', ' ) + ' > ' + labelsOfThisAdGroup );
			}
			if( labelsToRemove.length ){
				Logger.log( 'labels to remove from ' + adGroup.getCampaign().getName() + ' > ' + adGroup.getName() + ': ' + labelsToRemove.join( ', ' ) + ' > ' + labelsOfThisAdGroup );
			}
			
			labelsToApply.forEach( function( label ){ adGroup.applyLabel( label ) } );
			labelsToRemove.forEach( function( label ){ adGroup.removeLabel( label ) } );
		});
		
		Logger.log( statusChange.enable + ' ad groups enabled' );
		Logger.log( statusChange.pause + ' ad groups paused' );
		
		sendReport( reporting, statusChange );
		
	}catch ( error ){
		sendEmail( SEND_ERROR_MESSAGES_TO, 'Error in ' + SCRIPT_NAME + ' ' + accountName, error + '\n' + error.stack );
		Logger.log( 'Error in ' + SCRIPT_NAME + ' ' + accountName + ' -> ' + error + '\n' + error.stack );
		throw error;
	}
}

function sendReport( reporting, statusChange ){
	var accountName = AdWordsApp.currentAccount().getName();
	if( reporting.length > 0 ){
		attachment = [ 'Kampagne', 'Anzeigengruppe', 'Status' ].join( SEPARATOR ) + '\n' + reporting.join( '\n' );
		Logger.log( attachment );
		
		if( AdWordsApp.getExecutionInfo().isPreview() ){
			Logger.log( 'NO EMAILS WILL BE SEND IN PREVIEW MODE!' );
			return;
		}
		var emailBody = ''
			+ statusChange.enable + ' ad groups enabled' + '\n' 
			+ statusChange.pause + ' ad groups paused' + '';
		
		TO.forEach( function( recipientEmail ){
			MailApp.sendEmail(
				recipientEmail,
				accountName + ' ' + SUBJECT + ' ' + SCRIPT_NAME + ' ' + _getDateString(),
				emailBody,
				{
					attachments: [
						Utilities.newBlob(
							attachment,
							'text/csv',
							accountName + '_' + _getDateString() + '.csv'
						)
					]
				}
			);
		});
	}else{
		Logger.log( 'nothing to report' );
	}
}

// format todays date
function _getDateString() {
	return Utilities.formatDate( ( new Date() ), AdWordsApp.currentAccount().getTimeZone(), 'yyyy-MM-dd' );
}

function cleanUrl( url ){
	if( WRAPPED_URLS ){
		url = url.substr( url.lastIndexOf( 'http' ) );
		var x = decodeURIComponent( url );
		if( url != x ){
			url = x;
		}
	}
	if( STRIP_QUERY_STRING ){
		if( url.indexOf( '?' ) >= 0 ){
			url = url.split( '?' )[ 0 ];
		}
	}
	if( url.indexOf( '{' ) >= 0 ){
		//Let's remove the value track parameters
		url = url.replace( /\{[0-9a-zA-Z]+\}/g, '' );
	}
	return url;
}

function convertToTimeZone( date, timeZone ){
	return new Date( Utilities.formatDate( date, timeZone, 'MMM dd,yyyy HH:mm:ss' ) );
}

function computeNow( timeZone ){
	var now = convertToTimeZone( new Date(), timeZone );
	now.setTime( now.getTime() );
	return now;
}

function currentItems( items, currentPart, outOf, orderBy ){
	if( typeof orderBy != 'undefined' ){
		items.sort( function( a, b ){
			return apply( a, orderBy ) - apply( b, orderBy );
			/*
			if( typeof orderBy == 'function' ){
				return a[ orderBy ]() - b[ orderBy ]();
			}
			if( typeof orderBy == 'string' ){
				return a[ orderBy ] - b[ orderBy ];
			}
			*/
			//return a.getId() - b.getId();
		});
	}
	var countItems = items.length;
  
	var result = items.filter( function( item, index ){
		return index >= Math.ceil( currentPart / outOf * countItems ) && index < ( currentPart + 1 ) / outOf * countItems;
	});
	return result;
}

function getCurrentCampaignIds(){
	var campaignSelector = AdWordsApp.campaigns().withCondition( 'CampaignStatus = ENABLED' );
	var campaigns = iteratorToList( campaignSelector.get() );

	Logger.log( 'count all enabled campaigns: ' + campaigns.length );

	var campaignParts = CAMPAIGN_NAME_CONTAINS.filter( property( 'length' ).gt( 0 ) );
	var negativeCampaignNameParts = CAMPAIGN_NAME_DOESNT_CONTAIN.filter( property( 'length' ).gt( 0 ) );
	var excludedCampaigns = EXCLUDED_CAMPAIGNS.filter( property( 'length' ).gt( 0 ) );
	
	if( campaignParts.length > 0 ){ // this is important
		campaigns = campaigns.filter( function( campaign ){
			return campaignParts.reduce( function( resultSoFar, nextNamePartToCheck ){
				return resultSoFar || campaign.getName().indexOf( nextNamePartToCheck ) >= 0;
			}, false );
		});
	}
	if( negativeCampaignNameParts.length ){
		Logger.log( 'ignore campaigns which contain ' + negativeCampaignNameParts );
	}
	campaigns = campaigns.filter( function( campaign ){
		return negativeCampaignNameParts.reduce( function( resultSoFar, nextNamePartToCheck ){
			return resultSoFar && campaign.getName().indexOf( nextNamePartToCheck ) < 0;
		}, true );
	});
	if( excludedCampaigns.length ){
		Logger.log( 'excelude campaigns: ' + excludedCampaigns );
	}
	campaigns = campaigns.filter( function( campaign ){
		return excludedCampaigns.reduce( function( resultSoFar, nextExclusion ){
			return resultSoFar && campaign.getName() != nextExclusion;
		}, true );
	});
	
	Logger.log( 'Campaigns left: ' + campaigns.length );
	
	if( campaigns.length == 0 ){
		return optional( null, 'no enabled campaigns which match the campaign name filter found' );
	}
	
	var now = computeNow( AdWordsApp.currentAccount().getTimeZone() );
	
	var currentPart = now.getHours();
	if( !COMPUTE_ONLY_A_FRACTION_OF_CAMPAIGNS_EACH_HOUR ){
		currentPart = 0;
	}
	Logger.log( 'Current part is ' + ( currentPart + 1 ) + ' out of ' + HOURS_PER_DAY );
	
	var campaigns = currentItems(
		campaigns,
		currentPart,
		HOURS_PER_DAY,
		'getName'
    );

	if( campaigns.length == 0 ){
		return optional( null, 'no enabled campaigns are scheduled for this hour' );
	}

	var names = campaigns.map( property( 'getName' ) );
	Logger.log( 'campaigns for this hour: (' + names.length + ') : ' + names.join( '\n' ) );
	
	var campaignIds = campaigns.map( property( 'getId' ) );
	return optional( campaignIds );
}

function and( a, b ){ return a && b }
function or( a, b ){ return a || b }

function getItems( campaignIds ){
	var selector = AdWordsApp[ LEVEL ]();
	selector = selector.withCondition( 'CampaignId IN [' + campaignIds.join( ',' ) + ']' );
	if( ONLY_ENABLED_ITEMS ){
		selector = selector.withCondition( 'Status = "ENABLED"' );
	}
	
	var adgroupPartsNone = AD_GROUP_CONTAINS_NONE.filter( property( 'length' ).gt( 0 ) );
	var adgroupPartsAny = AD_GROUP_CONTAINS_ANY.filter( property( 'length' ).gt( 0 ) );
	
	items = iteratorToList( selector.get() ).filter( function( item ){
		var adGroup = item.getAdGroup();
		var hasURL = item.urls().getFinalUrl() != undefined;
		var containsNone = adgroupPartsNone.map( function( part ){ return adGroup.getName().indexOf( part ) == -1 } ).reduce( and, true );
		var containsAny = adgroupPartsAny.length == 0 || adgroupPartsAny.map( function( part ){ return adGroup.getName().indexOf( part ) >= 0 } ).reduce( or, false );
		var adGroupLabels = iteratorToList( adGroup.labels().get() ).map( property( 'getName' ) );
		var pausedByScriptOrEnabled = intersection( [ OUT_OF_STOCK_LABEL, HTTP_4XX_LABEL, URL_ERROR_LABEL ], adGroupLabels ).length > 0 || adGroup.isEnabled();
		return pausedByScriptOrEnabled && containsNone && containsAny && hasURL;
	});
	return items;
}

// ####################################################
// ####################################################

function sendEmail( to, subject, text ){
	if( !text ){
		throw new Error( ' no text supplied for Email ' );
	}
	if( MAILGUN_AUTH && MAILGUN_AUTH.length > 0 ){
		return mailGunSender( to, subject, text );	
	}else{
		return MailApp.sendEmail( to, subject, text );
	}
}

function mailGunSender( to, subject, text, html ){
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
		MAILGUN_URL,
		{
			"method": "post",
			"payload": {
				'from': MAILGUN_FROM,
				'to': to,
				'subject': subject,
				'text': text,
				'html': html,
			},
			"headers": {
				"Authorization": MAILGUN_AUTH,
			}
		}
	 );
}

// ####################################################
// ####################################################
