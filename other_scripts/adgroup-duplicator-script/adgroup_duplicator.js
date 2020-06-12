var EXACT_POSTFIX = '(exact)';
var BROAD_POSTFIX = '(broad)';
var DEFAULT_MAX_CPC = 1;
var EXCLUDED_CAMPAIGNS = [ ];
var INCLUDED_CAMPAIGNS = [ '[SUCH+RLSA:DE] campaign a(exact)', '[SUCH+RLSA:DE] campaign a(broad)' ];
var STATUSES = [ 'ENABLED', 'PAUSED' ].join(',');
var LABEL = 'PA New Keyword';
var CAMPAIGN_DONE_LABEL = 'ADGROUP_DUPLICATOR_DONE';

// can be set to CAMPAIGN or to ADGROUP
var LEVEL_SWITCH = 'CAMPAIGN';

// -- CONSTANTS --------
var SCRIPT_NAME = 'adgroup_duplicator_campaign_level';
var TARGETING_CRITERION_TYPE = 'USER_INTEREST_AND_LIST';


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

function findLabel( labelName ){
	var labelSelector = AdWordsApp.labels()
		.withCondition('Name = "' + labelName + '"');
	
	var labelIterator = labelSelector.get();
	if( labelIterator.hasNext() ){
		return labelIterator.next();
	}
}
function createLabel( labelName ){
	var label = findLabel( labelName );
	if( ! label ){
		AdWordsApp.createLabel( labelName );
		return findLabel( labelName );
	}else{
		return label;
	}
}

String.prototype.endsWith = function( str ){
	return this.indexOf( str ) == this.length - str.length;
}

Object.values = Object.values || ( function( obj ){
	return Object.keys( obj ).map( function( key ){
		return obj[key]
	})
});

function iteratorToList( iter ){
	var list = [];
	while( iter.hasNext() ){
		list.push( iter.next() );
	}
	return list;
}

String.trim = function( value ){
	return value.trim();
};

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

function has( prop ){
	var f = function( item ){
		return !! item[ prop ];
	};
	f.and = function( prop2 ){
		return function( item ){
			return f( item ) && item[ prop2 ];
		};
	};
	f.or = function( prop2 ){
		return function( item ){
			return f( item ) || item[ prop2 ];
		};
	};
	return f;
}

function broadNameToExactName( name ){
	return name.split(BROAD_POSTFIX)[0] + EXACT_POSTFIX;  //Entferne BMM und füge Exact an
}
function exactNameToBroadName( name ){
	return name.split(EXACT_POSTFIX)[0] + BROAD_POSTFIX;  //Entferne Exact und füge BMM an
}

function broadTextToExactText( text ){
	return "[" + text.split("+").join("") + "]";
}
function exactTextToBroadText( text ){
	return (" " + text.substring(1,text.length-1)).split(" ").join(" +").trim();
}

function findLoneCampaigns(){
	var res = {};

	findCampaigns().forEach( function( campaign ){
		var name = campaign.getName();
		
		if( ! name.endsWith( EXACT_POSTFIX ) && ! name.endsWith( BROAD_POSTFIX ) ){
			Logger.log( 'WARNING: Campaign "' + name + '" is not named according to the system on which this script operates. Ignore it!' );
			return;
		}
		
		if( name.endsWith( EXACT_POSTFIX ) ){
			var name1 = name.substring( 0, name.length - EXACT_POSTFIX.length );
			res[ name1 ] = res[ name1 ] || {};
			res[ name1 ].basicName = name1;
			res[ name1 ].exactCampaign = campaign;
		}
		
		if( name.endsWith( BROAD_POSTFIX ) ){
			var name1 = name.substring( 0, name.length - BROAD_POSTFIX.length );
			res[ name1 ] = res[ name1 ] || {};
			res[ name1 ].basicName = name1;
			res[ name1 ].broadCampaign = campaign;
		}
	});
	
	res = Object.values( res ).filter( has( 'broadCampaign' ).and( 'exactCampaign' ) );
	res.sort( function( a, b ){
		return a.basicName > b.basicName;
	});
	
	return res;
}

