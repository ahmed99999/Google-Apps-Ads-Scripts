
var config = {
	"DESCRIPTION" : "this script is used to take data from Deep Crawl anb put into BigQuery" ,
	"INSTRUCTIONS": "",
	"VERSION" : 1,
	"VERSION_TAG" : "stable",
	"TYPE":"MCC",
	"settings" : {
		"TIME_ZONE" : "Europe/Berlin",
		"SETTINGS_SHEET_URL" : "https://docs.google.com/spreadsheets/d/1WVAKcLaM5b6hnAq30netaTlQ59OjLelCWYcHb8DapWE/edit?usp=sharing",
		"SHEET_NAME" : "settings",
		"WARNINGS_FOR_SHARE_METRICS" : true,
		"WARNINGS_FOR_COMPOUND_METRICS" : true,
		"SCRIPT_INSTANCE" : 1,
		"DOWN_SENSITIVITY" : {
			"Clicks" : 4,
			"Impressions" : 4,
			"Cost" : 4,
			"Conversions" : 4,
			"ConversionValue" : 4,
			"SearchImpressionShare" : 4,
			"SearchRankLostImpressionShare" : 4,
			"SearchBudgetLostImpressionShare" : 4,
			"Cpo" : 4,
			"Ctr" : 5,
			"Cpc" : 4,
			"Cvr" : 5
		},
		"UP_SENSITIVITY" : {
			"Clicks" : 4,
			"Impressions" : 4,
			"Cost" : 4,
			"Conversions" : 7,
			"ConversionValue" : 6,
			"SearchImpressionShare" : 4,
			"SearchRankLostImpressionShare" : 4,
			"SearchBudgetLostImpressionShare" : 4,
			"Cpo" : 4,
			"Ctr" : 6,
			"Cpc" : 4,
			"Cvr" : 6
		},
		"IGNORE_LAST_HOURS" : 3,
		"ROOT_HACK" : true,
		"MIN_HACK" : true,
		"SUSPEND_FOR" : 1, 
		"DONT_RUN_UNTIL_HOUR" : 8,
		"COLOR_CODING_THRESHOLD" : 1.7,
		"CONV_LAG_HOUR" : 23,
		"MIN_ROUND_TO" : -2,
		"MAX_ROUND_TO" : 2,
		"MAILGUN" : {
			"SEND_EMAILS_THROUGH_MAILGUN" : true,
			"URL" : "https://api.mailgun.net/v3/mg.peakace.de/messages",
			"FROM" : "adwords_scripts@mg.peakace.de",
			"AUTHORISATION" : "Basic YXBpOmtleS1hYWZmMmI2MGU4MmNkMWYwOTIwYWYxNDUzZWM0MDcyOA=="
		},
		"BQ_CONV_LAG_PROJECT_ID" : "biddy-io",
		"BQ_CONV_LAG_DATASET_ID" : "anomaly_detector",
		"BQ_CONV_LAG_TABLE_NAME" : "conversion_lag",
		"ONLY_THIS_ACCOUNT" : null, 
		"SEND_DATA_TO_DEVELOPER" : false,
		"SEND_EMAILS_ONLY_TO_DEVELOPER" : false,
		"VERBOSE" : false,  
		"DEVELOPER_EMAIL" : "a.tissen@pa.ag"
	}
};

var config = JSON.parse( dataJSON.settings );
for( key in config ){
	this[ key ] = config[ key ];
}

// -------- CONSTANTS ----------------------

// -------- CONSTANTS ----------------------

var SCRIPT_NAME = 'Anomaly_Detector';

