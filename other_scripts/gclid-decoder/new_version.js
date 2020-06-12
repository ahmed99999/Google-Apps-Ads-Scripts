

// hour diff between GMT-0700 and Berlin summer time
// In winter it may be the same or maybe -8.
var HOUR_DIFF = -9;
var THRESHOLD = 1000 * 60 * 3;

// set time-zone here
var TIMEZONE = 'Europe/Berlin';

var MATELSO_ENDPOINT = 'http://www.matelso.de/Partnerbereich/Matelso_MRS_v_2_0.asmx/';
var MATELSO_API_FUNCTION = 'campaign_management_show_calls';
var MATELSO_PARTNER_ID = '3913';
var MATELSO_PASSWORD = 'Gi8t3D6Nfc';
var TARGET_B_NUMBER = '498006382555';
var MIN_DURATION = 1; // in sec

var now = new Date();
var date1 = new Date();
var date2 = new Date();
var DAYS = 7;
date1.setTime( now.getTime() - 1000 * 60 * 60 * 24 * DAYS );
var START_DATE = Utilities.formatDate( date1, TIMEZONE, 'yyyy-MM-dd' );
var END_DATE = Utilities.formatDate( date2, TIMEZONE, 'yyyy-MM-dd' );

Logger.log( 'start-date: ' + START_DATE );
Logger.log( 'end-date: ' + END_DATE );
	
var _ = (function(){
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
	function listToMap( list, property ){
		var map = {};
		list.forEach( function( item ){
			if( typeof property == 'function' ){
				map[ property( item ) ] = item;
			}else if( typeof item[ property ] == 'function' ){
				map[ item[ property ]() ] = item;
			}else{ 
				map[ item[ property ] ] = item;
			}
		});
		return map;
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
	function or2( value1, value2 ){
		return value1 || value2;
	}
	function and( predicate1, predicate2 ){
		return function( x ){
			return predicate1( x ) && predicate2( x );
		};
	}
	function and2( value1, value2 ){
		return value1 && value2;
	}
	function log( value ){
      Logger.log( 'value: ' + value );
	}
	function onlyUnique( value, index, self ){
		return self.indexOf( value ) === index;
	}
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
	function flatten( matrix ){
		return [].concat.apply([], matrix );
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
		Logger.log( 'fetch URL' );

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

	// ####################################################
	// ####################################################

	
	
	return {
		dateToString 	: dateToString,
		duringLastDays 	: duringLastDays,
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
		onlyUnique		: onlyUnique,
		iteratorToMap	: iteratorToMap,
		createLabel		: createLabel,
		flatten			: flatten,
		mailGunHtml		: mailGunHtml,
		mailGun			: mailGun
		
	};
})();

function base64Decode( string ){
  var characters = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=" ;
  
  var result = [];
  
  var i = 0;
  do {
    var b1 = characters.indexOf( string.charAt(i++) );
    var b2 = characters.indexOf( string.charAt(i++) );
    var b3 = characters.indexOf( string.charAt(i++) );
    var b4 = characters.indexOf( string.charAt(i++) );
    
    var a = ( ( b1 & 0x3F ) << 2 ) | ( ( b2 >> 4 ) & 0x3 );
    var b = ( ( b2 & 0xF  ) << 4 ) | ( ( b3 >> 2 ) & 0xF );
    var c = ( ( b3 & 0x3  ) << 6 ) | ( b4 & 0x3F );
    
    result.push( a );
    if( b ) result.push( b );
    if( c ) result.push( c );
    
  } while( i < string.length );
  
  return result;
}

function pad( length ){
	return function ( x ){
		x = x + '';
		while( x.length < length ){
			x = '0' + x;
		}
		return x;
	};
}

function stringToASCII( string ){
	if( undefined === string ){
		return [];
	}
	return string.split('').map( function( x ){ return x.charCodeAt( 0 ) } );
}

function tryParseDate( timestamp ){
	// Seems like timestamps are sometimes in nano-, micro-, milliseconds or in seconds.
	// Just try them all and take the most plausible
	
	var length = ( timestamp + '' ).length;
	switch( length ){
		case 10 : timestamp *= 1000; break; // seconds to millis
		case 13 : break;
		case 16 : timestamp = Math.round( timestamp / 1000 ); break; // micros to millis
		case 19 : timestamp = Math.round( timestamp / 1000000 ); break; // nanos to millis
		default : return undefined;
	}
	
	var res = new Date( timestamp );
	
	if( res && res.getFullYear() > 2000 && res.getFullYear() < 3000 ){
		//Logger.log( timestamp + " -> " + format( res ) + ' - ' + res );
		return timestamp;
	}
	
	return undefined;
}

function timestampFromGclid( gclid ){
	var replaced = gclid.replace( /_/g, '+' ).replace( /-/g, '/' );

	var decodedStr = base64Decode( replaced ).map( function( x ){ return String.fromCharCode( x ) } ).join( '' );

	var res = undefined;
	
	var regex = /(?=[\x5\xd\x15\x1d%\-5=EMU\]emu}\x85\x8d\x95\x9d\xa5\xad\xb5\xbd\xc5\xcd\xd5\xdd\xe5\xed\xf5\xfd])([\x80-\xff]*[\0-\x7f])(.{4})|([\x80-\xff]*[\0-\x7f])([\x80-\xff]*[\0-\x7f])/g;

	while( ( match = regex.exec( decodedStr ) ) != null ){
		var key = 0;
		var val = 0;
		
		var arr = stringToASCII( match[ 1 ] ? match[ 1 ] : match[ 3 ] );
		for( var i in arr ){
			key += ( arr[ i ] & 0x7f ) << i * 7;
		}
		key = key >> 3;
		
		if( key != 1 ){
			continue;
		}
		var arr = stringToASCII( match[ 1 ] ? match[ 2 ] : match[ 4 ] );
		for( var i in arr ){
			val += ( arr[ i ] & 0x7f ) * Math.pow( 2, i * 7 );
		}
		
		// Usually there are several keys=1.
		// Only one of them is a date.
		if( ! res ){
			res = tryParseDate( val );
		}
	}
	//Logger.log( res );
	return res;
}