function findAdgroupsWithoutCounterpart( campaign1, campaign2 ){
	
	var campaign2Adgroups = _.listToMap( _.SELECT( 'AdGroupName' )
		.FROM( 'ADGROUP_PERFORMANCE_REPORT' )
		.WHERE( 'CampaignId = ' + campaign2.getId() + '' )
		.AND( 'AdGroupStatus IN [' + STATUSES + ']' )
		.parse(),
		'AdGroupName' )
	;
	//var x = Object.values( campaign2Adgroups );
	//Logger.log( campaign2.getName() + ' - ' + campaign2.getId() + ' - ' + x.length + ' ' + x[0]AdGroupName );
	
	var adgroups = _.SELECT( 'AdGroupName', 'AdGroupId' )
		.FROM( 'ADGROUP_PERFORMANCE_REPORT' )
		.WHERE( 'CampaignId = ' + campaign1.getId() + '' )
		.AND( 'AdGroupStatus IN [' + STATUSES + ']' )
		.parse()
		.filter( function( x ){ return campaign2Adgroups[ x.AdGroupName ] == undefined } )
		.map( _.property( 'AdGroupId' ) )
		.slice( 0, 10000 ) // IN condition supports only up to 10000 parameters
	;
	Logger.log( adgroups.length + ' ' + adgroups[0] );

	if( adgroups.length == 0 ){
		return [];
	}

	var cond2 = 'AdGroupId IN [' + adgroups + ']';	
	Logger.log( cond2 );
	
	var res = iteratorToList(
		campaign1.adGroups()
			.withCondition( 'Status IN [' + STATUSES + ']' )
			.withCondition( cond2 )
			.get()
	);
	
	return res;
}

function findAdgroupsWithoutCounterpartOld( campaignMatchType1, campaignMatchType2 ){
	var adGroupsMatchType1 = iteratorToList( campaignMatchType1.adGroups().withCondition( 'Status in [' + STATUSES + ']' ).withLimit( 10000 ).get() );
	var adGroupMatchType1Names = '"' + adGroupsMatchType1.map( property( 'getName' ) ).join( '","' ) + '"';
	
	var adGroupsMatchType2Names = iteratorToList(
		campaignMatchType2.adGroups()
			.withCondition( 'Status IN [' + STATUSES + ']' )
			.withCondition( 'Name NOT_IN [' + adGroupMatchType1Names + ']' )
			.get()
	).map( property( 'getName' ) );
	
	var loneAdGroupsMatchType1 = adGroupsMatchType1.filter( function( adGroupMatchType1 ){
		return adGroupsMatchType2Names.indexOf( adGroupMatchType1.getName() ) >= -1;
	});
	
	return loneAdGroupsMatchType1;
}

