var config = {
	"DESCRIPTION" : "" ,
	"INSTRUCTIONS": "",
	"VERSION" : 1,
	"VERSION_TAG" : "stable",
	"settings" : {
		"SCRIPT_INSTANCE" : 1,
		"DEVELOPER_EMAIL" : "a.tissen@pa.ag",
		"MAX_SHOW_CAMPAIGNS_PER_CHECK" : 6,
		"MAX_SHOW_ADGROUPS_PER_CAMPAIGN" : 3,
		"SPREADSHEET_URL" : "https://docs.google.com/spreadsheets/d/1qdFQKZorQaQyNI5vo91DQyw-oMr_rNxqhX1JgUIvX3I/edit#gid=408565189",
		"SHEET_NAME" : "settings",
		"PROJECT_ID" : "biddy-io",
		"DATASET_ID" : "adgroup_settings_peak_ace",
		"TRUNCATE_EXISTING_DATASET" : false,
		"PARTITION_EXPIRATION" : 30,
		"MAILGUN" : {
			"SEND_EMAILS_THROUGH_MAILGUN" : true,
			"URL" : "https://api.mailgun.net/v3/mg.peakace.de/messages",
			"FROM" : "adwords_scripts@mg.peakace.de",
			"AUTHORISATION" : "Basic YXBpOmtleS1hYWZmMmI2MGU4MmNkMWYwOTIwYWYxNDUzZWM0MDcyOA=="
		},
		"NUM_PARTS" : 8,
		"CHECK_NEW_ADGROUPS" : true,
		"CHECK_CPC_BID" : false,
		"CHECK_CPM_BID" : false,
		"CHECK_CPV_BID" : false,
		"CHECK_TARGET_CPA" : false,
		"CHECK_MOBILE_BID_MODIFIER" : false,
		"CHECK_STATUS" : true,
		"CHECK_BIDDING_STRATEGY_NAME" : true
	}
};

var settings = ( typeof this[ 'dataJSON' ] != 'undefined' ? JSON.parse( dataJSON.settings ) : config.settings );
for( key in settings ){
    this[ key ] = settings[ key ];
}

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
	function isNumeric( n ){
		return !isNaN( parseFloat( n ) ) && isFinite( n );
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
		assert			: assert,
		toMatrix		: toMatrix,
		splitArray		: splitArray,
	};
})();

