
// set time-zone here
var TIME_ZONE = 'Europe/Berlin';

var URL = 'https://admin.entsorgung.de/fohMo3ae/matelso-call-tracking/call-by-ad';
var PHONE_NUMBER = '0800-6382555';




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
	obj.Time = new Date( Utilities.formatDate( new Date( obj.Timestamp ), TIME_ZONE, 'MMM dd,yyyy HH:mm:ss' ) );
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
			//"payload" : {
				// 'phone_number'	: PHONE_NUMBER,
				// 'date' 			: obj.Date,
				// 'time' 			: obj.Time,
				// 'gclid' 		: obj.GclId,
				//'clicks'		: obj.Clicks,
			//},
			headers: {
				//"Authorization" : "",
			},
			muteHttpExceptions : true
		}
	);
}

function main( gclid ){
  
	var report = AdWordsApp.report(
		"SELECT Clicks, GclId, ClickType, Date " +
		"FROM CLICK_PERFORMANCE_REPORT " +
		"WHERE ClickType IN [ CALLS, CALL_TRACKING, MOBILE_CALL_TRACKING, LOCATION_FORMAT_CALL ] " +
		"DURING TODAY" );
	
	var iterator = report.rows();
  
	var list = _.iteratorToList( iterator )
	.map( computeTime )
	.filter( function( x ){
		return x.Date.split('-')[1] == x.Time.getMonth() + 1 && x.Date.split('-')[2] == x.Time.getDate();
	});
  
  list.sort( function( a, b ){ return a.Time.getTime() - b.Time.getTime() } );
  
  list
	.forEach( function(x){
		var ret = callUrl( URL, x );
		Logger.log( x.ClickType + ', ' + x.Date + ', ' + x.Time + ', ' + x.Timestamp + ', ' + x.Clicks + ', ' + x.GclId + ', ' ); // + ret
      Logger.log( 'end' );
		
	});
}

/*
	var gclid = 'EAIaIQobChMIxKHC1-Sx2gIVl5EbCh1QlgMTEAAYASABEgIf8fD_BwE';
	var timestamp = timestampFromGclid( gclid );
	alert( timestamp );
*/