function createCounterPart( adGroup, campaign, textConverter ){
	
	Logger.log( 'Create ad group "' + adGroup.getName() + '" in campaign "' + campaign.getName() + '".' )
	
	var newAdGroup =
		campaign
		.newAdGroupBuilder()
		.withName( adGroup.getName() )
		.withCustomParameters( adGroup.urls().getCustomParameters() )
		.withTrackingTemplate( adGroup.urls().getTrackingTemplate() )
		.withStatus( adGroup.isEnabled() ? 'ENABLED' : 'PAUSED' )
		.withCpc( DEFAULT_MAX_CPC )
		.build()
		.getResult();
	
	// copy ads from source ad group to new ad group
	iteratorToList( adGroup.ads().get() ).forEach( function( ad ){
		var adOperation = newAdGroup.newAd().expandedTextAdBuilder()
			.withHeadlinePart1( ad.getHeadlinePart1() )
			.withHeadlinePart2( ad.getHeadlinePart2() )
			.withDescription( ad.getDescription() )
			.withPath1( ad.getPath1() )
			.withPath2( ad.getPath2() )
			.withFinalUrl( ad.urls().getFinalUrl() )
			.build();
	});
	
	// keywords
	iteratorToList( adGroup.keywords().get() ).forEach( function( keyword ){
		var keywordOperation = newAdGroup.newKeywordBuilder()
			.withText( textConverter( keyword.getText() ) )
			.withFinalUrl( keyword.urls().getFinalUrl().split("\?")[0] )
			.withCustomParameters( keyword.urls().getCustomParameters() )
			.withTrackingTemplate( keyword.urls().getTrackingTemplate() )
			.build();
		var newKeyword = keywordOperation.getResult();
		
		newKeyword.applyLabel( LABEL );
		newKeyword.pause();
	});
	
	// targeting setting
	newAdGroup.targeting().setTargetingSetting( TARGETING_CRITERION_TYPE, adGroup.targeting().getTargetingSetting( TARGETING_CRITERION_TYPE ) );
	
	// audiences
	iteratorToList( adGroup.targeting().audiences().get() ).forEach( function( audience ){
		var operation = newAdGroup
			.targeting()
			.newUserListBuilder()
			.withAudienceId( audience.getAudienceId() )
			.withBidModifier( audience.bidding().getBidModifier() )
			.build();
	});
	
	// excluded audiences
	iteratorToList( adGroup.targeting().excludedAudiences().get() ).forEach( function( audience ){
		var operation = newAdGroup
			.targeting()
			.newUserListBuilder()
			.withAudienceId( audience.getAudienceId() )
			.exclude();
	});
}

function createAdgroupDuplicates( mapOfAdgroups, nameConverter, matchType, textConverter ){
	
	
	for( name in mapOfAdgroups ){
		var adGroup = mapOfAdgroups[ name ];
		var campaign = adGroup.getCampaign();
		
		// create a new ad group
		var newAdGroup =
			campaign
			.newAdGroupBuilder()
			.withName( nameConverter(name) )
			.withCustomParameters( adGroup.urls().getCustomParameters() )
			.withTrackingTemplate( adGroup.urls().getTrackingTemplate() )
			.withStatus( adGroup.isEnabled() ? "ENABLED" : "PAUSED" )
			.withCpc( DEFAULT_MAX_CPC )
			.build()
			.getResult();
		
		// copy ads from source ad group to new ad group
		var adIterator = adGroup.ads().get();
		while (adIterator.hasNext()) {
		   var ad = adIterator.next();
		
          if( !ad.getHeadline() || ad.getHeadline().length < 1 ){
          //  Logger.log("");
            continue;
          }
			var adOperation = newAdGroup.newTextAdBuilder()
				.withHeadline( ad.getHeadline() )
				.withDescription1( ad.getDescription1() )
				.withDescription2( ad.getDescription2() )
				.withDisplayUrl( ad.getDisplayUrl() )
				.withFinalUrl( ad.urls().getFinalUrl() )
				.build();
		}	
			
		var adIterator = adGroup.ads().withCondition("Type = EXPANDED_TEXT_AD").get();
		while (adIterator.hasNext()) {
		   var ad = adIterator.next();		
			
		  if( !ad.getHeadlinePart1() || ad.getHeadlinePart1().length < 1 ){
          //  Logger.log("");
           continue;	
		  }	
				
			var adOperation = adGroup.newAd().expandedTextAdBuilder()
				.withHeadlinePart1( ad.getHeadlinePart1() )
				.withHeadlinePart2( ad.getHeadlinePart2() )
				.withDescription( ad.getDescription() )
				.withPath1( ad.getPath1() )
				.withPath2( ad.getPath2() )
				.withFinalUrl( ad.urls().getFinalUrl() )
				.build();	
		 }
		
		// copy keywords from source ad group to new ad group
		var keywordIterator = adGroup.keywords().get();
		while (keywordIterator.hasNext()) {
		   var keyword = keywordIterator.next();
		   
		   if( keyword.getMatchType() == matchType ){
			   
				var keywordOperation = newAdGroup.newKeywordBuilder()
					.withText( textConverter( keyword.getText() ) )
					.withCustomParameters( keyword.urls().getCustomParameters() )
					.withTrackingTemplate( keyword.urls().getTrackingTemplate() )
					.withFinalUrl( keyword.urls().getFinalUrl().split("\?")[0] )
					.build();
				var newKeyword = keywordOperation.getResult();
				
				newKeyword.applyLabel( "PA New Keyword");
				newKeyword.pause();
		   }
		}
		
		
		// targeting setting
		newAdGroup.targeting().setTargetingSetting( TARGETING_CRITERION_TYPE, adGroup.targeting().getTargetingSetting( TARGETING_CRITERION_TYPE ) );
		
		// audiences
		iteratorToList( adGroup.targeting().audiences().get() ).forEach( function( audience ){
			var operation = newAdGroup
				.targeting()
				.newUserListBuilder()
				.withAudienceId( audience.getAudienceId() )
				.withBidModifier( audience.bidding().getBidModifier() )
				.build();
		});
		
		// excluded audiences
		iteratorToList( adGroup.targeting().excludedAudiences().get() ).forEach( function( audience ){
			var operation = newAdGroup
				.targeting()
				.newUserListBuilder()
				.withAudienceId( audience.getAudienceId() )
				.exclude();
		});
	}
}