function format( date ){
	var pad1 = pad( 2 );
	return date.getFullYear() + "-" + pad1( ( date.getMonth() + 1 ) ) + "-" + pad1( date.getDate() ) + " " + pad1( date.getHours() ) + ":" + pad1( date.getMinutes() ) + ':' + pad1( date.getSeconds() );
}

function computeTime( obj ){
	obj.Timestamp = timestampFromGclid( obj.GclId );
	obj.Time = timestampToDate( obj.Timestamp );
	return obj;
}

function callUrl( url, obj ){
	if( AdWordsApp.getExecutionInfo().isPreview() ){
		Logger.log( 'don\'t fetch url in preview mode' );
		return false;
	}
	var requestType = 'get';
	if( requestType == 'get' ){
		url = url + '?' + 'phone_number=' + encodeURIComponent( PHONE_NUMBER ) +
					'&date=' + encodeURIComponent( obj.Date ) +
					'&time=' + encodeURIComponent( obj.Time ) +
					'&timestamp=' + encodeURIComponent( obj.Timestamp ) +
					'&gclid='+ encodeURIComponent( obj.GclId )
		;
	}
	Logger.log( 'url: ' + url );
	Logger.log( 'end of url' );
  
	return UrlFetchApp.fetch(
		url,
		{
			method : requestType, //"post",
			//"payload" :
				// 'phone_number'	: PHONE_NUMBER,
				// 'date' 			: obj.Date,
				// 'time' 			: obj.Time,
				// 'gclid' 		: obj.GclId,
				//'clicks'		: obj.Clicks,
			headers: {
				//"Authorization" : "",
			},
			muteHttpExceptions : true
		}
	);
}