var CONFIG = ( function(){
	var res = {
		// Lists of reports and fields to retrieve from AdWords.
		REPORT: {
			NAME: 'ADGROUP_PERFORMANCE_REPORT',
			//CampaignStatus IN ["ENABLED", "PAUSED"] AND AdGroupStatus IN ["ENABLED", "PAUSED"] AND 
			KEY : [ 'AdGroupId' ],
			FIELDS: {
				'CampaignId' 				: 'INTEGER',
				'CampaignName' 				: 'STRING',
				'AdGroupId' 				: 'INTEGER',
				'AdGroupName' 				: 'STRING',
				'AdGroupStatus' 			: 'STRING',
				'BiddingStrategyName' 		: 'STRING',
				'CpcBid' 					: 'STRING',
				'CpmBid' 					: 'STRING',
				'TargetCpa' 				: 'STRING',
				'CpvBid' 					: 'STRING',
				'AdGroupMobileBidModifier' 	: 'STRING'
			}
		},
		// When adding new checks the function doExecuteCheck should be updated!
		CHECKS : [
			'AdGroupStatus',
			'BiddingStrategyName',
			'CpcBid',
			'CpmBid',
			'TargetCpa',
			'CpvBid',
			'AdGroupMobileBidModifier'
		],

		EXPECTED_CHECKS_FOR_NEW_ADGROUPS : {
			'AdGroupStatus' : 'enabled',
			'BiddingStrategyName' : '--',
			'CpcBid' : 2.50,
			'CpmBid' : 0.25,
			'TargetCpa' : '--',
			'CpvBid' : '--',
			'AdGroupMobileBidModifier' : '--'
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
		if ( tableExists( tableName ) ){
			BigQuery.Tables.remove( PROJECT_ID, DATASET_ID, tableName );
			Logger.log( 'Table %s dropped.', tableName );
		}
	}
	
	function createTable( tableName, fields ){
		if( tableExists( tableName ) ){
			return;
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
		var resultsPerPage = 150 * NUM_PARTS;
		var finished = false;
		
		while( ! finished ){
			var tables = null;
			try{
				// Get a list of a part of all tables in the dataset.
				tables = BigQuery.Tables.list(
					PROJECT_ID,
					DATASET_ID,
					{
						pageToken  : pageToken,
						maxResults : resultsPerPage
					}
				);
			}catch( error ){
				if( ( error + '' ).indexOf( 'Not found: Token' ) >= 0 ){
					// Strnage bug. Sometimes pageToken is set to a table name.
					// I suspect the bigquery-api does this.
					// Let's try again - and risk endless recursion..
					return tableExists( tableId );
				}
			}
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
		if( typeof value == 'string' ){
			// remove thousand separator
			var num = value.split( ',' ).join( '' );
			if( _.isNumeric( num ) ){
				return num;
			}
			if( value.indexOf( '%' ) == value.length - 1 ){
				return value.substring( 0, value.length - 1 ) / 100;
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
			}
		}
		Logger.log( JSON.stringify( states, null, '\t' ) );
		
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
	SCRIPT_NAME : 'Adgroup_Settings_Checker',
	EMPTY : '',
	ID_COLUMN : 1, // 0-based
	EMAIL_COLUMN : 3, // 0-based
	ACCOUNTS_LIMIT : 50,
	BIGQUERY_CHUNK_SIZE : 30000,
};

// -------------------------------------


// latinize tool
(function(root, factory) {
  if (typeof define === 'function' && define.amd) {
    // AMD. Register as an anonymous module.
    define(factory);
  } else if (typeof exports === 'object') {
    // CommonJS
    module.exports = factory();
  } else {
    // running in browser
    root.latinize = factory();
  }
})(this, function() {

  function latinize(str) {
    if (typeof str === 'string') {
      return str.replace(/[^A-Za-z0-9]/g, function(x) {
        return latinize.characters[x] || x;
      });
    } else {
      return str;
    }
  }

  latinize.characters = {
    	'Á': 'A',    'Ă': 'A',    'Ắ': 'A',    'Ặ': 'A',    'Ằ': 'A',    'Ẳ': 'A',    'Ẵ': 'A',    'Ǎ': 'A',    'Â': 'A',    'Ấ': 'A',    'Ậ': 'A',    'Ầ': 'A',    'Ẩ': 'A',    'Ẫ': 'A',    'Ä': 'A',    'Ǟ': 'A',    'Ȧ': 'A',    'Ǡ': 'A',    'Ạ': 'A',    'Ȁ': 'A',    'À': 'A',    'Ả': 'A',    'Ȃ': 'A',    'Ā': 'A',    'Ą': 'A',    'Å': 'A',    'Ǻ': 'A',    'Ḁ': 'A',    'Ⱥ': 'A',    'Ã': 'A',    'Ꜳ': 'AA',    'Æ': 'AE',    'Ǽ': 'AE',    'Ǣ': 'AE',    'Ꜵ': 'AO',    'Ꜷ': 'AU',    'Ꜹ': 'AV',    'Ꜻ': 'AV',    'Ꜽ': 'AY',    'Ḃ': 'B',    'Ḅ': 'B',    'Ɓ': 'B',    'Ḇ': 'B',    'Ƀ': 'B',    'Ƃ': 'B',    'Ć': 'C',    'Č': 'C',    'Ç': 'C',    'Ḉ': 'C',    'Ĉ': 'C',    'Ċ': 'C',    'Ƈ': 'C',    'Ȼ': 'C',    'Ď': 'D',    'Ḑ': 'D',    'Ḓ': 'D',    'Ḋ': 'D',    'Ḍ': 'D',    'Ɗ': 'D',    'Ḏ': 'D',    'ǲ': 'D',    'ǅ': 'D',    'Đ': 'D',    'Ƌ': 'D',    'Ǳ': 'DZ',    'Ǆ': 'DZ',    'É': 'E',    'Ĕ': 'E',    'Ě': 'E',    'Ȩ': 'E',    'Ḝ': 'E',    'Ê': 'E',    'Ế': 'E',    'Ệ': 'E',    'Ề': 'E',    'Ể': 'E',    'Ễ': 'E',    'Ḙ': 'E',    'Ë': 'E',    'Ė': 'E',    'Ẹ': 'E',    'Ȅ': 'E',    'È': 'E',    'Ẻ': 'E',    'Ȇ': 'E',    'Ē': 'E',    'Ḗ': 'E',    'Ḕ': 'E',    'Ę': 'E',    'Ɇ': 'E',    'Ẽ': 'E',    'Ḛ': 'E',    'Ꝫ': 'ET',    'Ḟ': 'F',    'Ƒ': 'F',    'Ǵ': 'G',    'Ğ': 'G',    'Ǧ': 'G',    'Ģ': 'G',    'Ĝ': 'G',    'Ġ': 'G',    'Ɠ': 'G',    'Ḡ': 'G',    'Ǥ': 'G',    'Ḫ': 'H',    'Ȟ': 'H',    'Ḩ': 'H',    'Ĥ': 'H',    'Ⱨ': 'H',    'Ḧ': 'H',    'Ḣ': 'H',    'Ḥ': 'H',    'Ħ': 'H',    'Í': 'I',    'Ĭ': 'I',    'Ǐ': 'I',    'Î': 'I',    'Ï': 'I',    'Ḯ': 'I',    'İ': 'I',    'Ị': 'I',    'Ȉ': 'I',    'Ì': 'I',    'Ỉ': 'I',    'Ȋ': 'I',    'Ī': 'I',    'Į': 'I',    'Ɨ': 'I',    'Ĩ': 'I',    'Ḭ': 'I',    'Ꝺ': 'D',    'Ꝼ': 'F',    'Ᵹ': 'G',    'Ꞃ': 'R',    'Ꞅ': 'S',    'Ꞇ': 'T',    'Ꝭ': 'IS',    'Ĵ': 'J',    'Ɉ': 'J',    'Ḱ': 'K',    'Ǩ': 'K',    'Ķ': 'K',    'Ⱪ': 'K',    'Ꝃ': 'K',    'Ḳ': 'K',    'Ƙ': 'K',    'Ḵ': 'K',    'Ꝁ': 'K',    'Ꝅ': 'K',    'Ĺ': 'L',    'Ƚ': 'L',    'Ľ': 'L',    'Ļ': 'L',    'Ḽ': 'L',    'Ḷ': 'L',    'Ḹ': 'L',    'Ⱡ': 'L',    'Ꝉ': 'L',    'Ḻ': 'L',    'Ŀ': 'L',    'Ɫ': 'L',    'ǈ': 'L',    'Ł': 'L',    'Ǉ': 'LJ',    'Ḿ': 'M',    'Ṁ': 'M',    'Ṃ': 'M',    'Ɱ': 'M',    'Ń': 'N',    'Ň': 'N',    'Ņ': 'N',    'Ṋ': 'N',    'Ṅ': 'N',    'Ṇ': 'N',    'Ǹ': 'N',    'Ɲ': 'N',    'Ṉ': 'N',    'Ƞ': 'N',    'ǋ': 'N',    'Ñ': 'N',    'Ǌ': 'NJ',    'Ó': 'O',    'Ŏ': 'O',    'Ǒ': 'O',    'Ô': 'O',    'Ố': 'O',    'Ộ': 'O',    'Ồ': 'O',    'Ổ': 'O',    'Ỗ': 'O',    'Ö': 'O',    'Ȫ': 'O',    'Ȯ': 'O',    'Ȱ': 'O',    'Ọ': 'O',    'Ő': 'O',    'Ȍ': 'O',    'Ò': 'O',    'Ỏ': 'O',    'Ơ': 'O',    'Ớ': 'O',    'Ợ': 'O',    'Ờ': 'O',    'Ở': 'O',    'Ỡ': 'O',    'Ȏ': 'O',    'Ꝋ': 'O',    'Ꝍ': 'O',    'Ō': 'O',    'Ṓ': 'O',    'Ṑ': 'O',    'Ɵ': 'O',    'Ǫ': 'O',    'Ǭ': 'O',    'Ø': 'O',    'Ǿ': 'O',    'Õ': 'O',    'Ṍ': 'O',    'Ṏ': 'O',    'Ȭ': 'O',    'Ƣ': 'OI',    'Ꝏ': 'OO',    'Ɛ': 'E',    'Ɔ': 'O',    'Ȣ': 'OU',    'Ṕ': 'P',    'Ṗ': 'P',    'Ꝓ': 'P',    'Ƥ': 'P',    'Ꝕ': 'P',    'Ᵽ': 'P',    'Ꝑ': 'P',    'Ꝙ': 'Q',    'Ꝗ': 'Q',    'Ŕ': 'R',    'Ř': 'R',    'Ŗ': 'R',    'Ṙ': 'R',    'Ṛ': 'R',    'Ṝ': 'R',    'Ȑ': 'R',    'Ȓ': 'R',    'Ṟ': 'R',    'Ɍ': 'R',    'Ɽ': 'R',    'Ꜿ': 'C',    'Ǝ': 'E',    'Ś': 'S',    'Ṥ': 'S',    'Š': 'S',    'Ṧ': 'S',    'Ş': 'S',    'Ŝ': 'S',    'Ș': 'S',    'Ṡ': 'S',    'Ṣ': 'S',    'Ṩ': 'S',    'ß': 'ss',    'Ť': 'T',    'Ţ': 'T',    'Ṱ': 'T',    'Ț': 'T',    'Ⱦ': 'T',    'Ṫ': 'T',    'Ṭ': 'T',    'Ƭ': 'T',    'Ṯ': 'T',    'Ʈ': 'T',    'Ŧ': 'T',    'Ɐ': 'A',    'Ꞁ': 'L',    'Ɯ': 'M',    'Ʌ': 'V',    'Ꜩ': 'TZ',    'Ú': 'U',    'Ŭ': 'U',    'Ǔ': 'U',    'Û': 'U',    'Ṷ': 'U',    'Ü': 'U',    'Ǘ': 'U',    'Ǚ': 'U',    'Ǜ': 'U',    'Ǖ': 'U',    'Ṳ': 'U',    'Ụ': 'U',    'Ű': 'U',    'Ȕ': 'U',    'Ù': 'U',    'Ủ': 'U',    'Ư': 'U',    'Ứ': 'U',    'Ự': 'U',    'Ừ': 'U',    'Ử': 'U',    'Ữ': 'U',    'Ȗ': 'U',    'Ū': 'U',    'Ṻ': 'U',    'Ų': 'U',    'Ů': 'U',    'Ũ': 'U',    'Ṹ': 'U',    'Ṵ': 'U',    'Ꝟ': 'V',    'Ṿ': 'V',    'Ʋ': 'V',    'Ṽ': 'V',    'Ꝡ': 'VY',    'Ẃ': 'W',    'Ŵ': 'W',    'Ẅ': 'W',    'Ẇ': 'W',    'Ẉ': 'W',    'Ẁ': 'W',    'Ⱳ': 'W',    'Ẍ': 'X',    'Ẋ': 'X',    'Ý': 'Y',    'Ŷ': 'Y',    'Ÿ': 'Y',    'Ẏ': 'Y',    'Ỵ': 'Y',    'Ỳ': 'Y',    'Ƴ': 'Y',    'Ỷ': 'Y',    'Ỿ': 'Y',    'Ȳ': 'Y',    'Ɏ': 'Y',    'Ỹ': 'Y',    'Ź': 'Z',    'Ž': 'Z',    'Ẑ': 'Z',    'Ⱬ': 'Z',    'Ż': 'Z',    'Ẓ': 'Z',    'Ȥ': 'Z',    'Ẕ': 'Z',    'Ƶ': 'Z',    'Ĳ': 'IJ',    'Œ': 'OE',    'ᴀ': 'A',    'ᴁ': 'AE',    'ʙ': 'B',    'ᴃ': 'B',    'ᴄ': 'C',    'ᴅ': 'D',    'ᴇ': 'E',    'ꜰ': 'F',    'ɢ': 'G',    'ʛ': 'G',    'ʜ': 'H',    'ɪ': 'I',    'ʁ': 'R',    'ᴊ': 'J',    'ᴋ': 'K',    'ʟ': 'L',    'ᴌ': 'L',    'ᴍ': 'M',    'ɴ': 'N',    'ᴏ': 'O',    'ɶ': 'OE',    'ᴐ': 'O',    'ᴕ': 'OU',    'ᴘ': 'P',    'ʀ': 'R',    'ᴎ': 'N',    'ᴙ': 'R',    'ꜱ': 'S',    'ᴛ': 'T',    'ⱻ': 'E',    'ᴚ': 'R',    'ᴜ': 'U',    'ᴠ': 'V',    'ᴡ': 'W',    'ʏ': 'Y',    'ᴢ': 'Z',    'á': 'a',    'ă': 'a',    'ắ': 'a',    'ặ': 'a',    'ằ': 'a',    'ẳ': 'a',    'ẵ': 'a',    'ǎ': 'a',    'â': 'a',    'ấ': 'a',    'ậ': 'a',    'ầ': 'a',    'ẩ': 'a',    'ẫ': 'a',    'ä': 'a',    'ǟ': 'a',    'ȧ': 'a',    'ǡ': 'a',    'ạ': 'a',    'ȁ': 'a',    'à': 'a',    'ả': 'a',    'ȃ': 'a',    'ā': 'a',    'ą': 'a',    'ᶏ': 'a',    'ẚ': 'a',    'å': 'a',    'ǻ': 'a',    'ḁ': 'a',    'ⱥ': 'a',    'ã': 'a',    'ꜳ': 'aa',    'æ': 'ae',    'ǽ': 'ae',    'ǣ': 'ae',    'ꜵ': 'ao',    'ꜷ': 'au',    'ꜹ': 'av',    'ꜻ': 'av',    'ꜽ': 'ay',    'ḃ': 'b',    'ḅ': 'b',    'ɓ': 'b',    'ḇ': 'b',    'ᵬ': 'b',    'ᶀ': 'b',    'ƀ': 'b',    'ƃ': 'b',    'ɵ': 'o',    'ć': 'c',    'č': 'c',    'ç': 'c',    'ḉ': 'c',    'ĉ': 'c',    'ɕ': 'c',    'ċ': 'c',    'ƈ': 'c',    'ȼ': 'c',    'ď': 'd',    'ḑ': 'd',    'ḓ': 'd',    'ȡ': 'd',    'ḋ': 'd',    'ḍ': 'd',    'ɗ': 'd',    'ᶑ': 'd',    'ḏ': 'd',    'ᵭ': 'd',    'ᶁ': 'd',    'đ': 'd',    'ɖ': 'd',    'ƌ': 'd',    'ı': 'i',    'ȷ': 'j',    'ɟ': 'j',    'ʄ': 'j',    'ǳ': 'dz',    'ǆ': 'dz',    'é': 'e',    'ĕ': 'e',    'ě': 'e',    'ȩ': 'e',    'ḝ': 'e',    'ê': 'e',    'ế': 'e',    'ệ': 'e',    'ề': 'e',    'ể': 'e',    'ễ': 'e',    'ḙ': 'e',    'ë': 'e',    'ė': 'e',    'ẹ': 'e',    'ȅ': 'e',    'è': 'e',    'ẻ': 'e',    'ȇ': 'e',    'ē': 'e',    'ḗ': 'e',    'ḕ': 'e',    'ⱸ': 'e',    'ę': 'e',    'ᶒ': 'e',    'ɇ': 'e',    'ẽ': 'e',    'ḛ': 'e',    'ꝫ': 'et',    'ḟ': 'f',    'ƒ': 'f',    'ᵮ': 'f',    'ᶂ': 'f',    'ǵ': 'g',    'ğ': 'g',    'ǧ': 'g',    'ģ': 'g',    'ĝ': 'g',    'ġ': 'g',    'ɠ': 'g',    'ḡ': 'g',    'ᶃ': 'g',    'ǥ': 'g',    'ḫ': 'h',    'ȟ': 'h',    'ḩ': 'h',    'ĥ': 'h',    'ⱨ': 'h',    'ḧ': 'h',    'ḣ': 'h',    'ḥ': 'h',    'ɦ': 'h',    'ẖ': 'h',    'ħ': 'h',    'ƕ': 'hv',    'í': 'i',    'ĭ': 'i',    'ǐ': 'i',    'î': 'i',    'ï': 'i',    'ḯ': 'i',    'ị': 'i',    'ȉ': 'i',    'ì': 'i',    'ỉ': 'i',    'ȋ': 'i',    'ī': 'i',    'į': 'i',    'ᶖ': 'i',    'ɨ': 'i',    'ĩ': 'i',    'ḭ': 'i',    'ꝺ': 'd',    'ꝼ': 'f',    'ᵹ': 'g',    'ꞃ': 'r',    'ꞅ': 's',    'ꞇ': 't',    'ꝭ': 'is',    'ǰ': 'j',    'ĵ': 'j',    'ʝ': 'j',    'ɉ': 'j',    'ḱ': 'k',    'ǩ': 'k',    'ķ': 'k',    'ⱪ': 'k',    'ꝃ': 'k',    'ḳ': 'k',    'ƙ': 'k',    'ḵ': 'k',    'ᶄ': 'k',    'ꝁ': 'k',    'ꝅ': 'k',    'ĺ': 'l',    'ƚ': 'l',    'ɬ': 'l',    'ľ': 'l',    'ļ': 'l',    'ḽ': 'l',    'ȴ': 'l',    'ḷ': 'l',    'ḹ': 'l',    'ⱡ': 'l',    'ꝉ': 'l',    'ḻ': 'l',    'ŀ': 'l',    'ɫ': 'l',    'ᶅ': 'l',    'ɭ': 'l',    'ł': 'l',    'ǉ': 'lj',    'ſ': 's',    'ẜ': 's',    'ẛ': 's',    'ẝ': 's',    'ḿ': 'm',    'ṁ': 'm',    'ṃ': 'm',    'ɱ': 'm',    'ᵯ': 'm',    'ᶆ': 'm',    'ń': 'n',    'ň': 'n',    'ņ': 'n',    'ṋ': 'n',    'ȵ': 'n',    'ṅ': 'n',    'ṇ': 'n',    'ǹ': 'n',    'ɲ': 'n',    'ṉ': 'n',    'ƞ': 'n',    'ᵰ': 'n',    'ᶇ': 'n',    'ɳ': 'n',    'ñ': 'n',    'ǌ': 'nj',    'ó': 'o',    'ŏ': 'o',    'ǒ': 'o',    'ô': 'o',    'ố': 'o',    'ộ': 'o',    'ồ': 'o',    'ổ': 'o',    'ỗ': 'o',    'ö': 'o',    'ȫ': 'o',    'ȯ': 'o',    'ȱ': 'o',    'ọ': 'o',    'ő': 'o',    'ȍ': 'o',    'ò': 'o',    'ỏ': 'o',    'ơ': 'o',    'ớ': 'o',    'ợ': 'o',    'ờ': 'o',    'ở': 'o',    'ỡ': 'o',    'ȏ': 'o',    'ꝋ': 'o',    'ꝍ': 'o',    'ⱺ': 'o',    'ō': 'o',    'ṓ': 'o',    'ṑ': 'o',    'ǫ': 'o',    'ǭ': 'o',    'ø': 'o',    'ǿ': 'o',    'õ': 'o',    'ṍ': 'o',    'ṏ': 'o',    'ȭ': 'o',    'ƣ': 'oi',    'ꝏ': 'oo',    'ɛ': 'e',    'ᶓ': 'e',    'ɔ': 'o',    'ᶗ': 'o',    'ȣ': 'ou',    'ṕ': 'p',    'ṗ': 'p',    'ꝓ': 'p',    'ƥ': 'p',    'ᵱ': 'p',    'ᶈ': 'p',    'ꝕ': 'p',    'ᵽ': 'p',    'ꝑ': 'p',    'ꝙ': 'q',    'ʠ': 'q',    'ɋ': 'q',    'ꝗ': 'q',    'ŕ': 'r',    'ř': 'r',    'ŗ': 'r',    'ṙ': 'r',    'ṛ': 'r',    'ṝ': 'r',    'ȑ': 'r',    'ɾ': 'r',    'ᵳ': 'r',    'ȓ': 'r',    'ṟ': 'r',    'ɼ': 'r',    'ᵲ': 'r',    'ᶉ': 'r',    'ɍ': 'r',    'ɽ': 'r',    'ↄ': 'c',    'ꜿ': 'c',    'ɘ': 'e',    'ɿ': 'r',    'ś': 's',    'ṥ': 's',    'š': 's',    'ṧ': 's',    'ş': 's',    'ŝ': 's',    'ș': 's',    'ṡ': 's',    'ṣ': 's',    'ṩ': 's',    'ʂ': 's',    'ᵴ': 's',    'ᶊ': 's',    'ȿ': 's',    'ɡ': 'g',    'ᴑ': 'o',    'ᴓ': 'o',    'ᴝ': 'u',    'ť': 't',    'ţ': 't',    'ṱ': 't',    'ț': 't',    'ȶ': 't',    'ẗ': 't',    'ⱦ': 't',    'ṫ': 't',    'ṭ': 't',    'ƭ': 't',    'ṯ': 't',    'ᵵ': 't',    'ƫ': 't',    'ʈ': 't',    'ŧ': 't',    'ᵺ': 'th',    'ɐ': 'a',    'ᴂ': 'ae',    'ǝ': 'e',    'ᵷ': 'g',    'ɥ': 'h',    'ʮ': 'h',    'ʯ': 'h',    'ᴉ': 'i',    'ʞ': 'k',    'ꞁ': 'l',    'ɯ': 'm',    'ɰ': 'm',    'ᴔ': 'oe',    'ɹ': 'r',    'ɻ': 'r',    'ɺ': 'r',    'ⱹ': 'r',    'ʇ': 't',    'ʌ': 'v',    'ʍ': 'w',    'ʎ': 'y',    'ꜩ': 'tz',    'ú': 'u',    'ŭ': 'u',    'ǔ': 'u',    'û': 'u',    'ṷ': 'u',    'ü': 'u',    'ǘ': 'u',    'ǚ': 'u',    'ǜ': 'u',    'ǖ': 'u',    'ṳ': 'u',    'ụ': 'u',    'ű': 'u',    'ȕ': 'u',    'ù': 'u',    'ủ': 'u',    'ư': 'u',    'ứ': 'u',    'ự': 'u',    'ừ': 'u',    'ử': 'u',    'ữ': 'u',    'ȗ': 'u',    'ū': 'u',    'ṻ': 'u',    'ų': 'u',    'ᶙ': 'u',    'ů': 'u',    'ũ': 'u',    'ṹ': 'u',    'ṵ': 'u',    'ᵫ': 'ue',    'ꝸ': 'um',    'ⱴ': 'v',    'ꝟ': 'v',    'ṿ': 'v',    'ʋ': 'v',    'ᶌ': 'v',    'ⱱ': 'v',    'ṽ': 'v',    'ꝡ': 'vy',    'ẃ': 'w',    'ŵ': 'w',    'ẅ': 'w',    'ẇ': 'w',    'ẉ': 'w',    'ẁ': 'w',    'ⱳ': 'w',    'ẘ': 'w',    'ẍ': 'x',    'ẋ': 'x',    'ᶍ': 'x',    'ý': 'y',    'ŷ': 'y',    'ÿ': 'y',    'ẏ': 'y',    'ỵ': 'y',    'ỳ': 'y',    'ƴ': 'y',    'ỷ': 'y',    'ỿ': 'y',    'ȳ': 'y',    'ẙ': 'y',    'ɏ': 'y',    'ỹ': 'y',    'ź': 'z',    'ž': 'z',    'ẑ': 'z',    'ʑ': 'z',    'ⱬ': 'z',    'ż': 'z',    'ẓ': 'z',    'ȥ': 'z',    'ẕ': 'z',    'ᵶ': 'z',    'ᶎ': 'z',    'ʐ': 'z',    'ƶ': 'z',    'ɀ': 'z',    'ﬀ': 'ff',    'ﬃ': 'ffi',    'ﬄ': 'ffl',    'ﬁ': 'fi',    'ﬂ': 'fl',    'ĳ': 'ij',    'œ': 'oe',    'ﬆ': 'st',    'ₐ': 'a',    'ₑ': 'e',    'ᵢ': 'i',    'ⱼ': 'j',    'ₒ': 'o',    'ᵣ': 'r',    'ᵤ': 'u',    'ᵥ': 'v',    'ₓ': 'x',    'Ё': 'YO',    'Й': 'I',    'Ц': 'TS',    'У': 'U',    'К': 'K',    'Е': 'E',    'Н': 'N',    'Г': 'G',    'Ш': 'SH',    'Щ': 'SCH',    'З': 'Z',    'Х': 'H',    'Ъ': "'",    'ё': 'yo',    'й': 'i',    'ц': 'ts',    'у': 'u',    'к': 'k',    'е': 'e',    'н': 'n',    'г': 'g',    'ш': 'sh',    'щ': 'sch',    'з': 'z',    'х': 'h',    'ъ': "'",    'Ф': 'F',    'Ы': 'I',    'В': 'V',    'А': 'a',    'П': 'P',    'Р': 'R',    'О': 'O',    'Л': 'L',    'Д': 'D',    'Ж': 'ZH',    'Э': 'E',    'ф': 'f',    'ы': 'i',    'в': 'v',    'а': 'a',    'п': 'p',    'р': 'r',    'о': 'o',    'л': 'l',    'д': 'd',    'ж': 'zh',    'э': 'e',    'Я': 'Ya',    'Ч': 'CH',    'С': 'S',    'М': 'M',    'И': 'I',    'Т': 'T',    'Ь': "'",    'Б': 'B',    'Ю': 'YU',    'я': 'ya',    'ч': 'ch',    'с': 's',    'м': 'm',    'и': 'i',    'т': 't',    'ь': "'",    'б': 'b',    'ю': 'yu'
  };

  return latinize;
});


function getCurrentPart(){
	var date = new Date();
	var hour = date.getHours();
	return hour % NUM_PARTS;
}

function computeCurrentCampaignIds( currentPart ){
    var query = 'SELECT CampaignId FROM CAMPAIGN_PERFORMANCE_REPORT WHERE CampaignStatus IN [ "ENABLED", "PAUSED" ]';
	
	var res = _.iteratorToList( AdWordsApp.report( query ).rows() )
		.map( _.property( 'CampaignId' ) )
		.filter( _.property( _.hash, _.modulo( NUM_PARTS ), _.equals( currentPart ) ) )
	;
	return res;
}

function main(){
	//Logger.log( 'Database fields: ' + JSON.stringify( CONFIG.DATABASE_FIELDS, null, '\t' ) );
	
	try{
		// Logger.log( 'db-fields: ' + JSON.stringify( CONFIG.DATABASE_FIELDS ) );
		var currentPart = getCurrentPart();
		
		Logger.log( 'current part: ' + currentPart );
		
		BIGQUERY.createDataset();
		
		var accountIdToEmailMap = GOOGLE_SHEETS.getMapOfLists( CONSTANTS.ID_COLUMN, CONSTANTS.EMAIL_COLUMN );
		var accountIds = Object.keys( accountIdToEmailMap ).filter( function( accountId ){ return accountId != '' } )
		;
		accountIds = _.splitArray( accountIds, CONSTANTS.ACCOUNTS_LIMIT )[ SCRIPT_INSTANCE - 1 ];
		if( ! accountIds ){
			Logger.log( 'No accounts configured for this script instance. Terminate. ' );
			return;
		}
		
		MccApp
		.accounts()
		.withIds( accountIds )
		.withLimit( CONSTANTS.ACCOUNTS_LIMIT )
		.executeInParallel( 'processAccount', 'finalProcessing', JSON.stringify( { currentPart : currentPart } ) );
	} catch ( error ){
		var mccName = AdWordsApp.currentAccount().getName();
		var subject = 'Error in ' + CONSTANTS.SCRIPT_NAME + ' ' + SCRIPT_INSTANCE + ' ' + mccName;
		var message = error + '\n' + error.stack;
		Logger.log(  subject + ' -> ' + message );
		MAIL_APP.sendEmail( DEVELOPER_EMAIL, subject, message );
		throw error;
	}
}

function key1( key_ ){
	return function( row ){
		return key_
			.map( function( key ){ return row[ key ] } )
			.join( '_' )
		;
	};
}

function processAccount( params ){
	try{
		params = JSON.parse( params );
		
		var account = AdWordsApp.currentAccount();
		
		if( computeCurrentCampaignIds( params.currentPart ).length == 0 ){
			// the work is partitioned in NUM_PARTS parts.
			// the part which is due this hour is empty ( no campaigns )
			_.log( account.getName() + ': nothing to do -> quit');
			return;
		}

		var accountKey = latinize( account.getName()
			.replace(/\W+/g, '_' )
			.replace( /\u00dc/g, 'Ue' )
			.replace( /\u00fc/g, 'ue' )
			.replace( /\u00c4/g, 'Ae' )
			.replace( /\u00e4/g, 'ae' )
			.replace( /\u00d6/g, 'Oe' )
			.replace( /\u00f6/g, 'oe' )
			.replace( /\u00df/g, 'ss' )
			)
			+ '_'
			+ account.getCustomerId().replace( /\W+/g, '' ) + '_'
			+ params.currentPart;

		BIGQUERY.createTable( accountKey, CONFIG.DATABASE_FIELDS );
		
		// get data from bigQuery
		var oldData = BIGQUERY.queryTable( accountKey );

		var fields = Object.keys( CONFIG.DATABASE_FIELDS ).map( _.snakeToCamel );
		
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
		// Logger.log('get Adwords report');
		var newData = retrieveAdwordsReport( CONFIG.REPORT, params.currentPart );
		
		// ---------- Handle old adgroups ------------
		// accountName -> check -> campaign -> adgroup -> { oldValue, newValue }
		var res = {
			accountName : account.getName(),
			accountId : account.getCustomerId(),
			check : {},
			checkNew : {},
			bigQueryJobIds : [],
		};
		//var countChanges = 0;
		var countOldData = 0;
		
		// Logger.log('compute differences');
		for ( var key in oldData ){
			countOldData++;
			
			var oldRow = oldData[ key ];
			var newRow = newData[ key ];
			
			
			/*
			_.assert( oldRow[ 'CampaignName' ] == newRow[ 'CampaignName' ] ,
				'CampaignNames dont match for adgroup-id ' + key 
				+ ' old: ' + oldRow[ 'CampaignName' ] + ' new: ' + newRow[ 'CampaignName' ]
				);
			_.assert( oldRow[ 'AdGroupName' ]  == newRow[ 'AdGroupName' ]  ,
				'AdGroupNames  dont match for adgroup-id ' + key 
				+ ' old: ' + oldRow[ 'AdGroupName' ] + ' new: ' + newRow[ 'AdGroupName' ]
				);
			*/
		
			compareRows(
				oldRow,
				newRow,
				handleConflicts,
				res.check
			);
		}
		// --------------------------------------------------
		
		// ---------- Put new data into BigQuery ------------
		
		BIGQUERY.dropTable( accountKey );
		BIGQUERY.createTable( accountKey, CONFIG.DATABASE_FIELDS );
		
		//Logger.log('load into BigQuery');
		var jobIds = BIGQUERY.loadIntoBigquery( newData, accountKey );
		res.bigQueryJobIds = res.bigQueryJobIds.concat( jobIds );
		
		// --------------------------------------------------
		
		
		// ---------- Handle new adgroups -------------------
		if( CHECK_NEW_ADGROUPS ){
			var count = 0;
			for ( var key in oldData ){
				// to find adgroups in newData, which are not in oldData,
				// we need to delete oldData from newData
				delete newData[ key ];
				count++;
			}
			if( count > 0 ){
				// if there is no old data then it is one of the initial runs 
				// - dont check for new keywords in this case
				for ( var key in newData ){
					compareRows(
						CONFIG.EXPECTED_CHECKS_FOR_NEW_ADGROUPS,
						newData[ key ],
						handleConflicts,
						res.checkNew
					);
				}
			}
		}
		// -------------------------------------------
		
		
		
		//Logger.log( account.getName() + ' changes: ' + countChanges + ' old-data: ' + countOldData );
		
		
		var json = JSON.stringify( res, null, '\t' );
		
		// Logger.log( 'json: ' +  json );

		return json;
	} catch ( error ){
		var mccName = AdWordsApp.currentAccount().getName();
		var subject = 'Error in ' + CONSTANTS.SCRIPT_NAME + ' ' + SCRIPT_INSTANCE + ' ' + mccName;
		var message = error + '\n' + error.stack;
		Logger.log(  subject + ' -> ' + message );
		MAIL_APP.sendEmail( DEVELOPER_EMAIL, subject, message );
		throw error;
	}
}

function handleConflicts( check, campaignName, adgroupName, oldValue, newValue, target ){
	
	if( ! target[ check ] ){
		target[ check ] = { 
			campaign : {},
			otherCampaigns : {},
			countCampaigns : 0,
			countOtherCampaigns : 0,
			countOtherAdgroups : 0,
		};
	}

	if( ! target[ check ].campaign[ campaignName ] ){
		// new campaign or out of limit campaign
		if( target[ check ].countCampaigns < MAX_SHOW_CAMPAIGNS_PER_CHECK ){
			// campaign-limit not reached yet
			target[ check ].countCampaigns++;
			target[ check ].campaign[ campaignName ] = { adgroup : {}, countAdgroups : 0, countOtherAdgroups : 0 };
			
			// just assume here that MAX_SHOW_ADGROUPS_PER_CAMPAIGN >= 1
			target[ check ].campaign[ campaignName ].countAdgroups++;
			target[ check ].campaign[ campaignName ].adgroup[ adgroupName ] = { oldValue : oldValue, newValue : newValue };
		}else{
			// campaign-limit reached
			target[ check ].countOtherAdgroups++;
			if( ! target[ check ].otherCampaigns[ campaignName ] ){
				target[ check ].otherCampaigns[ campaignName ] = 1;
				target[ check ].countOtherCampaigns++;
			}
		}
	} else {
		// existing campaign
		if( target[ check ].campaign[ campaignName ].countAdgroups < MAX_SHOW_ADGROUPS_PER_CAMPAIGN ){
			// new adgroup
			target[ check ].campaign[ campaignName ].countAdgroups++;
			target[ check ].campaign[ campaignName ].adgroup[ adgroupName ] = { oldValue : oldValue, newValue : newValue };
		}else{
			// out of limit adgroup
			target[ check ].campaign[ campaignName ].countOtherAdgroups++;
		}	
	}
	//if( countChanges < 2 ){
	//	Logger.log( check + ' ' + campaignName + ' ' + adgroupName + ' ' + oldValue + ' ' + newValue );
	//}
}

function formatResult( target, accountName, firstValueType, secondValueType ){
	var html = '<style>th, td { border: 1px solid #ddd;}</style>';
	
	html += '<table style="padding:10px;border-collapse:collapse;">';
	for( check in target ){
		html += '<tr> <td colspan="2"> <h2>' + accountName + '</h2> </td> <td colspan="2"> <h3> ' + check + ' </h3> </td> </tr>';
		html += '<tr style="background-color:rgb(200,200,200);"> <td> Campaign </td> <td> Adgroup </td> <td> ' 
				+ firstValueType + ' value </td> <td> ' + secondValueType + ' value </td> </tr>';
		
		for( campaignName in target[ check ].campaign ){
			var campaignObj = target[ check ].campaign[ campaignName ];
			var firstRow = true;
			
			for( adgroupName in campaignObj.adgroup ){
				var oldValue = campaignObj.adgroup[ adgroupName ].oldValue;
				var newValue = campaignObj.adgroup[ adgroupName ].newValue;
				
				html += '<tr>';
				if( firstRow ){
					html += '<td  rowspan="' + (campaignObj.countAdgroups + (campaignObj.countOtherAdgroups>0?1:0))
						+ '"> ' + campaignName + ' </td>';
					firstRow = false;
				}
				html += '<td> ' + adgroupName + ' </td> <td> ' + oldValue + ' </td> <td> ' + newValue + ' </td></tr>';
			}
			if( campaignObj.countOtherAdgroups > 0 ){
				html += '<tr> <td> ... and ' + campaignObj.countOtherAdgroups
					+ ' other adgroups </td> <td>' + CONSTANTS.EMPTY + '</td><td>' + CONSTANTS.EMPTY + '</td> </tr>';
			}
		}
		if( target[ check ].countOtherCampaigns > 0 ){
			html += '<tr> <td> ... and ' + target[ check ].countOtherCampaigns
				+ ' other campaigns </td> <td> ... and ' + target[ check ].countOtherAdgroups + ' other adgroups </td> <td>' + CONSTANTS.EMPTY + '</td><td>' + CONSTANTS.EMPTY + '</td> </tr>';
		}
	}
	html += '</table>';
	
	
	return html;
}

function finalProcessing( results ){
	try{
		var emailMap = {};
		
		var accountIdToEmailMap = GOOGLE_SHEETS.getMapOfLists( CONSTANTS.ID_COLUMN, CONSTANTS.EMAIL_COLUMN );
		
		var jobIds = [];
		
		for ( var i = 0; i < results.length; i++ ) {
			if( results[i].getReturnValue() == 'undefined' ){
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
			
			resultX.bigQueryJobIds.forEach( function( jobId ){ jobIds.push( jobId ); } );
			
			// --------------- is result empty? -------------------------
			var count = 0;
			for( x in resultX.check ){ 
				count++;
			}
			for( x in resultX.checkNew ){ 
				count++;
			}		
			if( count == 0 ){
				_.log('no changes found for account ' + resultX.accountName );
				continue;
			}
			// ----------------------------------------------------------
			
			// its an [] of strings
			var emailsForThisAccount = accountIdToEmailMap[ resultX.accountId ];
			
			if( ! emailsForThisAccount ){
				// seems like there are no recipients for this account
				
				_.log( 'seems like there are no recipients for account ' + resultX.accountName );
				continue;
			}
			
			var formatted = formatResult( resultX.check, resultX.accountName, 'old', 'new' );
			formatted += formatResult( resultX.checkNew, resultX.accountName, 'expected', 'found' );
			
			emailsForThisAccount.forEach( function( email ){
				emailMap[ email ] = emailMap[ email ] ? emailMap[ email ] : '';
				emailMap[ email ] += formatted;
			});
		}
		
		for( email in emailMap ){
			_.log( 'sending emails to ' + email );
			var html = emailMap[ email ];
			MAIL_APP.sendEmail( email, CONSTANTS.SCRIPT_NAME + ' ' + AdWordsApp.currentAccount().getName(), null, html );
		}
		
		BIGQUERY.checkJobs( jobIds );
	} catch ( error ){
		var mccName = AdWordsApp.currentAccount().getName();
		var subject = 'Error in ' + CONSTANTS.SCRIPT_NAME + ' ' + SCRIPT_INSTANCE + ' ' + mccName;
		var message = error + '\n' + error.stack;
		Logger.log(  subject + ' -> ' + message );
		MAIL_APP.sendEmail( DEVELOPER_EMAIL, subject, message );
		throw error;
	}
}

function doExecuteCheck( check ){
	
	if( check == 'CpcBid' ){
		return CHECK_CPC_BID;
	}
	if( check == 'CpmBid' ){
		return CHECK_CPM_BID;
	}
	if( check == 'CpvBid' ){
		return CHECK_CPV_BID;
	}
	if( check == 'TargetCpa' ){
		return CHECK_TARGET_CPA;
	}
	if( check == 'AdGroupMobileBidModifier' ){
		return CHECK_MOBILE_BID_MODIFIER;
	}
	if( check == 'AdGroupStatus' ){
		return CHECK_STATUS;
	}
	if( check == 'BiddingStrategyName' ){
		return CHECK_BIDDING_STRATEGY_NAME;
	}
	throw new Error('Unknown check: ' + check );
}

function compareRows( oldOrExpectedRow, newRow, callback, target ){
	if( !newRow ){
		callback( 'MISSING_ADGROUP', oldOrExpectedRow[ 'CampaignName' ], oldOrExpectedRow[ 'AdGroupName' ], 'was present', 'is missing', target );
		return;
	}
	for( var index in CONFIG.CHECKS ){
		var check = CONFIG.CHECKS[ index ];
		
		if( ! doExecuteCheck( check ) ){
			continue;
		}

		var oldOrExpectedValue = oldOrExpectedRow[ check ];
		var newValue = newRow[ check ];
		
		if( oldOrExpectedValue != newValue ){
			callback( check, newRow[ 'CampaignName' ], newRow[ 'AdGroupName' ], oldOrExpectedValue, newValue, target );
		}
	}
}

function retrieveAdwordsReport( report, currentPart ){
	
	var query = 'SELECT ' + Object.keys( report.FIELDS ).join(',')
		+ ' FROM ' + report.NAME
		+ ' WHERE CampaignId in [' + computeCurrentCampaignIds( currentPart ) + '] '
	;
	Logger.log( query );

	var rows = _.iteratorToList( AdWordsApp.report( query ).rows() );
	
	Logger.log( 'rows.length: ' + rows.length );
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
	var map = _.listToMap( rows, key1( report.KEY ) ); // KEY = AdGroupId
	return map;
}