function findLoneAdGroups( campaign ){
	
	var exactMap = {};
	var broadMap = {};

	var adGroupIterator = campaign
		.adGroups()
		.get();
	
	while (adGroupIterator.hasNext()) {
		var adGroup = adGroupIterator.next();
		var name = adGroup.getName();
		if( name.indexOf(EXACT_POSTFIX) == name.length - EXACT_POSTFIX.length ){  //Prüfe ob Exact am Ende steht.
			exactMap[name] = adGroup;
		}
	}
	
	// ------------------------------
	
	var adGroupIterator = campaign
		.adGroups()
		.get();
	
	while (adGroupIterator.hasNext()) {
		var adGroup = adGroupIterator.next();
		var name = adGroup.getName();
		
		if( name.indexOf(BROAD_POSTFIX) == name.length - BROAD_POSTFIX.length ){
			
			
			var exactName = broadNameToExactName(name);
			
			
			//if( name.indexOf( "San Diego:Accommodation:+BMM" ) >= 0 ){
			//	Logger.log("found : " + name + " ------- exact_name: " + exactName +  " in map? " + exactMap[exactName]);
			//}
			
			
			if(exactMap[exactName]){
				delete exactMap[exactName];
			}else{
				broadMap[name] = adGroup;
			}
		}
	}
	
	
	//Logger.log("cant assign adgroup to broad or exact: " + name );
	
	return [exactMap,broadMap];
}

function campaignLevel(){
	var campaignPairs = findLoneCampaigns();
	//Logger.log( 'Campaign pairs: ' + campaignPairs.map( property( 'basicName' ) ) );

	if( campaignPairs.length == 0 ){
		Logger.log( 'Found no campaign-pairs. Trying to remove label from all campaigns and retry..' );
		_.iteratorToList( AdWordsApp.campaigns().get() ).forEach( function( campaign ){
			campaign.removeLabel( CAMPAIGN_DONE_LABEL );
		});
		campaignPairs = findLoneCampaigns();
		if( campaignPairs.length == 0 ){
			Logger.log( 'Still no campaign-pairs. Terminating.' );
			return;
		}
	}
	
	campaignPairs.forEach( function( pair ){
		Logger.log( 'Check campaigns: ' + pair.basicName );
		var loneExactAdGroups = findAdgroupsWithoutCounterpart( pair.exactCampaign, pair.broadCampaign );
		var loneBroadAdGroups = findAdgroupsWithoutCounterpart( pair.broadCampaign, pair.exactCampaign );
		
		if( loneExactAdGroups.length > 0 ) Logger.log( 'lone exact ad groups: ' + loneExactAdGroups );
		if( loneBroadAdGroups.length > 0 ) Logger.log( 'lone broad ad groups: ' + loneBroadAdGroups );
		
		loneExactAdGroups.forEach( function( loneExactAdGroup ){
			createCounterPart( loneExactAdGroup, pair.broadCampaign, exactTextToBroadText );
		});
		
		loneBroadAdGroups.forEach( function( loneBroadAdGroup ){
			createCounterPart( loneBroadAdGroup, pair.exactCampaign, broadTextToExactText );
		});
		pair.exactCampaign.applyLabel( CAMPAIGN_DONE_LABEL );
		pair.broadCampaign.applyLabel( CAMPAIGN_DONE_LABEL );
	});
}