function matelsoAPICall(){
	var params = {
		method : 'post',
		// muteHttpExceptions : true,
		payload : {
			partner_id : MATELSO_PARTNER_ID,
			partner_password : MATELSO_PASSWORD,
			start_date : START_DATE, // '2018-07-24',
			end_date : END_DATE, // '2018-07-24',
		}
	};
	var response = UrlFetchApp.fetch( MATELSO_ENDPOINT + MATELSO_API_FUNCTION, params );
	
	var xml = response.getContentText();
	//Logger.log( xml.substring( 0, 1000 ) );
	
	var document = XmlService.parse( xml );
	var root = document.getRootElement();

	var items = root.getChildren('data');
	
	function child( name ){
		var f = function( item ){
			return item.getChildren( name )[ 0 ].getText();
		}
		f.equals = function( value ){
			return function( item ){
				return f( item ) == value;
			}
		};
		f.gt = function( value ){
			return function( item ){
				return f( item ) / 1 > value;
			}
		};
		return f;
	}
	
	var dateStrings = items
		.filter( child( 'b_number' ).equals( TARGET_B_NUMBER ) )
		.filter( child( 'net_duration' ).gt( MIN_DURATION ) )
		.map( child( 'timestamp_begin' ) )
	;
	
	//items.forEach( function( duration, index ){ Logger.log( '%s) (%s)', ( index + 1 ).toFixed(), duration ) } );
	
	var timestamps = dateStrings.map( stringToTimestamp );
	
	return timestamps;
}

function timestampToDate( timestamp ){
	//return new Date( Utilities.formatDate( new Date( timestamp ), TIMEZONE, 'MMM dd,yyyy HH:mm:ss' ) );
	var x = new Date( timestamp / 1 );
	x.setHours( x.getHours() - HOUR_DIFF );
	return x;
}

function dateToTimestamp( date ){
  	date = new Date( date.getTime() );
  	date.setHours( date.getHours() + HOUR_DIFF );
	return date.getTime();
}

function stringToTimestamp( dateTimeString ){
	var res = dateTimeString.split( ' ' );
	var date = res[ 0 ].split( /\./g );
	var year = date[ 2 ];
	var month = date[ 1 ] - 1;
	var day = date[ 0 ];
	var res = res[ 1 ].split( ':' );
	var hour = res[ 0 ];
	var minute = res[ 1 ];
	var second = res[ 2 ];
	var res = new Date( year, month, day, hour, minute, second );
	
  	var timestamp = dateToTimestamp( res );
	
	//var res = new Date( Utilities.formatDate( res, TIMEZONE, 'MMM dd,yyyy HH:mm:ss' ) );
	//Logger.log( dateTimeString + ' - ' + res + ' - ' + timestamp + ' - ' + timestampToDate( timestamp ) );
	
	return timestamp;
}

function callReport(){
	var myRows = [];
	var today = new Date();
	var date = new Date();
	date.setTime( date.setTime() - 1000 * 60 * 60 * 24 * DAYS );
	
	while( today.getTime() > date.getTime() ){
		var str = Utilities.formatDate( date, TIMEZONE, 'yyyy-MM-dd' );
		date.setTime( date.setTime() + 1000 * 60 * 60 * 24 );
		var report = AdWordsApp.report(
			"SELECT CallStatus, CallEndTime, CallStartTime, CallType, HourOfDay " +
			"FROM CALL_METRICS_CALL_DETAILS_REPORT " +
			"DURING " + str + "," + str + "" );
		
		myRows = myRows.concat( _.iteratorToList( report.rows() ) );
	}
	
	Logger.log( 'Call-Report: ' + myRows.map( function( x ){ return JSON.stringify( x, null, 2 ) } ) );
	
}

