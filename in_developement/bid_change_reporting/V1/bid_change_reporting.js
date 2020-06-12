
var config = {
	"DESCRIPTION" : "",
	"INSTRUCTIONS":"To manage more than 50 accounts we use several instances of this script The SCRIPT_INSTANCE determine which subset of accounts is managed by this instance of the script the first 50 accounts are managed by the first instance ( SCRIPT_INSTANCE = 1 ) the next 50 account are managed by the second instance of this script ( SCRIPT_INSTANCE = 2 ) and so forth..",
	"VERSION" : 1,
	"VERSION_TAG" : "stable",
	"NAME": "Bid Change Anomaly Reporter",
	"settings" : {
		"DEVELOPER_EMAIL" : "a.bakhabou@pa.ag",
		"SCRIPT_INSTANCE" : 1,
		"REPORTING_HOUR" : 17,
		"SPREADSHEET_URL" : "https://docs.google.com/spreadsheets/d/1I0VFl6EIb-iOweErkdVq5RFQTvLGgO9L_nI47L1iQGI/edit#gid=0",
		"SHEET_NAME" : "settings",
		"PROJECT_ID" : "",
		"DATASET_ID" : "",
		"NEW_ADS_TABLE_NAME" : "new_ads",
		"TRUNCATE_EXISTING_DATASET" : "false",
		"TRUNCATE_EXISTING_TABLES" : "false",
		"PARTITION_EXPIRATION" : 30,
		"COMPAIGN_NAME_CONTAINS" : [],
		"INCLUDE_COMPAIGNS" : [] , 
		"CHECK_NEW_ITEMS" : "true",
		"MAX_SHOW_CAMPAIGNS_PER_CHECK" : 6,
 		"MAX_SHOW_ITEMS_PER_CAMPAIGN" : 3,
		"COMPAIGN_NAME_DOES_NOT_CONTAIN" : [],
		"MAX_ALLOWED_DURATION_IN_SECONDS" : 900,
		"EXPECTED_DURATION_PER_CAMPAIGN_IN_SECONDS" : 30
	}		
};

for( key in config.settings ){
	this[ key ] = config.settings[ key ];
}

// ------- SETTINGS ---------------

// ++++++++++++++++++++++++++++++++++
// ++++++++++++++++++++++++++++++++++
// ++++++++++++++++++++++++++++++++++

var CHANGES_TABLE_NAME = 'changes';
var TIME_ZONE = 'Europe/Berlin';
// split each account in NUM_PARTS parts to reduce report-size



var SPLITTER = ' _ ';
// POSSIBLE_DIVISORS must be divisors of 24, must contain 24 and be in ascending order
var POSSIBLE_DIVISORS = [ 1, 2, 3, 4, 6, 8, 12, 24 ];

// -------------------------------------

var MAILGUN = {
	SEND_EMAILS_THROUGH_MAILGUN : true,
	URL : 'https://api.mailgun.net/v3/mg.peakace.de/messages',
	FROM : 'adwords_scripts@mg.peakace.de',
	AUTHORISATION : 'Basic YXBpOmtleS1hYWZmMmI2MGU4MmNkMWYwOTIwYWYxNDUzZWM0MDcyOA=='
};