function findCampaigns(){
	var campaignSelector =
		AdWordsApp.campaigns()
		.withCondition( 'Status IN [' + STATUSES + '] ' )
		.withCondition( 'LabelNames CONTAINS_NONE [ "' + CAMPAIGN_DONE_LABEL + '" ]' );
	if( INCLUDED_CAMPAIGNS.length > 0 ){
		campaignSelector = campaignSelector.withCondition( 'CampaignName IN ["' + INCLUDED_CAMPAIGNS.join( '","' ) + '"] ' )
	}
	if( EXCLUDED_CAMPAIGNS.length > 0 ){
		campaignSelector = campaignSelector.withCondition( 'CampaignName NOT_IN ["' + EXCLUDED_CAMPAIGNS.join( '","' ) + '"] ' )
	}
	return _.iteratorToList( campaignSelector.get() );
}

function adgroupLevel(){
	var campaigns = findCampaigns();
	
	if( campaigns.length == 0 ){
		Logger.log( 'Found no campaigns. Trying to remove label from all campaigns and retry..' );
		_.iteratorToList( AdWordsApp.campaigns().get() ).forEach( function( campaign ){
			campaign.removeLabel( CAMPAIGN_DONE_LABEL );
		});
		campaigns = findCampaigns();
		if( campaigns.length == 0 ){
			Logger.log( 'Still no campaigns. Terminating.' );
			return;
		}
	}
	
	campaigns.forEach( function( campaign ){
		var name = campaign.getName();
		
		Logger.log( 'find lone adgroups in campaign ' + name );
		var [ exactMap, broadMap ] = findLoneAdGroups( campaign );
		var countE = 0;
		var countB = 0;
		for( var name in exactMap) countE++;
		for( var name in broadMap) countB++;
		Logger.log( countE + " exact adgroups found. "+ countB + " broad adgroups found");

		Logger.log("create exact duplicates");
		createAdgroupDuplicates( exactMap , exactNameToBroadName, "EXACT", exactTextToBroadText );
		Logger.log("create broad duplicates");
		createAdgroupDuplicates( broadMap , broadNameToExactName, "BROAD", broadTextToExactText );
		
		campaign.applyLabel( CAMPAIGN_DONE_LABEL );
	});
}

function main() {
	try{
		createLabel( LABEL );
		createLabel( CAMPAIGN_DONE_LABEL );
		
		if( LEVEL_SWITCH == 'CAMPAIGN' ){
			campaignLevel();
		}else if( LEVEL_SWITCH == 'ADGROUP' ){
			adgroupLevel();
		}else{
			throw new Error( 'unknown level switch: ' + LEVEL_SWITCH );
		}
		
	} catch ( error ){
		Logger.log( 'Error in ' + SCRIPT_NAME + ' -> ' + error + '\n' + error.stack );
		//sendEmail( DEVELOPER_EMAIL, 'Error in ' + SCRIPT_NAME + SCRIPT_INSTANCE + ' ' + mccName, error + '\n' + error.stack );
		throw error;
	}
}