// returns a map: timestamp -> Gclid
function gclidReport(){
	var today = new Date();
	var date = new Date();
	date.setTime( date.getTime() - 1000 * 60 * 60 * 24 * DAYS );
	var myRows = [];
	
	while( today.getTime() > date.getTime() ){
		var str = Utilities.formatDate( date, TIMEZONE, 'yyyyMMdd' );
		Logger.log( 'date for adwords: ' + str );
		var query = "SELECT Clicks, GclId, ClickType, Date " +
			"FROM CLICK_PERFORMANCE_REPORT " +
			"WHERE ClickType IN [ CALLS ] " + // , CALL_TRACKING, MOBILE_CALL_TRACKING, LOCATION_FORMAT_CALL
			"DURING " + str + "," + str + "" ;
		var report = AdWordsApp.report( query );
		myRows = myRows.concat( _.iteratorToList( report.rows() ) );
		date.setTime( date.getTime() + 1000 * 60 * 60 * 24 );
	}
	
	//Logger.log( myRows );
	
	var list = myRows
		.map( computeTime )
		.filter( function( item ){
			var cond = item.Date.split( '-' )[ 1 ] == item.Time.getMonth() + 1 && item.Date.split( '-' )[ 2 ] == item.Time.getDate();
			if( !cond ){
				Logger.log( 'WARNING: gclid-decoding failed:'
					+ ' clicks: ' + item.Clicks
					+ ' GclId: ' + item.GclId
					+ ' ClickType: ' + item.ClickType
					+ ' Date: ' + item.Date
					+ ' Time: ' + item.Time
				);
			}else{
				Logger.log( 'Success:'
					+ ' clicks: ' + item.Clicks
					+ ' Date: ' + item.Date
					+ ' Time: ' + item.Time
				);
			}
			
			return cond;
	});
	
	list.sort( function( a, b ){ return a.Time.getTime() - b.Time.getTime() } );
	
	var res = {};
	
	list.forEach( function( x ){
		//var ret = callUrl( URL, x );
		//Logger.log( x.ClickType + ', ' + x.Date + ', ' + x.Time + ', ' + x.Timestamp + ', ' + x.Clicks + ', ' + x.GclId + ', ' ); // + ret
		res[ x.Timestamp ] = x.GclId;
	});
	
	return res;
}

function matching( clickTimes, conversionsTime ){
	var res = [];
	
	do{
		var bestPair = null;
		var bestDiff = THRESHOLD + 1;
		for( var j = 0; j < clickTimes.length; j++ ){
			for( var i = 0; i < conversionsTime.length; i++ ){
				var clickTime = clickTimes[ j ];
				var convTime = conversionsTime[ i ];
				var diff = convTime / 1 - clickTime / 1;
				if( diff >= 0 && diff < THRESHOLD ){
					if( diff < bestDiff ){
						bestDiff = diff;
						bestPair = [ clickTime, convTime, Math.round( diff / 1000 ) + ' seconds' ];
					}
				}
			}
		}
		if( bestPair ){
			Logger.log( 'found a pair: ' + bestPair );
			res.push( bestPair );
			var index = clickTimes.indexOf( bestPair[ 0 ] );
			if( index > -1 ){
				clickTimes.splice( index, 1 );
			}else{
				Logger.log( 'Error! Can\'t find ' + bestPair[ 0 ] + ' in ' + clickTimes );
			}
			var index = conversionsTime.indexOf( bestPair[ 1 ] );
			if( index > -1 ){
				conversionsTime.splice( index, 1 );
			}else{
				Logger.log( 'Error! Can\'t find ' + bestPair[ 1 ] + ' in ' + conversionsTime  );
			}
		}
	}while( bestPair );
	
	return res;
}

function main() {
    
	var clickObjs = gclidReport(); // timestamp -> gclid
	
	var clickObjs = Object.keys( clickObjs )
		//.map( function( clickTime ){ return new Date( clickTime / 1 ) } )
		.map( function( timestamp ){
			return {
				timestamp : timestamp / 1,
				datetime : timestampToDate( timestamp / 1 ) + '',
				gclid : clickObjs[ timestamp ],
			};
		})
	;
	
	Logger.log( 'clicks from Adwords: \n'
		+ clickObjs
			.map( function( x ){ return x.datetime + '\t' + x.timestamp } )
			.join( '\n' )
		+ 'count clicks from Adwords: ' + clickObjs.length + '\n'
	);
	
	var conversionTimestamps = matelsoAPICall(); // timestamps
	
	Logger.log( 'conversions from Matelso: \n'
		+ conversionTimestamps.map( function( x ){ return timestampToDate( x ) + '\t' + x } ).join( '\n' )
		//+ '\n' + conversionTimestamps
		+ 'count conversions from Matelso: ' + conversionTimestamps.length + '\n'
	);
	
	var res = matching( clickObjs.map( _.property( 'timestamp' ) ), conversionTimestamps );
	
	Logger.log( JSON.stringify( res, null, 2 ) + '\n count matches: ' + res.length );
	
	//callReport();
	
	Logger.log( 'end' );
}


