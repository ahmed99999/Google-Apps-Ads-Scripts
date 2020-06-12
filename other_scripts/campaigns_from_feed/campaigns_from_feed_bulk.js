
var SCRIPT_NAME = 'Campaigns from Feed Creator';
var SHEET_URL = 'https://docs.google.com/spreadsheets/d/1fPCkpY6vFRFw2NJzfkmjj_tyltilFS4HPJYqmgjUT5o/edit#gid=0';
var FEED_SOURCE = null; //'http://188.166.56.224/feed.csv'; // 'https://get.cpexp.de/mj1BR8DJ3stWbHBVJtFy_xYMD_c-S4OB6ZRVWHJVeXnffV0b1a8YoVSpB0NMwMjT/beautypriceean_googleshoppingde.csv';
var FEED_SHEET_NAME = 'Recherche';
var FEED_DELIMITER = ';';
var SETTINGS_SHEET_NAME = 'settings';
var COUNTRY_CODES_SHEET_NAME = 'country_codes';
var ETAS_SHEET_NAME = 'ETAs';
var EXCEPTIONS_SHEET_NAME = 'Ausnahmen';
var STRUCTURE_DEFINITION_SHEET_NAME = 'Kampagnen';
var MANAGED_BY_SCRIPT_LABEL = 'MANAGED_BY_SCRIPT';
var PAUSED_BY_SCRIPT_LABEL = 'PAUSED_BY_SCRIPT';
var NUM_PARTS = 1;

// -------- CONSTANTS ------------------------------
var ACCOUNT_STRUCTURE_NAME = 'accountStructureData';
// One currency unit is one million micro amount.
var MICRO_AMOUNT_MULTIPLIER = 1000000;
var BROAD_SUFFIX = ' (broad)';
var EXACT_SUFFIX = ' (exact)';
var NEW_LINE = '<br>';
var MAX_HEADER_LENGTH = 30;
var MAX_DESCRIPTION_LENGTH = 80;
var MAX_PATH_LENGTH = 15;
var H1 = 'h1';
var H2 = 'h2';
var PATH1 = 'path1';
var PATH2 = 'path2';
var DESC = 'desc';
var WAITING_INTERVAL = 10; // in seconds
var DELIMITER = '<</->';

var KEYWORD = 'keyword';
var FINAL_URL = 'url';
var AD_VARIANT = 'adVariant';
var ADGROUP = 'adgroupName';
var MAX_IN_SELECTOR = 10000; // IN clause in awql allows 10000 items at max
var HEADER_PREFIX = 'Anzeigen Kampagnen Variante ';
var ACCOUNT_STRUCTURE_PREFIX = 'Level';
var CREATED_BY_SQ_SCRIPT_LABEL_NAME = 'CREATED_BY_SQ_SCRIPT';