// The order of days of week is important. Don't change it!
var DAYS_OF_WEEK = [ 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday' ];

// How far do we look back for conversion lag computation?
var DAYS_TO_RETRIEVE = 90;

// ACCOUNT_LIMIT is also used for determining which accounts will be managed by this instance of the script.
// See: SCRIPT_INSTANCE.
var ACCOUNT_LIMIT = 50;
var DAYS = 24 * 3600 * 1000;
var DAY = DAYS;

// don't issue warnings for compound metrics if the denominator is < 1
var LOWEST_ALLOWED_DENOMINATOR = 1;

var NUM_DAYS = 90;

var REPORT_TYPE = 'ACCOUNT_PERFORMANCE_REPORT';

// -----------------------------------

var CONV_LAG_COLUMNS = [ 'Date', 'Conversions', 'AllConversions', 'AllConversionValue', 'ConversionValue', 'Clicks' ];

var BIGQUERY = {
	PROJECT_ID : BQ_CONV_LAG_PROJECT_ID,
	DATASET_ID : BQ_CONV_LAG_DATASET_ID,
	CONV_LAG_VIEW : 'conversion_lag_view',
	// if "empty response" occurs, then BIGQUERY_CHUNK_SIZE should be reduced
	CHUNK_SIZE : 30000,
	// DROP_EXISTING_DATASET: false,
	DROP_EXISTING_TABLES: false,
	TABLE_NAME : BQ_CONV_LAG_TABLE_NAME,
	FIELDS: {
      'date' : 'DATE',
      'request_time' : 'TIMESTAMP',
	  'account_name' : 'STRING',
      'account_id' : 'INTEGER',
      'conversions' : 'FLOAT',
      'all_conversions' : 'FLOAT',
      'all_conversion_value' : 'FLOAT',
      'conversion_value' : 'FLOAT',
	  'clicks' : 'INTEGER'
	}
};

// source: https://gist.github.com/Fluidbyte/2973986
// console.log( Object.keys( codes ).map( x => codes[x] ).filter( x => x.symbol.length == 1 ).map( x => '\'' + x.code + '\': \'' + x.symbol + '\'' ).join( ', ' ) )
var currencyCodes = { 'USD': '$', 'EUR': '€', 'CRC': '₡', 'GBP': '£', 'ILS': '₪', 'JPY': '¥', 'KRW': '₩', 'NGN': '₦', 'PHP': '₱', 'PYG': '₲', 'THB': '฿', 'UAH': '₴', 'VND': '₫', 'ZAR': 'R' };

// -----------------------------------------
// -----------------------------------------


var COLUMNS_ = [
	{ name : 'Date', 		requestInReport : true },
	{ name : 'DayOfWeek',	requestInReport : true },
	{ name : 'HourOfDay', 	requestInReport : true },
	{
		name : 'Clicks',
		requestInReport : true,
		isMetric : true,
		isActive : true,
		down : DOWN_SENSITIVITY[ 'Clicks' ],
		up : UP_SENSITIVITY[ 'Clicks' ],
		isAddable : true,
		supportingMetrics : [ 'Ctr', 'Impressions', 'SearchImpressionShare', 'SearchBudgetLostImpressionShare', 'AverageCpc' ],
	},
	{
		name : 'Impressions',
		requestInReport : true,
		isMetric : true,
		isActive : true,
		down : DOWN_SENSITIVITY[ 'Impressions' ],
		up : UP_SENSITIVITY[ 'Impressions' ],
		isAddable : true,
		supportingMetrics : [ 'SearchImpressionShare', 'SearchBudgetLostImpressionShare', 'SearchRankLostImpressionShare', 'AverageCpc' ],
	},
	{
		name : 'Cost',
		requestInReport : true,
		isMetric : true,
		isActive : true,
		down : DOWN_SENSITIVITY[ 'Cost' ],
		up : UP_SENSITIVITY[ 'Cost' ],
		isAddable : true,
		supportingMetrics : [ 'Clicks', 'SearchImpressionShare', 'SearchBudgetLostImpressionShare', 'SearchRankLostImpressionShare', 'AverageCpc' ],
	},
	{
		name : 'Conversions',
		requestInReport : true,
		isMetric : true,
		isActive : true,
		down : DOWN_SENSITIVITY[ 'Conversions' ],
		up : UP_SENSITIVITY[ 'Conversions' ],
		isAddable : true,
		supportingMetrics : [ 'Clicks', 'Ctr', 'SearchImpressionShare', 'SearchBudgetLostImpressionShare', 'SearchRankLostImpressionShare' ],
	},
	{
		name : 'ConversionValue',
		requestInReport : true,
		isMetric : true,
		isActive : true,
		down : DOWN_SENSITIVITY[ 'ConversionValue' ],
		up : UP_SENSITIVITY[ 'ConversionValue' ],
		isAddable : true,
		supportingMetrics : [ 'Conversions' ],
	},
	{
		name : 'SearchImpressionShare',
		requestInReport : WARNINGS_FOR_SHARE_METRICS,
		isMetric : true,
		isShareMetric : true,
		isActive : WARNINGS_FOR_SHARE_METRICS,
		isZeroOneBounded : true,
		down : DOWN_SENSITIVITY[ 'SearchImpressionShare' ],
		up : UP_SENSITIVITY[ 'SearchImpressionShare' ],
		supportingMetrics : [ 'Impressions', 'SearchBudgetLostImpressionShare', 'SearchRankLostImpressionShare' ],
	},
	{
		name : 'SearchRankLostImpressionShare',
		requestInReport : WARNINGS_FOR_SHARE_METRICS,
		isMetric : true, 
		isShareMetric : true,
		isActive : WARNINGS_FOR_SHARE_METRICS,
		isZeroOneBounded : true,
		down : DOWN_SENSITIVITY[ 'SearchRankLostImpressionShare' ],
		up : UP_SENSITIVITY[ 'SearchRankLostImpressionShare' ],
		supportingMetrics : [ 'Impressions', 'Cpc', 'SearchImpressionShare' ],
	},
	{
		name : 'SearchBudgetLostImpressionShare',
		requestInReport : WARNINGS_FOR_SHARE_METRICS,
		isMetric : true,
		isShareMetric : true,
		isActive : WARNINGS_FOR_SHARE_METRICS,
		isZeroOneBounded : true,
		down : DOWN_SENSITIVITY[ 'SearchBudgetLostImpressionShare' ],
		up : UP_SENSITIVITY[ 'SearchBudgetLostImpressionShare' ],
		supportingMetrics : [ 'Impressions', 'Cost', 'SearchImpressionShare' ],
	},
	{
		name : 'Cpo',
		enumerator : 'Cost',
 		denominator : 'Conversions',
		isCompoundMetric : true,
		isMetric : true,
		isActive : WARNINGS_FOR_COMPOUND_METRICS,
		down : DOWN_SENSITIVITY[ 'Cpo' ],
		up : UP_SENSITIVITY[ 'Cpo' ],
		supportingMetrics : [ 'Conversions', 'Cost' ],
	},
	{
		name : 'Ctr',
		enumerator : 'Clicks',
		denominator : 'Impressions',
		isCompoundMetric : true,
		isMetric : true,
		isActive : WARNINGS_FOR_COMPOUND_METRICS,
		isZeroOneBounded : true,
		down : DOWN_SENSITIVITY[ 'Ctr' ],
		up : UP_SENSITIVITY[ 'Ctr' ],
		supportingMetrics : [ 'Clicks', 'Impressions' ],
	},
	{
		name : 'Cpc',
		enumerator : 'Cost',
 		denominator : 'Clicks',
		isCompoundMetric : true,
		isMetric : true,
		isActive : WARNINGS_FOR_COMPOUND_METRICS,
		down : DOWN_SENSITIVITY[ 'Cpc' ],
		up : UP_SENSITIVITY[ 'Cpc' ],
		supportingMetrics : [ 'Ctr', 'Impressions', 'Cost' ],
	},
	{
		name : 'Cvr',
		enumerator : 'Conversions',
		denominator : 'Clicks',
		isCompoundMetric : true,
		isMetric : true,
		isActive : WARNINGS_FOR_COMPOUND_METRICS,
		isZeroOneBounded : true,
		down : DOWN_SENSITIVITY[ 'Cvr' ],
		up : UP_SENSITIVITY[ 'Cvr' ],
		supportingMetrics : [ 'Conversions', 'Clicks' ],
	},
];

function loadData( sheetUrl, sheetName ){
	var sheet = initSheet( sheetUrl, sheetName );
	
	var res = {};
	sheet.getRange( 1, 1, Math.max( 1, sheet.getLastRow() ), Math.max( 1, sheet.getLastColumn() ))
		.getValues()
		.forEach( function( row ){
			// remove the first item from array and use it as a key
			var key = row.splice( 0, 1 )[ 0 ];
			if( !key || key == '' ){
				// ignore empty rows ( for example when sheet is empty (size=1x1) )
				return;
			}
			//Logger.log( 'key: ' + key + ' type: ' + (typeof key) );
			res[ key ] = row;	
		}
	);
	return res;
}

function objToDate( obj ){
	var arr = obj[ 'Date' ].split('-');
	return new Date( arr[ 0 ], arr[ 1 ] - 1, arr[ 2 ] );
}

// alias for property()
function to( propertyName ){
	return property( propertyName );
}

function property( propertyName ){
	var f = function( item ){
		return item[ propertyName ]
	};
	f.name1 = propertyName; // this improves groupBy() output
	f.equals = function( value ){
		return function( item ){
			return item[ propertyName ] == value;
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

function and( predicate1, predicate2 ){
	return function( x ){
		return predicate1( x ) && predicate2( x );
	};
}

Object.values = Object.values || ( function( obj ){
	return Object.keys( obj ).map( function( key ){
		return obj[key]
	} )
} );
String.trim = function( value ){
	return value.trim();
};

function toMap( arr, attribute ){
	var res = {};
	arr.forEach( function( row ){
		if ( row[attribute] !== undefined ) res[row[attribute]] = row;
		delete row[attribute];
	} );
	return res;
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
			obj['isActiveClone'] = null;
			temp[key] = clone( obj[key] );
			delete obj['isActiveClone'];
		}
	}
	return temp;
}

function partition( arr ){
	return {
		by: function( keyName ){
			var res = {};

			for ( var i = 0; i < arr.length; i++ ){
				var obj = clone( arr[i] );
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

function groupBy( arr, metrics ){
	function attributes( obj ){
		return function( attr ){
			return obj[attr];
		};
	}

	function checkValidity( item, metric ){
		if ( item[metric] === undefined ){
			throw new Error( 'Seems like items have no value ( undefined ) for supplied metric \'' + metric + '\'. item: ' + JSON.stringify( item ) );
		}
	}

	function adjust( obj, key ){
		if ( typeof metrics[key] == 'function' ){
			return [metrics[key]];
		}
		return typeof obj[key] == 'undefined' ? [] : typeof obj[key] == 'string' ? [obj[key]] : obj[key];
	}

	var keys;
	if ( metrics.keys ){
		keys = adjust( metrics, 'keys' );
	} else if ( metrics.key ){
		keys = adjust( metrics, 'key' );
	}

	if ( !keys ){
		throw new Error( 'Expected a non-empty array \'keys\', but got ' + keys );
	}

	var res = Object.values( arr.reduce( function( prev, item ){
		var key = keys.map( function( key ){
			if ( typeof key == 'string' ){
				return item[key];
			} else if ( typeof key == 'function' ){
				return key( item );
			}
		} ).join( '' );

		prev[key] = prev[key] || {count: 0};
		var obj = prev[key];

		// Just copy the keys into result obj.
		keys.forEach( function( key, index ){
			if ( typeof key == 'string' ){
				obj[key] = item[key];
			} else if ( typeof key == 'function' ){
				obj[key.name ? key.name : key.name1 ? key.name1 : 'key' + index] = key( item );
			}
		} );

		adjust( metrics, 'sum' ).forEach( function( metric ){
			checkValidity( item, metric );
			obj[metric] = ( ( obj[metric] || 0 ) + item[metric] );
		} );

		adjust( metrics, 'avg' ).forEach( function( metric ){
			checkValidity( item, metric );
			obj[metric] = ( ( obj[metric] || 0 ) * obj.count + item[metric] ) / ( obj.count + 1 );
		} );

		for ( var weight in ( metrics.weightedAvg || {} ) ){
			adjust( metrics.weightedAvg, weight ).forEach( function( metric ){
				checkValidity( item, metric );
				var oldSumOfWeights = ( obj['sum_' + weight] || 0 );
				obj['sum_' + weight] = oldSumOfWeights + item[weight];
				obj[metric] = ( ( obj[metric] || 0 ) * oldSumOfWeights + item[metric] * item[weight] ) / obj['sum_' + weight];
			} );
		}

		obj.count++;

		return prev;
	}, {} ) );

	// clean up
	res.forEach( function( x ){
		delete x['count'];
		for ( var weight in ( metrics.weightedAvg || {} ) ){
			delete x['sum_' + weight];
		}
	} );

	return res;
};


// #######################

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
	var sheet = initSheet( sheetUrl, sheetName );
	return loadSheet2( sheet );
}


// #######################


// ####################################################
// ####################################################

function sendEmail( recipient, subject, text, html ){
	if( !text && !html ){
		throw new Error( 'Whether text-body nor html supplied for email.' );
	}
	if( MAILGUN.SEND_EMAILS_THROUGH_MAILGUN ){
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
			name: SCRIPT_NAME + SCRIPT_INSTANCE,
			htmlBody : html
		}
	);
}

function mailGunSender( recipient, subject, text, html ){
	if ( html ){
		if ( !text ){
			text = 'this is supposed to be a html email. Seems like your device doesn\'t support html emails.';
		}
		//html = '<html><body>' + html + '</body></html>';
	} else {
		html = null;
	}
	Logger.log( 'fetch URL' );

	return UrlFetchApp.fetch(
		MAILGUN.URL,
		{
			method : 'post',
			payload : {
				from : MAILGUN.FROM,
				to: recipient,
				subject : subject,
				text : text,
				html : html,
			},
			headers : {
				Authorization : MAILGUN.AUTHORISATION,
			}
		}
	 );
}

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

function roundTo( digits ){
	return function( value ){
		return roundX( value, digits )
	};
}

function roundX( value, digits ){
	if( value === null || value === undefined ){
		return value;
	}
	var dec = Math.pow( 10, digits == undefined ? 2 : digits );
	return Math.round( value * dec ) / dec;
}

function roundTodSignificantDigits( value, digits, min, max ){
	var digits2 = digits - 1 - Math.floor( Math.log( value ) / Math.log( 10 ) );
	if( value <= 0 ){
		digits2 = 0;
	}
	var digits3 = digits2;
	digits3 = min != undefined ? Math.max( digits3, min ) : digits3;
	digits3 = max != undefined ? Math.min( digits3, max ) : digits3;
	
	//Logger.log( 'value: ' + value + ';digits: ' + digits + '; digits2: ' + digits2 + '; digits3: ' + digits3 + '; min: ' + min + '; max: ' + max   );
	
	return roundX( value , digits3 );
}

function isNumeric( n ){
	return !isNaN( parseFloat( n ) ) && isFinite( n );
}

function assertEqual( value1, value2, message ){
	if ( !value1 == value2 ){
		throw new Error( message ? message : ( value1 + ' is not equal to ' + value2 ) );
	}
}

function parseValue( value ){
	if ( value === undefined ){
		return undefined;
	}
	if ( value === null || value.trim() == '--' ){
		return null;
	}
	if ( value.substring( value.length - 1 ) == '%' ){
		var x = value.substring( 0, value.length - 1 );
		if( x.charAt( 0 ) == '<' || x.charAt( 0 ) == '>' ){
			x = x.substring( 1 );
		}
		x = x / 100;
		return x;
	}
	if ( !isNumeric( value.toString().replace( /,/g, '' ) ) ){
		return value;
	}
	return value.toString().replace( /,/g, '' ) / 1;
}

function parse( report, fields ){
	var myRows = [];
	var iter = report.rows();
	while ( iter.hasNext() ){
		var row = iter.next();
		var myRow = {};

		for ( index in fields ){
			var field = fields[ index ];

			myRow[ field ] = parseValue( row[ field ] );
		}
		myRows.push( myRow );
	}
	return myRows;
}

function retrieveReport( fields, refDate, days ){
	var query = ''
		+ ' SELECT ' + fields.join( ', ' )
		+ ' FROM ' + REPORT_TYPE
		+ ' DURING ' + getDateInThePast( refDate, days ) + ',' + getDateInThePast( refDate, 0 );

	//Logger.log( query );

	return parse( AdWordsApp.report( query ), fields );
}


//####################################################
//####################################################
//####################################################

var COLUMN_TYPES = {
	STRING: 'STRING',
	ACCOUNT_ID: 'ACCOUNT_ID',
	EMAIL: 'EMAIL',
	TIME: 'TIME',
	DATE: 'DATE',
	UNKNOWN: 'UNKNOWN'
};

function detectType( value ){
	var res =
		// account_id's must contain 10 digits and must not contain anything else ( besides whitespaces and minus-signs )
		value.replace( /[^0-9]/g, '' ).length == 10 && value.replace( /[0-9-\s]/g, '' ).length == 0 ? COLUMN_TYPES.ACCOUNT_ID :
			// emails must contain @
			/[@]/i.test( value ) ? COLUMN_TYPES.EMAIL :
				// times must contain 2 digits, followed by : followed by 2 digits and nothing else
				/^\d\d:\d\d$/.test( value ) ? COLUMN_TYPES.TIME :
					// dates must be of following form: xx.xx.xxxx
					/^\d\d\.\d\d\.\d\d$/.test( value ) ? COLUMN_TYPES.DATE :
						// strings must contain chars and must not contain @
						/[a-z]/i.test( value ) && !/[@]/i.test( value ) ? COLUMN_TYPES.STRING :
							// something other
							COLUMN_TYPES.UNKNOWN;
	return res;
}

function mode( arr ){
	frequencies = {};
	mostFrequentValue = null;
	highestFrequency = 0;
	for ( var index in arr ){
		var value = arr[index];
		frequencies[value] = frequencies[value] ? frequencies[value] + 1 : 1;

		if ( highestFrequency < frequencies[value] ){
			mostFrequentValue = value;
			highestFrequency = frequencies[value];
		}
	}
	return mostFrequentValue;
}

function first( arr ){
	return arr[0];
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

function takeFirst( n ){
	var n = n || 1;
	return function( x, index ){
		return index < n;
	};
}

function skipFirst( n ){
	var n = n || 1;
	return function( x, index ){
		return index >= n;
	};
}

function detectColTypes( matrix ){

	var cellTypes = [
		// [ account_id, account_id, emails, ... ], [ times, times, times, ... ], ...
	];

	// detectType for each cell
	matrix
	// consider only at max the first 200 rows to reduce computation-time
		.filter( skipFirst( 1 ) )
		.filter( takeFirst( 200 ) )
		.forEach( function( row ){
			row.forEach( function( cell, column ){
				cellTypes[column] = ( cellTypes[column] || [] ).push( detectType( cell ) );
			} );
		} );

	// decide on column-types here
	var columnTypes = cellTypes
	// ignore parse_errors for the purpose of determining column type
		.map( function( arr ){
			return arr.filter( function( possibleType ){
				return COLUMN_TYPES.UNKNOWN != possibleType
			} )
		} )
		// assign the most probable type according to frequency of occurrence
		.map( mode )
		// replace null by UNKNOWN
		.map( function( type ){
			return type || COLUMN_TYPES.UNKNOWN
		} );

	return columnTypes;
}

function avg2( last, current, index ){
	return ( last * index + current ) / ( index + 1 );
}

function anylyseColumn( regexArr, arr ){
	return regexArr.map( function( regex ){
		return arr.map( function( value ){
			return value.replace( regex, '' ).length
		} ).reduce( avg2 );
	} );
}

function detectHeaderRow( matrix ){
	var indicators = [/( ?!x )x/, /\D/g, /[^@]/g, /[^-]/g, /[^:]/g, /[^a-z]/gi];

	var firstRow 		= matrix.filter( takeFirst() );
	var withoutFirstRow = matrix.filter( skipFirst() );

	// Compute indicator-matrix for all rows except the first.
	// It's a m x n matrix, where m = count columns and n = count indicators
	var indicatorH = transpose( withoutFirstRow ).map( function( col ){
		return anylyseColumn( indicators, col );
	});
	// Compute indicator-matrix for first row.
	// It's a m x n matrix, where m = count columns and n = count indicators
	var indicatorFirstRow = transpose( firstRow ).map( function( col ){
		return anylyseColumn( indicators, col );
	});

	return indicatorH.map( function( ind, index ){
		return ind.map( function( y, index2 ){
			// Use the difference between indicators of first row and all other rows as predictor.
			// Low values indicate similarity between first row and other rows.
			return Math.abs( y - indicatorFirstRow[ index ][ index2 ] );
		} )
		.reduce( add, 0 ); // sum of all indicators
	}).reduce( avg2 ); // average over all columns
}

/*
* argument 'headerRow' - an array of strings
* return - an array of detected headers ( or unknown if not recognised )
*/
function detectHeaders( headerRow ){
	
	var expectedHeaders = {
		'Account-Name' : { name : 'accountName' },
		'Account-Id' : { name : 'accountId' },
		'ocid' : { name : 'ocid' },
		'Emails (comma-separated)' : { name : 'emails', isList : true },
		'pause until yyyy-mm-dd' : { name : 'pauseUntil' },
		'executive email' : { name : 'execEmails', isList : true },
		'exec hours' : { name : 'execTimes', isList : true }
	};
	
	var missing = Object.keys( expectedHeaders )
		.filter( function( expectedHeader ){ return headerRow.indexOf( expectedHeader ) == -1 } )
		.map( function( x ){ return expectedHeaders[ x ].name } );
	
	if( missing.length > 0 ){
		throw new Error( 'Missing following headers: ' + JSON.stringify( missing ) );
	}
	
	return headerRow.map( function( x ){ return expectedHeaders[ x ] || { name : 'unknown', unusedHeader : true } } );
}

function parseSettings( matrix, scriptInstance ){
	// cast numbers to strings
	matrix = matrix.map( function( row ){ return row.map( function( value ){ return value + ''; } ) } );
	
	if( detectHeaderRow( matrix ) ){
		var headers = detectHeaders( matrix[0] );
		
		var res1 = matrix
			.filter( skipFirst() ) // skip headers
			// Take only 50 rows. scriptInstance defines which 50 rows to take
			.filter( function( item, index ){ return index >= ( scriptInstance - 1 ) * ACCOUNT_LIMIT && index < scriptInstance * ACCOUNT_LIMIT })
			.map( function( row ){
				var res = {};

				for( var col = 0; col < row.length; col++ ){
					var header = headers[ col ];
					if ( header.name == 'unknown' ){
						// ignore not recognized columns
						continue;
					}
					if( header.isList ){
						res[ header.name ] = row[ col ].split( ',' ).map( function( x ){ return x.trim() } );
					}else{
						res[ header.name ] = row[ col ];
					}
				}
				return res;
			} );
		return res1;
	} else {
		throw new Error( 'Sheet contains no headers' );
	}
}

function nonZeroDiff( a, b ){
	if ( a - b == 0 ){
		return .000001;
	}
	return a - b;
}

function addThousendDelimiters( value ){
	value = value + '';
	
	var index = value.indexOf( '.' );
	if( index == -1 ){
		index = value.length;
	}
	while( index > 3 ){
		index -= 3;
		value = value.substring( 0, index ) + ',' + value.substring( index );
	}
	return value;
}

function formatForEmailNew( allAlerts ){
	function formatMetric( name, value, currency, originalValue ){
		//Logger.log( 'formatMetric( ' + JSON.stringify( name ) + ', ' + value + ', ' + originalValue );
		var round1 = roundTo( 1 );
		var digits = 2;
		var minDigits = MIN_ROUND_TO;
		var maxDigits = MAX_ROUND_TO;
		var round_ = roundTodSignificantDigits;
		
		var percentMetrics = [ 'Ctr', 'Cvr', 'SearchImpressionShare', 'SearchBudgetLostImpressionShare', 'SearchRankLostImpressionShare' ];
		
		if( percentMetrics.indexOf( name ) >= 0 ){
			value *= 100;
		}
		
		var res = round_( value, digits, minDigits, maxDigits ) + '';
		
		res = addThousendDelimiters( res );
		
		var currencySymbol = currencyCodes[ currency ] || '€';
		
		var suffix = percentMetrics
			.indexOf( name ) >= 0 ? '%' : 
			[ 'Cpc', 'Cpo', 'Cost', 'ConversionValue' ].indexOf( name ) >= 0 ? currencySymbol : ''; 
		
		res = res + suffix;
		
		if( [ 'Conversions', 'ConversionValue' ].indexOf( name ) >= 0 && originalValue != undefined ){
			var diff = value - originalValue;
			
			var v1 = round_( originalValue, digits, minDigits, maxDigits );
			var v2 = round_( diff, digits, minDigits, maxDigits );
			
			var sign = v2 > 0 ? '+' : '';
			
			v1 = addThousendDelimiters( v1 );
			v2 = addThousendDelimiters( v2 );
			
			res = v1 + suffix + ' (' + sign + v2 + suffix + ')';
			
		}
		
		return res;
	}

	function rename( metric ){
		// rename to make it shorter and clearer
			
		if( metric == 'SearchBudgetLostImpressionShare' ){
			return 'Lost by Budget';
		}
		if( metric == 'SearchRankLostImpressionShare' ){
			return 'Lost by Rank';
		}
		if( metric == 'SearchImpressionShare' ){
			return 'Impression Share';
		}
		if( metric == 'AverageCpc' ){
			return 'Average Cpc';
		}
		if( metric == 'ConversionValue' ){
			return 'Conversion Value';
		}
		if( metric == 'ConversionValuePerClick' ){
			return 'Conversion Value per Click';
		}
		if( metric == 'ConversionValuePerCost' ){
			return 'Conversion Value per Cost';
		}
		return metric;
	}

	function formatDays( value ){
		return 'today ' + ( value > 0 ? ( value > 1 ? '+ last ' + value + ' days' : '+ yesterday' ) : '' );
	}
	var html = '<!DOCTYPE html>\
<html lang="de">\
<head>\
    <meta http-equiv="Content-Type" content="text/html charset=UTF-8" />\
    <meta content="telephone=no" name="format-detection">\
    <meta name="viewport" content="width=device-width, initial-scale=1.0">\
    <meta http-equiv="X-UA-Compatible" content="ie=edge">\
    <title>Document</title>\
    <style>\
        td, th {\
            vertical-align: middle;\
        }\
        .header,\
        span.gray,\
        span.green,\
        span.red {\
            color: #fff\
        }\
        .email-container {\
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";\
            font-size: 14px\
        }\
        a[x-apple-data-detectors] {\
            color: inherit !important;\
            text-decoration: none !important;\
        }\
        #logo td{\
            background: #fe0000;\
            color: #fff;\
            padding: 7px 15px;\
            display: inline-block;\
        }\
        #anomaly {\
            margin-bottom: 15px;\
        }\
        #anomaly .header {\
            background-color: #007499;\
            overflow: hidden\
        }\
        #anomaly .header .account {\
            text-align: left;\
            font-size: 20px;\
            font-weight: 700\
        }\
        #anomaly .header .account-id {\
            text-align: right;\
            line-height: 27px\
        }\
        #anomaly .header a {\
            color: #fff!important;\
            text-decoration: none;\
        }\
        #anomaly .stats {\
            padding: 10px 10px 0;\
        }\
        #anomaly, #anomaly table{\
            width: 100%;\
            text-align: center\
        }\
        #anomaly tr.regular {\
            background: #f2f2f2;\
            text-align: center;\
        }\
        #anomaly td span.title {\
            display: none;\
        }\
        @media only screen and (max-width:800px) {\
            #anomaly .header td {\
                width: 100%;\
                display: block;\
                text-align: center!important;\
                float: none\
            }\
            #anomaly .stats {\
                padding: 0;\
            }\
            #anomaly table,\
            #anomaly tbody,\
            #anomaly td,\
            #anomaly th,\
            #anomaly thead,\
            #anomaly tr {\
                display: block\
            }\
            #anomaly tr.irregular {\
                display: table-row\
            }\
            #anomaly tr.irregular td {\
                display: table-cell;\
                padding-left: 0\
            }\
            #anomaly thead tr {\
                display: none;\
            }\
            #anomaly tr.regular {\
                border: 1px solid #f1f1f1;\
                padding: 10px 0;\
                margin: 0\
            }\
            #anomaly tr.regular td {\
                border: none;\
                border-bottom: 1px solid #f1f1f1;\
                padding: 5px 20px 5px 20px;\
                position: relative;\
                white-space: normal;\
                text-align: right\
            }\
            #anomaly tr.regular td.metric {\
                padding: 10px;\
                text-align: left;\
                font-size: 18px\
            }\
            #anomaly td span.title {\
                display: inherit;\
                float: left;\
                font-weight: 700;\
            }\
            #anomaly tr.irregular td {\
                text-align: left!important;\
                padding: 20px 0 30px!important\
            }\
        }\
        #anomaly tr .irregular td {\
            text-align: right;\
            padding: 15px 0 30px\
        }\
        #anomaly tr .irregular td .metric {\
            display: inline-block;\
            margin: 0 0 0 20px\
        }\
        span,\
        span.gray,\
        span.green {\
            padding: 0 5px\
        }\
        span {\
            font-weight: 700\
        }\
        span.red {\
            background: red\
        }\
        span.yellow {\
            background: #ffd800;\
            color: #fff\
        }\
        span.green {\
            background: green\
        }\
        span.gray {\
            background: #a6a6a6\
        }\
        i.yellow {\
            color: #ffd800\
        }\
        i.green {\
            color: green\
        }\
        i.red {\
            color: red\
        }\
        i.metric {\
            font-style: normal;\
            margin-left: 10px;\
        }\
    </style>\
</head>\
<body>\
<div class="email-container">\
    <table id="logo" cellpadding="15" cellspacing="0" border="0" >\
        <tbody>\
            <tr>\
                <td>ANOMALY DETECTOR</td>\
            </tr>\
        </tbody>\
    </table>\
    <table id="anomaly" cellpadding="0" cellspacing="0" border="1" bordercolor="#d2d2d2">\
	'
	;
	
	var alerts = partition( allAlerts ).by( 'accountName' );
	
	
	for( var accountName in alerts ){
		
		var accountAlerts = alerts[ accountName ];

		
		
		html +=
			'<tr>\
            <td>\
                <table class="header" cellpadding="10" cellspacing="0" border="0" >\
                    <tbody>\
                    <tr>\
							<td class="account">' + accountName + '\
								' + ( accountAlerts[ 0 ].ocid ? '\
									<a href="https://adwords.google.com/aw/campaigns?ocid=' + accountAlerts[ 0 ].ocid + '">\
										<img src="https://www.pa.ag/wp-content/uploads/email/icon-link.png">\
									</a>' : '' 
									) + '\
							</td>\
							<td class="account-id">Account-ID: ' + accountAlerts[ 0 ].accountId + '</td>\
						</tr>\
						</tbody>\
					</table>\
					<table class="stats">\
						<tbody>\
							<tr>\
								<td>\
									<table cellpadding="10" cellspacing="0" border="0" >\
										<thead>\
											<tr>\
												<th>Metric</th>\
												<th>Date range</th>\
												<th>Lower Bound</th>\
												<th>Avr</th>\
												<th>Upper Bound</th>\
												<th>Found</th>\
											</tr>\
										</thead>\
										<tbody>\
										'
		;
		
		
		accountAlerts.forEach( function( alert1 ){
			var name = alert1.metric.name;
			var down = ( alert1.avg - alert1.currentValue ) / nonZeroDiff( alert1.avg, alert1.lowerBound );
			var up = ( alert1.currentValue - alert1.avg ) / nonZeroDiff( alert1.upperBound, alert1.avg );
			var scalingFactor = Math.max( down, up );
			// yellow or red warning?
			var color = scalingFactor > COLOR_CODING_THRESHOLD ? 'red' : 'yellow';
			
			html += '<tr class="regular">\
							<td class="metric"><i class="' + color + '">•</i> <b>' + rename( alert1.metric.name ) + '</b></td>\
							<td><span class="title">Date Range</span>' + formatDays( alert1.daysBack ) + '</td>\
							<td><span class="title">Lower Bound</span>' + formatMetric( name, alert1.lowerBound, alert1.currency )  + '</td>\
							<td><span class="title">AVR</span>' + formatMetric( name, alert1.avg, alert1.currency )  + '</td>\
							<td><span class="title">Upper Bound</span>' + formatMetric( name, alert1.upperBound, alert1.currency )  + '</td>\
							<td><span class="title">Found</span><span class="' + color + '">'
								+ formatMetric( name, alert1.currentValue, alert1.currency )
								+ ( typeof alert1.currentValueOriginal != 'undefined' ? ' ( + ' + formatMetric( name, alert1.currentValue - alert1.currentValueOriginal, alert1.currency ) + ' ) ' : '' )
								+ '</span></td>\
						</tr>'
			;
			alert1.supportingMetrics = alert1.supportingMetrics.filter( function( metric ){
					// TODO: when impression-share-metrics are implemented this needs to be evaluated anew.
					return metric.was != undefined;
			});
			
			if( alert1.supportingMetrics.length > 0 ){
				html += '<tr class="irregular" >\n';
				html += '<td colspan=6>\n';
				
				alert1.supportingMetrics.sort( function( a, b ){
					var a_ = a.is / a.was; // TODO: division by zero?
					var b_ = b.is / b.was; // TODO: division by zero?
					
					if( a_ < 1 ){ a_ = 1 / a_ }; // TODO: division by zero?
					if( b_ < 1 ){ b_ = 1 / b_ }; // TODO: division by zero?
					
					// DESC
					return b_ - a_;
				});
				
				html += alert1.supportingMetrics.map( function( metric ){
					var res = '<i class="metric">\n'
						+ '<b class="title">' + rename( metric.name ) + ': </b>'
						+ formatMetric( metric.name, metric.was, alert1.currency, metric.wasOriginal  ) + ' '
						+ ( metric.mostImportant ? '<span class="gray">' : '<b>' )
						+ ' > '
						+ formatMetric( metric.name, metric.is, alert1.currency, metric.isOriginal )
						+ ( metric.mostImportant ? '</span>\n' : '</b>' )
						+ '</i>\n'
					;
					return res;
				}).reduce( function( a, b ){ return a + b }, '');
				
				html += '</td>\n';
				html += '</tr>';
			}
		});
		
		html += '\
						</tbody>\
					</table>\
				</td>\
			</tr>\
						</tbody>\
					</table>\
				</td>\
			</tr>\
		';
	}
	html += '</table>';
	
	html += '<a href="' + SETTINGS_SHEET_URL + '">Settings-Sheet</a>';
	html += '</div></body></html>';
	return html;
}

function main(){
	
	var now = new Date( Utilities.formatDate( new Date(), TIME_ZONE, 'MMM dd,yyyy HH:mm:ss' ) );
	var hour = now.getHours();
	if( hour < DONT_RUN_UNTIL_HOUR ){
		print( 'terminating', 'don\'t run until ' + DONT_RUN_UNTIL_HOUR + ' oclock' );
		return;
	}
	Logger.log( 'now: ' + now );
	
	var settings = parseSettings( loadSheet( SETTINGS_SHEET_URL, SHEET_NAME ), SCRIPT_INSTANCE );
	var mccName = AdWordsApp.currentAccount().getName();
	var accountIds = settings.map( property( 'accountId' ) ).filter( function( x ){ return x.match( /^\d\d\d-\d\d\d-\d\d\d\d$/ ) != null } );
	
	// Logger.log( JSON.stringify( settings, null, '\t' ) );
	//return;
	
	if( accountIds.length == 0 ){
		// Account selector .withIds() ignores empty arrays, as it seems.
		// Therefore quit before calling it.
		Logger.log( 'No accounts are eligable for instance ' + SCRIPT_INSTANCE + ' of this script.' );
		Logger.log( 'Quit' );
		return;
	}

	try {
		Logger.log( 'Account_ids: ' + JSON.stringify( accountIds, null, '\t' ) );

		var lagData = computeDiffsBQVersion();
		
		if( typeof MccApp == 'undefined' ){
			var result = processAccount( JSON.stringify( { mccName : mccName, settings : settings, lagData : lagData } ) );
			finalProcessing( [ { getReturnValue : function(){ return result },
				getCustomerId : function(){ return AdWordsApp.currentAccount().getCustomerId() } } ] );
		}else{
			var app = MccApp
				.accounts()
				.withIds( accountIds );
			
			if( ONLY_THIS_ACCOUNT ){
				app = app.withIds( [ ONLY_THIS_ACCOUNT ] );
			}
			
			app.withLimit( ACCOUNT_LIMIT )
				.executeInParallel( 'processAccount', 'finalProcessing', JSON.stringify( { mccName : mccName, settings : settings, lagData : lagData } ) );	
		}
	} catch ( error ){
		Logger.log( 'Error in ' + SCRIPT_NAME + SCRIPT_INSTANCE + ' ' + mccName + ' -> ' + error + '\n' + error.stack );
		sendEmail( DEVELOPER_EMAIL, 'Error in ' + SCRIPT_NAME + SCRIPT_INSTANCE + ' ' + mccName, error + '\n' + error.stack );
		throw error;
	}
}

function stringToDate( str, delimiter ){
	delimiter = delimiter || '-';
	if ( delimiter == '.' ){
		// escape delimiter for use as regex
		delimiter = '\\.';
	}
	var arr = str.split( delimiter );
	if ( arr[0].length >= 4 ){
		// YYYY-MM-DD
		return new Date( arr[0], arr[1] - 1, arr[2] );
	} else {
		// DD-MM-YYYY
		return new Date( arr[2], arr[1] - 1, arr[0] );
	}
}

function computeNow(){
	var now = new Date( Utilities.formatDate( new Date(), TIME_ZONE, 'MMM dd,yyyy HH:mm:ss' ) );
	var hoursToRemove = Math.min( now.getHours(), IGNORE_LAST_HOURS );
	now.setTime( now.getTime() - hoursToRemove * 1000 * 60 * 60 );
	return now;
}

function processAccount( params ){
	try{
		
		var account = AdWordsApp.currentAccount();
		var accountId = account.getCustomerId();
		var bqAccountId = accountId.replace( /-/g, '' );
		if( account.getName().trim() == '' ){
			return;
		}
		
		var params = JSON.parse( params );
		
		var mccName = params.mccName;

		// -----------------------------------------------
		// -----------------------------------------------
		//Logger.log( 'load conversion_lag data' );
		var conversionLagData = params.lagData
			.filter( function( obj ){
				return obj.accountId == bqAccountId;
			})
		;
		
		//Logger.log( account.getName() + ' lag-data: ' + allData.length + ' -> ' + account.getCustomerId().replace( /-/g, '' ) );
		//Logger.log( ( account.getCustomerId().replace( '-', '' ) == 1209530348 ) + '' + ( account.getCustomerId().replace( '-', '' ) == '1209530348' ) );
		
		
		if( conversionLagData.length < 90 ){
			Logger.log( account.getName() + ' too few lag-data: ' + conversionLagData.length );
		}
		
		var lagData = {};
		conversionLagData.forEach( function( item ){
			lagData[ item.day ] = item;
		});
		
		//Logger.log( account.getName() + ' lagData: ' + JSON.stringify( lagData, null, 2 ) );
		//return;
		// -----------------------------------------------
		// -----------------------------------------------
		
		var settings = params.settings;
		
		var settingForthisAccount = settings.filter( function( setting ){ return setting.accountId == accountId } )[0];
		var ocid = ( settingForthisAccount || {} ).ocid;
		var now = computeNow();

		var now2 = new Date( Utilities.formatDate( new Date(), TIME_ZONE, 'MMM dd,yyyy HH:mm:ss' ) );
		if( now2.getHours() == CONV_LAG_HOUR ){
			Logger.log( 'compute and save conv lag' );
			saveConvLag2( now2 );
		}
		
		Logger.log( account.getName() );
		

		if( VERBOSE )print( 'now', now );

		// Logger.log( 'now: hours: ' + now.getHours() + '. day: ' + now.getDay() + '. date : ' + now.getDate() );

		// Logger.log( 'retrieve reports' );

		var metricRows = retrieveReport( COLUMNS_.filter( property( 'requestInReport' ) ).map( property( 'name' ) ), now, DAYS_TO_RETRIEVE );

		if( SEND_DATA_TO_DEVELOPER && ONLY_THIS_ACCOUNT ){
			sendEmail( DEVELOPER_EMAIL, 'Data from ' + SCRIPT_NAME + SCRIPT_INSTANCE + ' ' + mccName, JSON.stringify( metricRows ) + '\n\n-------\n\n' + JSON.stringify( conversionLagData ) );
		}
		
		var alerts = func( metricRows, lagData, now, accountId, ocid, account.getName() );

		// Remove less specific alerts.
		// If there is an alert for today, then for example we don't need an alert for today+yesterday.
		alerts = alerts.filter( function( alert1 ){
			var res1 = alerts
				.filter( function( a ){ return a.metric.name == alert1.metric.name } )
				.filter( function( a ){ return a.daysBack < alert1.daysBack } )
				.length === 0;
			return res1;
		});
		
		// I tried to remove alerts which are based on too few data
		/*
		alerts = alerts.filter( function( alert1 ){
			if( alert1.isCompoundMetric ){
				if( alert1.metric.name == 'cpc' ){
					return alert1.denominator > 10 
				}
			}
		});
		*/
		
		var curr = AdWordsApp.currentAccount().getCurrencyCode();
		
		alerts.forEach( function( alert ){ alert.currency = curr } );
		
		var json = JSON.stringify( alerts );

		return json;
	} catch ( error ){
		Logger.log( 'Error in ' + SCRIPT_NAME +	SCRIPT_INSTANCE + ' ' + mccName + ' - ' + account.getName() + ', ' + error + '\n' + error.stack );
		sendEmail( DEVELOPER_EMAIL,
			'Error in ' +
			SCRIPT_NAME +
			SCRIPT_INSTANCE + ' ' +
			mccName + ' - ' +
			account.getName(),
			error + '\n' +
			error.stack
		);
		throw error;
	}
}

function headerName( metric ){
	return metric;
}

function readLastReported( matrix, accountIdColumnIndex, now ){
	// res[ metric ][ accountId ] = { rowIndex : 3, value = '20.07.2017 }
	var res = {};
	COLUMNS_.forEach( function( metric ){
		var header = headerName( metric.name );
		var colIndex = matrix[ 0 ].indexOf( header );
		if ( colIndex == -1 ){
			//throw new Error( 'column ' + header + ' not found' );
			// ignore missing data
			return;
		}
		res[ metric.name ] = res[ metric.name ] || {};
		for ( var rowIndex = 1; rowIndex < matrix.length; rowIndex++ ){
			var accountId = matrix[ rowIndex ][ accountIdColumnIndex ];
			var value = matrix[ rowIndex ][ colIndex ];
			if ( value ){
				var date = matrix[ rowIndex ][ colIndex ];
				if( typeof date == 'string' ){
					// seems like google-sheet sometimes returns a date and other times a string
					date = stringToDate( date, '-' );
				}
				if( date && date.getTime && date.getTime() + SUSPEND_FOR * DAYS < now.getTime() ){
					// reset old values.
					value = '';
				}
			}
			res[ metric.name ][ accountId ] = { rowIndex: rowIndex, value: value };
		}
	});
	return res;
}

function by( prop ){
	// ASCENDING ORDER
	return function( a, b ){
		return a[ prop ] - b[ prop ];
	};
}

function setValueInSheet( sheet, headerRow, lastReported ){
	Object.keys( lastReported ).forEach( function( metric ){
		var header = headerName( metric );

		var col = headerRow.indexOf( header );
		if ( col == -1 ){
			throw new Error( 'no column ' + header + ' found.' );
		}
		var values = Object.values( lastReported[ metric ] );

		values.sort( by( property( 'rowIndex' ) ) );

		values = values.map( property( 'value' ) ).map( function( x ){
			return [ x ];
		});

		sheet.getRange( 2, col + 1, values.length, 1 ).setValues( values );
	});
}

function prepareSheet( sheet ){
	var headers = sheet.getRange( 1, 1, 1, sheet.getMaxColumns() ).getValues()[0];

	COLUMNS_.filter( property( 'isActive' ) ).forEach( function( metric ){
		var header = headerName( metric.name );

		if ( headers.indexOf( header ) < 0 ){
			// create a new column
			sheet.insertColumnAfter( sheet.getLastColumn() );
			sheet.getRange( 1, sheet.getLastColumn() + 1 ).setValue( header );
			sheet.getRange( 1, sheet.getLastColumn(), sheet.getMaxRows(), 1 ).setBackgroundRGB( 230, 230, 255 );
		}
	} );
}

function finalProcessing( results ){
	try{
		var alerts = {};
		var execAlerts = {};

		var settings = parseSettings( loadSheet( SETTINGS_SHEET_URL, SHEET_NAME ), SCRIPT_INSTANCE );
		var mccName = AdWordsApp.currentAccount().getName();
		var now = computeNow();

		var sheet = initSheet( SETTINGS_SHEET_URL, SHEET_NAME );
		prepareSheet( sheet );

		var matrix = loadSheet2( sheet );
		var accountIdColIndex = 1;
		var lastReported = readLastReported( matrix, accountIdColIndex, now );
		
		results.forEach( function( result ){
			if ( result.getReturnValue() === 'undefined' ){
				// yes, adwords scripts really returns a string 'undefined'

				// processAccount() just returns ( return; )
				return;
			}

			var resultX = JSON.parse( result.getReturnValue() );

			if ( null == resultX ){
				// seems like this is possible if a thread had an error
				return;
			}
			if ( resultX.length == 0 ){
				return;
			}

			var accountId = result.getCustomerId();

			var settingsForAccount = settings.filter( property( 'accountId' ).equals( accountId ) );
			if ( settingsForAccount.length == 0 ){
				// TODO: can this happen?
				// ignore accounts without settings
				return;
			}
			// Just take the first setting. There should be only one. If there are more then somebody did a mistake.
			var settingForThisAccount = settingsForAccount[ 0 ];
			var date = settingForThisAccount.pauseUntil;
			if( typeof date == 'string' ){
				// seems like google-sheet sometimes returns a date and other times a string
				date = stringToDate( date, '-' );
			}
			if( date && date.getTime() > now.getTime() ){
				// ignore paused accounts
				return;
			}
			
			if( settingForThisAccount.execTimes.filter( function( hour ){ return hour == now.getHours() } ).length > 0 ){
				// report to executives all alerts ( even suspended ones )
				settingForThisAccount.execEmails.forEach( function( email ){
					// Add alerts to execEmails.
					execAlerts[ email ] = ( execAlerts[ email ] || [] ).concat( resultX );
				});
			}
			
			// Filter resultX: remove suspended metrics
			resultX = resultX.filter( function( alert ){
				if( lastReported[ alert.metric.name ] === undefined ){
					print( 'no lastReported found for ', alert.metric.name );
				}
				var suspended = lastReported[ alert.metric.name ][ accountId ].value;
				if( typeof suspended == 'string' ){
					// seems like google-sheet sometimes returns a date and other times a string
					suspended = stringToDate( suspended, '-' );
				}
				if ( suspended && suspended.getTime ){
					if ( suspended.getTime() + SUSPEND_FOR * DAYS > now.getTime() ){
						return false;
					}
				}
				return true;
			});

			if ( resultX.length === 0 ){
				return;
			}

			resultX.forEach( function( alert ){
				lastReported[ alert.metric.name ][ accountId ].value = dateToString( now, '-' );
			});

			settingForThisAccount.emails.forEach( function( email ){
				// Add alerts to emails.
				alerts[ email ] = ( alerts[ email ] || [] ).concat( resultX );
			});
		});
		Logger.log( 'emails-addresses: ' + Object.keys( alerts ) );
		Logger.log( 'final-result: ' + JSON.stringify( alerts ) );

		var isPreview = AdWordsApp.getExecutionInfo().isPreview();
		
		for ( var email in alerts ){
			if( !isPreview || email == DEVELOPER_EMAIL ){
				Logger.log( 'send email to ' + email );
				var html = formatForEmailNew( alerts[ email ] );
				sendEmail( email, SCRIPT_NAME + SCRIPT_INSTANCE + ' ' + mccName + ' ' + ( isPreview ? '(Preview Mode)' : '' ), null /* no text body */, html );
			}
		}
		for ( var email in execAlerts ){
			if( !isPreview || email == DEVELOPER_EMAIL ){
				Logger.log( 'send exec-email to ' + email );
				var html = formatForEmailNew( execAlerts[ email ] );
				sendEmail( email, SCRIPT_NAME + SCRIPT_INSTANCE + ' ' + mccName + ' Executive Version ' + ( isPreview ? '(Preview Mode)' : '' ), null /* no text body */, html );
			}
		}
		
		setValueInSheet( sheet, matrix[0], lastReported );
	} catch ( error ){
		Logger.log( 'Error in ' + SCRIPT_NAME + SCRIPT_INSTANCE + ' ' + mccName + ' ' + ( isPreview ? '(Preview Mode)' : '' ) + ' ' + error + '\n' + error.stack );
		sendEmail( DEVELOPER_EMAIL, 'Error in ' + SCRIPT_NAME + SCRIPT_INSTANCE + ' ' + mccName + ' ' + ( isPreview ? '(Preview Mode)' : '' ), error + '\n' + error.stack );
		throw error;
	}
}

// #########################################
/*
 * Remove the largest and the smalles values from arra 'data'.
*/
function removeOutliers( data ){

	var indexOfMaxValue = data.reduce( function( iMax, x, i, arr ){
		return x > arr[iMax] ? i : iMax
	}, 0 );
	data.splice( indexOfMaxValue, 1 );

	var indexOfMinValue = data.reduce( function( iMin, x, i, arr ){
		return x < arr[iMin] ? i : iMin
	}, 0 );
	data.splice( indexOfMinValue, 1 );
}

function avg( data ){
	return data.reduce( add, 0 ) / data.filter( nonNull ).length;
}

function stdDeviation( data ){
	var avg1 = avg( data );
	var diffs = data.map( function( value ){
		return Math.pow( value - avg1, 2 )
	} );
	return Math.sqrt( avg( diffs ) );
}

function computeBounds( data, metric ){
	var down = metric.down;
	var up = metric.up;
	var isZeroOneBounded = !!metric.isZeroOneBounded;
	
	if ( !down || !up ){
		//throw new Exception( 'no sigma-factors defined for metric ' + metric );
		throw new Error( 'invalid arguments ( down, up ) ' );
	}
	var avg1 = avg( data );
	var stdDev = stdDeviation( data );

	var squareRootHackValue = ROOT_HACK ? Math.max( Math.sqrt( avg1 ) - 3, 0 ) : 0;

	var lowerBound = avg1 - stdDev * down - squareRootHackValue;
	var upperBound = avg1 + stdDev * up + squareRootHackValue;

	var minimalLowerBound = 0;
	var minimalUpperBound = isZeroOneBounded ? 0 : 3;
	lowerBound = Math.max( lowerBound, minimalLowerBound );
	upperBound = Math.max( upperBound, minimalUpperBound );
	
	if( MIN_HACK ){
		//lowerBound = Math.max( lowerBound, 0.00001 );
		
		var minHackValue = quantile( data, 0.1 ) / 3 - ( isZeroOneBounded ? 0 : 2 );
		lowerBound = Math.max( lowerBound, minHackValue );
	}

	return [lowerBound, upperBound];
}

function quantile( data, p ){
	if ( p < 0 || p > 1 ){
		throw new Error( 'p-argument in quantile() is out of bounds.' );
	}
	if ( data.length == 0 ){
		throw new Error( 'data-argument in quantile() is empty.' );
	}
	var data1 = data.sort( function( a, b ){
		return a - b
	} );
	var i = 1;
	while ( i / data.length < p ){
		i++;
	}
	return data[i - 1];
}


// #########################################


/*
* Computes an array with 24 floats within range [0-1] in ascending order.
* The i-th item represents the share of converions usually occouring until hourOfDay = i.
* Returns i-th item where i represents current hour of day.
* Example: [ 0.02, 0.03, 0.03, 0.03, 0.04, 0.04, 0.05, 0.07, 0.1, 0.14, 0.19, 0.25, 0.31, 0.37, 0.42, 0.49, 0.55, 0.61, 0.67, 0.74, 0.82, 0.9, 0.96, 1 ]
*/
function computeHourShare( hourMetrics, now ){

	// ASCENDING
	hourMetrics.sort( function( a, b ){
		return a['HourOfDay'] - b['HourOfDay'];
	} );

	// index corresponds to hourOfDay
	// e.g conversions[ 3 ] = 7 means 7 conversions between 3 and 4 oclock
	var conversions = hourMetrics.map( property( 'Conversions' ) );
	var conversionValues = hourMetrics.map( property( 'ConversionValue' ) );

	var sumConversions = conversions.reduce( add, 0 );
	var convShares = conversions.map( divideBy( sumConversions ) );

	var sumConversionValues = conversionValues.reduce( add, 0 );
	var convValueShares = conversionValues.map( divideBy( sumConversionValues ) );

	var accumulatedShares = acummulate( convShares ).map( roundTo( 2 ) );

	// Logger.log( 'accumulatedShares: ' + JSON.stringify( accumulatedShares ) );

	//print( accumulatedShares );

	return accumulatedShares[now.getHours()];
}

function queryBQ( table, waitLimit ){
	var queryRequest = BigQuery.newQueryRequest();
	queryRequest.query = 'SELECT * FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.' + table + '`';
	queryRequest.useLegacySql = false;
  
	var queryResults = BigQuery.Jobs.query( queryRequest, BIGQUERY.PROJECT_ID );
	var jobId = queryResults.jobReference.jobId;
	
	var counter = 0;
	waitLimit = waitLimit || 7;
	sleepTimeMs = 1000;
	
	while( ! queryResults.jobComplete && counter++ < waitLimit ){
		Logger.log( 'wait for query job to complete' );
		Utilities.sleep( sleepTimeMs );
		sleepTimeMs *= 2;
		queryResults = BigQuery.Jobs.getQueryResults( BIGQUERY.PROJECT_ID, jobId );
	}
	
	if( queryResults.jobComplete ){
		if( !queryResults.rows ){
			// empty result. return empty matrix
			return [[]];
		}
		var matrix = queryResults.rows.map( function( row ){
			return row.f.map( property( 'v' ) );
		});
		// Logger.log( matrix.length );
		return matrix;
	}
	var message = 'BQ query job is not complete after ' + Math.pow( 2, waitLimit ) + ' seconds.';
	Logger.log( message );
	throw new Error( message );
}

function computeDiffsBQVersion(){
	var maxTime = 8;
	var dayIndex = 0;
	var accountIdColumnIndex = 1;
	
	var allData = queryBQ( BIGQUERY.CONV_LAG_VIEW, maxTime );
	
	//Logger.log( 'all-lag-data: ' + allData.length );
	
	var allData = allData
		.map( function( row ){
			return {
				accountId : row[ accountIdColumnIndex ],
				day : row[ dayIndex ],
				additionalExpectedConversionsPerClick : row[ 2 ],
				additionalExpectedValuePerClick : row[ 3 ],
			}
		})
	;

	return allData;
}

/*
* arr - an arr of numeric values ordered ascending by time ( date or hour ).
* For example: [ conversions for the day before yesterday, conversions for yesterday, conversions for today ]
* returns accumulated version. Example:
* [ conversions for the day before yesterday,
*	conversions for the day before yesterday + conversions for yesterday,
*	conversions for the day before yesterday + conversions for yesterday + conversions for today ]
*/
function acummulate( arr ){
	var sum = 0;
	var res = [];
	for ( var i = 0; i < arr.length; i++ ){
		sum += arr[i];
		res[i] = sum;
	}
	return res;
}

function add( a, b ){
	return a + b;
}

function divideBy( value ){
	return function( x ){
		return x / value
	};
}

function times( value ){
	return function( x ){
		return x * value
	};
}

function firstElem( arr ){
	return arr[0];
};


// .........................................................................................

function daysBack( now ){
	return function( dayOfWeek ){
		var index = DAYS_OF_WEEK.indexOf( dayOfWeek );
		var nowIndex = now.getDay();

		var res = nowIndex - index;
		if ( res < 0 ){
			res += 7;
		}
		return res;
	};
}

function dateDiff( date1, date2 ){
	return ( date1 - date2 ) / ( 1000 * 60 * 60 * 24 );
}

function week( now ){
	return function( date ){
		return Math.floor( dateDiff( now, stringToDate( date ) ) / 7 );
	}
}

function dateToString( date, delimiter, withHours ){
	return addLeadingZeros( date.getFullYear(), 4 ) + delimiter +
		addLeadingZeros( date.getMonth() + 1, 2 ) + delimiter +
		addLeadingZeros( date.getDate(), 2 ) +
		( withHours ? ' ' + addLeadingZeros( date.getHours(), 2 ) + ':' + addLeadingZeros( date.getMinutes(), 2 ) : '' )
		;

}

function dayOfWeek( date ){
	return DAYS_OF_WEEK[date.getDay()];
}

function nonNull( value ){
	return value != null;
}

/*
* AdWords delivers no values for impression-share metrics for the last two days.
* To fix this we set the values for the last two days to the average of all data.
*/
function fixImpressionShares( data, now ){
	
	var shareMetrics = COLUMNS_.filter( property( 'isShareMetric' ) ).map( property( 'name' ) );
	
	var avgShareMetricsGroupedByDayOfWeek = toMap(
		groupBy(
			data,
			{
				key: 'DayOfWeek',
				weightedAvg: { 'Impressions' : shareMetrics }
			}
		 ),
		'DayOfWeek'
	 );
	// Problem1: can contain NaN
	// Problem2: seems like values are way too low

	if ( VERBOSE ){
		DAYS_OF_WEEK.forEach( function( x ){
			print( x + ' - SearchRankLostImprShare', avgShareMetricsGroupedByDayOfWeek[x].SearchRankLostImpressionShare )
		});
	}

	//var x = data.map( property( 'SearchRankLostImpressionShare' ) ).map( roundTo( 2 ) );
	//print( x );
	
	shareMetrics.forEach( function( metric ){
		data.forEach( function( row ){
			if ( row[ metric ] === null ){
				row[ metric ] = avgShareMetricsGroupedByDayOfWeek[ row.DayOfWeek ][ metric ];
			}
		} );
	});
	//var x = data.map( property( 'SearchRankLostImpressionShare' ) ).map( roundTo( 2 ) );
	//print( x );
	
}

function sameDayOfWeekAs( date ){
	return function( row ){
		return DAYS_OF_WEEK.indexOf( row.DayOfWeek ) == date.getDay()
	};
}

function hourUntil( date ){
	return function( row ){
		return row.HourOfDay < date.getHours()
	};
}

function hourAfter( date ){
	return function( row ){
		return row.HourOfDay > date.getHours()
	};
}

function hourBefore( date ){
	return function( row ){
		return row.HourOfDay <= date.getHours()
	};
}

function sameDateAs( date ){
	var dateAsString = dateToString( date, '-' );
	return function( row ){
		return row.Date == dateAsString;
	}
}

function onlyUnique( value, index, self ){
	return self.indexOf( value ) === index;
}

function computeShare( data, now, metric ){

	var sumMetricUntilCurHour = data
		.filter( not( sameDateAs( now ) ) )
		.filter( sameDayOfWeekAs( now ) )
		.filter( hourBefore( now ) )
		.map( property( metric ) )
		.reduce( add, 0 );

	var sumMetricWholeDay = data
		.filter( not( sameDateAs( now ) ) )
		.filter( sameDayOfWeekAs( now ) )
		.map( property( metric ) )
		.reduce( add, 0 );

	var res = sumMetricUntilCurHour / sumMetricWholeDay;

	if ( isNaN( res ) ){
		// fallback
		res = now.getHours() / 24;
	}

	return roundX( res, 2 );
}

function fixConversionLagNew( data, lagData, now ){
	
	data.map( function( row ){
		// init original values
		row.OriginalConversions = row.Conversions;
		row.OriginalConversionValue = row.ConversionValue;
		return row;
	})
	.forEach( function( row ){

			var date = stringToDate( row.Date );
			var days = Math.floor( dateDiff( now, date ) ) + 1;

			// rows which are older than 90 days don't need adjustment - set delayedConv = 0
			if( days > 90 ){
				return;
			}
			
			// var delayedConversions = ( lagData[ date.getDay() ] || [] )[ days ] || 0;
			if( typeof lagData[ days ] == 'undefined' ){
				//var x = 'WARNING: -------> ' + days + ', ' + JSON.stringify( lagData, null, 2 );
				//	Logger.log( x );
				//throw new Error( x );
				return;
			}
			
			var delayedConversions = lagData[ days ].additionalExpectedConversionsPerClick * row.Clicks;
			var delayedValue = lagData[ days ].additionalExpectedValuePerClick * row.Clicks;

			// add approximate delayed conversions and value
			row.Conversions 	+= delayedConversions;
			row.ConversionValue += delayedValue;
		}
	);
}

function computeForecastForNextHours( data, now, metric ){

	var countDays = data
		.filter( not( sameDateAs( now ) ) )
		.filter( sameDayOfWeekAs( now ) )
		.map( property( 'Date' ) )
		.filter( onlyUnique )
		.length;

	var res = data
			.filter( not( sameDateAs( now ) ) )
			.filter( sameDayOfWeekAs( now ) )
			.filter( hourAfter( now ) )
			.map( property( metric ) )
			.reduce( add, 0 )
		/ countDays;

	return roundX( res, 2 );
}

function printMetricData( data, metric, now ){
	if( VERBOSE ){
		
		var res = groupBy( data.filter( sameDayOfWeekAs( now ) ).filter( function( x ){ return x.Date != dateToString( now, '-' ) } ), 
			{
				key: property( 'Date' ),
				 sum : [ metric ]
				// weightedAvg: {'Impressions': [ metric ]}
			}
		 );
		/*
		var metricData = groupBy( data.filter( sameDayOfWeekAs( now ) ).filter( function( x ){
				return x.Date != '2017-09-04'
			} ),
			{
				key: property( 'DayOfWeek' ),
				 sum : [ metric ]
				// weightedAvg: {'Impressions': [ metric ]}
			}
		 );
		*/
		print( metric, res );
	}
}

function func( data, conversionLagData, now, accountId, ocid, accountName ){
	if( VERBOSE ){
		print( 'account_name' , accountName );
	}

	var metric = 'SearchRankLostImpressionShare';
	metric = 'Conversions';

	fixConversionLagNew( data, conversionLagData, now );

	/*
	// ignore Christmas data
	data = data.filter( function( row ){
		var date1 = stringToDate( row.Date, '-' );
		
		var before22december = date1.getMonth() < 11 || date1.getDate() < 22;
		var after2january = date1.getMonth() > 0 || date1.getDate() > 2;
		
		return before22december && after2january;
	});
	*/
	
	data = data.filter( not( sameDayOfWeekAs( now ) ).or( not( hourAfter( now ) ) ) );

	if( WARNINGS_FOR_SHARE_METRICS ){
		fixImpressionShares( data, now );
	}
	
	//printMetricData( data, metric, now );

	/*
		data
		.sort( function( a,b ){ return a.HourOfDay - b.HourOfDay } )
		.filter( sameDateAs( new Date( now - 0 * 24 * 3600 * 1000 ) ) )
		.forEach( function( row ){ print( row.HourOfDay, { conv: row.Conversions, value: row.ConversionValue } ) } );
	*/

	// dayComparator takes a day of week and returns number of days between current day of week and the argument
	var dayComparator = daysBack( now );
	// Takes a Date-obj and returns how many weeks are between it and now
	var weekComparator = week( now );

	var res = [];

	for ( var daysBack1 = 0; daysBack1 < 7; daysBack1++ ){

		// take only data for daysOfWeek not older than current dayOfWeek minus daysBack1
		var data1 = data.filter( function( x ){
			return dayComparator( x.DayOfWeek ) <= daysBack1;
		});

		var options = {
			key: function week( item ){
				return weekComparator( item.Date )
			},
			sum: COLUMNS_
				.filter( property( 'isAddable' ) )
				.map( property( 'name' ) )
				.concat( 'OriginalConversions', 'OriginalConversionValue' )
		};
		if( WARNINGS_FOR_SHARE_METRICS ){
			var shareMetrics = COLUMNS_.filter( property( 'isShareMetric' ) ).map( property( 'name' ) );
			options[ 'weightedAvg' ] = { 'Impressions' : shareMetrics };
		}
		
		var data2 = groupBy( data1, options );

		var past = 'past';
		var current = 'current';
		// week > 0 -> older than 7 days ago
		var split = partition( data2 ).by( function( x ){
			return x.week > 0 ? past : current
		});
		
		if( ! split[ current ] ){
			throw new Error( 'No current data available. If this is developement then you need to download fresh data. ' );
		}
		
		COLUMNS_
			.filter( property( 'isActive' ) )
			.filter( property( 'isMetric' ) )
			.forEach( function( metric ){

				var metricData = split[ past ].map( property( metric.name ) );
				var currVal = split[ current ][ 0 ][ metric.name ];

				if( WARNINGS_FOR_COMPOUND_METRICS && metric.isCompoundMetric ){
					var metricData = split[ past ]
						// ignore data where denominator is = 0
						.filter( function( x ){ return x[ metric.denominator ] >= LOWEST_ALLOWED_DENOMINATOR } )
						.map(    function( x ){ return x[ metric.enumerator ] / x[ metric.denominator ] } )
						;
					if( metricData.length == 0 ){
						// not enough data to issue a warning
						return;
					}
					if( split[ current ][ 0 ][ metric.denominator ] < LOWEST_ALLOWED_DENOMINATOR ){
						// not enough current data available to issue a warning
						return;
					}
					currVal = split[ current ][ 0 ][ metric.enumerator ] / split[ current ][ 0 ][ metric.denominator ];
				}
				
				var bounds = computeBounds( metricData, metric );
				
				var avgValue = avg( metricData );
				if( metric == 'Conversions' && Math.abs( avgValue - currVal ) < 1 ){
					// don't report conversion deviations < 1
					return;
				}
				
				var item = {
					metric: metric,
					daysBack: daysBack1,
					accountId: accountId,
					ocid : ocid,
					accountName: accountName,
					currentValue : currVal,
					lowerBound : bounds[0],
					upperBound : bounds[1],
					avg : avgValue,
					outOfBounds : currVal < bounds[0] || currVal > bounds[1]
				};
				
				if ( split[ current ][ 0 ][ 'Original' + metric.name ] != undefined ){
					item.currentValueOriginal = split[ current ][ 0 ][ 'Original' + metric.name ];
					item.avgOriginal = 			avg( split[ past ].map( property( 'Original' + metric.name ) ) );
				}
				
				if( item.outOfBounds ){
					item.supportingMetrics = [];
					metric.supportingMetrics.forEach( function( supportingMetric ){
						var supItem = {
							name : supportingMetric,
							was : avg( split[ past ].map( property( supportingMetric ) ) ),
							is : split[ current ][ 0 ][ supportingMetric ]
						};
						if ( split[ current ][ 0 ][ 'Original' + supportingMetric ] != undefined ){
							supItem.isOriginal = split[ current ][ 0 ][ 'Original' + supportingMetric ];
							supItem.wasOriginal = avg( split[ past ].map( property( 'Original' + supportingMetric ) ) );
						}
						
						item.supportingMetrics.push( supItem );
					});
				}
				
				if( VERBOSE ){
					print( 'item', item );
				}
				
				res.push( item );
		});
	}

	//	print( 'values', 		res.filter( property( 'metric' ).equals( 'ConversionValue' ) ) );

	//print( 'all results: ', res );

	res = res.filter( property( 'outOfBounds' ) );
	//print( 'out of bounds: ', res.filter( property( 'outOfBounds' ) ) );

	return res;
}

function print( key, value ){

	var text = '';
	text += key;

	if ( value != undefined ){
		text += ': ';
		if ( value instanceof Date ){
			text += dateToString( value, '-', true );
		} else if ( typeof value == 'number' ){
			text += value;
		} else if ( typeof value == 'string' ){
			if ( ['{', '['].filter( function( x ){
					return value.indexOf( x ) >= 0
				} ).length > 0 ){
				try {
					text += JSON.stringify( value, null, '\t' );
				} catch ( e ){
					text += e;
				}
			} else {
				text += value;
			}
		} else if ( typeof value == 'object' ){
			try {
				text += JSON.stringify( value, null, '\t' );
			} catch ( e ){
				text += e;
			}
		} else {
			text += value;
		}
	}
	text += '\n------------------------------------------\n';
	if ( typeof Logger !== 'undefined' && Logger.log ){
		Logger.log( text );
	} else if ( typeof output !== 'undefined' && output ){
		output.innerText += text;
	} else {
		throw new Error( 'no output-method available' );
	}
}

function developement(){
	var account = {
		getCustomerId: function(){
			return 'customerId'
		}, getName: function(){
			return 'customerName'
		}
	};
	var now = new Date();
	now.setHours( now.getHours() - 3 );
	print( 'now', now );

	
	//var alerts = func( hourMetrics, conversionLagData, now, account.getCustomerId(), null, account.getName() ); print( 'alerts', alerts );

	
	// 	fixImpressionShare
	var x = null;
	x = x * 100;
	
	print( 'test', x );
	
	
	unitTests();
}



function spaces( metric ){
	switch( metric ){
		case 'Cost' : return '\t\t';
		case 'Ctr' : return '\t\t';
		case 'AverageCpc' : return '\t';
		case 'Impressions' : return '\t';
        case 'Conversions' : return '\t';
		case 'Clicks' : return '\t';
		case 'AverageCpc' : return '\t';
		
	}
	return '';
}

function spaces2( str ){
  if( (str+'').length > 6 ){
   return str + ''; 
  }
  return str + '\t';
}

function toHTMLTable( arr ){
	var text = '';
  
	text += '<table style="padding:1px;width:100%;color:rgb(150,150,150);border-bottom: 1px solid ddd;">';
	for( var i = 0; i < arr.length; i++ ){
		var border = 'border-bottom:none;';
		if( i % 2 == 1 ){
			border = 'border-bottom: 1px solid ddd;';
		}
		var width = Math.round( 100 / arr[i].length ) + '%';
		
		text += '<tr>';
		for( var j = 0; j < arr[i].length; j++ ){
			text += '<td style="width:'+width+';border-left:none;border-top:none;'+border+'border-right:1px solid ddd;">' + arr[i][j] + '</td>';
		}
		text += '</tr>';
	}
	text += '</table>';
	
	return text;
}

// ----------- NEW -----------------------------------------

function toSnakeCase( str ){
	return str.split(/(?=[A-Z])/).join('_').toLowerCase();
}

function saveConvLag2( now ){
	var accountId = AdWordsApp.currentAccount().getCustomerId();
	var rows = retrieveReport( CONV_LAG_COLUMNS, now, NUM_DAYS );
	
	// Sort in DESCENDING order by date and time
	rows.sort( function( a, b ){
		return objToDate( b ).getTime() - objToDate( a ).getTime();
	});
	
	// seems like array 'rows' can be empty
	if( rows.length ){
		var res1 = rows.map( function( row ){
			var res = {};
			CONV_LAG_COLUMNS.forEach( function( y ){ res[ toSnakeCase( y ) ] = row[ y ] } );
			//res[ 'date' ] = row[ 'Date' ];
			res[ 'request_time' ] = dateToString( now, '-', true );
			res[ 'account_id' ] = accountId.split( '-' ).join( '' ) / 1;
			res[ 'account_name' ] = AdWordsApp.currentAccount().getName();
			return res;
		});
		//Logger.log( JSON.stringify( res1 ) );
		upload( res1 );
		Logger.log( rows.length );
	}
}

function upload( res ){
	Logger.log( 'load into BigQuery' );
	
	var jobIds = loadIntoBigquery(
		toCsvChunks(
			toCSV( res, BIGQUERY.FIELDS )
		),
		BIGQUERY.TABLE_NAME
	)
	
	Logger.log( 'done' );
	checkJobs( jobIds );
}

// +++++ BIGQUERY +++++++++++++++++++++++++++++++++++++
//                                                    |

function toCSV( data, fields ){
	var columns = Object.keys( fields );
	return data.map( function( obj ){
		return columns.map( function( column ){
			var res = obj[ column ];
			if( res === undefined ){
				Logger.log( 'no column ' + column + ' found in ' + JSON.stringify( obj, null, '\t' ) );
			}
			return res;
		});
	});
}

function createDataset() {
	if( datasetExists() ){
		if( BIGQUERY.DROP_EXISTING_DATASET ){
			BigQuery.Datasets.remove( BIGQUERY.PROJECT_ID, BIGQUERY.DATASET_ID, { 'deleteContents' : true } );
			Logger.log( 'Truncated dataset ' + BIGQUERY.DATASET_ID );
		} else {
			return;
		}
	}
	
	// Create new dataset.
	var dataSet = BigQuery.newDataset();
	dataSet.friendlyName = BIGQUERY.DATASET_ID;
	dataSet.datasetReference = BigQuery.newDatasetReference();
	dataSet.datasetReference.projectId = BIGQUERY.PROJECT_ID;
	dataSet.datasetReference.datasetId = BIGQUERY.DATASET_ID;

	dataSet = BigQuery.Datasets.insert( dataSet, BIGQUERY.PROJECT_ID );
	Logger.log( 'Created dataset with id %s.', dataSet.id );
}

function datasetExists() {
	// Get a list of all datasets in project.
	var datasets = BigQuery.Datasets.list( BIGQUERY.PROJECT_ID );
	var datasetExists = false;
	// Iterate through each dataset and check for an id match.
	if( datasets.datasets != null ){
		for( var i = 0; i < datasets.datasets.length; i++ ){
			var dataset = datasets.datasets[ i ];
			if( dataset.datasetReference.datasetId == BIGQUERY.DATASET_ID ){
				datasetExists = true;
				break;
			}
		}
	}
	return datasetExists;
}

function dropTable( tableName ){
	if ( tableExists( tableName ) ) {
		BigQuery.Tables.remove( BIGQUERY.PROJECT_ID, BIGQUERY.DATASET_ID, tableName );
		Logger.log('Table %s dropped.', tableName );
	}
}

function createTable( tableName, fields ) {
	if( tableExists( tableName ) ){
		if( BIGQUERY.DROP_EXISTING_TABLES ){
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
		var fieldName = fieldNames[i];
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
	table.tableReference.datasetId = BIGQUERY.DATASET_ID;
	table.tableReference.projectId = BIGQUERY.PROJECT_ID;
	table.tableReference.tableId = tableName;

	table.timePartitioning = BigQuery.newTimePartitioning();
	table.timePartitioning.type = 'DAY';
	table.timePartitioning.expirationMs = 1000 * 60 * 60 * 24 * NUM_DAYS;
	table.timePartitioning.requirePartitionFilter = true;
	
	try{
		table = BigQuery.Tables.insert(
			table,
			BIGQUERY.PROJECT_ID,
			BIGQUERY.DATASET_ID
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
			BIGQUERY.PROJECT_ID,
			BIGQUERY.DATASET_ID,
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

function copyTable( srcTableId, destTableId ){
	var job = {
		configuration: {
			copy: {
				destinationTable: {
					projectId	: BIGQUERY.PROJECT_ID,
					datasetId	: BIGQUERY.DATASET_ID,
					tableId  	: destTableId
				},
				sourceTable : {
					projectId	: BIGQUERY.PROJECT_ID,
					datasetId	: BIGQUERY.DATASET_ID,
					tableId		: srcTableId
				},
				createDisposition	: 'CREATE_IF_NEEDED',
				writeDisposition	: 'WRITE_TRUNCATE',
			}
		}
	};
	BigQuery.Jobs.insert( job, BIGQUERY.PROJECT_ID );
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
		if( isNumeric( num ) ){
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
	return splitArray( rows, BIGQUERY.CHUNK_SIZE ).map( function( rows ){ return rows.join( '\n' ) } );
}

function loadIntoBigquery( csvChunks, tableName ){
	// dropTable( tableName );
	// createTable( tableName, BIGQUERY.FIELDS );
	var uploader = loadIntoBigqueryTable( tableName );
	var bigQueryJobIds = csvChunks.map( uploader ).filter( function( x ){ return x != 'error' } );
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
						projectId: BIGQUERY.PROJECT_ID,
						datasetId: BIGQUERY.DATASET_ID,
						tableId: tableName
					},
					skipLeadingRows: 0, // We have no a header row, so nothing to skip.
					writeDisposition	: 'WRITE_APPEND', // Since we load chunks it must be append! Do not use 'WRITE_TRUNCATE' here!
				}
			}
		};
		try{
			var insertJob = BigQuery.Jobs.insert( job, BIGQUERY.PROJECT_ID, blobData );
			//Logger.log('Load job started for %s. Check on the status of it here: ' +
			//   'https://bigquery.cloud.google.com/jobs/%s', tableName,
			//   BIGQUERY.PROJECT_ID);
			return insertJob.jobReference.jobId;
		}catch( error ){
			// sometimes we get "No schema specified on job or table." here
			Logger.log( error + ' - table: ' + tableName );
			if( ( '' + error ).indexOf( 'Insufficient Permission' ) >= 0 ){
				throw error;
			}
			return 'error';
		}
	};
}

function checkJobs( jobIds ){
	var states = {};
	for( var i in jobIds ){
		var jobId = jobIds[ i ];
		var job = BigQuery.Jobs.get( BIGQUERY.PROJECT_ID, jobId );
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

//                                                    |
// +++++ BIGQUERY +++++++++++++++++++++++++++++++++++++










//¯¯¯¯¯¯¯¯¯¯¯ Unit Tests ¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯¯|

function unitTests(){
	
	function assertGreater( a, b ){
		if ( a <= b ){
			throw new Error( a + ' is not > ' + b );
		}
	}

	function assertBetween( a, b, c ){
		if ( b <= a || b >= c ){
			throw new Error( b + ' is not between ' + a + ' and ' + c );
		}
	}

	function assertAsc(){
		var args = Array.prototype.slice.call( arguments );
		for ( var i = 1; i < args.length; i++ ){
			if ( args[i - 1] > args[i] ){
				throw new Error( 'Arguments are not sorted in ascending order' );
			}
		}
	}

	function assertNaN( a ){
		if ( a == a ){
			throw new Error( a + ' is not NaN.' );
		}
	}

	function assertTrue( a ){
		if ( !a ){
			throw new Error( 'Expected true, but got: ' + a );
		}
	}

	function assertFalse( a ){
		if ( a ){
			throw new Error( 'Expected false, but got: ' + a );
		}
	}

	function assertEqual( a, b ){
		if ( isNumeric( a ) && isNumeric( b ) ){
			// small deviations are allowed
			if ( Math.abs( a - b ) > 0.000000000000001 ){
				throw new Error( a + ' is not equal to ' + b + '. -> ' + Math.abs( a - b ) );
			}
		} else if ( a !== b ){
			throw new Error( a + ' is not equal to ' + b );
		}
	}

	function assertEqualJSON( a, b ){
		var aa = JSON.stringify( a );
		var bb = JSON.stringify( b );

		if ( aa != bb ){
			throw new Error( aa + ' is not equal to ' + bb );
		}
	}


	assertEqualJSON( groupBy( [
		{name: 'alex', score: null},
		{name: 'alex', score: null},
		{name: 'Bea', score: null},
		{name: 'Bea', score: 33},
		{name: 'Andi', score: 1},
		{name: 'Andi', score: 3}
	], {key: 'name', sum: 'score'} ), [
		{name: "alex", score: 0},
		{name: "Bea", score: 33},
		{name: "Andi", score: 4}] );

	assertEqualJSON( groupBy( [
		{name: 'alex', score: 3},
		{name: 'alex', score: 5},
		{name: 'Bea', score: 2},
		{name: 'Bea', score: 33},
		{name: 'Andi', score: 1},
		{name: 'Andi', score: 3}
	], {key: 'name', sum: 'score'} ), [
		{"name": "alex", "score": 8},
		{"name": "Bea", "score": 35},
		{"name": "Andi", "score": 4}] );

	assertEqualJSON( groupBy( [
		{name: 'alex', score: 3, someUnusedField: 234},
		{name: 'alex', score: 5},
		{name: 'Bea', score: 2},
		{name: 'Bea', score: 32},
		{name: 'Andi', score: 1},
		{name: 'Andi', score: 3}
	], {key: 'name', avg: 'score'} ), [
		{"name": "alex", "score": 4},
		{"name": "Bea", "score": 17},
		{"name": "Andi", "score": 2}] );

	assertEqualJSON( groupBy( [
		{name: 'alex', score: 3, w: 8},
		{name: 'alex', score: 5, w: 2},
		{name: 'Bea', score: 2, w: 6},
		{name: 'Bea', score: 3, w: 4},
		{name: 'Andi', score: 1, w: 8},
		{name: 'Andi', score: 3, w: 2}
	], {key: 'name', weightedAvg: {w: 'score'}, sum: 'w'} ), [
		{"name": "alex", w: 10, "score": 3.4},
		{"name": "Bea", w: 10, "score": 2.4},
		{"name": "Andi", w: 10, "score": 1.4}] );

	assertEqualJSON( groupBy( [
		{name: 'alex', score: 3, w: 4},
		{name: 'alex', score: 5, w: 2},
		{name: 'Bea', score: 1, w: 6},
		{name: 'Bea', score: 4, w: 3},
		{name: 'Andi', score: 2, w: 5},
		{name: 'Andi', score: 3, w: 2}
	], {
		key: function wScore( item ){
			return item.score + item.w
		}, weightedAvg: {w: 'score'}, sum: 'w'
	} ), [
		{wScore: 5, w: 2, score: 3},
		{wScore: 7, w: 20, score: 2.5}
	] );

	assertEqualJSON( groupBy( [
		{name: 'alex', score: null, w: 0},
		{name: 'alex', score: 11, w: 1},
		{name: 'alex', score: 5, w: 2},
		{name: 'Bea', score: null, w: 6},
		{name: 'Bea', score: null, w: 3},
		{name: 'Andi', score: 2, w: null},
		{name: 'Andi', score: 3, w: 2}
	], {key: 'name', weightedAvg: {w: 'score'}} ), [
		{"name": "alex", "score": 7},
		{"name": "Bea", "score": 0},
		{"name": "Andi", "score": 3}
	] );


	assertEqual( parseValue( 'a' ), 'a' );
	assertEqual( parseValue( 'A' ), 'A' );
	assertEqual( parseValue( '1a' ), '1a' );
	assertEqual( parseValue( '01%' ), 0.01 );
	assertEqual( parseValue( '01.3%' ), 0.013 );
	assertEqual( parseValue( '1.3%' ), 0.013 );
	assertEqual( parseValue( '-1.3%' ), -0.013 );
	assertEqual( parseValue( '111.3%' ), 1.113 );
	assertEqual( parseValue( '1' ), 1 );
	assertEqual( parseValue( '1.1' ), 1.1 );
	assertEqual( parseValue( '-1.1' ), -1.1 );
	assertEqual( parseValue( '132,423.34' ), 132423.34 );
	assertEqual( parseValue( '13,,,2,423.34' ), 132423.34 ); // strange case
	assertEqual( parseValue( '132a423.34' ), '132a423.34' );
	assertEqual( parseValue( '--' ), null );
	assertEqual( parseValue( null ), null );
	assertEqual( parseValue( undefined ), undefined );

	assertEqualJSON( partition( [
			{name: 'alex', score: 3},
			{name: 'alex', score: 5},
			{name: 'Bea', score: 2},
			{name: 'Bea', score: 33},
			{name: 'Andi', score: 1},
			{name: 'Andi', score: 3}
		] ).by( 'name' ), {
			alex: [{score: 3}, {score: 5}],
			Bea: [{score: 2}, {score: 33}],
			Andi: [{score: 1}, {score: 3}],
		}
	 );

	assertEqualJSON( partition( [
			{name: 'alex', score: 3},
			{name: 'alex', score: 5},
			{name: 'Bea', score: 2},
			{name: 'Bea', score: 33},
			{name: 'Andi', score: 1},
			{name: 'Andi', score: 3}
		] ).by( 'name' ), {
			alex: [{score: 3}, {score: 5}],
			Bea: [{score: 2}, {score: 33}],
			Andi: [{score: 1}, {score: 3}],
		}
	 );

	var comparator = daysBack( stringToDate( '2017-07-25' ) );
	assertEqual( comparator( 'Tuesday' ), 0 );
	assertEqual( comparator( 'Monday' ), 1 );
	assertEqual( comparator( 'Sunday' ), 2 );
	assertEqual( comparator( 'Saturday' ), 3 );
	assertEqual( comparator( 'Friday' ), 4 );
	assertEqual( comparator( 'Thursday' ), 5 );
	assertEqual( comparator( 'Wednesday' ), 6 );

	var now = stringToDate( '2017-07-26' );
	assertEqual( dateDiff( now, stringToDate( '2017-07-27' ) ), -1 );
	assertEqual( dateDiff( now, stringToDate( '2017-07-26' ) ), 0 );
	assertEqual( dateDiff( now, stringToDate( '2017-07-25' ) ), 1 );

	var comparator = week( now );
	assertEqual( comparator( '2017-07-26' ), 0 );
	assertEqual( comparator( '2017-07-20' ), 0 );
	assertEqual( comparator( '2017-07-19' ), 1 );
	assertEqual( comparator( '2017-07-13' ), 1 );
	assertEqual( comparator( '2017-07-12' ), 2 );
	assertEqual( comparator( '2017-07-27' ), -1 );


	assertEqual( avg( [1, null, 3] ), 2 );
	assertEqual( avg( [1, 3, null] ), 2 );
	assertEqual( avg( [1, 3] ), 2 );
	assertEqual( avg( [1] ), 1 );
	assertNaN( avg( [] ), NaN );
	assertNaN( avg( [undefined] ), NaN );
	assertNaN( avg( [null] ), NaN );
	assertNaN( avg( [null, null] ), NaN );

	assertEqual( quantile( [1], 0.1 ), 1 );
	assertEqual( quantile( [2], 0 ), 2 );
	assertEqual( quantile( [5], 1 ), 5 );
	assertEqual( quantile( [33], .4 ), 33 );
	assertEqual( quantile( [3, 4], .4 ), 3 );
	assertEqual( quantile( [3, 4], .5 ), 3 );
	assertEqual( quantile( [3, 4], .6 ), 4 );
	assertEqual( quantile( [3, 4, 5], .3 ), 3 );
	assertEqual( quantile( [3, 4, 5], .6 ), 4 );
	assertEqual( quantile( [3, 4, 5], .7 ), 5 );
	assertEqual( quantile( [4, 3, 5], .3 ), 3 );
	assertEqual( quantile( [5, 4, 3], .6 ), 4 );
	assertEqual( quantile( [4, 3, 5], .7 ), 5 );

	assertEqual( quantile( [3, 4, 5, 5], .2 ), 3 );
	assertEqual( quantile( [3, 4, 5, 5], .3 ), 4 );
	assertEqual( quantile( [3, 4, 5, 5], .50 ), 4 );
	assertEqual( quantile( [3, 4, 5, 5], .51 ), 5 );
	assertEqual( quantile( [3, 4, 5, 5], .9 ), 5 );
	assertEqual( quantile( [3, 4, 5, 5], 1 ), 5 );

	
	assertEqualJSON( computeBounds( [ 1, 1, 5, 5 ], { down : 1, up : 1, isZeroOneBound : false } ), [ 1, 5 ] );


	assertEqualJSON( computeBounds( [ 1, 1, 5, 5 ], { down : 2, up : 2, isZeroOneBound : false } ), [ 0, 7 ] );
	
	var bounds = computeBounds( [500, 500, 1500, 1500 ], { down : 4, up : 4, isZeroOneBound : false } );
	//alert( bounds[0]+' : '+ bounds[1] );
	assertAsc( 100, bounds[0], 300, 3000, bounds[1], 3500 );
	
	var bounds = computeBounds( [1000, 1000, 1000, 1000], { down : 4, up : 4, isZeroOneBound : false } );

	assertAsc( 970, bounds[0], 980, 1020, bounds[1], 1030 );

	var now = new Date( 1501855503376 );
	assertEqual( computeShare( [], now, 'x' ), 0.67 );
	assertEqual( computeShare( [{metric: 0, HourOfDay: 3, DayOfWeek: 5}], now, 'metric' ), 0.67 );
	assertEqual( computeShare( [{metric: 10, HourOfDay: 4, DayOfWeek: 1}], now, 'metric' ), 0.67 );

	assertEqual( computeShare( [{metric: 3, HourOfDay: 3, DayOfWeek: 'Friday'}], now, 'metric' ), 1 );
	assertEqual( computeShare( [{metric: 3, HourOfDay: 3, DayOfWeek: 'Friday'}, {
		metric: 3,
		HourOfDay: 3,
		DayOfWeek: 'Monday'
	}], now, 'metric' ), 1 );
	assertEqual( computeShare( [{metric: 3, HourOfDay: 3, DayOfWeek: 'Friday'}, {
		metric: 3,
		HourOfDay: 21,
		DayOfWeek: 'Friday'
	}], now, 'metric' ), .5 );
	assertEqual( computeShare( [{metric: 3, HourOfDay: 3, DayOfWeek: 'Friday'}, {
		metric: 1,
		HourOfDay: 21,
		DayOfWeek: 'Friday'
	}], now, 'metric' ), .75 );
	assertEqual( computeShare( [{metric: 0, HourOfDay: 3, DayOfWeek: 'Friday'}, {
		metric: 1,
		HourOfDay: 21,
		DayOfWeek: 'Friday'
	}], now, 'metric' ), 0 );
	assertEqual( computeShare( [{metric: 1, HourOfDay: 3, DayOfWeek: 'Friday'}, {
		metric: 0,
		HourOfDay: 21,
		DayOfWeek: 'Friday'
	}], now, 'metric' ), 1 );

	var predicate = not( property( 'x' ) ).or( property( 'y' ).equals( 3 ) );

	assertTrue( predicate( {x: true, y: 3} ) );
	assertFalse( predicate( {} ) );
	assertFalse( predicate( {x: 234, y: 23} ) );
	assertFalse( predicate( {x: 234, y: 23} ) );


	// ------------------------------------------- test fixImpressionShares()
	var testHourMetrics = [];
	var start = new Date( 2017, 4, 15 );
	var finish = new Date( 2017, 7, 15 );
	var i = 0;
	for ( var date = start; date < finish; date.setTime( date.getTime() + 3600 * 1000 ) ){
		testHourMetrics.push( {
			Date: dateToString( date, '-' ),
			DayOfWeek: dayOfWeek( date ),
			HourOfDay: date.getHours(),
			Impressions : 450 + Math.round( Math.random() * 100 ),
			SearchImpressionShare: i > 2208 - 48 ? null : 0.1 + i++ / 22080,
			SearchRankLostImpressionShare: i > 2208 - 48 ? null : 0.1,
			SearchBudgetLostImpressionShare: i > 2208 - 48 ? null : 0.1
		} );
	}
	print( testHourMetrics.map( property( 'SearchImpressionShare' ) ) );
	assertEqual( testHourMetrics.length, 2208 );

	fixImpressionShares( testHourMetrics, new Date( finish.getTime() - 1000 * 60 * 5 ) );
	
	print( testHourMetrics.map( property( 'SearchImpressionShare' ) ) );

	assertEqual( testHourMetrics.length, 2208 );
	assertBetween( 0.10, testHourMetrics[2207].SearchImpressionShare, 0.19 );
	assertBetween( 0.09, testHourMetrics[7].SearchImpressionShare, 0.11 );
	// -------------------------------------------

	assertEqualJSON( 
		{},
		toMap( [], 'key' )
	 );
	assertEqualJSON( 
		{},
		toMap( [{}], 'key' )
	 );

	assertEqualJSON( 
		{},
		toMap( [{a: 3}], 'key' )
	 );

	assertEqualJSON( 
		{
			'23': {}
		},
		toMap( [{key: 23}], 'key' )
	 );

	assertEqualJSON( 
		{
			x: {value: 3},
			y: {value: 2}
		},
		toMap( [{key: 'x', value: 3}, {key: 'y', value: 2}], 'key' )
	 );

	assertEqual( detectType( '' ), COLUMN_TYPES.UNKNOWN );
	assertEqual( detectType( 'test' ), COLUMN_TYPES.STRING );
	assertEqual( detectType( '@' ), COLUMN_TYPES.EMAIL );
	assertEqual( detectType( 'sd@fa' ), COLUMN_TYPES.EMAIL );
	assertEqual( detectType( '1234567890' ), COLUMN_TYPES.ACCOUNT_ID );
	assertEqual( detectType( ' 1 -234-56---789--0 -' ), COLUMN_TYPES.ACCOUNT_ID );
	assertEqual( detectType( 'asdf 1 -234-56---789--0 -' ), COLUMN_TYPES.STRING );
	assertEqual( detectType( '324' ), COLUMN_TYPES.UNKNOWN );

	assertEqual( mode( [] ), null );
	assertEqual( mode( [1] ), 1 );
	assertEqual( mode( [100] ), 100 );
	assertEqual( mode( [1, 2] ), 1 );
	assertEqual( mode( [1, 2, 2] ), 2 );

	assertEqualJSON( transpose( [[]] ), [[]] );
	assertEqualJSON( transpose( [[1]] ), [[1]] );
	assertEqualJSON( transpose( [[1, 2]] ), [[1], [2]] );
	assertEqualJSON( transpose( [[1], [2]] ), [[1, 2]] );
	assertEqualJSON( transpose( [[1, 2], [3, 4]] ), [[1, 3], [2, 4]] );

	assertEqualJSON( [ 1, 2, 3 ].filter( takeFirst() ), [ 1 ] );
	assertEqualJSON( [ 1, 2, 3 ].filter( takeFirst( 2 ) ), [ 1, 2 ] );
	assertEqualJSON( [ 1, 2, 3 ].filter( skipFirst() ), [ 2, 3 ] );
	assertEqualJSON( [ 1, 2, 3 ].filter( skipFirst( 2 ) ), [ 3 ] );
	assertEqualJSON( [].filter( skipFirst() ), [] );
	assertEqualJSON( [].filter( skipFirst( 2 ) ), [] );

	assertEqualJSON( anylyseColumn( [/( ?!x )x/, /\D/g, /[^@]/g, /[^-]/g, /[^:]/g, /[^a-z]/gi], ['12:3d@as--d-@f4'] ), [15, 4, 2, 3, 1, 5] );
	assertEqualJSON( anylyseColumn( [/( ?!x )x/, /\D/g, /[^@]/g, /[^-]/g, /[^:]/g, /[^a-z]/gi], ['12:3d@as--d-@f4', '1'] ), [8, 2.5, 1, 1.5, .5, 2.5] );

	var x = detectHeaderRow( [['Top-Handy', '234-432-1234'], ['AO-Hostel', '234-432-1234'], ['Talkthisway', '234-432-1234']] );
	var y = detectHeaderRow( [['Account-Name', 'Account-Id'], ['AO-Hostel', '234-432-1234'], ['Talkthisway', '234-432-1234']] );
	assertBetween( 0, x, 9 );
	assertBetween( 9, y, 50 );

	assertEqualJSON( detectHeaders( [] ), [] );
	
	/*
	assertEqualJSON(
		parseSettings(
			[
				['Account-Name', 'Account-Id', 'Time2', 'Emails ( comma-separated )', 'pause until xx.xx.xxxx '],
				['ASDFf-adfs32', '123-321-3214', '20:00', 'asdf@pa.ag', '20.11.2017'],
				['§$Gasdffs', '133-321-3214', '21:00', 'a.test@pa.ag', '22.08.2017']
			],
			1
		 ),
		[
			{
				accountName: 'ASDFf-adfs32',
				accountId: '123-321-3214',
				execTimes: ['20:00'],
				emails: ['asdf@pa.ag'],
				pauseUntil: '20.11.2017'
			},
			{
				accountName: '§$Gasdffs',
				accountId: '133-321-3214',
				execTimes: ['21:00'],
				emails: ['a.test@pa.ag'],
				pauseUntil: '22.08.2017'
			}
		]
	);
	*/

	//assertEqualJSON( compute( [], 4, 4, false ), [ 10, 20 ] );


	console.log( 'all tests passed' );
	document.body.appendChild( document.createTextNode( 'all tests passed' ) );

}


//____________________________________________|
