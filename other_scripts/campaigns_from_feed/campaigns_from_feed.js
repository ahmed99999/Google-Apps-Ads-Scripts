

var SHEET_URL = 'https://docs.google.com/spreadsheets/d/1sSGAH6hOXEGlA2BRhyUyHlbQog7qgswDMHS5wU2warQ/edit?usp=sharing';
var FEED_SOURCE = '188.166.56.224/feed.csv'; // 'https://get.cpexp.de/mj1BR8DJ3stWbHBVJtFy_xYMD_c-S4OB6ZRVWHJVeXnffV0b1a8YoVSpB0NMwMjT/beautypriceean_googleshoppingde.csv';
var FEED_SHEET_NAME = 'Feed';
var FEED_DELIMITER = ';';
var SETTINGS_SHEET_NAME = 'settings';
var ETAS_SHEET_NAME = 'ETA';
var STRUCTURE_DEFINITION_SHEET_NAME = 'Kampagnen';
var CREATED_BY_SCRIPT_LABEL = 'CREATED_BY_SCRIPT';
var PAUSED_BY_SCRIPT_LABEL = 'PAUSED_BY_SCRIPT';

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
var DESC = 'desc';
var WAITING_INTERVAL = 10; // in seconds
var DELIMITER = '<</->';

var KEYWORD = 'keyword';
var FINAL_URL = 'url';
var AD_VARIANT = 'adVariant';
var ADGROUP = 'adgroupName';


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
			log( key + ( value ? ': ' + value : '' ) );
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
			})
			
			
			
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
							parse : parse1
						}
					},
					DURING : during,
					parse : parse1
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
	return {
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
		profiler		: profiler
	};
})();