var _ = (function(){
	var uniqueWarnings = {};
	// -----------------------------------------------
	// Inspired by java.util.Optional
	// returns an object which either has a value (which can be retrieved by .get() )
	// or has an error-message. 'optional' can be used to represent missing values (instead of returning null).
	function optional( value, message ){
		var error = message ? new Error( message ) : new Error('No such value!');
		var isNull = ( value === undefined || value === null );
		return {
			get : 			function()						{ if( isNull ){ throw error; } return value; },
			ifPresent : 	function( consumer )			{ if( !isNull ){ consumer( value ) } },
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
			hasFailed :		function()						{ return isNull },
			isEmpty :		function()						{ return isNull },
			orElse : 		function( other )				{ return isNull ? other : value },
			orElseGet : 	function( supplier )			{ return isNull ? supplier.get() : value },
			orElseThrow : 	function( exceptionSupplier )	{ if( isNull ) throw exceptionSupplier(); return value; },
			equals : 		function( otherValue )			{ return !isNull && value == otherValue },
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
	// -----------------------------------------------
	function trim( str ){
		return str.trim();
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
					var obj = this.clone( arr[i] );
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
	function addLeadingZeros( number, digits ){
		var res = '' + number;
		while ( res.length < digits ){
			res = '0' + res;
		}
		return res;
	}
	function dateToString( date, delimiter, withHours ){
		return addLeadingZeros( date.getFullYear(), 4 ) + delimiter +
			addLeadingZeros( date.getMonth() + 1, 2 ) + delimiter +
			addLeadingZeros( date.getDate(), 2 ) +
			( withHours ? ' ' + addLeadingZeros( date.getHours(), 2 ) + ':' + addLeadingZeros( date.getMinutes(), 2 ) : '' )
		;
	}
	function duringLastDays( days ){
		var today = new Date();
		var before = new Date( today.getTime() - 1000 * 60 * 60 * 24 * days );
		return ' DURING ' + dateToString( before, '' ) + ', ' + dateToString( today, '' );
	}
	function addToMultiMap( map, key, value ){
		if( ! map[ key ] ){
			map[ key ] = [];
		}
		map[ key ].push( value );
	}
	function iteratorToList( iter ){
		var list = [];
		while( iter.hasNext() ){
			list.push( iter.next() );
		}
		return list;
	}
	function iteratorToMap( iter, property ){
		var map = {};
		while( iter.hasNext() ){
			var item = iter.next();
			
			if( typeof property == 'function' ){
				map[ property( item ) ] = item;
			}else if( typeof item[ property ] == 'function' ){
				map[ item[ property ]() ] = item;
			}else{
				map[ item[ property ] ] = item;
			}
		}
		return map;
	}
	function listToMap( list, keySelector, valueSelector ){
		var map = {};
		
		if( ! valueSelector ){
			valueSelector = identity;
		}
		
		list.forEach( function( item ){
			if( typeof keySelector == 'function' ){
				if( typeof valueSelector == 'function' ){
					map[ keySelector( item ) ] = valueSelector( item );
				}else if( typeof item[ valueSelector ] == 'function' ){
					map[ keySelector( item ) ] = item[ valueSelector ]();
				}else{ 
					map[ keySelector( item ) ] = item[ valueSelector ];
				}
			}else if( typeof item[ keySelector ] == 'function' ){
				if( typeof valueSelector == 'function' ){
					map[ item[ keySelector ]() ] = valueSelector( item );
				}else if( typeof item[ valueSelector ] == 'function' ){
					map[ item[ keySelector ]() ] = item[ valueSelector ]();
				}else{ 
					map[ item[ keySelector ]() ] = item[ valueSelector ];
				}
			}else{
				if( typeof valueSelector == 'function' ){
					map[ item[ keySelector ] ] = valueSelector( item );
				}else if( typeof item[ valueSelector ] == 'function' ){
					map[ item[ keySelector ] ] = item[ valueSelector ]();
				}else{ 
					map[ item[ keySelector ] ] = item[ valueSelector ];
				}
			}
		});
		return map;
	}
	function stringListToMap( list, value ){
		var res = {};
		list.forEach( function( item ){ res[ item ] = value } );
		return res;
	}
	function properties(){
		var args = Array.prototype.slice.call( arguments );
		var f = function( item ){
			return args.map( function( arg ){
				if( typeof arg == 'function' ){
					return arg( item );
				}else if( typeof item[ arg ] == 'function' ){
					return item[ arg ]();
				}else{
					return item[ arg ];
				}
			});
		};
		f.name1 = args.join( '_' ); // this improves groupBy() output
		return f;
	}
	function call(){
		var args = Array.prototype.slice.call( arguments );
		// first argument is the method to call
		var method = args.splice( 0, 1 );
		// all other arguments are arguments of the method
		var f = function( item ){
			if( typeof res[ arg ] == 'function' ){
				res = res[ arg ]( args );
			}
			return res;
		};
		f.name1 = args.join( '_' ); // this improves groupBy() output
		return f;
	}
	function property(){
		var args = Array.prototype.slice.call( arguments );
		var f = function( item ){
			var res = item;
			args.forEach( function( arg ){
				if( typeof arg == 'function' ){
					res = arg( res );
				}else if( typeof res[ arg ] == 'function' ){
					res = res[ arg ]();
				}else{
					res = res[ arg ];
				}
			});
			return res;
		};
		f.name1 = args.join( '_' ); // this improves groupBy() output
		f.equals = function( value ){
			return function( item ){
				return f( item ) == value;
			}
		};
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
		return f;
	}
	function not( predicate ){
		var res = function( x ){
			return false == predicate( x );
		};
		res.or = function( predicate ){
			return or( this, predicate );
		};
		res.and = function( predicate ){
			return and( this, predicate );
		};
		return res;
	}
	function or( predicate1, predicate2 ){
		return function( x ){
			return predicate1( x ) || predicate2( x );
		};
	}
	function or2( bool1, bool2 ){
		return bool1 || bool2;
	}
	function and( predicate1, predicate2 ){
		return function( x ){
			return predicate1( x ) && predicate2( x );
		};
	}
	function log( value ){
		if( typeof Logger !== 'undefined' ){
			var now = new Date( Utilities.formatDate( new Date(), 'Europe/Berlin', 'MMM dd,yyyy HH:mm:ss' ) );
			var now = addLeadingZeros( now.getHours(), 2) + ':' + addLeadingZeros( now.getMinutes(), 2 );
			value = now + ' ' + value;
			Logger.log( value );
		}else{
			document.write( value + '<br>' );
		}
	}
	function uniqueWarning( key, value ){
		if( !uniqueWarnings[ key ] ){
			uniqueWarnings[ key ] = 1;
			log( 'WARNING: ' + key + ( value ? ': ' + value : '' ) );
		}else{
			uniqueWarnings[ key ]++;
		}
	}
	function printUniqueWarnings(){
		for( warning in uniqueWarnings ){
			log( warning + ': ' + uniqueWarnings[ warning ] );
		}
	}
	function onlyUnique( value, index, self ){
		return self.indexOf( value ) === index;
	}
	function onlyUniqueIgnoreCase(){
		var lowerCaseMap = {};
		return function( value, index, self ){
			var lower = value.toLowerCase();
			if( lowerCaseMap[ lower ] ){
				return false;
			}
			lowerCaseMap[ lower ] = 1;
			return true;
		}
	}
	function onlyUnique2( property1 ){
		var mapped = null;
		return function( value, index, self ){
			if( ! mapped ){
				mapped = self.map( property( property1 ) );
			}
			return mapped.indexOf( value[ property1 ] ) === index;
		};
	}
	function findLabel( labelName ){
		var labelSelector = AdWordsApp.labels()
			.withCondition('Name = "' + labelName + '"');
		
		var labelIterator = labelSelector.get();
		if( labelIterator.hasNext() ){
			return labelIterator.next();
		}
	}
	function getOrCreateLabel( labelName ){
		var label = findLabel( labelName );
		if( ! label ){
			AdWordsApp.createLabel( labelName );
			return findLabel( labelName );
		}else{
			return label;
		}
	}
	function flatten( matrix ){
		return [].concat.apply([], matrix );
	}
	function by( prop ){
		// ASCENDING ORDER
		return function( a, b ){
			return a[ prop ] - b[ prop ];
		};
	}
	function by2( prop ){
		// ASCENDING ORDER
		return function( a, b ){
			return a[ prop ] > b[ prop ] ? 1 : ( a[ prop ] < b[ prop ] ? -1 : 0 );
		};
	}
	function and2( a, b ){ return a && b }
	function identity( a ){ return a }
	function concat( list1, list2 ){
		return list1.concat( list2 );
	}
	function concat2( mapOfLists ){
		var list = [];
		
		for( key in mapOfLists ){
			list = list.concat( mapOfLists[ key ] );
		}
		return list;
	}
	function isContainedIn( truthMap ){
		return function( item ){
			return !! truthMap[ item ];
		}
	}
	function isContainedIn2( str ){
		return function( str2 ){ return str.indexOf( str2 ) >= 0 };
	}
	function contains( str ){
		return function( text ){ return text.indexOf( str ) >= 0 };
	}
	function SELECT(){
		var query = '';
		function parseValue( value ){
			function isNumeric( n ){
				return !isNaN( parseFloat( n ) ) && isFinite( n );
			}
			if ( value === undefined ){
				return undefined;
			}
			if ( value === null || value.trim() == '--' ){
				return null;
			}
			if ( value.substring( value.length - 1 ) == '%' ){
				return value.substring( 0, value.length - 1 ) / 100;
			}
			if ( !isNumeric( value.toString().replace( /,/g, '' ) ) ){
				return value;
			}
			return value.toString().replace( /,/g, '' ) / 1;
		}
		function parse( report, fields ){
			var myRows = [];
			var iter = report.rows();
			
			iteratorToList( iter ).forEach( function( row ){
				var myRow = {};

				for ( index in fields ){
					var field = fields[ index ];
					myRow[ field ] = parseValue( row[ field ] );
				}
				myRows.push( myRow );
			});
			
			return myRows;
		}
		
		var fields = Array.prototype.slice.call( arguments );
		
		if( Array.isArray( arguments[0] ) ){
			// allow to supply arguments as an array
			fields = arguments[0];
		}
		
		query = 'SELECT ' + fields.join( ',' );
		
		function parse1(){
			//return query + ' -> ' + fields;
			return parse( AdWordsApp.report( query ), fields );
		}
		function during( days ){
			query += ' DURING ' + duringLastDays( days );
			return {
				parse : parse1
			}
		}
		function print1(){
			log( query );
			return this;
		}
		
		return {
			FROM : function( reportName ){
				query += ' FROM ' + reportName;
				return {
					WHERE : function( condition ){
						query += ' WHERE ' + condition
						return {
							AND : function( condition ){
								query += ' AND ' + condition;
								return this;
							},
							DURING : during,
							parse : parse1,
							print : print1
						}
					},
					DURING : during,
					parse : parse1,
					print : print1
				}
			}
		}
	}
	function pair( f1, f2 ){
		return function( item ){
			return [ f1( item ), f2( item ) ];
		}
	}
	function transpose( array ){
		if ( array.length == 0 ){
			return [];
		}
		if ( array.length == 1 && array[0].length == 0 ){
			// array is symmetric
			return array;
		}

		return array[0].map( function( col, i ){
			return array.map( function( row ){
				return row[i];
			} )
		} );
	}
	function nonEmpty( item ){ return item != '' }
	function sample( arr ){ return arr[ Math.floor( Math.random() * arr.length ) ] }

	function extractHostname( url ){
		var hostname;
		//find & remove protocol (http, ftp, etc.) and get hostname

		if( url.indexOf( "://" ) > -1 ){
			hostname = url.split( '/' )[ 2 ];
		}else {
			hostname = url.split( '/' )[ 0 ];
		}

		//find & remove port number
		hostname = hostname.split( ':' )[ 0 ];
		//find & remove "?"
		hostname = hostname.split( '?' )[ 0 ];

		return hostname;
	}
	// ####################################################
	// ####################################################
	function mailGunHtml( to, subject, html ){
		return mailGunSender( to, subject, null, html );
	}
	function mailGun( to, subject, text ){
		return mailGunSender( to, subject, text );
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
		log( 'fetch URL' );

		return UrlFetchApp.fetch( 
			'https://api.mailgun.net/v3/mg.peakace.de/messages',
			{
				"method": "post",
				"payload": {
					'from': "adwords_scripts@mg.peakace.de",
					'to': to,
					'subject': subject,
					'text': text,
					'html': html,
				},
				"headers": {
					"Authorization": "Basic YXBpOmtleS1hYWZmMmI2MGU4MmNkMWYwOTIwYWYxNDUzZWM0MDcyOA==",
				}
			}
		 );
	}
	function keysOf( obj ){
		return function( key ){ return obj[ key ] };
	}
	// ####################################################
	// ####################################################
	function profiler( name ){
		var count = 0;
		var skippedLogs = 0;
		var sumMillis = 0;
		var l = null;
		return {
			start : function(){
				l = (new Date() ).getTime();
			},
			end : function( logInterval ){
				sumMillis += (new Date() ).getTime() - l;
				count++;
				if( logInterval ){
					this.logTime( logInterval );
				}
			},
			logTime : function( logInterval ){
				if( ++skippedLogs >= logInterval ){
					skippedLogs = 0;
					log( name + ': sum: ' + sumMillis + ', count: ' + count + ', avg: ' + Math.floor( sumMillis / count ) );
				}
			}
		};
	}
	function cache1(){
		var myCache = {};
		return {
			get : function( key, builder ){
				var value = myCache[ key ];
				if( !value ){
					value = builder( key );
					myCache[ key ] = value;
				}
				return value;
			}
		};
	}
	function cache2(){
		var myCache = {};
		return {
			get : function( key1, key2, builder ){
				var value = myCache[ key1 ];
				if( value ){
					value = value[ key2 ];
				}
				if( !value ){
					value = builder( key1, key2 );
					if( ! myCache[ key1 ] ){
						myCache[ key1 ] = {};
					}
					myCache[ key1 ][ key2 ] = value;
				}
				return value;
			}
		};
	}
	function cache(){
		var myCache = {};
		return {
			get : function(){
				var keys = Array.prototype.slice.call( arguments );
				
				var builder = null;
				if( typeof keys[ keys.length - 1 ]  == 'function' ){
					builder = keys.splice( -1, 1 )[ 0 ];
				}
				
				if( ! Array.isArray( keys ) ){
					keys = [ keys ];
				}
				// try to find value in cache
				var value = myCache;
				keys.forEach( function( key ){
					if( value ){
						value = value[ key ];
					}
				});

				if( ! value ){
					// value is not cached, build it!
					value = builder.apply( null, keys );
					// save value in cache
					var lastKeyIndex = keys.length - 1;
					var cache = myCache;
					for( var i = 0; i < lastKeyIndex; i++ ){
						if( !cache[ keys[ i ] ] ){
							cache[ keys[ i ] ] = {};
						}
						cache = cache[ keys[ i ] ];
					}
					cache[ keys[ lastKeyIndex ] ] = value;
				}
				return value;
			}
		}
	}
	function putInto( arr ){
		return function( item ){
			arr.push( item );
		};
	}
	function limit( limit1 ){
		return function( item, index ){
			return index < limit1;
		}
	}
	return {
		toString		: function(){ return 'my tools class'; },
		partition		: partition,
		trim			: trim,
		cache1			: cache1,
		cache2			: cache2,
		cache			: cache,
		call			: call,
		optional		: optional,
		clone			: clone,
		dateToString 	: dateToString,
		duringLastDays 	: duringLastDays,
		addToMultiMap 	: addToMultiMap,
		iteratorToList	: iteratorToList,
		listToMap		: listToMap,
		property 		: property,
		properties		: properties,
		not				: not,
		and				: and,
		and2			: and2,
		or				: or,
		or2				: or2,
		log				: log,
		uniqueWarning	: uniqueWarning,
		printUniqueWarnings : printUniqueWarnings,
		onlyUnique		: onlyUnique,
		onlyUnique2		: onlyUnique2,
		onlyUniqueIgnoreCase : onlyUniqueIgnoreCase,
		iteratorToMap	: iteratorToMap,
		getOrCreateLabel: getOrCreateLabel,
		flatten			: flatten,
		by				: by,
		mailGunHtml		: mailGunHtml,
		mailGun			: mailGun,
		identity		: identity,
		concat			: concat,
		concat2			: concat2,
		stringListToMap	: stringListToMap,
		isContainedIn	: isContainedIn,
		contains		: contains,
		SELECT			: SELECT,
		pair			: pair,
		transpose		: transpose,
		nonEmpty		: nonEmpty,
		sample			: sample,
		isContainedIn2	: isContainedIn2,
		extractHostname	: extractHostname,
		keysOf			: keysOf,
		profiler		: profiler,
		by2				: by2,
		putInto			: putInto,
		limit			: limit
	};
})();

function uploadTool(){
	var campaignType = 'Search Only';
	var campaignBudget = 1;
	var adgroupCpcBid = .36;
	var keywordCpcBid = .36;
	
	var itemsCount = 0;
	var charCount = 0;
	
	var headers = [
		'Campaign', 
		'Budget',
		'Bid Strategy type',
		'Campaign type',
		'Ad Group',
		'Max CPC',
		'Final URL',
		'Keyword',
		'Criterion Type',
		'Keyword state',
		'Headline 1',
		'Headline 2',
		'Description',
		'Path 1',
		'Path 2',
		'Ad Type',
		'Ad state'
	];
	
	// See https://developers.google.com/adwords/scripts/docs/features/bulk-upload
	// https://developers.google.com/adwords/scripts/docs/features/bulk-upload-entities
	var upload = AdWordsApp.bulkUploads().newCsvUpload(	headers, { moneyInMicros: false } );
	upload.forCampaignManagement();
	
	
	return {
		setCampaignType : function( campaignType1 ){
			campaignType = campaignType1;
		},
		setCampaignBudget : function( campaignBudget1 ){
			campaignBudget = campaignBudget1;
		},
		setAdgroupMaxCpc : function( adgroupCpcBid1 ){
			adgroupCpcBid = adgroupCpcBid1;
		},
		setKeywordCpcBid : function( keywordCpcBid1 ){
			keywordCpcBid = keywordCpcBid1;
		},
		addCampaign : function( campaignName ){
			itemsCount++;
			charCount+= campaignName.length;
			charCount+= 1; // budget
			charCount+= 3; // cpc
			charCount+= 11; // campaign type
			
			upload.append({
				'Campaign': campaignName,
				'Budget': campaignBudget,
				'Bid Strategy type': 'Manual CPC',
				'Campaign type': campaignType, // valid value: Search
			});
		},
		addAdgroup : function( campaignName, adgroupName ){
			itemsCount++;
			charCount+= campaignName.length;
			charCount+= adgroupName.length;
			
			upload.append({
				'Campaign': campaignName,
				'Ad Group': adgroupName,
			});
		},
		addKeyword : function( campaignName, adgroupName, keyword, url ){
			itemsCount++;
			charCount += campaignName.length;
			charCount += adgroupName.length;
			charCount += keyword.length;
			charCount += 1; // keyword cpc bid
			charCount += url.length;
			charCount += 6; // keyword state
			
			upload.append({
				'Campaign': campaignName,
				'Ad Group': adgroupName,
				'Keyword' : keyword,
				//'Criterion Type' : 'Exact',
				'Max CPC' : keywordCpcBid,
				'Final URL' : url,
				'Keyword state' : 'paused'
			});
		},
		addAd : function( campaignName, adgroupName, h1, h2, desc, url, path1, path2 ){
			
			if( charCount > 30000000 ){
				// Bulk upload is limited to 100 MB which corresponds roughly to 40000000 chars.
				// Try to avoid the limit by split the csv into several uploads.
				_.log( 'reachted 3000000 char limit. Start partial upload' );
				this.logCounts();
				upload.apply();
				
				// clear and init upload
				itemsCount = 0;
				charCount = 0;
				upload = AdWordsApp.bulkUploads().newCsvUpload(	headers, { moneyInMicros: false } );
				upload.forCampaignManagement();	
			}
			
			itemsCount++;
			charCount += campaignName.length;
			charCount += adgroupName.length;
			charCount += h1.length;
			charCount += h2.length;
			charCount += desc.length;
			charCount += url.length;
			if( typeof path1 != 'undefined' ) charCount+= path1.length;
			if( typeof path2 != 'undefined' ) charCount+= path2.length;
			charCount+= 16; // ad type
			charCount+= 6; // ad state

			upload.append({
				'Campaign': campaignName,
				'Ad Group': adgroupName,
				'Headline 1' : h1,
				'Headline 2' : h2,
				'Description' : desc,
				'Final URL' : url,
				'Path 1' : path1,
				'Path 2' : path2,
				'Ad Type' : 'Expanded text ad',
				'Ad state' : 'paused'
			});
		},
		logCounts : function(){
			_.log( 'items count: ' + itemsCount );
			_.log( 'char count: ' + charCount );
		},
		upload 			: function(){
			this.logCounts();
			upload.apply();
			// clear and init upload
			itemsCount = 0;
			charCount = 0;
			upload = AdWordsApp.bulkUploads().newCsvUpload(	headers, { moneyInMicros: false } );
			upload.forCampaignManagement();	
		}
	};
}

// ########################################################
// ########################################################

function initSheet( sheetUrl, sheetName ){
	//_.log( 'init sheet: ' + sheetUrl + ', ' + sheetName );
	var book = SpreadsheetApp.openByUrl( sheetUrl );
	if ( !sheetName ){
		// seems to be active sheet
		sheetName = book.getSheetName();
	}
	var sheet = book.getSheetByName( sheetName );

	if ( !sheet ){
		sheet = book.insertSheet( sheetName );

		if ( sheet.getMaxColumns() > 1 ){
			// delete unused columns to stay below
			// the 2 mio cells limit of google sheets
			sheet.deleteColumns( 2, sheet.getMaxColumns() - 1 );
		}

		if ( sheet.getMaxRows() > 1 ){
			// delete unused rows to stay below
			// the 2 mio cells limit of google sheets
			sheet.deleteRows( 2, sheet.getMaxRows() - 1 );
		}
	}

	return sheet;
}

function loadSheet2( sheet ){
	return sheet
		.getRange(
			1,
			1,
			Math.max( 1, sheet.getLastRow() ),
			Math.max( 1, sheet.getLastColumn() )
		 )
		.getValues();
}

function loadSheet( sheetUrl, sheetName ){
	var sheet = initSheet( sheetUrl, sheetName );
	return loadSheet2( sheet );
}

function parseSheet( matrix ){
	var headerRow = matrix.shift();
	//_.log( 'headers: ' + headerRow );
	
	var data = matrix.map( function( row ){
		var res = {};
		headerRow.forEach( function( header, index ){ res[ header ] = row[ index ] } );
		return res;
	});
	
	return data;
}

function computeRegex2( header ){ return new RegExp( '\\{' + header + '(?:\\[[^,]+,\\d+\\])*\\}', 'gi' ) };

function parseBook(){
	_.log( 'parse Book' );
	
	var countryCodes = parseSheet( loadSheet( SHEET_URL, COUNTRY_CODES_SHEET_NAME ) );
	countryCodes = _.listToMap( countryCodes, 'Country Code', 'Criteria ID' );
	
	var exceptions = parseSheet( loadSheet( SHEET_URL, EXCEPTIONS_SHEET_NAME ) );
	var deletions 	 = exceptions.filter( _.property( 'replace_by/remove' ).isEmpty() );
	var replacements = exceptions.filter( _.property( 'replace_by/remove' ).isNotEmpty() );
	replacements.forEach( function( rep ){
		var mySplit = rep[ 'replace_by/remove' ].split( '/' );
		rep[ 'replace_by/remove' ] = mySplit[ 0 ];
		rep[ 'addArtificial' ] = mySplit.slice( 1 );
	});
	
	var settings = parseSheet( loadSheet( SHEET_URL, SETTINGS_SHEET_NAME ) );
	settings = _.listToMap( settings, 'Setting', 'Value' );
	
	//_.log( JSON.stringify( settings ) );
	_.log( 'parse eta settings' );
	
	
	var etaSettings = _.transpose( loadSheet( SHEET_URL, ETAS_SHEET_NAME ) );
	
	var etaSettings2 = [];
	
	etaSettings[ 0 ]
		.map( function( item, index ){
			var ret = {
				isHeader : item.indexOf( HEADER_PREFIX ) == 0,
				variant  : item.substring( HEADER_PREFIX.length ).match(/\d+/),
				index : index
			};
			// -----------------------------------
			// search for H1 header
			var delta = 1;
			while( index + delta < etaSettings[ 0 ].length
				&& etaSettings[ 0 ][ index + delta ] != 'H1'
				&& etaSettings[ 0 ][ index + delta ].indexOf( HEADER_PREFIX ) < 0
				){
				delta++;
			}
			if( ret.isHeader && ( index + delta == etaSettings[ 0 ].length || etaSettings[ 0 ][ index + delta ].indexOf( HEADER_PREFIX ) >= 0 ) ){
				_.uniqueWarning( 'no H1 header found => broken config :-/' );
			}
			ret.index = index + delta;
			// -----------------------------------
			return ret;
		})
		// It would be a bad idea to move filter() up in the execution order.
		.filter( _.property( 'isHeader' ) )
		.map( function( item ){
			return {
				variant : item.variant,
				h1 : etaSettings[ 0 ].slice( item.index + 1, item.index + 20 ).filter( _.nonEmpty ),
				h2 : etaSettings[ 2 ].slice( item.index + 1, item.index + 20 ).filter( _.nonEmpty ),
				desc : [
					etaSettings[ 4 ].slice( item.index + 1,  item.index + 5  ).filter( _.nonEmpty ),
					etaSettings[ 4 ].slice( item.index + 6,  item.index + 10 ).filter( _.nonEmpty ),
					etaSettings[ 4 ].slice( item.index + 11, item.index + 15 ).filter( _.nonEmpty ),
					etaSettings[ 4 ].slice( item.index + 16, item.index + 20 ).filter( _.nonEmpty )
				]
			}
		})
		.forEach( function( setting ){
			etaSettings2[ setting.variant ] = setting;
		})
	;
	
	// _.log( JSON.stringify( etaSettings2, null, '\t' ) );

	_.log( 'parse feed' );
	
	var feed;
	if( FEED_SOURCE && FEED_SOURCE.indexOf( 'http' ) == 0 ){
		var csv = Utilities.parseCsv( UrlFetchApp.fetch( FEED_SOURCE ).getContentText(), FEED_DELIMITER );
		_.log( 'parsed csv' );
		feed = parseSheet( csv );
	}else{
		feed = parseSheet( loadSheet( SHEET_URL, FEED_SHEET_NAME ) );
	}
	var headers = [];
	if( feed.length > 0 ){
		headers = Object.keys( feed[0] );
	}
	
	feed = feed.filter( function( row ){
		return deletions.map( function( deletion ){
			return row[ deletion[ 'Feed_Column' ] ] != deletion[ 'Trigger' ];
		}).reduce( _.and2, true );
	});
	
	var addedArtificialFeedRows = [];
	
	feed.forEach( function( row ){
		replacements.forEach( function( replacement ){
			if( row[ replacement[ 'Feed_Column' ] ] == replacement[ 'Trigger' ] ){
				row[ replacement[ 'Feed_Column' ] ] = replacement[ 'replace_by/remove' ];
				replacement[ 'addArtificial' ].forEach( function( replaceBy ){
					var rowCopy = _.clone( row );
					rowCopy[ replacement[ 'Feed_Column' ] ] = replaceBy;
					addedArtificialFeedRows.push( rowCopy );
				});
			}
		});
	});
	feed = feed.concat( addedArtificialFeedRows );
	
	_.log( 'parse account structure' );
	
	var accountStructure = _.transpose( loadSheet( SHEET_URL, STRUCTURE_DEFINITION_SHEET_NAME ) );
	
	accountStructure = accountStructure[ 0 ]
		.map( function( item, index ){
			return {
				firstLineOfDefinition : item.indexOf( ACCOUNT_STRUCTURE_PREFIX ) == 0,
				index : index
			}
		})
		.filter( _.property( 'firstLineOfDefinition' ) )
		.map( function( item ){
			return {
				campaignName : accountStructure[ 1 ][ item.index + 1 ],
				adgroupName  : accountStructure[ 1 ][ item.index + 2 ],
				keyword 	 : accountStructure[ 1 ][ item.index + 3 ],
				countryCodes : accountStructure[ 3 ][ item.index + 1 ]
					.split(',')
					.map( _.property( 'trim' ) )
					.map( _.property( 'toUpperCase' ) )
					.map( function( str ){ return countryCodes[ str ] || str } ),
				adVariant	 : accountStructure[ 4 ][ item.index + 2 ],
				path1		 : accountStructure[ 5 ][ item.index + 2 ],
				path2		 : accountStructure[ 6 ][ item.index + 2 ],
				url 		 : accountStructure[ 7 ][ item.index + 3 ],
			}
		})
	;
	
	// find all used headers
	
	_.log( 'find used headers' );
	var cacher = {};
	var headerRegexCache = _.cache();
	
	accountStructure.forEach( function( structure ){
		structure.usedHeaders = {};
		headers.forEach( function( header ){
			
			var regex = headerRegexCache.get( header, computeRegex2 );
			regex.lastIndex = 0;
			
			[ 'campaignName', 'adgroupName', 'keyword', 'url', 'adVariant' ].forEach( function( field ){
				if( regex.test( structure[ field ] ) ){
					structure.usedHeaders[ header ] = 1;
				}
			});
		});
	});
	
	_.log( 'compute structures' );
	var parseHeaderProfiler = _.profiler( 'parseHeader' );
	var cloneProfiler = _.profiler( 'clone' );
	var punctuationProfiler = _.profiler( 'punctuation' );
	var logEvery = 10000;
	
	//var parser = myParser();
	var result = [];
	
	feed.forEach( function( row ){
		//row[ ACCOUNT_STRUCTURE_NAME ] = [];
		
		accountStructure.forEach( function( structure ){
			
			var obj = {
				campaignName : structure[ 'campaignName' ],
				adgroupName  : structure[ 'adgroupName' ],
				keyword 	 : structure[ 'keyword' ],
				url			 : structure[ 'url' ],
				adVariant	 : structure[ 'adVariant' ],
				countryCodes : structure[ 'countryCodes' ],
				path1		 : structure[ 'path1' ],
				path2		 : structure[ 'path2' ],
			};
			
			var headersOfEmptyCells = headers.filter( function( header ){ return row[ header ] == '' && structure.usedHeaders[ header ] });
			
			if(	headersOfEmptyCells.length > 0 ){
				_.uniqueWarning( 'empty cells in feed which should be used as placeholders. skip.. ', headersOfEmptyCells );
				return;
			}

			parseHeaderProfiler.start();
			
			headers.forEach( function( header ){
				obj.campaignName = parseHeader( header, row[ header ], obj.campaignName, cacher	);
				obj.adgroupName  = parseHeader( header, row[ header ], obj.adgroupName,  cacher	);
				obj.keyword 	 = parseHeader( header, row[ header ], obj.keyword, 	 cacher	);
				obj.url 		 = parseHeader( header, row[ header ], obj.url, 		 cacher );
				obj.adVariant	 = parseHeader( header, row[ header ], obj.adVariant, 	 cacher );
				obj.path1		 = parseHeader( header, row[ header ], obj.path1,	 	 cacher );
				obj.path2		 = parseHeader( header, row[ header ], obj.path2,	 	 cacher );
			});
			
			parseHeaderProfiler.end();
			
			obj.campaignName = obj.campaignName.trim();
			obj.adgroupName = removePunctuation( obj.adgroupName ).toLowerCase().trim();
			punctuationProfiler.start();
			obj.keyword = removePunctuation( obj.keyword ).toLowerCase().trim();
			obj.url = obj.url.trim();
			obj.adVariant = obj.adVariant.trim();
			obj.path1 = removePunctuation( obj.path1 ).trim();
			obj.path2 = removePunctuation( obj.path2 ).trim();
			punctuationProfiler.end();
			
			if( obj.campaignName == '' ){
				_.uniqueWarning( 'empty campaignName. skip..' );
				return;
			}

			if( obj.adgroupName == '' ){
				_.uniqueWarning( 'empty adgroupName', ' in ' + obj.campaignName + '. skip..' );
				return;
			}

			if( obj.keyword == '' ){
				_.uniqueWarning( 'empty keyword', ' in ' + obj.campaignName +' / ' + obj.adgroupName + '. skip..' );
				return;
			}
			
			if( obj.adVariant == '' ){
				_.uniqueWarning( 'empty adVariant', ' in ' + obj.campaignName +' / ' + obj.adgroupName + '. skip..' );
				return;
			}
			
			cloneProfiler.start();
			if( ! etaSettings2[ obj.adVariant ] ){
				_.uniqueWarning( 'no eta settings defined for variant ' + obj.adVariant + '. skip..' );
				return;
			}
			obj.adVariant = _.clone( etaSettings2[ obj.adVariant ] );
			cloneProfiler.end( logEvery );
			
			parseHeaderProfiler.start();
			[ H1, H2 ].forEach( function( h ){
				obj[ AD_VARIANT ][ h ] = obj[ AD_VARIANT ][ h ].map( function( h_ ){
					headers.forEach( function( header ){
						h_ = parseHeader( header, row[ header ], h_, cacher );
					});
					return h_;
				});
			});
			
			obj[ AD_VARIANT ][ DESC ] = obj[ AD_VARIANT ][ DESC ].map( function( descArr ){
				return descArr.map( function( desc ){
					headers.forEach( function( header ){
						desc = parseHeader( header, row[ header ], desc, cacher );
					});
					return desc;
				});
			});
			parseHeaderProfiler.end( logEvery );
			
			punctuationProfiler.start();
			[ H1, H2 ].forEach( function( h ){
				obj[ AD_VARIANT ][ h ] = obj[ AD_VARIANT ][ h ].map( removePunctuationInAds );
			});
			obj[ AD_VARIANT ][ DESC ] = obj[ AD_VARIANT ][ DESC ].map( function( descArr ){
				return descArr.map( removePunctuationInAds );
			});
			punctuationProfiler.end( logEvery );
			
			
			// Check for errors in place-holders
			
			if(	obj.campaignName.indexOf( '{' ) >= 0 ){
				throw new Error( 'found a place holder in campaign name, which could not be dissolved: ' + obj.campaignName + ' headers: ' + JSON.stringify( headers ) );
			}
			if(	obj.adgroupName.indexOf( '{' ) >= 0 ){
				throw new Error( 'found a place holder in ad group name, which could not be dissolved: ' + obj.adgroupName );	
			}
			if(	obj.keyword.indexOf( '{' ) >= 0 ){
				throw new Error( 'found a place holder in keyword, which could not be dissolved: ' + obj.keyword );
			}
			if(	obj.url.indexOf( '{' ) >= 0 ){
				throw new Error( 'found a place holder in url, which could not be dissolved: ' + obj.url );
			}
			if(	obj.path1.indexOf( '{' ) >= 0 ){
				throw new Error( 'found a place holder in path1, which could not be dissolved: ' + obj.path1 + ' headers: ' + JSON.stringify( headers ) );
			}
			if(	obj.path2.indexOf( '{' ) >= 0 ){
				throw new Error( 'found a place holder in path2, which could not be dissolved: ' + obj.path2 + ' headers: ' + JSON.stringify( headers ) );
			}
			if(	obj[ AD_VARIANT ][ H1 ].map( _.contains( '{' ) ).reduce( _.or2 , false ) ){
				throw new Error( 'found a place holder in ad header1, which could not be dissolved: ' + obj[ AD_VARIANT ][ H1 ].filter( _.contains( '{' ) )[0] );
			}
			if( obj[ AD_VARIANT ][ H2 ].map( _.contains( '{' ) ).reduce( _.or2 , false ) ){
				throw new Error( 'found a place holder in ad header2, which could not be dissolved: ' + obj[ AD_VARIANT ][ H2 ].filter( _.contains( '{' ) )[0] );	
			}
			var descriptions = _.flatten( obj[ AD_VARIANT ][ DESC ] );
			if( descriptions.map( _.contains( '{' ) ).reduce( _.or2 , false ) ){
				throw new Error( 'found a place holder in ad description, which could not be dissolved: ' + descriptions.filter( _.contains( '{' ) )[0] );
			}
			
			obj.url = urlEncode( obj.url );
			
			//row[ ACCOUNT_STRUCTURE_NAME ].push( obj );
			result.push( obj );
		});
	});
		
	// _.log( JSON.stringify( feed[0], null, "\t" ) );
	
	 _.log( 'done with parsing' );
	
	var res = {};
	res[ SETTINGS_SHEET_NAME ] = settings;
	res[ FEED_SHEET_NAME ]  = result;
	
	return res;
}

// ########################################################
// ########################################################

function removePunctuationInAds( str ){
	//var allowedSpecialCharsInAds = '®$#%@()=+/&Ɛ™©?!¡––—*:“”»«'; // €
	var punctRE = /[’'\[\]{}⟨⟩،、‒―…‹›‐\‘’'"´;⁄·\•^†‡°”¿※№÷×ºª‰−‱¶′″‴§~_|‖¦℗℠¤₳฿₵¢₡₢₫₯֏₠ƒ₣₲₴₭₺₾ℳ₥₦₧₱₰£៛₽₹₨₪৳₸₮₩¥`²]/g;
	var spaceRE = /\s+/g;
	return str.replace( punctRE, '' ).replace( spaceRE, ' ' );
}

function removePunctuation( str ){ // &
	var punctRE = /[\.’'\[\](){}⟨⟩:,،、‒–—―…!‹›«»‐\-?‘’“”'"´;\/⁄·\*@\•^†‡°”¡¿※#№÷×ºª%‰+−=‱¶′″‴§~_|‖¦©℗®℠™¤₳฿₵¢₡₢$₫₯֏₠€ƒ₣₲₴₭₺₾ℳ₥₦₧₱₰£៛₽₹₨₪৳₸₮₩¥²`]/g;
	var spaceRE = /\s+/g;
	return str.replace( punctRE, '').replace( spaceRE, ' ' );
}

function parseHeader( header, text, config, regexCacher ){
	var regex = regexCacher[ header ];
	var regex2 = regexCacher[ 'secondRegx' ];
	
	if( !regex2 ){
		var regex2 = new RegExp( '\\[([^,]+),(\\d+)\\]', 'gi' );
		regexCacher[ 'secondRegex' ] = regex2;
	}
	if( ! regex ){
		regex = new RegExp( '\\{' + header + '(?:\\[[^,]+,\\d+\\])*\\}', 'gi' );
		regexCacher[ header ] = regex;
	}
	regex.lastIndex = 0;
	regex2.lastIndex = 0;
	
	var res = config;
	
	while( match = regex.exec( config ) ){
		res = res.split( match[0] );
		var text2 = text;
		
		var splitLogic = [];
		while( match2 = regex2.exec( match[0] ) ){
			splitLogic.push( { delimiter : match2[1], selector : match2[2] - 1 } );
		}
		var outOfBounds = false;
		splitLogic.forEach( function( splitLogicRow ){
			var arr = text2.split( splitLogicRow.delimiter );
			if( splitLogicRow.selector >= arr.length ){
				_.uniqueWarning(  'Select-Index exceeds split-array-length', ': "' + text2 + '".split("' + splitLogicRow.delimiter + '")[' + splitLogicRow.selector + ']' );
				outOfBounds = true;
				return;
				//throw new Error( 'Select-Index exceeds split-array-length: "' + text2 + '".split("' + splitLogicRow.delimiter + '")[' + splitLogicRow.selector + ']' );
			}
			text2 = arr[ splitLogicRow.selector ];
		});
		if( outOfBounds ){
			// config is not compatible with this text. skip it..
			return '';
		}
		res = res.join( text2 );
	}
	return res;
}

function myParser(){
	var regex2 = new RegExp( '\\[([^,]+),(\\d+)\\]', 'gi' );
	
	var splitLogicCache 	= _.cache1();
	var headerRegexCache 	= _.cache1();
	var regexResultCache 	= _.cache2();
	var resultsProfiler 	= _.profiler( 'resultsCacher' );
	var splitLogicProfiler 	= _.profiler( 'splitLogicCacher' );
	
	
	return {
		parseHeader : function( header, text, config ){
			
			var res = config;
		
			resultsProfiler.start();
			var results = regexResultCache.get( header, config, function( header1, config1 ){
				var regex = headerRegexCache.get( header1, computeRegex2 );
				regex.lastIndex = 0;
				
				var res1 = [];
				
				while( match = regex.exec( config1 ) ){
					res1.push( match );
				}
				return res1;
			});
			resultsProfiler.end( 100000 );
			
			results.forEach( function( match ){
				res = res.split( match[0] );
				var text2 = text;
				var outOfBounds = false;
				
				splitLogicProfiler.start();
				var splitLogic = splitLogicCache.get( match[0], function( key ){
					var splitLogic = [];
					regex2.lastIndex = 0;
					while( match2 = regex2.exec( key ) ){
						splitLogic.push( { delimiter : match2[1], selector : match2[2] - 1 } );
					}
					return splitLogic;
				});
				splitLogicProfiler.end( 10000 );
				
				splitLogic.forEach( function( splitLogicRow ){
					var arr = text2.split( splitLogicRow.delimiter );
					if( splitLogicRow.selector >= arr.length ){
						_.uniqueWarning(  'Select-Index exceeds split-array-length', ': "' + text2 + '".split("' + splitLogicRow.delimiter + '")[' + splitLogicRow.selector + ']' );
						outOfBounds = true;
						return;
						//throw new Error( 'Select-Index exceeds split-array-length: "' + text2 + '".split("' + splitLogicRow.delimiter + '")[' + splitLogicRow.selector + ']' );
					}
					text2 = arr[ splitLogicRow.selector ];
				});
				if( outOfBounds ){
					// config is not compatible with this text. skip it..
					return '';
				}
				res = res.join( text2 );
			});
			return res;
		}
	}
}

function urlEncode( url ){
	url = url.replace( /\s&\s/g, '-' );
	url = url.replace( /ä/g, 'ae' );
	url = url.replace( /ö/g, 'oe' );
	url = url.replace( /ü/g, 'ue' );
	url = url.replace( /ß/g, 'ss' );
	url = url.replace( /\s/g, '+' );

	return url;
}

function developement(){

	var parser = myParser();
	
	var data = {
		'category5' : 'Düfte',
		'category6' : 'Damenparfum',
		'gender' : 'Damen',
		'brand' : 'Weleda',
		'product_type' : 'Eau de Toilette'
	};
	
	var text = 'https://www.beautyprice.de/{category5}/{category6}?p[Gender][]={gender}&p[ProductType][]={product_type}';
	
	for( header in data ){
		text = parser.parseHeader( header, data[ header ], text );
	};
	
	_.log( urlEncode( text ) );
	
	return;
	
	var configs = [
		"SE+RLSA+DE_{category5}_Produkt_Typ+Brand",
		"{product_type} {brand}",
		"{product_type} {brand}",
		"SE+RLSA+DE_{category5}_Produkt_Typ",
		"{product_type}",
		"{product_type}",
		"SE+RLSA+DE_{category5}_Produkt_Typ + Gender",
		"{product_type} {gender}",
		"{product_type} {gender}",
		"https://www.beautyprice.de/{category5}/{category6}?p%5BManufacturer%5D%5B%5D={brand}&p%5BProductType%5D%5B%5D={product_type}",
		"https://www.beautyprice.de/{category5}/{category6}?p%5BProductType%5D%5B%5D={product_type}",
		"https://www.beautyprice.de/{category5}/{category6}?p%5BGender%5D%5B%5D={gender}&p%5BProductType%5D%5B%5D={product_type}",
		"{product_type} für {gender} online vergleichen",
		"{product_type} für {gender} vergleichen",
		"{gender} {product_type} vergleichen",
		"{product_type} hier vergleichen",
		"{product_type} jetzt vergleichen",
		"Marken-{product_type} für {gender}",
		"{product_type} Preisvergleich",
		"{product_type} günstig online",
		"Jetzt vergleichen & sparen",
		"Top Marken-Auswahl",
		"Beautyprice Preisvergleich",
		"Top Preise - Top Auswahl",
		"Über 1.000 Marke Vergleichen",
		"Deutschlands großer Beauty-Vergleich – Jetzt {product_type} für {gender} vergleichen.",
		"Deutschlands großer Beauty-Vergleich – Jetzt {product_type} für {gender} vergleichen & sparen.",
		"Deutschlands großer Beauty-Vergleich – Hier {product_type} finden, vergleichen & sparen.",
		"Deutschlands großer Beauty-Vergleich – Jetzt Top-Beautyprodukte vergleichen.",
		"Beauty-Vergleich bei Beautyprice – Jetzt {product_type} für {gender} vergleichen.",
		"Beauty-Vergleich bei Beautyprice – Jetzt {product_type} für {gender} vergleichen & sparen.",
		"Beauty-Vergleich bei Beautyprice – Hier {product_type} finden, vergleichen & sparen.",
		"Beauty-Vergleich bei Beautyprice – Jetzt Top-Beautyprodukte vergleichen.",
		"Finden, vergleichen & sparen – Jetzt {product_type} für {gender} vergleichen.",
		"Finden, vergleichen & sparen – Jetzt {product_type} für {gender} vergleichen & sparen.",
		"Finden, vergleichen & sparen – Hier {product_type} finden, vergleichen & sparen.",
		"Jetzt finden, vergleichen & sparen – Top Marken bei Beautyprice vergleichen.",
		"Jetzt {product_type} für {gender} auf Beautyprice.de vergleichen & sparen.",
		"Jetzt {product_type} auf Beautyprice.de vergleichen & sparen.",
		"Jetzt {product_type} für {gender} auf Beautyprice.de finde, vergleichen & sparen.",
		"Jetzt deine Lieblingsmarken auf Beautyprice.de finden, vergleichen & sparen.",
		"Deutschlands großer Beauty-Vergleich – Jetzt {product_type} vergleichen.",
		"Deutschlands großer Beauty-Vergleich – Jetzt {product_type} vergleichen & sparen.",
		"Deutschlands großer Beauty-Vergleich – Hier {product_type} finden, vergleichen & sparen.",
		"Deutschlands großer Beauty-Vergleich – Jetzt Top-Beautyprodukte vergleichen.",
		"Beauty-Vergleich bei Beautyprice – Jetzt {product_type} vergleichen.",
		"Beauty-Vergleich bei Beautyprice – Jetzt {product_type} vergleichen & sparen.",
		"Beauty-Vergleich bei Beautyprice – Hier {product_type} finden, vergleichen & sparen.",
		"Beauty-Vergleich bei Beautyprice – Jetzt Top-Beautyprodukte vergleichen.",
		"Finden, vergleichen & sparen – Jetzt {product_type} vergleichen.",
		"Finden, vergleichen & sparen – Jetzt {product_type} vergleichen & sparen.",
		"Finden, vergleichen & sparen – Hier {product_type} finden, vergleichen & sparen.",
		"Jetzt finden, vergleichen & sparen – Top Marken bei Beautyprice vergleichen.",
		"Jetzt {product_type} auf Beautyprice.de vergleichen & sparen.",
		"Jetzt {product_type} auf Beautyprice.de vergleichen & sparen.",
		"Jetzt {product_type} auf Beautyprice.de finde, vergleichen & sparen.",
		"Jetzt deine Lieblingsmarken auf Beautyprice.de finden, vergleichen & sparen.",
		"Top Marken-Auswahl",
		"Beautyprice Preisvergleich",
		"Top Preise - Top Auswahl",
		"Über 1.000 Marke Vergleichen",
		"{product_type} online vergleichen",
		"{product_type} vergleichen",
		"{product_type} Preisvergleich",
		"{product_type} hier vergleichen",
		"{product_type} jetzt vergleichen",
		"Marken-{product_type}",
		"{product_type} Preisvergleich",
		"{product_type} günstig online",
		"Jetzt vergleichen & sparen",
	];
	var text = "some text";
	
	for(var i=0;i<15000;i++){
		headers.forEach( function( header ){
			configs.forEach( function( config ){
				parser.parseHeader( header, text, config );
			})
		})
	}
	
	

	return;
	[ missingIn1, missingIn2 ] = findDiff( [ 'a', 'b', 'd', 'f', 'g', 'h' ], [ 'a', 'c', 'd', 'e', 'f' ] );
	
	alert( missingIn1 );
	alert( missingIn2 );
	
	return;
	var regex = /\{google_product_category(?:\[[^,]+,\d+\])*\}/gi;
	while( match = regex.exec( 'SE+RLSA+DE_{google_product_category[ > ,5]}_Produkt_Typ' ) ){
		alert( match[0] );
	}
	
	return;
	var cacher = {};
	var res = parseHeader(
		'google_product_category',
		'Gesundheit & Schönheit > Körperpflege',
		'SE+RLSA+DE_{google_product_category[ > ,5]}_Produkt_Typ+Brand',
		cacher
	);
	
	alert( res );
}

function findMissingCampaigns2( campaignNames ){
	var campaignsInAccount = _.SELECT( 'CampaignName' )
		.FROM( 'CAMPAIGN_PERFORMANCE_REPORT' )
		.parse()
		.map( _.property( 'CampaignName' ) )
	;
	
	var missingCampaignNames = campaignNames.filter( function( name ){ return campaignsInAccount.indexOf( name ) < 0 } );
	
	if( missingCampaignNames.length > 0 ){
		_.log( 'Missing campaigns: ' + missingCampaignNames );
	}
	
	return missingCampaignNames.length;
}

function findDiff( list1, list2 ){
	var index1 = 0;
	var index2 = 0;
	
	var missingInList1 = [];
	var missingInList2 = [];
	
	while( index2 < list2.length && index1 < list1.length ){
		if( list1[ index1 ] == list2[ index2 ] ){
			index1++;
			index2++;
		}else if( list1[ index1 ] < list2[ index2 ] ){
			missingInList2.push( list1[ index1 ] );
			index1++;
		}else{
			missingInList1.push( list2[ index2 ] );
			index2++;
		}
	}
	
	while( index2 < list2.length ){
		missingInList1.push( list2[ index2 ] );
		index2++;
	}
	while( index1 < list1.length ){
		missingInList2.push( list1[ index1 ] );
		index1++;
	}
	
	return [ missingInList1, missingInList2 ];
}

function campaignAction( campaignsFromFeed, logger, bulk ){
	_.log( 'do campaign action' );
	
	var campaignsInAccount = _.SELECT( 'CampaignName' )
		.FROM( 'CAMPAIGN_PERFORMANCE_REPORT' )
		.WHERE( 'CampaignStatus IN [ENABLED,PAUSED]' )
		.parse()
		.map( _.property( 'CampaignName' ) )
	;
	campaignsInAccount.sort();
	
	var campaignsFromFeed1 = {};
	for( campaignName in campaignsFromFeed ){
		campaignsFromFeed1[ campaignName + EXACT_SUFFIX ] = campaignsFromFeed[ campaignName ];
		campaignsFromFeed1[ campaignName + BROAD_SUFFIX ] = campaignsFromFeed[ campaignName ];
	}
	
	campaignNamesFromFeed = Object.keys( campaignsFromFeed1 );
	
	campaignNamesFromFeed.sort();
	
	_.log( 'found ' + campaignsInAccount.length + ' campaigns in account' );
	
	[ missingInFeed, missingInAccount ] = findDiff( campaignNamesFromFeed, campaignsInAccount );
	// we don't care for missingInFeed
	
	if( missingInAccount.length > 0 ){
		
		missingInAccount.forEach( function( campaignName ){ logger.log( 'campaigns created', campaignName ) } );
		missingInAccount.forEach( bulk.addCampaign );
		
		_.log( 'bulk-upload campaigns and wait for it to finish' );
		bulk.upload();
		
		// wait for bulk-upload to create campaigns
		var countMissingCampaigns = missingInAccount.length;
		while( countMissingCampaigns ){
			_.log( 'sleep ' + WAITING_INTERVAL + ' seconds and wait for bulk-upload to finish' );
			Utilities.sleep( WAITING_INTERVAL * 1000 );
			countMissingCampaigns = findMissingCampaigns2( missingInAccount );
		}
		
		var campaignIds = missingInAccount.map( function( x ){ return '"' + x + '"' } ).join( ',' );
		
		_.log( 'labele Kampagnen ' + campaignIds + ' mit CREATED_BY_SCRIPT' );
		
		_.iteratorToList(
			AdWordsApp
				.campaigns()
				.withCondition( 'Name IN [' + campaignIds + ']' )
				.get()
		).forEach( function( campaign ){
			campaign.applyLabel( MANAGED_BY_SCRIPT_LABEL );
			var countryCodes = campaignsFromFeed1[ campaign.getName() ];
			countryCodes.forEach( function( countryCode ){ campaign.addLocation( countryCode ) } );
			
		});
	}
}

function adgroupAction( adgroupsInFeed, bulk, currentCampaignIds, logger ){
	
	_.log( 'find adgroups differences between current campaigns and feed' );
	
  	var adgroupsInAccount = _.SELECT( 'CampaignName', 'AdGroupName' )
		.FROM( 'ADGROUP_PERFORMANCE_REPORT' )
		.WHERE( 'CampaignStatus IN [ENABLED,PAUSED]' )
		.AND( 'AdGroupStatus IN [ENABLED,PAUSED]' )
		.AND( 'CampaignId IN [' + currentCampaignIds.join( ', ' ) + ']' )
		//.print()
		.parse()
		.map( function( row ){ return row[ 'CampaignName'] + DELIMITER + row[ 'AdGroupName' ] } );
	
	_.log( 'count adgroups in current campaigns: ' + adgroupsInAccount.length );
	adgroupsInAccount.sort();
	adgroupsInFeed = Object.keys( adgroupsInFeed );
	
	_.log( 'count adgroups in feed: ' + adgroupsInFeed.length );
	
	adgroupsInFeed.sort();
	
	//var campaigns = _.iteratorToMap( AdWordsApp.campaigns().withCondition('CampaignStatus IN [ENABLED, PAUSED]').get(), 'getName' );
	
	[ missingInFeed, missingInAccount ] = findDiff( adgroupsInFeed, adgroupsInAccount );

	_.log( 'create missing Adgroups' );

	//var adgroupProfiler = _.profiler( 'createAdgroup' );
	//var labelProfiler = _.profiler( 'applyLabel' );
	
	missingInAccount.forEach( function( adgroup ){
		[ campaignName, adgroupName ] = adgroup.split( DELIMITER );
		logger.log( 'adgroups created', campaignName + ' > ' + adgroupName );
		
		bulk.addAdgroup( campaignName, adgroupName );
		
		/*
		var campaign = campaigns[ campaignName ];
		if( campaign ){
			
			adgroupProfiler.start();
			var adgroup = campaign.newAdGroupBuilder()
				.withName( adgroupName )
				.withStatus( 'ENABLED' )
				.build()
				.getResult();
			adgroupProfiler.end( 500 );
			
			labelProfiler.start();
			adgroup.applyLabel( MANAGED_BY_SCRIPT_LABEL );
			labelProfiler.end( 500 );
		}
		*/
	});
	
	_.log( 'done with adgroups' );
	
}

function keywordAction( keywordInFeed, bulk, currentCampaignIds, logger ){
	_.log( 'keyword action' );

	var pausedLabel = _.getOrCreateLabel( PAUSED_BY_SCRIPT_LABEL );
	var sqLabel = _.getOrCreateLabel( CREATED_BY_SQ_SCRIPT_LABEL_NAME );
	
	var keywordsPausedByScript =
		_.listToMap(
			_.SELECT( 'CampaignName', 'AdGroupName', 'Criteria' )
			.FROM( 'KEYWORDS_PERFORMANCE_REPORT' )
			.WHERE( 'CampaignStatus IN [ ENABLED, PAUSED ]' )
			.AND( 'Labels CONTAINS_ANY [' + pausedLabel.getId() + ']' )
			.AND( 'CampaignId IN [' + currentCampaignIds.join( ', ' ) + ']' )
			.AND( 'AdGroupStatus IN [ ENABLED, PAUSED ]' )
			.AND( 'Status = PAUSED' )
			.parse(),
			function( row ){ return row[ 'CampaignName' ] + DELIMITER + row[ 'AdGroupName' ] + DELIMITER + row[ 'Criteria' ] },
			_.property( 'Criteria' )
		)
	;
	
	var urls = {};
	
	var keywordsInAccount = _.iteratorToMap( AdWordsApp.keywords()
		.withCondition( 'CampaignId IN [' + currentCampaignIds.join( ', ' ) + ']' )
		.withCondition( 'CampaignStatus IN [ENABLED, PAUSED]' )
		.withCondition( 'AdGroupStatus IN [ENABLED, PAUSED]' )
		.withCondition( 'Labels CONTAINS_NONE ["' + sqLabel.getId() + '"]' )
		.withCondition( 'Status IN [ENABLED, PAUSED]' )
		.get(),
		function( keyword ){ return keyword.getCampaign().getName() + DELIMITER + keyword.getAdGroup().getName() + DELIMITER + keyword.getText() }
	);
	
	var keywordsToBePaused = [];
	var keywordsToBeEnabled = [];
	var keywordsToBeCreated = [];
	var countKeywordsInAccount = 0;
	var countKeywordsInFeed = 0;

	for( key in keywordsInAccount ){
		countKeywordsInAccount++;
		if( !keywordInFeed[ key ] ){
			if( keywordsInAccount[ key ].isEnabled() ){
				keywordsToBePaused.push( keywordsInAccount[ key ] );
			}
		}
	}
	_.log( 'count keywords in account: ' + countKeywordsInAccount );

	for( key in keywordInFeed ){
		countKeywordsInFeed++;
		if( !keywordsInAccount[ key ] ){
			[ campaignName, adgroupName, keyword ] = key.split( DELIMITER );
			// _.log( key );
			//var adgroup = adgroups[ campaignName + DELIMITER + adgroupName ];

			logger.log( 'keywords created', campaignName + ' > ' + adgroupName + ' > ' + keyword );
			keywordsToBeCreated.push({
				campaignName : campaignName,
				adgroupName : adgroupName,
				//adgroup : adgroup,
				keyword : keyword,
				url : keywordInFeed[ key ]
			});
			//	_.uniqueWarning( 'Can\'t find adgroup in account: ', campaignName + ' > ' + adgroupName );
		}else if( keywordsInAccount[ key ].isPaused() && keywordsPausedByScript[ key ] ){
			keywordsToBeEnabled.push( keywordsInAccount[ key ] );
		}
	}

	_.log( 'count keywords in feed: ' + countKeywordsInFeed );
	
	_.log( 'count keywords to be paused: ' + keywordsToBePaused.length );
	
	keywordsToBePaused.forEach( function( keyword ){
		logger.log( 'keywords paused', keyword.getCampaign().getName() + ' > ' + keyword.getAdGroup().getName() + ' > ' + keyword.getText() );
		keyword.pause();
		keyword.applyLabel( PAUSED_BY_SCRIPT_LABEL );
	});
	
	_.log( 'count keywords to be enabled: ' + keywordsToBeEnabled.length );
	
	keywordsToBeEnabled.forEach( function( keyword ){
		logger.log( 'keywords enabled', keyword.getCampaign().getName() + ' > ' + keyword.getAdGroup().getName() + ' > ' + keyword.getText() );
		keyword.enable();
		keyword.removeLabel( PAUSED_BY_SCRIPT_LABEL );
	});
	
	_.log( 'count keywords to be created: ' + keywordsToBeCreated.length );
	
	keywordsToBeCreated.forEach( function( obj ){
		bulk.addKeyword( obj.campaignName, obj.adgroupName, obj.keyword, obj.url );
		/*
		var op = obj.adgroup
			.newKeywordBuilder()
			.withText( obj.keyword )
			.withCpc( 1.5 )
			.withFinalUrl( obj.url )
			.build();
		var newKeyword = op.getResult();
		newKeyword.applyLabel( MANAGED_BY_SCRIPT_LABEL );
		newKeyword.pause();
		*/
	});
	
	_.log( 'done with keywords' );
}

function adAction( adsInFeed, bulk, currentCampaignIds, logger ){
	_.log( 'ad action' );

	var pausedLabel = _.getOrCreateLabel( PAUSED_BY_SCRIPT_LABEL );
	var sqLabel = _.getOrCreateLabel( CREATED_BY_SQ_SCRIPT_LABEL_NAME );
	
	var adsPausedByScript =
		_.listToMap(
			_.SELECT( 'CampaignName', 'AdGroupName', 'HeadlinePart1', 'HeadlinePart2', 'Description' )
			.FROM( 'AD_PERFORMANCE_REPORT' )
			.WHERE( 'CampaignStatus IN [ ENABLED, PAUSED ]' )
			.AND( 'Labels CONTAINS_ANY [' + pausedLabel.getId() + ']' )
			.AND( 'CampaignId IN [' + currentCampaignIds.join( ', ' ) + ']' )
			.AND( 'AdGroupStatus IN [ ENABLED, PAUSED ]' )
			.AND( 'Status = PAUSED ' )
			.parse(),
			function( row ){
				
				var res =
					row[ 'CampaignName' ]  + DELIMITER + 
					row[ 'AdGroupName' ]   + DELIMITER + 
					row[ 'HeadlinePart1' ] + DELIMITER + 
					row[ 'HeadlinePart2' ] + DELIMITER + 
					row[ 'Description' ];
				
				return res;
			},
			_.identity
		)
	;
	_.log( 'get all ads' );
	var urls = {};
	
	/*
	var adCandidatesForActivation = _.iteratorToMap( AdWordsApp.ads()
		.withCondition( 'CampaignId IN [' + currentCampaignIds.join( ', ' ) + ']' )
		.withCondition( 'CampaignStatus IN [ENABLED, PAUSED]' )
		.withCondition( 'AdGroupStatus IN [ENABLED, PAUSED]' )
		.withCondition( 'Labels CONTAINS_ANY [' + pausedLabel.getId() + ']' )
		.withCondition( 'Status = PAUSED' )
		.get(),
		function( row ){
			var res =
				row.getCampaign().getName() + DELIMITER +
				row.getAdGroup().getName() + DELIMITER +
				row.getHeadlinePart1() + DELIMITER +
				row.getHeadlinePart2() + DELIMITER +
				row.getDescription();
			return res;
		}
	);
	*/
	
	var adsInAccount = _.iteratorToMap( AdWordsApp.ads()
		.withCondition( 'CampaignId IN [' + currentCampaignIds.join( ', ' ) + ']' )
		.withCondition( 'CampaignStatus IN [ENABLED, PAUSED]' )
		.withCondition( 'AdGroupStatus IN [ENABLED, PAUSED]' )
		.withCondition( 'Labels CONTAINS_NONE ["' + sqLabel.getId() + '"]' )
		.withCondition( 'Status IN [ENABLED, PAUSED]' )
		.get(),
		function( row ){
			
			
			var res =
				row.getCampaign().getName() + DELIMITER +
				row.getAdGroup().getName() + DELIMITER +
				row.getHeadlinePart1() + DELIMITER +
				row.getHeadlinePart2() + DELIMITER +
				row.getDescription();
			
			return res;
		}
	);
	
	_.log( 'find all ads to be paused' );
	
	var adsToBePaused = [];
	var adsToBeEnabled = [];
	var adsToBeCreated = [];
	var countAdsInAccount = 0;
	
	for( key in adsInAccount ){
		countAdsInAccount++;
		if( !adsInFeed[ key ] ){
			if( adsInAccount[ key ].isEnabled() ){
				adsToBePaused.push( adsInAccount[ key ] );
			}
		}
	}
	_.log( 'count ads in account: ' + countAdsInAccount );
	_.log( 'find all ads to be created or enabled' );
	
	
	/*
	var feedKeys = Object.keys( adsInFeed );
	var accountKeys = Object.keys( adsInAccount );
	
	feedKeys.sort();
	accountKeys.sort();
	
	for( i = 0; i < 10; i++ ){
		_.log( 'feedKey: ' + feedKeys[ i ] );
	}
	for( i = 0; i < 10; i++ ){
		_.log( 'accountKey: ' + accountKeys[ i ] );
	}
	*/
	
	for( key in adsInFeed ){
		if( !adsInAccount[ key ] ){
			[ campaignName, adgroupName, h1, h2, desc, path1, path2 ] = key.split( DELIMITER );
			//var adgroup = adgroups[ campaignName + DELIMITER + adgroupName ];
			adsToBeCreated.push({
				campaignName : campaignName,
				adgroupName : adgroupName,
				//adgroup : adgroup,
				h1 : h1,
				h2 : h2,
				desc : desc,
				url : adsInFeed[ key ],
				path1 : path1,
				path2 : path2,
			});
			//	_.uniqueWarning( 'Can\'t find adgroup in account: ', campaignName + ' > ' + adgroupName );
		}else{
			if( adsInAccount[ key ].isPaused() && adsPausedByScript[ key ] ){
				adsToBeEnabled.push( adsInAccount[ key ] );
			}
		}
	}
	
	_.log( 'pause ' + adsToBePaused.length + ' ads' );
	
	adsToBePaused.forEach( function( ad ){
		logger.log( 'ads paused', 
			ad.getCampaign().getName() + ' > ' +
			ad.getAdGroup().getName() + ' > ' +
			ad.getHeadlinePart1() + ' > ' +
			ad.getHeadlinePart2() + ' > ' +
			ad.getDescription() 
		);
		ad.pause();
		ad.applyLabel( PAUSED_BY_SCRIPT_LABEL );
	});
	
	_.log( 'enable ' + adsToBeEnabled.length + ' ads' );
	
	adsToBeEnabled.forEach( function( ad ){
		logger.log( 'ads enabled', 
			ad.getCampaign().getName() + ' > ' +
			ad.getAdGroup().getName() + ' > ' +
			ad.getHeadlinePart1() + ' > ' +
			ad.getHeadlinePart2() + ' > ' +
			ad.getDescription() 
		);
		ad.enable();
		ad.removeLabel( PAUSED_BY_SCRIPT_LABEL );
	});
	
	_.log( 'create ' + adsToBeCreated.length + ' ads' );
	
	adsToBeCreated.forEach( function( obj ){
		logger.log( 'ads created', obj.campaignName + ' > ' + obj.adgroupName + ' > ' + obj.h1 + ' > ' + obj.h2 + ' > ' + obj.desc + ' > ' + obj.path1 + ' > ' + obj.path2 );
		bulk.addAd( obj.campaignName, obj.adgroupName, obj.h1, obj.h2, obj.desc, obj.url, obj.path1, obj.path2 );
		/*
		var op = obj.adgroup.newAd()
			.expandedTextAdBuilder()
			.withHeadlinePart1( obj.h1 )
			.withHeadlinePart2( obj.h2 )
			.withDescription( obj.desc )
			.withFinalUrl( obj.url )
			.build();
		var newAd = op.getResult();
		newAd.applyLabel( MANAGED_BY_SCRIPT_LABEL );
		newAd.pause();
		*/
	});
	
	_.log( 'done with ads' );
}

function computeKeywordText( keyword, suffix ){
	if( suffix == EXACT_SUFFIX ){
		return '[' + keyword + ']';
	}else if( suffix == BROAD_SUFFIX ){
		return '+' + keyword.replace( /\s+/g, ' +' );
	}else{
		throw new Error( 'Unexpected suffix: ' + suffix );
	}
}

function computeAdgroupKey( structure, suffix ){
	return structure[ 'campaignName' ] + suffix + DELIMITER + structure[ 'adgroupName' ];
}

function progressLogger( exampleLimit ){
	exampleLimit = exampleLimit || 3;
	var count1 = 0;
	var counter = {};
	var examples = {};
	return {
		count : function(){
			return count1;
		},
		log : function( key, value ){
			
			counter [ key ] = counter [ key ] || 0;
			examples[ key ] = examples[ key ] || [];
			
			counter[ key ]++;
			count1++;
			
			if( examples[ key ].length < exampleLimit ){
				examples[ key ].push( value );
			}
		},
		toString : function(){
			var res = '';
			for( key in counter ){
				if( counter[ key ] <= exampleLimit ){
					res += key + 
						'\n\t' +
						examples[ key ].join( '\n\t' ) +
						'\n\n'
					;
				}else{
					res += key + 
						'\n\t' +
						examples[ key ].slice( 0, -1 ).join( '\n\t' ) +
						'\n\t' +
						' and ' + ( counter[ key ] - examples[ key ].length + 1 ) + ' other' +
						'\n\n'
					;
				}
			}
			if( res == '' ){
				res = 'progressLogger logged nothing';
			}
			return res;
		}
		//examples.adsPaused.push( campaignName + '>' + adgroupName + '>' + h1 + ' ' + h2 + ' ' + desc );
	};
}

function hash( value ){
	value = value + '';
	var hash = 0;
	if ( value.length == 0 ) return hash;
	for( i = 0; i < value.length; i++ ){
		var char1 = value.charCodeAt( i );
		hash = (( hash << 5 ) - hash ) + char1;
		hash = hash & hash; // Convert to 32bit integer
	}
	return Math.abs( hash );
}

function getCurrentHour(){
	var date = new Date();
	var hour = date.getHours();
	return hour;
}

function computeCurrentCampaignIds( currentHour ){
	var managedByScriptLabel = _.getOrCreateLabel( MANAGED_BY_SCRIPT_LABEL );
	
	var rows = _.SELECT( 'CampaignId', 'CampaignName' )
		.FROM( 'CAMPAIGN_PERFORMANCE_REPORT' )
		.WHERE( 'CampaignStatus IN [ENABLED,PAUSED]' )
		.AND( 'Labels CONTAINS_ANY [' + managedByScriptLabel.getId() + ']' )
		.parse()
	;
	rows.sort( _.by2( 'CampaignName' ) );
	
	rows = rows.filter( function( item, index ){
		return index % NUM_PARTS == currentHour % NUM_PARTS;
	});
	
	var currentCampaignIds = rows.map( _.property( 'CampaignId' ) );
	var currentCampaignNames = _.stringListToMap( rows.map( _.property( 'CampaignName' ) ),	1 );
	
	return [ currentCampaignIds, currentCampaignNames ];
}

function findAdgroupsWithTooFewAds(){
	var ads = _.partition(
			_.SELECT( 'CampaignName', 'AdGroupName', 'Id' )
			.FROM( 'AD_PERFORMANCE_REPORT' )
			.WHERE( 'CampaignStatus IN [ENABLED,PAUSED]' )
			.AND( 'AdGroupStatus IN [ENABLED,PAUSED]' )
			.AND( 'Status IN [ENABLED,PAUSED]' )
			.parse()
		).by( function( row ){ return row[ 'CampaignName' ] + '>' + row[ 'AdGroupName' ] } )
	;
	var logger = progressLogger( 5 );
	for( key in ads ){
		if( ads[ key ].length < 4 ){
			logger.log( 'too few ads in adgroup', key + ' has only ' + ads[ key ].length + ' ads' );
		}
	}
	
	return logger;
}

function pauseOrEnableSqBasedKeywords(){
	// Since campaigns are managed by feed-script but keywords/adgroups
	// are also created by sq-based-script, we need to enable/pause such keywords.
	// We are going to find them by exact negative Keywords in BMM-Adgroups.
	// This is possible because the sq-based-creator-script excludes 
	// search-queries as exact before it creates adgroups and keywords for them.
	
	var label = SQ_BASED_LABEL_NAME;
	
	
	// find all negative exact keywords which are not equal to the positive keywords in each bmm-adgroup.
		// var neg_exact = keyword-performance-report where is_negative = true and campaign_name contains BMM_SUFFIX and match_type = exact
	
	var keywordsFromBmmCampaigns = _.partition( _.SELECT( 'CampaignName', 'AdGroupName', 'Criteria', 'IsNegative', 'KeywordMatchType', 'Status' )
		.FROM( 'KEYWORDS_PERFORMANCE_REPORT' )
		.WHERE( 'CampaignName CONTAINS "' + BROAD_SUFFIX + '"' )
		.AND( 'CampaignStatus IN [ENABLED,PAUSED]' )
		.AND( 'AdGroupStatus IN [ENABLED,PAUSED]' )
		.AND( 'Status IN [ENABLED,PAUSED]' )
		//.AND( 'IsNegative = TRUE' )
		//.AND( 'KeywordMatchType = "EXACT"' )
		.parse()).by( function( row ){ return row[ 'CampaignName' ].replace( BROAD_SUFFIX, '' ) + DELIMITER + row[ 'AdGroupName' ] } )
	;
	
	var toBePaused = [];
	var toBeEnabled = [];
	
	
	// search for counterparts of the negative exact keywords in exact adgroups.
	for( adgroupKey in keywordsFromBmmCampaigns ){

		var keywords = _.partition( keywordsFromBmmCampaigns[ adgroupKey ] ).by( 'IsNegative' );
		
		var positiveKeywords = keywords[ 'False' ];
		var negativeKeywords = keywords[ 'True' ];
		
		var statuses = positiveKeywords.map( _.property( 'Status' ) ).filter( _.onlyUnique );
		
		if( statuses.length > 1 ){
			// There are enabled and paused positive keywords in this adgroup.
			// Current business logic works with only one keyword for each adgroup.
			// The behavior is not determined for several keywords with contradicting statuses.
			// Just ignore this case for the moment.
			continue;
		}
		if( statuses.length == 0 ){
			// empty adgroup ?
			// ignore
			continue;
		}

		var collection = statuses[ 0 ].toLowerCase() == 'enabled' ? toBeEnabled : toBePaused;
		
		// Track all negative exact keywords to corresponding adgroups in EXACT-campaigns and activate them if they are paused and have the label 'PAUSED_BY_SCRIPT'.
		// Track all negative exact keywords to corresponding adgroups in EXACT-campaigns and pause them and apply label 'PAUSED_BY_SCRIPT' if they are active.		
		var positiveKeywords2 = _.listToMap( positiveKeywords, _.property( 'Criteria' ) );
		
		[ campaignName, adgroupName ] = adgroupKey.split( DELIMITER );
		
		negativeKeywords
			.filter( _.property( 'KeywordMatchType' ).equals( 'EXACT' ) )
			.filter( function( row ){ return !positiveKeywords2[ row[ 'Criteria' ] ] } )
			.map( function( row ){ return { campaignName : campaignName, adgroupName : row[ 'Criteria' ] } } )
			.forEach( _.putInto( collection ) )
		;
	}
	
	// If the bmm-keyword is paused and has label PAUSED_BY_SCRIPT then pause the exact sq-based keywords as well and apply label PAUSED_BY_SCRIPT
	if( toBePaused.length > 0 ){
		
		var adgroupNamesToBePaused = toBePaused.map( _.property( 'adgroupName' ) ).filter( _.limit( MAX_IN_SELECTOR ) );
		
		var keywordsFromExactCampaigns = _.partition(
			_.iteratorToList(
				AdWordsApp.keywords()
				.withCondition( 'CampaignName CONTAINS "' + EXACT_SUFFIX + '"' )
				.withCondition( 'CampaignStatus IN [ENABLED, PAUSED]' )
				.withCondition( 'AdGroupStatus IN [ENABLED, PAUSED]' )
				.withCondition( 'AdGroupName IN ["' + adgroupNamesToBePaused.join( '", "' ) + '"]' )
				.withCondition( 'Status IN [ENABLED]' )
				.get()
			)
		).by( 
			function( keyword ){ return keyword.getCampaign().getName().replace( EXACT_SUFFIX, '' ) + DELIMITER + keyword.getAdGroup().getName() }
		);
		
		toBePaused.forEach( function( item ){
			var keywords = ( keywordsFromExactCampaigns[ item.campaignName + DELIMITER + item.adgroupName ] || [] )
				.filter( _.property( 'getText' ).equals( item.adgroupName ) )
			;
			if( keywords.length == 1 ){
				keywords[0].pause();
				keywords[0].applyLabel( PAUSED_BY_SCRIPT );
			}
		});
	}
	// If the bmm-keyword is enabled then enable the exact sq-based keyword as well and remove the label PAUSED_BY_SCRIPT
	if( toBeEnabled.length > 0 ){
		
		var adgroupNamesToBeEnabled = toBeEnabled.map( _.property( 'adgroupName' ) ).filter( _.limit( MAX_IN_SELECTOR ) );
		
		var keywordsFromExactCampaigns = _.partition(
			_.iteratorToList(
				AdWordsApp.keywords()
				.withCondition( 'CampaignName CONTAINS "' + EXACT_SUFFIX + '"' )
				.withCondition( 'CampaignStatus IN [ENABLED, PAUSED]' )
				.withCondition( 'AdGroupStatus IN [ENABLED, PAUSED]' )
				.withCondition( 'AdGroupName IN ["' + adgroupNamesToBeEnabled.join( '", "' ) + '"]' )
				.withCondition( 'Status IN [PAUSED]' )
				.get()
			)
		).by( 
			function( keyword ){ return keyword.getCampaign().getName().replace( EXACT_SUFFIX, '' ) + DELIMITER + keyword.getAdGroup().getName() }
		);
		
		toBeEnabled.forEach( function( item ){
			var keywords = ( keywordsFromExactCampaigns[ item.campaignName + DELIMITER + item.adgroupName ] || [] )
				.filter( _.property( 'getText' ).equals( item.adgroupName ) )
			;
			if( keywords.length == 1 ){
				keywords[0].pause();
				keywords[0].applyLabel( PAUSED_BY_SCRIPT );
			}
		});
	}
}

function main(){
	try{
		_.log( ' start' );
		// this label must be created here
		var managedByScriptLabel = _.getOrCreateLabel( MANAGED_BY_SCRIPT_LABEL );
		
		var logger = progressLogger( 3 );
		var input = parseBook();
		
		var minKeywordsForEamil = input[ SETTINGS_SHEET_NAME ][ 'email wenn x keywords erstellt' ];
		var emails = input[ SETTINGS_SHEET_NAME ][ 'email adressen' ].split(',').map( _.trim );
		
		var onlyUniqueIgnoreCase = _.onlyUniqueIgnoreCase();
		
		var campaignNamesFromFeed = _.listToMap( input[ FEED_SHEET_NAME ]
			//.map( _.property( ACCOUNT_STRUCTURE_NAME ) )
			//.reduce( _.concat, [] ) // flatten
			.filter( function( structure ){ return _.nonEmpty( structure[ 'campaignName' ] ) } )
			.filter( function( structure ){ return onlyUniqueIgnoreCase( structure[ 'campaignName' ] ) } ),
			_.property( 'campaignName' ),
			_.property( 'countryCodes' )
		);

		// no need to free memory here. It isn't so big after all
		// onlyUniqueIgnoreCase = null; // let gc do it's job

		_.log( 'found ' + Object.keys( campaignNamesFromFeed ).length + ' campaigns in feed ' );

		var bulk = uploadTool();
		bulk.setCampaignType( 	input[ SETTINGS_SHEET_NAME ][ 'Campaign Type' ] );
		bulk.setCampaignBudget( input[ SETTINGS_SHEET_NAME ][ 'Campaign Daily Budget' ] );
		bulk.setAdgroupMaxCpc( 	input[ SETTINGS_SHEET_NAME ][ 'Adgroup-Max-Cpc' ] );
		bulk.setKeywordCpcBid(  input[ SETTINGS_SHEET_NAME ][ 'setKeywordCpcBid' ] );

		campaignAction( campaignNamesFromFeed, logger, bulk );

		//var campaignNamesMap = _.stringListToMap( campaignNamesFromFeed, 1 );

		// -------------------------
		var currentHour = getCurrentHour();
		_.log( 'currentHour: ' + currentHour );

		[ currentCampaignIds, currentCampaignNames ] = computeCurrentCampaignIds( currentHour );
		
		if( currentCampaignIds.length == 0 ){
			// the work is partitioned in NUM_PARTS.
			// the part which is due this hour is empty ( no campaigns )
			_.log( 'Nothing scheduled for this hour. -> quit');
			return;
		}
		_.log( 'current campaigns: ' + Object.keys( currentCampaignNames ) );

		// -------------------------

		// AdGroups

		_.log( 'prepare adgroups' );

		var adgroupsInFeed = {};

		input[ FEED_SHEET_NAME ]
			.forEach( function( structure ){
				if( campaignNamesFromFeed[ structure[ 'campaignName' ] ] && structure[ 'adgroupName' ].length > 0 ){
					[ EXACT_SUFFIX, BROAD_SUFFIX ].forEach( function( suffix ){
						var campaignName = structure[ 'campaignName' ] + suffix;
						if( currentCampaignNames[ campaignName ] ){
							var adgroupKey = computeAdgroupKey( structure, suffix );
							adgroupsInFeed[ adgroupKey ] = 1;
						}
					});
				}
			})
		;

		adgroupAction( adgroupsInFeed, bulk, currentCampaignIds, logger );

		// -----------------------------

		/*
		var adgroups = _.iteratorToMap(
				AdWordsApp.adGroups()
				.withCondition( 'CampaignStatus IN [ENABLED, PAUSED]' )
				.withCondition( 'AdGroupStatus IN [ENABLED, PAUSED]' )
				.get(),
				function( adgroup ){ return adgroup.getCampaign().getName() + DELIMITER + adgroup.getName() }
			)
		;
		*/
		// -----------------------------
		
		// Keywords
		
		_.log( 'prepare keywords' );
		
		var keywords2 = {};

		input[ FEED_SHEET_NAME ]
			.forEach( function( structure ){
				[ EXACT_SUFFIX, BROAD_SUFFIX ].forEach( function( suffix ){
					var campaignName = structure[ 'campaignName' ] + suffix;
					if( currentCampaignNames[ campaignName ] ){
						var adgroupKey = computeAdgroupKey( structure, suffix );
						if( adgroupsInFeed[ adgroupKey ] ){
							
							var keywordKey = adgroupKey + DELIMITER + computeKeywordText( structure[ 'keyword' ].toLowerCase(), suffix );
							
							keywords2[ keywordKey ] = structure[ 'url' ];
						}
					}
				});
			})
		;
		
		keywordAction( keywords2, bulk, currentCampaignIds, logger );
		
		// Ads
		_.log( 'prepare ads' );
		
		var ads = {};
		
		var computeHeader = function( headers, index ){
			var validHeaders = headers
				.filter( _.property( 'length' ).le( MAX_HEADER_LENGTH ) )
			;
			
			if( validHeaders.length == 0 ){
				return 'no header1 could be computed';
			}
			return validHeaders[ index % validHeaders.length ];
		};
		
		var uniqueAdgroups = {};
		
		input[ FEED_SHEET_NAME ]
			.forEach( function( structure ){
				[ EXACT_SUFFIX, BROAD_SUFFIX ].forEach( function( suffix ){
					var adgroupKey = computeAdgroupKey( structure, suffix );
					if( adgroupsInFeed[ adgroupKey ] ){
					
						var campaignName = structure[ 'campaignName' ] + suffix;
						var adgroupName = structure[ 'adgroupName' ];
						
						if( currentCampaignNames[ campaignName ] ){
							if( uniqueAdgroups[ adgroupKey ] ){
								// we have already ads for this adgroup
								return;
							}
							uniqueAdgroups[ adgroupKey ] = 1;
							
							[ 0, 1, 2, 3 ].forEach( function( adIndex ){
								var h1 = computeHeader( structure[ AD_VARIANT ][ H1 ], adIndex );
								var h2 = computeHeader( structure[ AD_VARIANT ][ H2 ], adIndex );
								var desc = structure[ AD_VARIANT ][ DESC ][ adIndex ]
									.filter( _.property( 'length' ).le( MAX_DESCRIPTION_LENGTH ) )
									.reduce( function( a, b ){ return a.length > b.length ? a : b }, 'no valid description found' )
								;

								var key = adgroupKey + DELIMITER +
									h1 + DELIMITER +
									h2 + DELIMITER +
									desc + DELIMITER +
									structure[ PATH1 ] + DELIMITER +
									structure[ PATH2 ]
								;
								
								ads[ key ] = structure[ 'url' ];
							});
						}
					}
				});
			})
		;
		
		adAction( ads, bulk, currentCampaignIds, logger );
		_.log( 'start upload' );
		bulk.upload();
		
		if( logger.count() > minKeywordsForEamil ){
			emails.forEach( function( email ){
				_.mailGun( email, SCRIPT_NAME + ' - ' + AdWordsApp.currentAccount().getName(), logger.toString() );
			});
		}
		
		_.printUniqueWarnings();
	}catch( error ){
		_.log( error + '\n' + error.stack );
	}
}