// dedug SPREADSHEET : 
// var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1Ja5M37U6iNxEJUfqKGgQQevC9p2GMxSqWuQNKLxsGpI/edit#gid=0';
// -------------------------------------

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
        
        if( ! keySelector ){
			throw new Error("key selector required");
        }
        
		list.forEach( function( item, index ){
			if( typeof keySelector == 'function' ){
				if( typeof valueSelector == 'function' ){
					map[ keySelector( item, index ) ] = valueSelector( item, index );
				}else if( typeof item[ valueSelector ] == 'function' ){
					map[ keySelector( item, index ) ] = item[ valueSelector ]();
				}else{ 
					map[ keySelector( item, index ) ] = item[ valueSelector ];
				}
			}else if( typeof item[ keySelector ] == 'function' ){
				if( typeof valueSelector == 'function' ){
					map[ item[ keySelector ]() ] = valueSelector( item, index );
				}else if( typeof item[ valueSelector ] == 'function' ){
					map[ item[ keySelector ]() ] = item[ valueSelector ]();
				}else{ 
					map[ item[ keySelector ]() ] = item[ valueSelector ];
				}
			}else{
				if( typeof valueSelector == 'function' ){
					map[ item[ keySelector ] ] = valueSelector( item, index );
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
				apply( item, arg );
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
	function apply( item, arg ){
		if( typeof arg == 'function' ){
			return arg( item );
		}else if( typeof item[ arg ] == 'function' ){
			return item[ arg ]();
		}else if( typeof item[ arg ] != 'undefined' ){
			return item[ arg ];
		}else if( typeof arg[ item ] != 'undefined' ){
			return arg[ item ];
		}else{
			throw new Error( 'apply() can\'t determine what to do with ' + item + ' and ' + arg );
		}
	}
	function property(){
		var args = Array.prototype.slice.call( arguments );
		var f = function( item ){
			var res = item;
			for( var index in args ){
				var arg = args[ index ];
				res = apply( res, arg );
			}
			//res = args.reduce( apply, res );
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
		value = JSON.stringify( value, null, '\t' );
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
	function snakeToCamel( str ){
		var res = str
			.replace( /_+(.)/g, function( x, chr ){
			return chr.toUpperCase();
		});
		return res.charAt( 0 ).toUpperCase() + res.slice( 1 );
	}
	function camelToSnake( str ){
		return str.replace( /\.?([A-Z])/g, function( x, y ){ return '_' + y.toLowerCase() } ).replace( /^_/, '' );
	}
	function hash( value ){
		value = value + '';
		var hash = 0;
		if ( value.length == 0 ) return hash;
		for( i = 0; i < value.length; i++ ){
			var char1 = value.charCodeAt( i );
			hash = ( ( hash << 5 ) - hash ) + char1;
			hash = hash & hash; // Convert to 32bit integer
		}
		return Math.abs( hash );
	}
	function equals( value ){
		return function( x ){ return x == value };
	}
	function modulo( value ){
		return function( x ){ return x % value };
	}
	function isNumeric( n ) {
	  return ! isNaN( parseFloat( n ) ) && isFinite( n );
	}
	function predicate(){
		var operations = Array.prototype.slice.call( arguments );
		return function( item ){
			return operations.reduce( function( a, b ){ return b( a ) }, item );
		};
	}
	function assert( condition, message ){
		if( !condition ){
			message = message || "Assertion failed";
			if( typeof Error !== "undefined" ){
				throw new Error(message);
			}
			throw message; // Fallback
		}
	}
	function toMatrix( obj ){
		return Object.values( obj ).map( Object.values );
	}
	function splitArray( arr, chunkSize ){
		var i, res = [];
		for( i = 0; i < arr.length; i += chunkSize ){
			res.push( arr.slice( i, i + chunkSize ) );
		}
		return res;
	}
	function xor( a, b ){ return a ? !b : b };
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
		profiler		: profiler,
		by2				: by2,
		putInto			: putInto,
		limit			: limit,
		snakeToCamel	: snakeToCamel,
		camelToSnake	: camelToSnake,
		hash			: hash,
		equals			: equals,
		modulo			: modulo,
		isNumeric		: isNumeric,
		predicate		: predicate,
		assert			: assert,
		toMatrix		: toMatrix,
		splitArray		: splitArray,
		xor				: xor,
	};
})();

var CONFIG = ( function(){
	var res = {
		// Lists of reports and fields to retrieve from AdWords.
		REPORT: {
			NAME: 'KEYWORDS_PERFORMANCE_REPORT',
			//CampaignStatus IN ["ENABLED", "PAUSED"] AND AdGroupStatus IN ["ENABLED", "PAUSED"] AND 
			KEY : [ 'AdGroupId', 'Id' ],
			FIELDS: {
				'CampaignId' 				: 'INTEGER',
				'CampaignName' 				: 'STRING',
				'AdGroupId' 				: 'INTEGER',
				'AdGroupName' 				: 'STRING',
				'Id'						: 'INTEGER',
				'Criteria'					: 'STRING',
				'Status'		 			: 'STRING',
				'CpcBid' 					: 'STRING'
				//'Labels'				 	: 'STRING',
				//'FinalUrls'				: 'STRING'
			}
		},
		CHECKS : [
			// 'Status',
			'CpcBid'
			//'Labels',
			// 'FinalUrls'
		],
		EXPECTED_CHECKS_FOR_NEW_ITEMS : {
			'Status'	: 'paused',
			'CpcBid'	: '--'
			//'Labels'	: '["PA New Keyword"]',
			//'FinalUrls' : '--'
		},
		DATABASE_FIELDS : {},
	};
	for( var fieldName in res.REPORT.FIELDS ){
		var type = res.REPORT.FIELDS[ fieldName ];
		var snake = _.camelToSnake( fieldName );
		res.DATABASE_FIELDS[ snake ] = type;
	}
	return res;
})();

var BIGQUERY = ( function(){
	
	function createDataset() {
		if( datasetExists() ){
			if( TRUNCATE_EXISTING_DATASET ){
				BigQuery.Datasets.remove( PROJECT_ID, DATASET_ID, { 'deleteContents' : true } );
				Logger.log( 'Truncated dataset ' + DATASET_ID );
			} else {
				return;
			}
		}
		
		// Create new dataset.
		var dataSet = BigQuery.newDataset();
		dataSet.friendlyName = DATASET_ID;
		dataSet.datasetReference = BigQuery.newDatasetReference();
		dataSet.datasetReference.projectId = PROJECT_ID;
		dataSet.datasetReference.datasetId = DATASET_ID;

		dataSet = BigQuery.Datasets.insert( dataSet, PROJECT_ID );
		Logger.log( 'Created dataset with id %s.', dataSet.id );
	}

	function datasetExists() {
		// Get a list of all datasets in project.
		var datasets = BigQuery.Datasets.list( PROJECT_ID );
		var datasetExists = false;
		// Iterate through each dataset and check for an id match.
		if( datasets.datasets != null ){
			for( var i = 0; i < datasets.datasets.length; i++ ){
				var dataset = datasets.datasets[ i ];
				if( dataset.datasetReference.datasetId == DATASET_ID ){
					datasetExists = true;
					break;
				}
			}
		}
		return datasetExists;
	}

	function dropTable( tableName ){
		if ( tableExists( tableName ) ) {
			BigQuery.Tables.remove( PROJECT_ID, DATASET_ID, tableName );
			Logger.log( 'Table %s dropped.', tableName );
		}
	}
	
	function createTable( tableName, fields ) {
		if( tableExists( tableName ) ){
			if( TRUNCATE_EXISTING_TABLES ){
				dropTable( tableName );
			}else{
				return;
			}
		}

		// Create new table.
		var table = BigQuery.newTable();
		var schema = BigQuery.newTableSchema();
		var bigQueryFields = [];

		// Add each field to table schema.
		var fieldNames = Object.keys( fields );
		for( var i = 0; i < fieldNames.length; i++ ){
			var fieldName = fieldNames[ i ];
			var bigQueryFieldSchema = BigQuery.newTableFieldSchema();
			bigQueryFieldSchema.description = fieldName;
			bigQueryFieldSchema.name = fieldName;
			bigQueryFieldSchema.type = fields[ fieldName ];
		
			bigQueryFields.push( bigQueryFieldSchema );
		}

		schema.fields = bigQueryFields;
		table.schema = schema;
		table.friendlyName = tableName;

		table.tableReference = BigQuery.newTableReference();
		table.tableReference.datasetId = DATASET_ID;
		table.tableReference.projectId = PROJECT_ID;
		table.tableReference.tableId = tableName;

		if( PARTITION_EXPIRATION ){
			table.timePartitioning = BigQuery.newTimePartitioning();
			table.timePartitioning.type = 'DAY';
			table.timePartitioning.expirationMs = 1000 * 60 * 60 * 24 * PARTITION_EXPIRATION;
			table.timePartitioning.requirePartitionFilter = true;
		}
		
		try{
			table = BigQuery.Tables.insert(
				table,
				PROJECT_ID,
				DATASET_ID
			);
		}catch( error ){
			// sometimes we get "table already exists" here
			// we can ignore this error
			// should be fixed by now
			Logger.log( '----------------------> ' + error + ' - ' + tableName );
		}
		Logger.log('Table %s created.', tableName);
	}

	function tableExists( tableId ){
		var pageToken = ''; // start with empty pageToken
		var resultsPerPage = 150;
		var finished = false;
		
		while( ! finished ){
			// Get a list of a part of all tables in the dataset.
			var tables = BigQuery.Tables.list(
				PROJECT_ID,
				DATASET_ID,
				{
					pageToken  : pageToken,
					maxResults : resultsPerPage
				}
			);
			pageToken = tables.nextPageToken;
		  
			if( ! pageToken ){
				finished = true;
			}
			// Iterate through each table and check for an id match.
			if ( tables.tables != null ){
				for( var i = 0; i < tables.tables.length; i++ ){
					var table = tables.tables[ i ];
					if( table.tableReference.tableId == tableId ){
						return true;
					}
				}
			}
		}
		return false;
	}

	function getTables(){
		var pageToken = null; // start with empty pageToken
		var resultsPerPage = 150;
		var res = [];
		do{
			// Get a list of a part of all tables in the dataset.
			var tables = BigQuery.Tables.list(
				PROJECT_ID,
				DATASET_ID,
				{
					pageToken  : pageToken || '',
					maxResults : resultsPerPage
				}
			);
			pageToken = tables.nextPageToken;
		  
			res = res.concat( tables.tables || [] );
		}while( pageToken );
		
		return res;
	}

	function copyTable( srcTableId, destTableId ){
		var job = {
			configuration: {
				copy: {
					destinationTable: {
						projectId	: PROJECT_ID,
						datasetId	: DATASET_ID,
						tableId  	: destTableId
					},
					sourceTable : {
						projectId	: PROJECT_ID,
						datasetId	: DATASET_ID,
						tableId		: srcTableId
					},
					createDisposition	: 'CREATE_IF_NEEDED',
					writeDisposition	: 'WRITE_TRUNCATE',
				}
			}
		};
		BigQuery.Jobs.insert( job, PROJECT_ID );
	}

	function splitArray( arr, chunkSize ){
		var i, res = [];
		for( i = 0; i < arr.length; i += chunkSize ){
			res.push( arr.slice( i, i + chunkSize ) );
		}
		return res;
	}

	function prepareForBigQuery( value ){
		function isNumeric( n ){
			return ! isNaN( parseFloat( n ) ) && isFinite( n );
		}
		if( typeof value == 'string' ){
			// remove thousand separator
			var num = value.split( ',' ).join( '' );
			if( _.isNumeric( num ) ){
				return num;
			}
			if( value.length > 0 && value.indexOf( '%' ) == value.length - 1 ){
                var num = value.substring( 0, value.length - 1 );
                if( isNumeric( num ) ){
                    return num / 100;
                }
            }
			if( value.indexOf( '"' ) >= 0 ){
				value = value.replace( new RegExp( '"', 'g' ), '""' );
			}
			value = '"' + value + '"';
			return value;
		}
		value = value + '';
		
		if( value.indexOf(',') >= 0 ){
			value = value.replace( new RegExp( ',', 'g' ), '' );
		}
		return value;
	}

	function toCsvChunks( matrix ){
		var rows = matrix.map( function( row ){
			return row.map( prepareForBigQuery ).join( ',' );
		});
		return _.splitArray( rows, CONSTANTS.BIGQUERY_CHUNK_SIZE ).map( function( rows ){ return rows.join( '\n' ) } );
	}

	function loadIntoBigquery( matrix, tableName ){
		// dropTable( tableName );
		// createTable( tableName, FIELDS );
		//Logger.log( 'loadIntoBigQuery: ' + JSON.stringify( matrix, null, '\t' ) );
		if( typeof matrix.length == 'undefined' ){
			matrix = _.toMatrix( matrix );
			// Logger.log( 'toMatrix: ' + JSON.stringify( matrix[0], null, '\t' ) );
		}
		var uploader = loadIntoBigqueryTable( tableName );
		var bigQueryJobIds = toCsvChunks( matrix ).map( uploader );
		return bigQueryJobIds;
	}

	function loadIntoBigqueryTable( tableName ){
		return function( data ){
			// Convert to Blob format.
			var blobData = Utilities.newBlob( data, 'application/octet-stream' );
			// Create the data upload job.
			var job = {
				configuration: {
					load: {
						destinationTable: {
							projectId: PROJECT_ID,
							datasetId: DATASET_ID,
							tableId: tableName
						},
						skipLeadingRows: 0, // We have no a header row, so nothing to skip.
						writeDisposition	: 'WRITE_APPEND', // Since we load chunks it must be append! Do not use 'WRITE_TRUNCATE' here!
					}
				}
			};
			try{
				var insertJob = BigQuery.Jobs.insert( job, PROJECT_ID, blobData );
				//Logger.log('Load job started for %s. Check on the status of it here: ' +
				//   'https://bigquery.cloud.google.com/jobs/%s', tableName,
				//   PROJECT_ID);
				return insertJob.jobReference.jobId;
			}catch( error ){
				// sometimes we get "No schema specified on job or table." here
				Logger.log( error + ' - ' + tableName );
				return 'error';
			}
		};
	}

	function checkJobs( jobIds ){
		var states = {};
		for( var i in jobIds ){
			var jobId = jobIds[ i ];
			if( jobId == 'error' ){
				continue;
			}
			var job = BigQuery.Jobs.get( PROJECT_ID, jobId );
			var state = job.status.state;
			states[ state ] = ( states[ state ] || 0 ) + 1;
			
			if( job.status.errorResult ){
				Logger.log( 'message : ' + job.status.errorResult.message );
				Logger.log( 'location : ' + job.status.errorResult.location );
				Logger.log( 'Debug-info: ' + job.status.errorResult.debugInfo );
				throw new Error ( JSON.stringify( job.status.errors, null, 2 ) );
			}
		}
		Logger.log( 'job ids : ' + jobIds.length );
		Logger.log('states : ' +  JSON.stringify( states, null, '\t' ) );
		
		if( states[ 'RUNNING' ] ){
			Utilities.sleep( 5000 );
			checkJobs( jobIds );
		}
	}

	function queryTable( tableId ){
		var result = [];
		var pageToken = ''; // empty pageToken
		var resultsPerPage = 10000;
		var finished = false;
		//var processed = 0;
		
		while( ! finished ){
			var data = BigQuery.Tabledata.list(
				PROJECT_ID,
				DATASET_ID,
				tableId,
				{
					pageToken  : pageToken,
					maxResults : resultsPerPage
				}
			);
			result = result.concat( ( data.rows || [] ).map( function( row ){
				return row.f.map( _.property( 'v' ) );
			}));
			pageToken = data.pageToken;
			if( ! pageToken ){
				finished = true;
			}
			//processed += data.rows ? data.rows.length : 0;
			//Logger.log( processed + ' / ' + data.totalRows + ' processed ' );
		}
		//Logger.log( 'result: ' + JSON.stringify( result ) );
		return result;
	}

	function queryBQ( table, waitLimit ){
		var queryRequest = BigQuery.newQueryRequest();
		queryRequest.query = 'SELECT * FROM `' + PROJECT_ID + '.' + DATASET_ID + '.' + table + '`';
		queryRequest.useLegacySql = false;
	  
		var query = BigQuery.Jobs.query( queryRequest, PROJECT_ID );

		var counter = 0;
		waitLimit = waitLimit || 10;
		
		while( ! query.jobComplete && counter++ < waitLimit ){
			Logger.log( 'wait for query job to complete' );
			Utilities.sleep( 1000 );
		}
	  
		if( query.jobComplete ){
			var matrix = query.rows.map( function( row ){
				return row.f.map( _.property( 'v' ) );
			});
			// Logger.log( matrix.length );
			return matrix;
		}
		var message = 'BQ query job is not complete after ' + waitLimit + ' seconds.';
		Logger.log( message );
		throw new Error( message );
	}
	
	return {
		queryTable 			: queryTable,
		queryBQ 			: queryBQ,
		checkJobs 			: checkJobs,
		loadIntoBigquery 	: loadIntoBigquery,
		copyTable			: copyTable,
		getTables			: getTables,
		tableExists			: tableExists,
		createTable			: createTable,
		dropTable			: dropTable,
		datasetExists		: datasetExists,
		createDataset		: createDataset,
	}
})();

// ####################################################
// ####################################################

var GOOGLE_SHEETS = ( function (){

	function autoResizeColumns( sheet ){
		for( var column = 1; column <= sheet.getLastColumn(); column++ ){
			sheet.autoResizeColumn( column );
		}
	}
	
	function getMapOfLists( keyColumnIndex, valueColumnIndex, sheetUrl, sheetName ){
		var values = loadSheet( sheetUrl, sheetName );
		var res = {};
		for( var index = 1; index < values.length; index++ ){
			var key =  values[ index ][ keyColumnIndex ];
			var list = values[ index ][ valueColumnIndex ];
			if( list ){
				res[ key ] = list.split(',').map( String.trim );
			}
		}
		return res;
	}
	
	function initSheet( sheetUrl, sheetName ){
		var book = SpreadsheetApp.openByUrl( sheetUrl );
		if ( !sheetName ){
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
		sheetUrl = sheetUrl || SPREADSHEET_URL;
		sheetName = sheetName || SHEET_NAME;
		var sheet = initSheet( sheetUrl, sheetName );
		return loadSheet2( sheet );
	}

	return {
		loadSheet		: loadSheet,
		getMapOfLists	: getMapOfLists,
		
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

// -------------------------------------
// ------- CONSTANTS -------------------

var CONSTANTS = {
	SCRIPT_NAME : 'bid_change_reporting',
	EMPTY : '',
	ID_COLUMN : 1, // 0-based
	EMAIL_COLUMN : 2, // 0-based
	ACCOUNTS_LIMIT : 50,
	BIGQUERY_CHUNK_SIZE : 30000,
	DELIMITER : '_',
}

// -------------------------------------

function computeNumParts( countAllCampaigns ){
    return POSSIBLE_DIVISORS.filter( function( divisor ){
        if( divisor == 24 ){
            return true; // 24 is always allowed
        }
        var res = ( countAllCampaigns <= MAX_ALLOWED_DURATION_IN_SECONDS / EXPECTED_DURATION_PER_CAMPAIGN_IN_SECONDS * divisor );
        return res;
    })[ 0 ];
}

function computeCurrentCampaignIds(){
    if (INCLUDE_COMPAIGNS.length == 0) {
		var query = "SELECT CampaignId, CampaignName FROM CAMPAIGN_PERFORMANCE_REPORT WHERE CampaignStatus IN [ 'ENABLED', 'PAUSED' ]";  	   
	}else{
			var query = "SELECT CampaignId, CampaignName FROM CAMPAIGN_PERFORMANCE_REPORT WHERE CampaignName CONTAINS_ANY ['" + INCLUDE_COMPAIGNS.join("','") + "']  AND CampaignStatus IN [ 'ENABLED', 'PAUSED' ]";
		}

	var allCampaignIds = _.iteratorToList( AdWordsApp.report( query ).rows() )
	.filter( function ( row ){
		if (COMPAIGN_NAME_CONTAINS.length == 0) {
			return true ;
		}		

		return	COMPAIGN_NAME_CONTAINS.map(function (name) {
				return row.CampaignName.indexOf(name) >= 0;
			}).reduce( _.or2 , false);			
	})
	.filter( function ( row ){
		if (COMPAIGN_NAME_DOES_NOT_CONTAIN.length == 0) {
			return true ;
		}		

		return	COMPAIGN_NAME_DOES_NOT_CONTAIN.map(function (name) {
				return row.CampaignName.indexOf(name) < 0;
			}).reduce( _.and2 , true);			
	})
    .map( _.property( 'CampaignId' ) )
    ;
    var numParts = computeNumParts( allCampaignIds.length );
    var currentPart = ( new Date().getHours() ) % numParts;
   
    var currentCampaignIds = allCampaignIds
        .filter( _.property( _.hash, _.modulo( numParts ), _.equals( currentPart ) ) )
    ;
    return [ currentCampaignIds, currentPart, numParts ];
}

function main(){
	
	try{		
		BIGQUERY.createDataset();
		
		var accountIdToEmailMap = GOOGLE_SHEETS.getMapOfLists( CONSTANTS.ID_COLUMN, CONSTANTS.EMAIL_COLUMN );
		var accountIds = Object.keys( accountIdToEmailMap ).filter( function( accountId ){
			var res = typeof accountId == 'string' && accountId.match( /^\d\d\d-\d\d\d-\d\d\d\d$/ );
			return res;
		});
		accountIds = _.splitArray( accountIds, CONSTANTS.ACCOUNTS_LIMIT )[ SCRIPT_INSTANCE - 1 ];
		if( ! accountIds ){
			Logger.log( 'No accounts configured for this script instance. Terminate. ' );
			return;
		}

		CONFIG.DATABASE_FIELDS.old_cpc = 'STRING';
		CONFIG.DATABASE_FIELDS.account_name = 'STRING';
		CONFIG.DATABASE_FIELDS.account_id = 'STRING';
		BIGQUERY.createTable( CHANGES_TABLE_NAME , CONFIG.DATABASE_FIELDS );
		delete CONFIG.DATABASE_FIELDS.old_cpc ;
		delete CONFIG.DATABASE_FIELDS.account_name ;
		delete CONFIG.DATABASE_FIELDS.account_id ;
		
		if( typeof (MccApp) != 'undefined' ){
			MccApp
			.accounts()
			.withIds( accountIds )
			.withLimit( CONSTANTS.ACCOUNTS_LIMIT )
			.executeInParallel( 'processAccount', 'finalProcessing' );
       }else {         
			var result = processAccount();
				finalProcessing( [ {
					getReturnValue : function(){ return result } , 
					getCustomerId : function(){ return AdWordsApp.currentAccount().getCustomerId() } 
				} ] );         
       } 
	} catch ( error ){		
		var mccName = AdWordsApp.currentAccount().getName();
		var subject = 'Error in ' + CONSTANTS.SCRIPT_NAME + '' + SCRIPT_INSTANCE + ' ' + mccName;
		var message = error + '\n' + error.stack;
		Logger.log(  subject + ' -> ' + message );
		MAIL_APP.sendEmail( DEVELOPER_EMAIL, subject, message );
		throw error;
	}
}

function key1( key_ ){
	return function( row ){
		return key_
			.map( _.property( row ) )
			.join( CONSTANTS.DELIMITER )
		;
	};
}

function processAccount(){
	try{
		var account = AdWordsApp.currentAccount();
		[ currentCampaignIds, currentPart, numParts ] = computeCurrentCampaignIds();
        Logger.log(
            'process ' + account.getName()
            + ': ' + currentCampaignIds.length + ' campaigns '
            +  ', current part: ' + currentPart    +  ' out of ' + numParts
        );
        if( currentCampaignIds.length == 0 ){
            // the work is partitioned in parts.
            // the part which is due this hour is empty ( no campaigns )
            Logger.log( account.getName() + ': nothing to do -> quit' );
            return;
        }
		var accountKey = account.getName()
			.replace(/\W+/g, '_' )
			.replace( /\u00dc/g, 'Ue' )
			.replace( /\u00fc/g, 'ue' )
			.replace( /\u00c4/g, 'Ae' )
			.replace( /\u00e4/g, 'ae' )
			.replace( /\u00d6/g, 'Oe' )
			.replace( /\u00f6/g, 'oe' )
			.replace( /\u00df/g, 'ss' )
			+ '_'
			+ account.getCustomerId().replace( /\W+/g, '' ) + '_'
			+ currentPart;

		BIGQUERY.createTable( accountKey, CONFIG.DATABASE_FIELDS );
		
		// get data from bigQuery
		var oldData = BIGQUERY.queryTable( accountKey );

		var fields = Object.keys( CONFIG.REPORT.FIELDS );
		
		// cast to map of maps
	
		oldData = _.listToMap(
			oldData.map( function( row ){
				return _.listToMap(
					row,
					function( item, index ){ return fields[ index ] }, // key selector
					function( item, index ){ return item } // value selector
				);
			})
			, key1( CONFIG.REPORT.KEY )
		);
		
		// get data from AdWords as map of maps
		var newData = retrieveAdwordsReport( CONFIG.REPORT, currentPart , currentCampaignIds );
		
		// ---------- Handle old items ------------
		// accountName -> check -> campaign -> item -> { oldValue, newValue }
		var res = {
			accountName : account.getName(),
			accountId : account.getCustomerId(),
			check : {},
			checkNew : {},
			bigQueryJobIds : [],
		};
		var countOldData = 0;
		
		// changes table
		var changes1 = [];

		for ( var key in oldData ){
			countOldData++;
			
			var oldRow = oldData[ key ];
			var newRow = newData[ key ];		

			var compare = compareRows(
								oldRow,
								newRow,
								res.check
							);
			
			if (compare == true) {			
				newRow.old_cpc = oldRow.CpcBid;
				newRow.account_name = AdWordsApp.currentAccount().getName();
				newRow.account_id = AdWordsApp.currentAccount().getCustomerId();

				changes1.push(newRow);
			}
		}
		// --------------------------------------------------

		// ---------- Put new data into BigQuery ------------
		
		BIGQUERY.dropTable( accountKey );
		BIGQUERY.createTable( accountKey, CONFIG.DATABASE_FIELDS );		
		
		//		
		var changejobIds = [] ;
		
		if (changes1.length != 0) {
			changejobIds = BIGQUERY.loadIntoBigquery( _.listToMap( changes1 , function( x ){ return x.AdGroupId + '_' + x.Id ; } ), CHANGES_TABLE_NAME );	
		}
		
		var jobIds = BIGQUERY.loadIntoBigquery( newData, accountKey );
	
		// -------------------------------------------	
		
		var json = JSON.stringify( changejobIds.concat( jobIds ) , null, '\t' );		

		return json;
	} catch ( error ){
		var mccName = AdWordsApp.currentAccount().getName();
		var subject = 'Error in ' + CONSTANTS.SCRIPT_NAME + '' + SCRIPT_INSTANCE + ' ' + mccName;
		var message = error + '\n' + error.stack;
		Logger.log(  subject + ' -> ' + message );
		MAIL_APP.sendEmail( DEVELOPER_EMAIL, subject, message );
		throw error;
	}
}


function handleConflicts( check, campaignName, key, oldValue, newValue, target ){
	
	if( ! target[ check ] ){
		target[ check ] = { 
			campaign : {},
			otherCampaigns : {},
			countCampaigns : 0,
			countOtherCampaigns : 0,
			countOtherItems : 0,
		};
	}
	
	if( ! target[ check ].campaign[ campaignName ] ){
		// new campaign or out of limit campaign
		if( target[ check ].countCampaigns < MAX_SHOW_CAMPAIGNS_PER_CHECK ){
			// campaign-limit not reached yet
			target[ check ].countCampaigns++;
			target[ check ].campaign[ campaignName ] = { item : {}, countItems : 0, countOtherItems : 0 };
			
			// just assume here that MAX_SHOW_ITEMS_PER_CAMPAIGN >= 1
			target[ check ].campaign[ campaignName ].countItems++;
			target[ check ].campaign[ campaignName ].item[ key ] = { oldValue : oldValue, newValue : newValue };
		}else{
			// campaign-limit reached
			target[ check ].countOtherItems++;
			if( ! target[ check ].otherCampaigns[ campaignName ] ){
				target[ check ].otherCampaigns[ campaignName ] = 1;
				target[ check ].countOtherCampaigns++;
			}
		}
	} else {
		// existing campaign
		if( target[ check ].campaign[ campaignName ].countItems < MAX_SHOW_ITEMS_PER_CAMPAIGN ){
			// new item
			target[ check ].campaign[ campaignName ].countItems++;
			target[ check ].campaign[ campaignName ].item[ key ] = { oldValue : oldValue, newValue : newValue };
		}else{
			// out of limit item
			target[ check ].campaign[ campaignName ].countOtherItems++;
		}	
	}
}


function finalProcessing( results ){
	try{
		var emailMap = {};
		
		var accountIdToEmailMap = GOOGLE_SHEETS.getMapOfLists( CONSTANTS.ID_COLUMN, CONSTANTS.EMAIL_COLUMN );
		
		var jobIds = [];
		
		for ( var i = 0; i < results.length; i++ ) {
			if( typeof results[i].getReturnValue() == 'undefined' || results[i].getReturnValue() == 'undefined' ){
				// yes, adwords scripts really returns a string 'undefined'
				
				// this happens if there are no campaigns scheduled for this hour
				// in this case proceedAccount() just returns ( return; )
				continue;
			}
			
			var resultX = JSON.parse( results[i].getReturnValue() );
			
			if( null == resultX ){
				// seems like this is possible if a thread had an error
				continue;
			}
			
			resultX.forEach( function( jobId ){ jobIds.push( jobId ); } );
			
			// --------------- is result empty? -------------------------
			var count = 0;
			for( x in resultX.check ){ 
				count++;
			}
			for( x in resultX.checkNew ){ 
				count++;
			}		
			if( count == 0 ){
				_.log('no changes found for account : ' + results[i].getCustomerId() );
				continue;
			}
		}		

		var now = new Date( Utilities.formatDate( new Date(), TIME_ZONE , 'MMM dd,yyyy HH:mm:ss' ) );
		if( now.getHours() == EMAIL_SENDING_HOUR ){
			
			BIGQUERY.checkJobs( jobIds );
            var queryRequest = BigQuery.newQueryRequest();
			queryRequest.useLegacySql = false ;            
			queryRequest.query = 'select account_name, account_id, campaign_name, ad_group_name, criteria, old_cpc, cpc_bid  from `'+ PROJECT_ID + '.' + DATASET_ID +'.' + CHANGES_TABLE_NAME + '` WHERE _PARTITIONTIME = _PARTITIONTIME;';
            
            var query = BigQuery.Jobs.query(queryRequest, PROJECT_ID);
			Utilities.sleep(180);

			var attachment = [];
			var account_ids = []; 
			var resu = GOOGLE_SHEETS.getMapOfLists( 1, 2, SPREADSHEET_URL , SHEET_NAME );	

			var emails = [] ;

			for (var res in resu){
				resu[res].forEach(function (re) {
					if (emails.inhdexOf(re) < 0) {
						emails.push(re) ;
					}
				});
			}

			var email_accounts = {} ;
			for (var account in resu) {
				emails.forEach(function ( email ) {					
					if (resu[account].indexOf(email) >= 0){
						if  (email_accounts[email] == undefined ) {
							email_accounts[email] = [ account ] ; 
						}else{
							email_accounts[email].push(account);
						}
					}
				});
			}

			if (query.jobComplete) {
				if (typeof(query.rows) != 'undefined') {
					for (var i = 0; i < query.rows.length; i++) {
						var row = query.rows[i];
						var values = [];
						for (var j = 0; j < row.f.length; j++) {
							values.push(row.f[j].v);
						}
						if ( account_ids.indexOf(values[1]) < 0 ) {
							account_ids.push(values[1]);
						}						
						attachment[i]  = values.slice();
					}

					var bid_changes = false ;
					attachment_accounts = {} ;			
					var send_attach = 'sep=,\n"account_name","account_id","compain_name","Adroup_name","Keyword","OldBid","NewBid"\n';
					account_ids.forEach(function (id) {
						for (var index = 0; index < attachment.length; index++) {
							if( id == attachment[index][1]){
								bid_changes = true ;
								send_attach = send_attach + '"' + attachment[index].map( function( x ){  return x.replace( /"/g, '""' ) } ).join( '","' ) + '"' + '\n';
							}	
						}
						if (bid_changes) {
							attachment_accounts[id] = send_attach ;
						}
						bid_changes = false ;
					});

					for (var email_account in email_accounts) {
						var message = "" ; 
						var blob = [] ;
						var allAttachments = "" ;
						email_accounts[email_account].forEach(function (account) {
							
							if (Object.keys(attachment_accounts).indexOf(account) >= 0){
								allAttachments =  allAttachments +  attachment_accounts[account] ;
							} else {
								message = message + " - no changes for the account number " + account + "\n" ;								
							}
						});

						blob.push( Utilities.newBlob ( allAttachments , 'text/csv', 'report.csv' ) ) ;															

						MailApp.sendEmail( email_account , 'Bid Reporting' ,
												message, 
											{
												name: 'the Bid report',
												attachments: blob
											});
					}					
				    BIGQUERY.dropTable( CHANGES_TABLE_NAME );
				}else{					
					emails.forEach(function (email) {
						MailApp.sendEmail( email , 'Bid changes Reporting',
										'no bid_changes for today.', 
									{
										name: 'the Bid report'
									});
					});										
				}
			}		
		}
		BIGQUERY.checkJobs( jobIds );
	} catch ( error ){
		var mccName = AdWordsApp.currentAccount().getName();
		var subject = 'Error in ' + CONSTANTS.SCRIPT_NAME + '' + SCRIPT_INSTANCE + ' ' + mccName;
		var message = error + '\n' + error.stack;
		Logger.log(  subject + ' -> ' + message );
		MAIL_APP.sendEmail( DEVELOPER_EMAIL, subject, message );
		throw error;
	}
}

function compareRows( oldOrExpectedRow, newRow, target ){
	if( !newRow ){
		/*
		handleConflicts(
			'MISSING_ITEM',
			oldOrExpectedRow[ 'CampaignName' ],
			KEY.map( _.property( oldOrExpectedRow )).join( SPLITTER ),
			'was present',
			'is missing',
			target
		);
		*/
		// don't check missing items
		return;
	}
	for( var index in CONFIG.CHECKS ){
		var check = CONFIG.CHECKS[ index ];
		
		var oldOrExpectedValue = oldOrExpectedRow[ check ];
		var newValue = newRow[ check ];
		
		var labels = 'Labels';
		
		if( check == labels ){
			var oldContains =
				IGNORED_LABELS
				.map( _.isContainedIn2( oldOrExpectedValue ) )
				.reduce( _.or2, false );
			var newContains =
				IGNORED_LABELS
				.map( _.isContainedIn2( newValue ) )
				.reduce( _.or2, false );
			
			if( _.xor( oldContains, newContains ) ){
				continue;
			}
		}
		
		if( oldOrExpectedValue != newValue ){
			handleConflicts(
				check,
				newRow[ 'CampaignName' ],
				CONFIG.REPORT.KEY.map( function ( keyElement ) { return newRow[ keyElement ]; }).join( SPLITTER ),
				//newRow[ 'AdGroupName' ] + SPLITTER + newRow[ 'Criteria' ],
 				oldOrExpectedValue,
				newValue,
				target
			);
			return true ;
		}
	}
}

function retrieveAdwordsReport( report, currentPart , currentCampaignIds ){
	if( typeof currentPart == 'undefined' ){
		throw new Error( 'currentPart is undefined' );
	}
	var query = 'SELECT ' + Object.keys( report.FIELDS ).join(',')
		+ ' FROM ' + report.NAME
		+ ' WHERE CampaignId in [' + currentCampaignIds + '] '
	;
	Logger.log( query );

	var rows = _.iteratorToList( AdWordsApp.report( query ).rows() );
	
	rows = rows.map( function( row ){
		// Important: to ensure correct order of attributes we need to create a new row object!!!
		// The object returned from AdWords contains at least one more field which would break everything.
		// Therefore we need a clean copy of each row!
		var newRow = {};
		for( fieldName in report.FIELDS ){
			newRow[ fieldName ] = row[ fieldName ];
		}
		return newRow;
	});
	var map = _.listToMap( rows, key1( report.KEY ) ); // KEY = AdGroupId_KeywordId
	return map;
}