function uploadTool(){
	var budget = 2;
	var adgroupCPCBid = 1;
	var keywordCPCBid = 1;
	
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
		'Headline 1',
		'Headline 2',
		'Description',
		'Path 1',
		'Path 2',
		'Ad Type'
	];
	
	// See https://developers.google.com/adwords/scripts/docs/features/bulk-upload
	var upload = AdWordsApp.bulkUploads().newCsvUpload(	headers, { moneyInMicros: false } );
	upload.forCampaignManagement();
	
	
	return {
		addSingleCampaign 	: function( campaignName ){
			upload.append({
				'Campaign': campaignName,
				'Budget': budget,
				'Bid Strategy type': 'cpc',
				'Campaign type': 'Search Only'
			});
		},
		upload 			: function(){
			upload.apply();
		},
		addSingleAdgroup	: function( campaignName, adgroupName ){
			upload.append({
				'Campaign': campaignName,
				'Ad Group': adgroupName,
				'Max CPC' : adgroupCPCBid
			});
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
	
	var settings = parseSheet( loadSheet( SHEET_URL, SETTINGS_SHEET_NAME ) );
	settings = _.listToMap( settings, 'Setting', 'Value' );
	
	//_.log( JSON.stringify( settings ) );
	_.log( 'parse eta settings' );
	
	var etaSettings = initSheet( SHEET_URL, ETAS_SHEET_NAME )
		.getNamedRanges()
		.map( _.property( 'getRange', 'getValues' ) )
		.map( _.transpose )
		.map( function( matrix, index ){
			return {
				variant : index,
				h1 : matrix[0].slice(1).filter( _.nonEmpty ),
				h2 : matrix[2].slice(1).filter( _.nonEmpty ),
				desc : [ 
					matrix[4].slice(1,5),
					matrix[4].slice(6,10),
					matrix[4].slice(11,15),
					matrix[4].slice(16,20)
				]
			}
		})
	;

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
	
	_.log( 'parse account structure' );
	
	var accountStructure = initSheet( SHEET_URL, STRUCTURE_DEFINITION_SHEET_NAME )
		.getNamedRanges()
		.map( _.property( 'getRange', 'getValues' ) )
		.map( function( matrix ){
			return {
				campaignName : matrix[1][1],
				adgroupName  : matrix[2][1],
				keyword 	 : matrix[3][1],
				url 		 : matrix[3][3],
				adVariant	 : matrix[3][4],
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
			
			[ 'campaignName', 'adgroupName', 'keyword', 'url' ].forEach( function( field ){
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
	
	
	//var parser = myParser();
	
	feed.forEach( function( row ){
		row[ ACCOUNT_STRUCTURE_NAME ] = [];
		
		accountStructure.forEach( function( structure ){
			
			var obj = {
				campaignName : structure[ 'campaignName' ],
				adgroupName  : structure[ 'adgroupName' ],
				keyword 	 : structure[ 'keyword' ],
				url			 : structure[ 'url' ]
			};
			
			var headersOfEmptyCells = headers.filter( function( header ){ return row[ header ] == '' && structure.usedHeaders[ header ] });
			
			if(	headersOfEmptyCells.length > 0 ){
				_.uniqueWarning( 'WARNING: empty cells in feed which should be used as placeholders. skip.. ', headersOfEmptyCells );
				return;
			}

			parseHeaderProfiler.start();
			
			headers.forEach( function( header ){
				obj.campaignName = parseHeader( header, row[ header ], obj.campaignName, cacher				);
				obj.adgroupName  = parseHeader( header, row[ header ], obj.adgroupName, cacher 				);
				obj.keyword 	 = parseHeader( header, row[ header ], obj.keyword.toLowerCase(), cacher	);
				obj.url 		 = parseHeader( header, row[ header ], obj.url.toLowerCase(), cacher 		);
			});
			
			parseHeaderProfiler.end();
			
			obj.campaignName = obj.campaignName.trim();
			obj.adgroupName = obj.adgroupName.trim();
			punctuationProfiler.start();
			obj.keyword = removePunctuation( obj.keyword ).trim();
			punctuationProfiler.end();
			obj.url = obj.url.trim();
			
			if( obj.campaignName == '' ){
				_.uniqueWarning( 'WARNING: empty campaignName. skip..' );
				return;
			}

			if( obj.adgroupName == '' ){
				_.uniqueWarning( 'WARNING: empty adgroupName', ' in ' + obj.campaignName + '. skip..' );
				return;
			}

			if( obj.keyword == '' ){
				_.uniqueWarning( 'WARNING: empty keyword', ' in ' + obj.campaignName +' / ' + obj.adgroupName + '. skip..' );
				return;
			}
			
			cloneProfiler.start();
			obj[ AD_VARIANT ] = _.clone( etaSettings[ structure[ AD_VARIANT ] - 1 ] );
			cloneProfiler.end( 1000 );
			
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
			parseHeaderProfiler.end( 1000 );
			
			punctuationProfiler.start();
			[ H1, H2 ].forEach( function( h ){
				obj[ AD_VARIANT ][ h ] = obj[ AD_VARIANT ][ h ].map( removePunctuationInAds );
			});
			obj[ AD_VARIANT ][ DESC ] = obj[ AD_VARIANT ][ DESC ].map( function( descArr ){
				return descArr.map( removePunctuationInAds );
			});
			punctuationProfiler.end( 1000 );
			
			
			// Check for errors in place-holders
			
			if(	obj.campaignName.indexOf( '{' ) >= 0 ){
				throw new Error( 'found a place holder in campaign name, which could not be dissolved: ' + obj.campaignName + ' headers: ' + JSON.stringify( headers ) + ' row: ' + row[ 'google_product_category' ] );
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
			
			obj.url = encodeURI( obj.url );
			
			row[ ACCOUNT_STRUCTURE_NAME ].push( obj );
		});
	});
		
	// _.log( JSON.stringify( feed[0], null, "\t" ) );
	
	 _.log( 'done with parsing' );
	
	var res = {};
	res[ SETTINGS_SHEET_NAME ] = settings;
	res[ FEED_SHEET_NAME ]  = feed;
	
	return res;
}

// ########################################################
// ########################################################

function removePunctuationInAds( str ){
	//var allowedSpecialCharsInAds = '®$#%@()=+/&Ɛ™©?!¡––—*:“”»«';
	var punctRE = /[’'\[\]{}⟨⟩،、‒―…‹›‐\‘’'"´;⁄·\•^†‡°”¿※№÷×ºª‰−‱¶′″‴§~_|‖¦℗℠¤₳฿₵¢₡₢₫₯֏₠€ƒ₣₲₴₭₺₾ℳ₥₦₧₱₰£៛₽₹₨₪৳₸₮₩¥]/g;
	var spaceRE = /\s+/g;
	return str.replace( punctRE, '').replace( spaceRE, ' ' );
}

function removePunctuation( str ){
	var punctRE = /[\.’'\[\](){}⟨⟩:,،、‒–—―…!‹›«»‐\-?‘’“”'"´;\/⁄·\&*@\•^†‡°”¡¿※#№÷×ºª%‰+−=‱¶′″‴§~_|‖¦©℗®℠™¤₳฿₵¢₡₢$₫₯֏₠€ƒ₣₲₴₭₺₾ℳ₥₦₧₱₰£៛₽₹₨₪৳₸₮₩¥]/g;
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
				_.uniqueWarning(  'WARNING: Select-Index exceeds split-array-length', ': "' + text2 + '".split("' + splitLogicRow.delimiter + '")[' + splitLogicRow.selector + ']' );
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
						_.uniqueWarning(  'WARNING: Select-Index exceeds split-array-length', ': "' + text2 + '".split("' + splitLogicRow.delimiter + '")[' + splitLogicRow.selector + ']' );
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

function developement(){

	var profiler = _.profiler( 'test' );
	profiler.start();
	
	// .........................

	var x = 0;
	
	for( var i=0;i<3000000;i++){
		x += i;
	}
	// .........................
	
	_.log( x );
	
	profiler.end( 1 );
	
	return;

	var parser = myParser();
	
	var headers = [
		'category5',
		'category6',
		'gender',
		'brand',
		'product_type'
	];
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

function campaignAction( campaignNamesFromFeed ){
	_.log( 'do campaign action' );
	
	var campaignsInAccount = _.SELECT( 'CampaignName' )
		.FROM( 'CAMPAIGN_PERFORMANCE_REPORT' )
		.WHERE( 'CampaignStatus IN [ENABLED,PAUSED]' )
		.parse()
		.map( _.property( 'CampaignName' ) )
	;
	campaignsInAccount.sort();
	
	campaignNamesFromFeed = campaignNamesFromFeed
		.map( function( campaignName ){ return [ campaignName + EXACT_SUFFIX, campaignName + BROAD_SUFFIX, ] } )
		.reduce( _.concat, [] ) // flatten
	;
	campaignNamesFromFeed.sort();
	
	_.log( 'found ' + campaignsInAccount.length + ' campagins in account' );
	
	[ missingInFeed, missingInAccount ] = findDiff( campaignNamesFromFeed, campaignsInAccount );
	// we don't care for missingInFeed
	
	if( missingInAccount.length > 0 ){
		var bulk = uploadTool();
		missingInAccount.forEach( bulk.addSingleCampaign );
		
		_.log( 'bulk-upload campaigns and wait for it to finish' );
		bulk.upload();
		
		// wait for bulk-upload to create campaigns
		var countMissingCampaigns = missingInAccount.length;
		while( countMissingCampaigns ){
			_.log( 'sleep ' + WAITING_INTERVAL + ' seconds and wait for bulk-upload to finish' );
			Utilities.sleep( WAITING_INTERVAL * 1000 );
			countMissingCampaigns = findMissingCampaigns2( missingInAccount );
		}
		
		_.log( 'labele Kampagnen mit CREATED_BY_SCRIPT' );
		
		_.iteratorToList(
			AdWordsApp
				.campaigns()
				.withCondition( 'Name IN [' + missingInAccount.map( function(x){ return '"' + x + '"' } ).join( ',' ) + ']' )
				.get()
		).forEach( function( campaign ){
			campaign.applyLabel( CREATED_BY_SCRIPT_LABEL );
		});
	}
}

function adgroupAction( adgroupsInFeed ){
	
	_.log( 'find adgroups differences between account and feed' );
	
  	var allAdgroupsInAccount = _.SELECT( 'CampaignName', 'AdGroupName' )
		.FROM( 'ADGROUP_PERFORMANCE_REPORT' )
		.WHERE( 'CampaignStatus IN [ENABLED,PAUSED]' )
		.AND( 'AdGroupStatus IN [ENABLED,PAUSED]' )
		.parse()
		.map( function( row ){ return row[ 'CampaignName'] + DELIMITER + row[ 'AdGroupName' ] } );
	
	allAdgroupsInAccount.sort();
	adgroupsInFeed = Object.keys( adgroupsInFeed );
	adgroupsInFeed.sort();
	
	var campaigns = _.iteratorToMap( AdWordsApp.campaigns().withCondition('CampaignStatus IN [ENABLED, PAUSED]').get(), 'getName' );
	
	[ missingInFeed, missingInAccount ] = findDiff( adgroupsInFeed, allAdgroupsInAccount );

	
	_.log( 'create missing Adgroups' );

	var adgroupProfiler = _.profiler( 'createAdgroup' );
	var labelProfiler = _.profiler( 'applyLabel' );
	
	var bulk = null;//TODO
	missingInAccount.forEach( function( adgroup ){
		[ campaignName, adgroupName ] = adgroup.split( DELIMITER );
		
		//bulk.addSingleAdgroup( campaignName, adgroupName );
		
		///*
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
			adgroup.applyLabel( CREATED_BY_SCRIPT_LABEL );
			labelProfiler.end( 500 );
		}
		//*/
	});
	//bulk.upload();
	
	_.log( 'done with adgroups' );
	
}

function newKeywordAction( keywordInFeed, adgroups ){
	_.log( 'new keyword action' );

	var urls = {};
	
	var keywordsInAccount = _.iteratorToMap( AdWordsApp.keywords()
		.withCondition( 'CampaignStatus IN [ENABLED, PAUSED]' )
		.withCondition( 'AdGroupStatus IN [ENABLED, PAUSED]' )
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
			_.log( key );
			var adgroup = adgroups[ campaignName + DELIMITER + adgroupName ];
			if( adgroup ){
				keywordsToBeCreated.push({
					adgroup : adgroup,
					keyword : keyword,
					url : keywordInFeed[ key ]
				});
			}else{
				_.uniqueWarning( 'Can\'t find adgroup in account: ', campaignName + ' > ' + adgroupName );
			}
		}else{
			if( keywordsInAccount[ key ].isPaused() && keywordsInAccount[ key ].labels().withIds( [ pausedLabel.getId() ] ).get().hasNext() ){
				keywordsToBeEnabled.push( keywordsInAccount[ key ] );
			}
		}
	}
	_.log( 'count keywords in feed: ' + countKeywordsInFeed );
	_.log( 'count keywords to be created: ' + keywordsToBeCreated.length );
	
	
	keywordsToBePaused.forEach( function( keyword ){
		keyword.pause();
		keyword.applyLabel( PAUSED_BY_SCRIPT_LABEL );
	});
	
	keywordsToBeEnabled.forEach( function( keyword ){
		keyword.enable();
		keyword.removeLabel( PAUSED_BY_SCRIPT_LABEL );
	});
	
	keywordsToBeCreated.forEach( function( obj ){
		var op = obj.adgroup
			.newKeywordBuilder()
			.withText( obj.keyword )
			.withCpc( 1.5 )
			.withFinalUrl( obj.url )
			.build();
		var newKeyword = op.getResult();
		newKeyword.applyLabel( CREATED_BY_SCRIPT_LABEL );
		newKeyword.pause();
	});
	
	_.log( 'done with keywords' );
}

function newAdAction( adsInFeed, adgroups ){
	_.log( 'new ad action' );

	var urls = {};
	
	var adsInAccount = _.iteratorToMap( AdWordsApp.ads()
		.withCondition( 'CampaignStatus IN [ENABLED, PAUSED]' )
		.withCondition( 'AdGroupStatus IN [ENABLED, PAUSED]' )
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
	
	var adsToBePaused = [];
	var adsToBeEnabled = [];
	var adsToBeCreated = [];
	
	for( key in adsInAccount ){
		if( !adsInFeed[ key ] ){
			if( adsInAccount[ key ].isEnabled() ){
				adsToBePaused.push( adsInAccount[ key ] );
			}
		}
	}
	
	for( key in adsInFeed ){
		if( !adsInAccount[ key ] ){
			[ campaignName, adgroupName, h1, h2, desc ] = key.split( DELIMITER );
			var adgroup = adgroups[ campaignName + DELIMITER + adgroupName ];
			if( adgroup ){
				adsToBeCreated.push({
					adgroup : adgroup,
					h1 : h1,
					h2 : h2,
					desc : desc,
					url : adsInFeed[ key ]
				});
			}else{
				_.uniqueWarning( 'Can\'t find adgroup in account: ', campaignName + ' > ' + adgroupName );
			}
		}else{
			if( adsInAccount[ key ].isPaused() && adsInAccount[ key ].labels().withIds( [ pausedLabel.getId() ] ).get().hasNext() ){
				adsToBeEnabled.push( adsInAccount[ key ] );
			}
		}
	}
	
	adsToBePaused.forEach( function( ad ){
		ad.pause();
		ad.applyLabel( PAUSED_BY_SCRIPT_LABEL );
	});
	
	adsToBeEnabled.forEach( function( ad ){
		ad.enable();
		ad.removeLabel( PAUSED_BY_SCRIPT_LABEL );
	});
	
	adsToBeCreated.forEach( function( obj ){
		var op = obj.adgroup.newAd()
			.expandedTextAdBuilder()
			.withHeadlinePart1( obj.h1 )
			.withHeadlinePart2( obj.h2 )
			.withDescription( obj.desc )
			.withFinalUrl( obj.url )
			.build();
		var newAd = op.getResult();
		newAd.applyLabel( CREATED_BY_SCRIPT_LABEL );
		newAd.pause();
	});
	
	_.log( 'done with ads' );
}

function computeDescription( row, adIndex, buyKeywords ){
	var keyword = row[ KEYWORD ];
	
	var containsBuyWords = buyKeywords.map( _.isContainedIn2( keyword.toLowerCase() ) ).reduce( _.or2, false );
	
	return row[ AD_VARIANT ].desc[ adIndex ]
		.filter( function( desc ){ return containsBuyWords ? !buyKeywords.map( _.isContainedIn2( desc.toLowerCase() ) ).reduce( _.or2, false ) : true } )
		.map( function( desc ){ return desc.replace( /\{keyword\}/g, keyword ) } )
		.filter( _.property( 'length' ).le( MAX_DESCRIPTION_LENGTH ) )
		.reduce( function( a, b ){ return a.length > b.length ? a : b }, 'no valid description found' );
}

function computeHeader( row, headerSelector, buyKeywords, index ){
	var keyword = row[ KEYWORD ];
	var containsBuyWords = headerSelector == H2 ? false : buyKeywords.map( _.isContainedIn2( keyword.toLowerCase() ) ).reduce( _.or2, false );
	
	
	var validHeaders = row[ AD_VARIANT ][ headerSelector ]
		.filter( function( head ){ 
			var headerContainsBuyWords = buyKeywords.map( _.isContainedIn2( head.toLowerCase() ) ).reduce( _.or2, false );
			return containsBuyWords ? ! headerContainsBuyWords : true 
		})
		.map( function( head ){ return head.replace( /\{keyword\}/g, keyword ) } )
		.filter( _.property( 'length' ).le( MAX_HEADER_LENGTH ) )
		;
	if( validHeaders.length == 0 ){
		return 'no header1 could be computed';
	}
	return validHeaders[ ( index - 1 ) % validHeaders.length ];
}
	
function computeKeywordText( keyword, suffix ){
	if( suffix == EXACT_SUFFIX ){
		return '[' + keyword + ']';
	}else if( suffix == BROAD_SUFFIX ){
		return '+' + keyword.replace( ' ', ' +' );
	}else{
		throw new Error( 'Unexpected suffix: ' + suffix );
	}
}

function computeAdgroupKey( structure, suffix ){
	return structure[ 'campaignName' ] + suffix + DELIMITER + structure[ 'adgroupName' ];
}

function main(){
	_.log( ' start' );

	
	/*
  var errors = AdWordsApp.adGroups().withCondition('CampaignStatus = "ENABLED"').get().next()
  .newAd().expandedTextAdBuilder()
  .withDescription('Make-up online vergleichen')
  .withHeadlinePart1('')
  .withHeadlinePart2('')
  .withFinalUrl('http://www.example.com')
  .build().getErrors();
  
  _.log( errors[0] );
  
  */
	
	var input = parseBook();
	
	
	var campaignNamesFromFeed = input[ FEED_SHEET_NAME ]
		.map( _.property( ACCOUNT_STRUCTURE_NAME ) )
		.map( function( accountStructureArr ){
			return accountStructureArr.map( _.property( 'campaignName' ) );
		})
		.reduce( _.concat, [] ) // flatten
		.filter( _.nonEmpty )
		.filter( _.onlyUniqueIgnoreCase() )
	;
	
	_.log( 'found ' + campaignNamesFromFeed.length + ' campaigns in feed ' );
	
	campaignAction( campaignNamesFromFeed );
	
	var campaignNamesMap = _.stringListToMap( campaignNamesFromFeed, 1 );
	
	// AdGroups
	
	_.log( 'sleep 4 seconds' );
	Utilities.sleep( 4000 );
	
	_.log( 'prepare adgroups' );
	
	var adgroupsInFeedCaseUnique = {};
	var adgroupsInFeed = {};
	
	input[ FEED_SHEET_NAME ]
		.map( _.property( ACCOUNT_STRUCTURE_NAME ) )
		.forEach( function( arr ){
			arr.forEach( function( structure ){
				if( campaignNamesMap[ structure[ 'campaignName' ] ] && structure[ 'adgroupName' ].length > 0 ){
					[ EXACT_SUFFIX, BROAD_SUFFIX ].forEach( function( suffix ){
						var adgroupKey = computeAdgroupKey( structure, suffix );
						var keyLowerCase = adgroupKey.toLowerCase();
			
						// skip adgroups which differ only in case
						if( !adgroupsInFeedCaseUnique[ keyLowerCase ] ){
							adgroupsInFeedCaseUnique[ keyLowerCase ] = 1;
							adgroupsInFeed[ adgroupKey ] = 1;
						}
					});
				}
			});
		})
	;
	
	adgroupAction( adgroupsInFeed );
	
	
	// -----------------------------
	
	
	var adgroups = _.iteratorToMap(
			AdWordsApp.adGroups()
			.withCondition( 'CampaignStatus IN [ENABLED, PAUSED]' )
			.withCondition( 'AdGroupStatus IN [ENABLED, PAUSED]' )
			.get(),
			function( adgroup ){ return adgroup.getCampaign().getName() + DELIMITER + adgroup.getName() }
		)
	;
	
	// -----------------------------
	
	// Keywords
	
	_.log( 'prepare keywords' );
	
	var keywords2 = {};

	input[ FEED_SHEET_NAME ]
		.map( _.property( ACCOUNT_STRUCTURE_NAME ) )
		.forEach( function( arr ){
			arr.forEach( function( structure ){
				[ EXACT_SUFFIX, BROAD_SUFFIX ].forEach( function( suffix ){
					var adgroupKey = computeAdgroupKey( structure, suffix );
					if( adgroupsInFeed[ adgroupKey ] ){
						
						var keywordKey = adgroupKey + DELIMITER + computeKeywordText( structure[ 'keyword' ], suffix );
						
						keywords2[ keywordKey ] = structure[ 'url' ];
					}
				});
			});
		})
	;
	
	newKeywordAction( keywords2, adgroups );
	
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
		.map( _.property( ACCOUNT_STRUCTURE_NAME ) )
		.forEach( function( arr ){
			arr.forEach( function( structure ){
				[ EXACT_SUFFIX, BROAD_SUFFIX ].forEach( function( suffix ){
					var adgroupKey = computeAdgroupKey( structure, suffix );
					if( adgroupsInFeed[ adgroupKey ] ){
					
						var campaignName = structure[ 'campaignName' ] + suffix;
						var adgroupName = structure[ 'adgroupName' ];
						
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
								desc
							;
							
							ads[ key ] = structure[ 'url' ];
						});
					}
				});
			});
		})
	;
	
	newAdAction( ads, adgroups );
	
	_.printUniqueWarnings();
	
}
