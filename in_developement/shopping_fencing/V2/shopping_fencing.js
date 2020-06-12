

var SETTINGS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1sNZhnyXDgagSqw3qpXZGomHEyP7UsRCAloMIGHYOVSM/edit#gid=0';

var SETTINGS = [
	{
		name                   : 'SOURCE_ACCOUNT_IDS',
		description            : ''
			+ 'SOURCE_ACCOUNT_IDS determines which accounts should be used \n'
			+ 'for acquiring search queries and performance data.\n'
			+ 'Usually, SOURCE_ACCOUNT_IDS should contains only\n'
			+ 'the account id which set in TARGET_ACCOUNT_ID.\n'
			+ 'Only in the case of a new account without sufficient \n'
			+ 'search-query and performance history an additional \n'
			+ 'accout can be added to SOURCE_ACCOUNT_IDS.\n'
			+ 'This setting is ignored in Non-MCC-accounts.',
		type                   : 'account[]',
		value                  : '',
		is_required            : false,
		examples               : [ [ '123-456-7890' ], [ 1234567890 ] ],
	},
	{
		name                   : 'TARGET_ACCOUNT_ID',
		description            : ''
			+ 'The client account, for which '
			+ 'shopping campaigns should be fenced.\n'
			+ 'This setting is ignored in Non-MCC-accounts.',
		type                   : 'account',
		value                  : '',
		is_required            : false,
		examples               : [ '123-456-7890', 1234567890 ],
	},
	{
		name                   : 'ERROR_REPORTING_EMAILS',
		description            : ''
			+ 'Who to send email notifications to in case of errors.',
		type                   : 'email[]',
		value                  : [],
		allow_empty            : true,
		is_required            : false,
		examples               : [ [], [ 'your-name@your-org.domain' ] ],
	},
	{
		name                   : 'STOP_WORDS',
		description            : 'Don\'t use these ngrams for campaign fencing',
		type                   : 'string[]',
		value                  : [
			'aus',
			'zur',
			'für',
			'des',
			'the',
			'und',
			'in',
			'er',
			'die',
			'dem',
			'auf',
			'und',
			'zu',
			'zum',
			'in'
		],
		is_required            : true,
		examples               : [ [], [ 'der', 'the' ] ],
	},
	{
		name                   : 'MIN_CLICKS',
		description            : 'The minimum amount of clicks an ngram needs\n'
			+ 'to be considered for campaign-fencing.',
		type                   : 'int',
		value                  : '3',
		is_required            : true,
		examples               : [ 0, 15, 120 ],
	},
	{
		name                   : 'DAYS_BACK',
		description            : 'Date range for Search-Query report.\n'
			+ 'Determines how many days of performance data to use\n'
			+ 'to determine how profitable ngrams are.',
		type                   : 'int',
		value                  : '90',
		is_required            : true,
		examples               : [ 7, 30, 90 ],
	},
	{
		name                   : 'TARGET_ROAS_HIGH_DEFAULT',
		description            : 'Default values for high ROAS threshold.\n'
			+ 'Ngrams with roas >= \'High\' are considered high profitability.\n'
			+ 'Ngrams with roas between \'Medium\' and \'High\' are considered medium profitability.\n'
			+ 'Ngrams with roas < \'Medium\' are considered low profitability.',
		type                   : 'float',
		value                  : '',
		is_required            : true,
		examples               : [ 1.1, .7 ],
	},
	{
		name                   : 'TARGET_ROAS_MEDIUM_DEFAULT',
		description            : 'Default values for medium ROAS threshold.\n'
			+ 'Ngrams with roas >= \'High\' are considered high profitability.\n'
			+ 'Ngrams with roas between \'Medium\' and \'High\' are considered medium profitability.\n'
			+ 'Ngrams with roas < \'Medium\' are considered low profitability.',
		type                   : 'float',
		value                  : '',
		is_required            : true,
		examples               : [ 1.1, .7 ],
	},
	{
		name                   : 'TARGET_ROAS_HIGH',
		description            : 'Category based ROAS thresholds.\n'
			+ 'If no roas thresholds for a category are set then default (see above)\n'
			+ 'are used.\n'
			+ 'Ngrams with roas >= \'High\' are considered high profitability.\n'
			+ 'Ngrams with roas between \'Medium\' and \'High\' are considered medium profitability.\n'
			+ 'Ngrams with roas < \'Medium\' are considered low profitability.\n'
			+ 'Values are not cosidered to be percentage values.\n'
			+ 'So to set 150% ROAS set this value to 1.5.',
		type                   : 'float{}',
		value                  : ''
			+ 'karten > geburt > geburtskarten > danksagungskarten : 1.\n'
			+ 'karten > geburtstag > geburtstagseinladungen > 50. geburtstag : 1.',
		is_required            : false,
		examples               : [ 'category_a : 1.1\ncategory_b : 1.2' ],
	},
	{
		name                   : 'TARGET_ROAS_MEDIUM',
		description            : 'Category based ROAS thresholds.\n'
			+ 'If no roas thresholds for a category are set then default (see above)\n'
			+ 'are used.\n'
			+ 'Ngrams with roas >= \'High\' are considered high profitability.\n'
			+ 'Ngrams with roas between \'Medium\' and \'High\' are considered medium profitability.\n'
			+ 'Ngrams with roas < \'Medium\' are considered low profitability.\n'
			+ 'Values are not cosidered to be percentage values.\n'
			+ 'So to set 150% ROAS set this value to 1.5.',
		type                   : 'float{}',
		value                  : ''
			+ 'karten > geburt > geburtskarten > danksagungskarten : .7\n'
			+ 'karten > geburtstag > geburtstagseinladungen > 50. geburtstag : .7',
		is_required            : false,
		examples               : [ 'category_a : 1.1\ncategory_b : 1.2' ],
	},
];


/*
// SOURCE_ACCOUNT_IDS determines which accounts should be used 
// for acquiring search queries and performance data.
// Usually, SOURCE_ACCOUNT_IDS should contains only
// the account id which set in TARGET_ACCOUNT_ID.
// Only in the case of a new account without sufficient 
// search-query and performance history an additional 
// accout can be added to SOURCE_ACCOUNT_IDS.
// This setting is ignored in Non-MCC-accounts.
var SOURCE_ACCOUNT_IDS = [ 9031124505 ]; // 1182117027 die Kartenmacherei

// TARGET_ACCOUNT_ID determines which on account 
// to execute this script.
// This setting is ignored in Non-MCC-accounts.
var TARGET_ACCOUNT_ID = 9031124505; // die Kartenmacherei DE (shopping)

// Default values for ROAS thresholds.
// Ngrams with roas >= 'High' are considered high profitability.
// Ngrams with roas between 'Medium' and 'High' are considered medium profitability.
// Ngrams with roas < 'Medium' are considered low profitability.

var TARGET_ROAS_HIGH_DEFAULT = 1.;
var TARGET_ROAS_MEDIUM_DEFAULT = .7;

// Category based ROAS thresholds.
// If no roas thresholds for a category are set then default (see above)
// are used.
// Ngrams with roas >= 'High' are considered high profitability.
// Ngrams with roas between 'Medium' and 'High' are considered medium profitability.
// Ngrams with roas < 'Medium' are considered low profitability.
// Values are not cosidered to be percentage values.
// So to set 150% ROAS set this value to 1.5.
var TARGET_ROAS_HIGH = {
	'karten > geburt > geburtskarten > danksagungskarten' : 1.,
	'karten > geburtstag > geburtstagseinladungen > 50. geburtstag' : 1.,
};

var TARGET_ROAS_MEDIUM = {
	'karten > geburt > geburtskarten > danksagungskarten' : .7,
	'karten > geburtstag > geburtstagseinladungen > 50. geburtstag' : .7,
};

// Date range for Search-Query report.
// Determines how many days of performance data to use
// to determine how profitable ngrams are.
var DAYS_BACK = 90;

// The minimum amount of clicks an ngram needs
// to be considered for campaign-fencing.
var MIN_CLICKS = 3;

// Don't use these ngrams for campaign fencing
var STOP_WORDS = [
	'aus',
	'zur',
	'für',
	'des',
	'the',
	'und',
	'in',
	'er',
	'die',
	'dem',
	'auf',
	'und',
	'zu',
	'zum',
	'in'
];

// Who to send email notifications to in case of errors?
var ERROR_REPORTING_EMAILS = [ 'a.tissen@pa.ag' ];

*/



// -------------------------------------------
// -------------------------------------------
// -------------------------------------------
// -------- ADVANCED SETTINGS ----------------
// Usually, there is no need to adjust them.
// Don't change these settings if the script is 
// already working on an account. 



// Two possible MODE's: 1 or 2.
// MODE = 1:
// In MODE = 1 high profitability campaigns are low  priority.
// In MODE = 1 medium profitability campaigns are medium priority.
// In MODE = 1 low  profitability campaigns are high priority.
// MODE = 2:
// In MODE = 2 high profitability campaigns are high priority.
// In MODE = 2 medium profitability campaigns are medium priority.
// In MODE = 2 low  profitability campaigns are low  priority.
//
// This setting should not be changed if the script is already
// working (or has been working) in account.
var MODE = 1;

// Naming of campaign labels.
// Don't change these label-name settings if this script is already in use.
var SUSPENDED_LABEL = 'suspended';
var MANAGED_BY_SCRIPT_LABEL = 'managed_by_script';

// SEPARATOR is used in campaign names to separate
// different information. Current naming scheme is 
// prefix_profitability_category_priority.
// Only "_" is tested. Other values for SEPARATOR 
// may lead to conflicts.
var SEPARATOR = '_';

// Naming of priorities and profitabilities.
var PRIORITY_BUCKETS      = [ 'Low', 'Medium', 'High' ];
var PROFITABILITY_BUCKETS = [ 'Low', 'Medium', 'High' ];

// This determines how campaigns are expected to be named
// for the script to be able to extract information from its names.
// Don't change this if the script is already (or has been running)
// running in account.
var CAMPAIGN_NAME_SCHEME = {
	MANAGED : {
		PREFIX : 'DE-Shopping',
		GROUPS : [
			PROFITABILITY_BUCKETS,
			/[a-zA-Z0-9 >ßöäüÖÄÜ\.]+/,
			PRIORITY_BUCKETS,
		],
		EXTRACTION_ORDER : {
			2 : 'CATEGORY',
			1 : 'PROFITABILITY',
			3 : 'PRIORITY',
			// one-based ( zero is full match )
		},
	},
	SUSPENDED : {
		PREFIX : 'Suspended',
		GROUPS : [
			/\d+/,
			PRIORITY_BUCKETS,
		],
		EXTRACTION_ORDER : {
			1 : 'INDEX',
			2 : 'PRIORITY',
			// one-based ( zero is full match )
		},
	},
};


// ------- END OF SETTINGS ------------








/*
var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1jsGNA9Po-CYf3_GvHNPj2luMyPfSpsUQlTN45-4a7cc/edit#gid=0';
var SS = SpreadsheetApp.openByUrl( SPREADSHEET_URL );
var SHEET = SS.getSheetByName( 'Settings' );

var PROFITABILY_GROUP1 = parseInt( SHEET.getRange('G2').getValue() );
var PROFITABILY_GROUP2 = parseInt( SHEET.getRange('H2').getValue() );
*/


// ------ CONSTANTS --------------
var MILLIS_IN_A_DAY = 1000 * 60 * 60 * 24;
var NO_CATEGORY = 'no_category';
var SCRIPT_NAME = 'shopping fencer';
var ATTRIBUTE_COLUMNS = [ 'Query', 'CampaignName', 'AdGroupName' ];
var METRICS    = [ 'Clicks', 'Cost', 'Conversions', 'ConversionValue' ];
// ------ END OF CONSTANTS -------

if( !Object.entries ){
	Object.entries = function( obj ){
		var ownProps = Object.keys( obj ),
			i = ownProps.length,
			resArray = new Array( i ); // preallocate the Array
		while( i-- ){
			resArray[ i ] = [ ownProps[ i ], obj[ ownProps[ i ] ] ];
		}
		return resArray;
	};
}
if( !Object.values ){
	Object.values = function( obj ){
		var ownProps = Object.keys( obj ),
			i = ownProps.length,
			resArray = new Array( i ); // preallocate the Array
		while( i-- ){
			resArray[ i ] = obj[ ownProps[ i ] ];
		}
		return resArray;
	};
}

var CONDITIONS = {
	CAMPAIGN : {
		NAME_CONTAINS: [],
		NAME_DOES_NOT_CONTAIN : [],
		STATUS_IN : [],
	},
	AD_GROUP : {
		NAME_CONTAINS:[],
		NAME_DOES_NOT_CONTAIN:[],
		STATUS_IN : [],
	}
};

var _ = ( function(){
	
	function toList( iterator ){
		var list = [];
		while( iterator.hasNext() ){
			list.push( iterator.next() );
		}
		return list;
	}

	function group( rows ){
		if( ! rows ){
			throw 'rows is undefined';
		}
		return {
			byAll : function( keys, finalKey ){
				function recursive( keys, res, row ){
					var key = keys[ 0 ];
					var value = row[ key ];
					
					var otherKeys = keys.slice( 1 );
					if( otherKeys.length > 0 ){
						res[ value ] = res[ value ] || {};
						recursive( otherKeys, res[ value ], row );
					}else{
						if( finalKey ){
							res[ value ] = row[ finalKey ];
						}else{
							res[ value ] = row;	
						}
					}
				}
				var res = {};
				rows.forEach( function( row ){ recursive( keys, res, row ) } );
				return res;
			},
			by : function(){
				var keyMapper = property.apply( null, arguments );
				return {
					sum : function( value ){
						var res = {};
						rows.forEach( function( row ){
							var key = keyMapper( row );
							res[ key ] = ( res[ key ] || 0 ) + row[ value ];
						});
						return res;
					},
					count : function(){
						var res = {};
						rows.forEach( function( row ){
							var key = keyMapper( row );
							res[ key ] = ( res[ key ] || 0 ) + 1;
						});
						return res;
					},
					any : function(){
						var res = {};
						rows.forEach( function( row ){
							var key = keyMapper( row );
							res[ key ] = row;
						});
						return res;
					},
					all : function(){
						var res = {};
						rows.forEach( function( row ){
							var key = keyMapper( row );
							res[ key ] = res[ key ] || [];
							res[ key ].push( row );
						});
						return res;
					},
				};
			}
		};
	}

	/*private*/ function apply( item, arg ){
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
		throw new Error( 'apply() can\'t determine what to do with ' + JSON.stringify( item, null, 2 ) + ' and ' + arg );
	}

	function property(){
		var args = Array.prototype.slice.call( arguments );
		return function( item ){
			// do NOT use reduce here, because apply will interpret the third argument :(
			var res = item;
			args.forEach( function( arg ){ res = apply( res, arg ) } );
			return res;
		};
	}

	function onlyUnique( value, index, self ){
		return self.indexOf( value ) === index;
	}

	function flatten( acc, val ){
		return acc.concat( val );
	}

	function and( a, b ){
		return a && b;
	}
	
	function equals( value ){
		return function( item ){
			return item == value;
		}
	};

	function not( predicate ){
		return function( item ){
			return ! predicate( item );
		}
	}
	
	function toMap( acc, pair ){
		// can be used like this: Object.entries( ... ).filter( ... ).reduce( toMap, {} );
		acc[ pair[ 0 ] ] = pair[ 1 ];
		return acc;
	}
	
	function map(){
		var mapper = property.apply( null, [].slice.call( arguments ) );
		return function( array ){
			return array.map( mapper );
		};
	}
	
	function reduce( mapper, initValue ){
		return function( array ){
			return array.reduce( mapper, initValue );
		};
	}
	
	function filter(){
		var args = [].slice.call( arguments );
		return function( array ){
			return array.filter( property.apply( args ) );
		};
	}

	function oneParam( func ){
		// Make sure that func is called with one single parameter.
		// Ignore all other parameters.
		// This is handy for functionals ( forEach, map, reduce ... )
		return function( parameter ){
			return func( parameter );
		}
	}

	function call( obj, method ){
		return function( parameter ){
			return obj[ method ]( parameter );
		}
	}

	function lessThan( value ){
		return function( item ){
			return item < value;
		}
	};

	function lessOrEqual( value ){
		return function( item ){
			return item <= value;
		}
	};

	function greaterThan( value ){
		return function( item ){
			return item > value;
		}
	};

	function endsWith( value ){
		return function( item ){
			var index = item.indexOf( value );
			return index > 0 && index == item.length - value.length;
		}
	};

	function isEmptyString(){
		return function( item ){
			return item == '';
		}
	};

	function isDefined(){
		
		return function( item ){
			return typeof item != 'undefined';
		}
	}

	function getSuffix( separator ){
		return function( str ){
			var arr = str.split( separator );
			return arr[ arr.length - 1 ];
		};
	}
	
	function isIn( list ){
		return function( item ){
			return list.indexOf( item ) >= 0;
		}
	}
	
	function notIn( list ){
		return function( item ){
			return list.indexOf( item ) < 0;
		};
	}
	
	return {
		toList : toList,
		group : group,
		property : property,
		onlyUnique : onlyUnique,
		flatten : flatten,
		and : and,
		equals : equals,
		not : not,
		toMap : toMap,
		map : map,
		reduce : reduce,
		filter : filter,
		oneParam : oneParam,
		call : call,
		lessThan : lessThan,
		lessOrEqual : lessOrEqual,
		greaterThan : greaterThan,
		endsWith : endsWith,
		isEmptyString : isEmptyString,
		isDefined : isDefined,
		getSuffix : getSuffix,
		isIn : isIn,
		notIn : notIn,
	};
})();

for( name in _ ){
	this[ name ] = _[ name ];
}

function settingsFromSheets(){
	var SETTINGS_RANGE = 'A:B';
	var SETTINGS_VALUE_COLUMN = 'B';
	var ALLOW_INVALID = false;
	
	var TYPE_TEXT = {
		'enum'    : 'todo',
		'any'     : 'Enter anything.',
		'string'  : 'Enter any string.',
		'float'   : 'Enter a floating point number.',
		'int'     : 'Enter an integer',
		'boolean' : 'Enter true or false.',
		'email'   : 'Enter an email address.',
		'account' : 'Enter an account id.',
		'money'   : 'Enter a monetary value.',
		
		'enum[]'    : 'todo',
		'any[]'     : 'Enter a list of anything.',
		'string[]'  : 'Enter a list of strings.',
		'float[]'   : 'Enter a list of floating point numbers.',
		'int[]'     : 'Enter a list of integers',
		'boolean[]' : 'Enter a list of true or false values.',
		'email[]'   : 'Enter a list of email addresses.',
		'account[]' : 'Enter a list of account ids.',
		'money[]'   : 'Enter a list of monetary values.',
		
		'enum{}'    : 'todo',
		'any{}'     : 'Enter a map of anything.',
		'string{}'  : 'Enter a map of strings.',
		'float{}'   : 'Enter a map of floating point numbers.',
		'int{}'     : 'Enter a map of integers',
		'boolean{}' : 'Enter a map of true or false values.',
		'email{}'   : 'Enter a map of email addresses.',
		'account{}' : 'Enter a map of account ids.',
		'money{}'   : 'Enter a map of monetary values.',
	};
	
	var TYPE_REGEX = {
		'enum'    : 'todo',
		'any'     : '.*',
		'string'  : '.*',
		'float'   : '\\d+(?:[\\.,]\\d*)?|[\\.,]\\d+',
		'int'     : '\\d+',
		'boolean' : '(?:true|false|yes|no|ja|nein|wahr|falsch)',
		'email'   : '(?:(?:[^<>()\\[\\]\\\\.,;:\\s@"]+(?:\\.[^<>()\\[\\]\\\\.,;:\\s@"]+)*)|(?:".+"))@(?:(?:\\[[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\.[0-9]{1,3}\\])|(?:(?:[a-zA-Z\\-0-9]+\\.)+[a-zA-Z]{2,}))',
		'account' : '\\d\\d\\d-?\\d\\d\\d-?\\d\\d\\d\\d',
		'money'   : '(?:\\d+(?:[\\.,]\\d\\d?)?$|^[\\.,]\\d+)(?:\\s?[€$])?',
	};
	Object.keys( TYPE_REGEX ).forEach( function( type ){
		TYPE_REGEX[ type + '[]' ] = TYPE_REGEX[ type ] + '\\s*(?:[,\\n]\\s*' + TYPE_REGEX[ type ] + '\\s*)*\\s*,?'
	});

	Object.keys( TYPE_REGEX ).forEach( function( type ){
		TYPE_REGEX[ type + '{}' ] =
			  '[^,\\n:]+\\s*:\\s*' + TYPE_REGEX[ type ] + '\\s*(?:[,\\n]\\s*' 
			+ '[^,\\n:]+\\s*:\\s*' + TYPE_REGEX[ type ] + '\\s*)*\\s*,?'
	});
	
	function stringify( obj ){
		if( typeof obj == 'undefined' ){
			return '';
		}
		if( Array.isArray( obj ) ){
			return obj.join( '\n' );
		}
		if( typeof obj == 'string' ){
			return obj;
		}
		if( typeof obj == 'boolean' ){
			if( obj ){
				return 'yes';
			}
			return '';
		}
		return JSON.stringify( obj, null, 2 );
	}
	
	function addValidation( sheet, setting, cell ){
		var validation = SpreadsheetApp.newDataValidation();
		
		if( setting.type == 'boolean' ){
			validation.requireCheckbox()
		}else{
			var regex = TYPE_REGEX[ setting.type ];
			regex = regex.replace( /"/g, '""' );
			var ignoreCase = '(?i)';
			regex = ignoreCase + '^\\s*' + regex + '\\s*$';
			var formula = '=REGEXMATCH(TO_TEXT(' + cell + '),"' + regex + '")';
			//Logger.log( formula );
			validation.requireFormulaSatisfied( formula );
		}
		
		sheet.getRange( cell ).setDataValidation(
			validation
				.setAllowInvalid( ALLOW_INVALID )
				.setHelpText( TYPE_TEXT[ setting.type ] )
				.build()
		);
	}
	
	function prepareSettingsSheet( sheet, settings ){
		//sheet.clear();
		var headers = [ 'Name', 'Value', 'Description', 'Examples', 'Is_Required' ];
		if( sheet.getRange( 'A1' ).isBlank() ){
			sheet.appendRow( headers );
		}
		
		settings = settings.sort( function( a, b ){
			return ( a.required === b.required ) ? 0 : ( a.required === true ? -1 : 1 );
		});
		var settingNamesFromSheet = Object.keys( readSettings( sheet ) );
		
		function indexIn( array ){
			return function( item ){
				return array.indexOf( item );
			};
		}
		
		settings
			.filter(
				property(
					'name',
					indexIn( settingNamesFromSheet ),
					equals( -1 )
				)
			)
			.forEach(
				function( setting ){
					var row = headers
						.map( property( 'toLowerCase' ) )
						.map( property( setting ) )
						.map( stringify )
					;
					//Logger.log( row );
					sheet.appendRow( row );
					
					var rowIndex = sheet.getLastRow();
					addValidation( sheet, setting, SETTINGS_VALUE_COLUMN + rowIndex );
				}
			)
		;
	}
	
	function readSettings( sheet ){
		var map = {};
		sheet
			.getRange( SETTINGS_RANGE )
			.getValues()
			.forEach( function( row ){
				var name = row[ 0 ];
				var value = row[ 1 ];
				map[ name ] = value;
			})
		;
		return map;
	}
	
	function readValue( str, type ){
		function parseValue( type ){
			return function( str ){
				if( type == 'string' ){
					return str;
				}
				if( type == 'float' ){
					return parseFloat( str );
				}
				if( type == 'int' ){
					return parseInt( str );
				}
				if( type == 'boolean' ){
					return [ 'true', 'yes', 'ja' ].indexOf( myValue.toLowerCase() ) >= 0;
				}
				if( type == 'email' ){
					return str;
				}
				if( type == 'account' ){
					return str;
				}
				if( type == 'money' ){
					return parseFloat( str.replace( /[€\$]/g, '' ).trim() );
				}
				throw new Error( 'Got unsupported type : ' + type + '. The value is: ' + str );
			};
		}
		var res = str;
		
		if( [ '[]', '{}' ].indexOf( type.slice( -2 ) ) >= 0 ){
			var subType = type.slice( 0, type.length - 2 );
			
			list = str
				.replace( /\n/g, ',' )
				.replace( /\,+/g, ',' )
				.split( ',' )
				.map( property( 'trim' ) )
				.filter( not( equals( '' ) ) )
			;
			
			if( type.slice( -2 ) == '[]' ){
				res = list.map( parseValue( subType ) );
			}
			if( type.slice( -2 ) == '{}' ){
				res = {};
				list.forEach( function( keyValue ){
					[ key, value ] = keyValue.split( ':' ).map( property( 'trim' ) );
					res[ key ] = parseValue( subType )( value );
				});
			}
		}
		return res;
	}
	
	function isNotSet( value ){
		if( Array.isArray( value ) ){
			return value.length == 0;
		}
		return value == '';
	}
	
	function checkMissingSettings( settings ){
		var missingSettings = settings
			.filter( property( 'is_required' ) )
			//.filter( property( 'value', not( isDefined ) ) )
			.filter( property( 'value', isNotSet ) )
			.map( property( 'name' ) )
		;
		if( missingSettings.length > 0 ){
			throw new Error(
				'Required settings are missing: '
				+ missingSettings.join( ', ' )
				+ '\nGo to ' + SETTINGS_SHEET_URL + ' and set values for these settings'
			);
		}
	}
	
	function updateSettingsFromSheet( sheet, settings ){
		var groupedSettings = group( settings ).by( 'name' ).any();
		var map = readSettings( sheet );
		//Logger.log( 'found settings in sheets: ' + JSON.stringify( map, null, 2 ) );
		
		for( name in map ){
			if( groupedSettings[ name ] ){
				groupedSettings[ name ].value = readValue(
					map[ name ],
					groupedSettings[ name ].type
				);
			}
		}
	}
	
	function makeSettingsGlobal( settings ){
		settings.forEach( function( setting ){
			Logger.log(
				'add global setting: '
				+ setting.name
				+ ' = '
				+ JSON.stringify( setting.value, null, 2 )
			);
			this[ setting.name ] = setting.value;
		});
		//Logger.log( this );
		//printGlobalVariables();
	}
	
	function printGlobalVariables(){
		function deepTypeof( thing ){
			var type = typeof thing;
			if( thing instanceof RegExp ){
				type = 'regexp';
			}
			if( Array.isArray( thing ) ){
				type = 'array';
				type += '[ ' + Object.keys( thing ).map( function( key ){
					return key + ':' + deepTypeof( thing[ key ] );
					}).join( ', ' ) + ' ]';
				return type;
			}
			if( [ 'object' ].indexOf( type ) >= 0 ){
				type += '{ ' + Object.keys( thing ).map( function( key ){
					return key + ':' + deepTypeof( thing[ key ] );
				}).join( ', ' ) + ' }';
				return type;
			}
			return type;
		}
		function hasAcceptableType( thing ){
			var type = (
				[ 'function', 'undefined' ].indexOf( typeof this[ key ] ) == -1
				&& ( typeof this[ key ] != 'object' || this[ key ] instanceof Object )
			);
			return type;
		}
		for( key in this ){
			if( hasAcceptableType( this[ key ] ) ){
				Logger.log( key + ': ' + deepTypeof( this[ key ] ) );
			}
		}
	}
	
	var sheet;
	if( SETTINGS_SHEET_URL === 'PLEASE_REPLACE_THIS_WITH_THE_SHEET_URL' ){
		throw new Error(
			'PLEASE CREATE AN EMPTY SHEET'
			+ ' AND PUT ITS URL INTO SETTINGS_SHEET_URL'
		);
		return;
	}
	sheet = SpreadsheetApp
		.openByUrl( SETTINGS_SHEET_URL )
		.getActiveSheet()
	;
	
	prepareSettingsSheet( sheet, SETTINGS );
	updateSettingsFromSheet( sheet, SETTINGS );
	checkMissingSettings( SETTINGS );
	makeSettingsGlobal( SETTINGS );
	
	//Logger.log( JSON.stringify( group( settings ).byAll( [ 'name' ], 'value' ), null, 2 ) );
}

function surround( prefix, postfix ){
	return function( str ){ return prefix + str + postfix };
}

function initiazeConditions(){
	var conditions = SHEET.getRange( 2, 1, SHEET.getLastRow(), 6 ).getValues();
	conditions.forEach( function ( row ){
	 	if( row[0] != '' ) CONDITIONS.CAMPAIGN.NAME_CONTAINS.push( row[0] );
	 	if( row[1] != '' ) CONDITIONS.CAMPAIGN.NAME_DOES_NOT_CONTAIN.push( row[1]);
	 	if( row[2] != '' ) CONDITIONS.CAMPAIGN.STATUS_IN.push( row[2] );

	 	if( row[3] != '' ) CONDITIONS.AD_GROUP.NAME_CONTAINS.push( row[3] );
	 	if( row[4] != '' ) CONDITIONS.AD_GROUP.NAME_DOES_NOT_CONTAIN.push( row[4] );
	 	if( row[5] != '' ) CONDITIONS.AD_GROUP.STATUS_IN.push( row[5] );
	});
}

function buildConditions(){
	//initiazeConditions();
	return []
	.concat( CONDITIONS.CAMPAIGN.NAME_CONTAINS.map( surround(' CampaignName CONTAINS "', '" ')) )
	.concat( CONDITIONS.CAMPAIGN.NAME_DOES_NOT_CONTAIN.map( surround(' CampaignName DOES_NOT_CONTAIN "', '" ')) )
	.concat( CONDITIONS.AD_GROUP.NAME_CONTAINS.map( surround( ' AdGroupName CONTAINS "' ,'" ' )) )
	.concat( CONDITIONS.AD_GROUP.NAME_DOES_NOT_CONTAIN.map( surround(' AdGroupName DOES_NOT_CONTAIN "', '" ' )) )
	.concat( CONDITIONS.CAMPAIGN.STATUS_IN.map( surround( ' CampaignStatus IN [ "', '"]' ) ))
	.concat( CONDITIONS.AD_GROUP.STATUS_IN.map( surround( ' AdGroupStatus IN ["' , '"] ' )) );
}

function getReport( report, fields, conditions, during ){
	if( fields && Array.isArray( fields ) ){
		fields = fields.map( function( str ){ return str.trim() } ).join( ', ' );
	}
	conditions = ( conditions && conditions.length > 0 ) ? ' WHERE ' + conditions.join( ' AND ' ) : '';
	during = during ? ' DURING ' + formatDateForGoogleAds( during ) + ',' + formatDateForGoogleAds( new Date() ) : '';

	var query = 'SELECT ' + fields + ' FROM ' + report + conditions + during;
	
	Logger.log( 'query: ' + query );
	
	return toList( AdsApp.report( query ).rows() );
}

function buildRow( headers ){
	return function( row ){
		var res = {};
		headers.forEach( function( header ){
			res[ header ] = row[ header ];
		});
		return res;
	};
}

function sum( row1, row2 ){
	var res = [ 'Count' ].concat( METRICS ).reduce(
		function( prev, metric ){
			prev[ metric ] = 
				  parseFloat( row1[ metric ] || 0 )
				+ parseFloat( row2[ metric ] || 0 )
			;
			return prev;
		},
		{}
	);
	return res;
}

function ensureIsNumber( number ){
	if ( Number( number ) !== number ){
		throw new Error( number + ' is not a number' );
	}
	return number;
}

function fenceThreeCampaigns( campaigns, words, category, categories ){

	var highCampaign   = campaigns[ 'High' ];
	var mediumCampaign = campaigns[ 'Medium' ];
	var lowCampaign    = campaigns[ 'Low' ];
	
	var highProfitabilityWords   = words[ 'High' ];
	var mediumProfitabilityWords = words[ 'Medium' ];
	var lowProfitabilityWords    = words[ 'Low' ];
	
	var highNegativeKeywords   = toList( highCampaign   .negativeKeywords().get() );
	var mediumNegativeKeywords = toList( mediumCampaign .negativeKeywords().get() );
	var lowNegativeKeywords    = toList( lowCampaign    .negativeKeywords().get() );
	
	var categoriesToFenceAgainst = categories
		.filter( not( equals( category ) ) )
		.map( function( category ){
			var ar = category.split( ' > ' );
			if( ar.length > 1 ){
				return ar[ 1 ];
			}
			return category;
		})
	;
	
	var negativeForHighProfitability   = [];
	var negativeForMediumProfitability = [];
	var negativeForLowProfitability    = [];
	
	// MODE 1
	if( MODE == 1 ){
		negativeForLowProfitability = negativeForLowProfitability
			.concat( highProfitabilityWords )
			.concat( mediumProfitabilityWords )
			.concat( categoriesToFenceAgainst )
		;
		
		negativeForMediumProfitability = negativeForMediumProfitability
			.concat( highProfitabilityWords )
			.concat( categoriesToFenceAgainst )
		;
		
		negativeForHighProfitability = negativeForHighProfitability
			.concat( categoriesToFenceAgainst )
		;
	}
	// MODE 2
	if( MODE == 2 ){
		
		negativeForLowProfitability = negativeForLowProfitability
			.concat( categoriesToFenceAgainst )
		;
		
		negativeForMediumProfitability = negativeForMediumProfitability
			.concat( lowProfitabilityWords )
			.concat( categoriesToFenceAgainst )
		;
		
		negativeForHighProfitability = negativeForHighProfitability
			.concat( lowProfitabilityWords )
			.concat( mediumProfitabilityWords )
			.concat( categoriesToFenceAgainst )
		;
	}
	
	// add missing negative keywords
	
	negativeForHighProfitability
		.filter( notIn( highNegativeKeywords.map( property( 'getText' ) ) ) )
		.forEach( call( highCampaign, 'createNegativeKeyword' ) )
	;
	
	negativeForMediumProfitability
		.filter( notIn( mediumNegativeKeywords.map( property( 'getText' ) ) ) )
		.forEach( call( mediumCampaign, 'createNegativeKeyword' ) )
	;
	
	negativeForLowProfitability
		.filter( notIn( lowNegativeKeywords.map( property( 'getText' ) ) ) )
		.forEach( call( lowCampaign, 'createNegativeKeyword' ) )
	;
	
	// remove all other negative keywords
	
	highNegativeKeywords
		.filter( property( 'getText', notIn( negativeForHighProfitability ) ) )
		.forEach( property( 'remove' ) )
	;
	
	mediumNegativeKeywords
		.filter( property( 'getText', notIn( negativeForMediumProfitability ) ) )
		.forEach( property( 'remove' ) )
	;
	
	lowNegativeKeywords
		.filter( property( 'getText', notIn( negativeForLowProfitability ) ) )
		.forEach( property( 'remove' ) )
	;
	
}

function pad( number, digits ){
	number = number + '';
	while( number.length < digits ){
		number = '0' + number;
	}
	return number;
}

function daysBack( days ){
	var today = new Date();
	var date = new Date( today.getTime() - MILLIS_IN_A_DAY * days );
	return date;
}

function formatDateForGoogleAds( date ){
	return (
		date.getFullYear() +
		pad( date.getMonth() + 1, 2 ) +
		pad( date.getDate(), 2 )
	);
}

function getSearchQueryRows( account ){
	if( typeof MccApp != 'undefined' ){
		MccApp.select( account );
	}
	
	var fields = ATTRIBUTE_COLUMNS.concat( METRICS );
	
	var sqr = getReport(
		'SEARCH_QUERY_PERFORMANCE_REPORT',
		fields,
		buildConditions(),
		daysBack( DAYS_BACK )
	).map( buildRow( fields ) );
	
	Logger.log( 'found ' + sqr.length + ' search query rows' );
	
	return sqr;
}

var levenshteinCache = {};

function levenshtein( a, b ){
	if(a.length == 0) return b.length; 
	if(b.length == 0) return a.length; 

	var cached = levenshteinCache[ a + '|||' + b ];
	if( typeof cached != 'undefined' ){
		return cached;
	}
	
  var matrix = [];

  // increment along the first column of each row
  var i;
  for(i = 0; i <= b.length; i++){
    matrix[i] = [i];
  }

  // increment each column in the first row
  var j;
  for(j = 0; j <= a.length; j++){
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for(i = 1; i <= b.length; i++){
    for(j = 1; j <= a.length; j++){
      if(b.charAt(i-1) == a.charAt(j-1)){
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                                Math.min(matrix[i][j-1] + 1, // insertion
                                         matrix[i-1][j] + 1)); // deletion
      }
    }
  }
  levenshteinCache[ a + '|||' + b ] = matrix[b.length][a.length];
  return matrix[b.length][a.length];
};

Number.prototype.times = function( callback ){
	for( var i = 1; i <= Number( this.valueOf() ); i++ ){
		callback( i );
	};
}

function cached( mapper ){
	var cache = {};
	return function( key ){
		return cache[ key ] || ( cache[ key ] = mapper( key ) );
	};
}

function determineCategory( categories ){
	function contains( str, part ){
		return ( ' ' + str + ' ' ).indexOf( ' ' + part + ' ' ) >= 0;
	}
	return function( sq ){
		var possibleCategories = categories.filter( function( category ){
			return [ 'CampaignName' ].filter( function( attribute ){
				var res = sq[ attribute ].toLowerCase().indexOf( category.toLowerCase() ) >= 0;
				//var res = contains( sq[ attribute ].toLowerCase(), category.toLowerCase() );
				
				if( res ){
					//Logger.log( attribute + ' = ' + sq[ attribute ].toLowerCase() + ' ||| ' + category.toLowerCase() );
				}
				return res;
			}).length > 0;
		});
		if( possibleCategories.length == 0 ){
			return NO_CATEGORY;
		}
		return possibleCategories[ 0 ];
	};
}

function roas( metrics ){
	return Math.round( metrics.ConversionValue / ( metrics.Cost || .01 ) * 100 ) / 100;
	//return Math.round( ( metrics.ConversionValue - metrics.Cost ) / metrics.Clicks * 100 ) / 100;
}

function computeAvgPerformance( sqrGrouped ){
	var averagePerformance = {};
	Object.entries( sqrGrouped )
		.forEach( function( [ category, searchQueries ] ){
			var overall = searchQueries.reduce( sum, { Count : 0 } );
			averagePerformance[ category ] = roas( overall );
		})
	;
	return averagePerformance;
}

function computeNgrams( sqrGrouped ){
	var ngrams = {};
	Object.entries( sqrGrouped )
		.forEach( function( [ category, searchQueries ] ){
			if( category == NO_CATEGORY ){
				return;
			}
			searchQueries.forEach( function( sq ){
				sq.Query.split( ' ' ).forEach( function( word ){
					
					if( word.match( /[%\.\*,@\!]/ ) != null ){
						return;
					}
					
					ngrams[ category ] = ngrams[ category ] || {};
					ngrams[ category ][ word ] = ngrams[ category ][ word ] ? ngrams[ category ][ word ] : { Count : 0 };
					ngrams[ category ][ word ] = sum( ngrams[ category ][ word ], sq );
				});
			});
			var overall = searchQueries.reduce( sum, { Count : 0 } );
			averagePerformance = roas( overall );
			Logger.log( category + ': ' + searchQueries.length + ' --- ' + JSON.stringify( overall, null, 2 ) );
		})
	;
	return ngrams;
}

function filterWords( ngrams, categories ){
	var res = {};
	Object.entries( ngrams ).forEach( function( [ category, obj ] ){
		res[ category ] = {};
		Object.entries( obj ).forEach( function( [ word, metrics ] ){
			if(
				metrics.Clicks < MIN_CLICKS ||
				categories.indexOf( word ) >= 0 ||
				STOP_WORDS.indexOf( word ) >= 0
				){
					return;
			}
			res[ category ][ word ] = metrics;
			//Logger.log( word + ': ' + roas( metrics ) + ' ' + JSON.stringify( metrics, null, 2 ) );
		});
	});
	return res;
}

function computePerformance( ngrams ){
	Object.entries( ngrams ).forEach( function( [ category, obj ] ){
		Object.entries( obj ).forEach( function( [ word, metrics ] ){
			metrics.Roas = roas( metrics );
			metrics.Cost = Math.round( metrics.Cost * 100 ) / 100;
			metrics.ConversionValue = Math.round( metrics.ConversionValue * 100 ) / 100;
			//Logger.log( word + ': ' + roas( metrics ) + ' ' + JSON.stringify( metrics, null, 2 ) );
			
			if( metrics.Roas >= ( TARGET_ROAS_HIGH[ category ] || TARGET_ROAS_HIGH_DEFAULT ) ){
				metrics.Performance = 'High';
			}else if( metrics.Roas >= ( TARGET_ROAS_MEDIUM[ category ] || TARGET_ROAS_MEDIUM_DEFAULT ) ){
				metrics.Performance = 'Medium';
			}else{
				metrics.Performance = 'Low';
			}
		});
	});
}

function computedRoas( item ){
	item.Roas = Math.round( item.ConversionValue / ( item.Cost || 1 ) * 100 ) / 100;
	item.Count = 1;
}

function CampaignManagement( campaignNameSchemes ){

	function buildRegexp( campaignNameScheme ){
		function toRegexp( arrayOrString ){
			if( typeof arrayOrString == 'string' ){
				return arrayOrString;
			}
			if( Array.isArray( arrayOrString ) ){
				return arrayOrString.join( '|' );
			}
			if( arrayOrString instanceof RegExp ){
				var str = ( '' + arrayOrString );
				return str.substring( 1, str.length - 1 );
			}
			throw 'can\'t determine how to create regexp from ' + arrayOrString;
		}
		var res = '^';
		res += campaignNameScheme.PREFIX;
		res += SEPARATOR;
		res += campaignNameScheme.GROUPS.map( toRegexp ).map( surround( '(', ')' ) ).join( SEPARATOR );
		res += '$';
		Logger.log( res );
		return res;
	}
	
	function parse( campaignNameScheme ){
		var regexp = new RegExp( buildRegexp( campaignNameScheme ), 'i' );
		return function( campaign ){
			var myMatch = campaign.getName().match( regexp );
			var res = {
				CAMPAIGN       : campaign,
				SCHEME_MATCHED : myMatch != null,
			};
			if( myMatch ){
				Object.entries(
					campaignNameScheme.EXTRACTION_ORDER
				).forEach( function( [ index, name ] ){
					res[ name ] = myMatch[ index ];
				});	
			}
			return res;
		};
	}
	
	function log( label ){
		return function( item ){
			Logger.log( label + ': ' + JSON.stringify( item, null, 2 ) );
			return item;
		}
	}
	
	function findTripples( campaignNameScheme, campaigns ){
		var parsedCampaigns = campaigns.map( parse( campaignNameScheme ) );
		if( parsedCampaigns.length == 0 ){
			return {};
		}
		var groupedCampaigns = group( parsedCampaigns ).by( 'SCHEME_MATCHED' ).all();
		
		var mismatches = groupedCampaigns[ 'false' ] || [];
		mismatches.forEach( function( campaign ){
			Logger.log( 'mismatch: ' + campaign.CAMPAIGN.getName() );
		});
		
		var campaignsMatchingScheme = groupedCampaigns[ 'true' ];
		
		//Logger.log( 'grouped campaigns: ' + JSON.stringify( campaignsMatchingScheme, null, 2 ) );
		
		if( ! campaignsMatchingScheme ){
			// nothing found
			return {};
		}

		var keys = Object.values( campaignNameScheme.EXTRACTION_ORDER );
		Logger.log( 'keys: ' + keys );
		
		var campaignTripples = group( campaignsMatchingScheme ).byAll( keys, 'CAMPAIGN' );
		
		/*
		var campaignTripples =
			Object.entries(
				group( campaignsMatchingScheme ).by( 'type' ).all()
			)
			// ensure that there are 3 campaigns for each category or index
			.filter( property( 1, 'length', equals( 3 ) ) )
			// ensure that the 3 campaigns correspond to the 3 profitabilities
			.filter(
				property(
					1,
					map( 'profitability' ),
					filter( onlyUnique ),
					'length',
					equals( 3 )
				)
			)
			// convert array to map: profitability : campaign
			.map(
				function( pair ){
					var res = [
						pair[ 0 ],
						group( pair[ 1 ] ).by( 'profitability' ).any()
					];
					return res;
				}
			)
			.reduce( toMap, {} )
		;
		*/
		return campaignTripples;
	}
	
	/*private*/ function getShoppingCampaigns( conditions ){
		var campaignSelector = AdsApp.shoppingCampaigns();
		( conditions || [] ).forEach( call( campaignSelector, 'withCondition' ) );
		var iterator = campaignSelector.get();
		Logger.log( 'Found ' + iterator.totalNumEntities() + ' shopping campaigns with conditions ' + conditions + '.' );
		return toList( iterator );
	}
	
	function getManagedCampaigns(){
		var conditions = [
			'LabelNames CONTAINS_ALL [ \'' + MANAGED_BY_SCRIPT_LABEL + '\' ]',
			'LabelNames CONTAINS_NONE [\'' + SUSPENDED_LABEL + '\']'
		];
		return findTripples( campaignNameSchemes.MANAGED, getShoppingCampaigns( conditions ) );
	}

	function getSuspendedCampaigns(){
		var conditions = [
			'LabelNames CONTAINS_ALL  [\'' + MANAGED_BY_SCRIPT_LABEL + '\',\'' + SUSPENDED_LABEL + '\' ]',
		];
		return findTripples( campaignNameSchemes.SUSPENDED, getShoppingCampaigns( conditions ) );
	}
	
	function getCategories(){
		return Object.keys( getManagedCampaigns() );
	}
	
	return {
		getManagedCampaigns   : getManagedCampaigns,
		getSuspendedCampaigns : getSuspendedCampaigns,
		getCategories         : getCategories,
	};
}

function findLabel( labelName ){
	var labelSelector = AdWordsApp.labels()
		.withCondition( 'Name = "' + labelName + '"' );
	var labelIterator = labelSelector.get();
	if( labelIterator.hasNext() ){
		return labelIterator.next();
	}
}

function camelize( str ){
    var res = ( ' ' + str )
		.toLowerCase()
		.replace(
			/[^a-zA-ZÀ-ÖØ-öø-ÿ0-9]+(.)/g,
			function( match, chr ){
				return chr.toUpperCase();
			}
		)
	;
	return res;
}

function createLabels(){
	var labels = [ SUSPENDED_LABEL, MANAGED_BY_SCRIPT_LABEL ];
	var missingLabels = labels.filter( not( property( findLabel, isDefined ) ) );
	if( missingLabels.length == labels.length ){
		if( AdWordsApp.getExecutionInfo().isPreview() ){
			Logger.log(
				'Labels ' + missingLabels + ' are missing.' +
				'\nCan\'t create labels in Preview Mode'
			);
		}else{
			labels.forEach( call( AdWordsApp, 'createLabel' ) );
		}
	}
}

function main(){
	try{
		Logger.log( 'start' );
		settingsFromSheets();
		// create labels
		if( typeof MccApp != 'undefined' ){
			MccApp.select( MccApp.accounts().withIds( [ TARGET_ACCOUNT_ID ] ).get().next() );
		}
		createLabels();
		
		var sqr;
		if( typeof MccApp != 'undefined' ){
			sqr = toList(
				MccApp.accounts().withIds(
					SOURCE_ACCOUNT_IDS
				).get()
			)
			.map( getSearchQueryRows )
			.reduce( flatten )
			;
		}else{
			sqr = getSearchQueryRows();
		}
		sqr.forEach( computedRoas );

		if( typeof MccApp != 'undefined' ){
			MccApp.select( MccApp.accounts().withIds( [ TARGET_ACCOUNT_ID ] ).get().next() );
		}
		
		var campaignManagement = CampaignManagement( CAMPAIGN_NAME_SCHEME );
		var suspendedCampaigns = campaignManagement.getSuspendedCampaigns();
		var managedCampaigns   = campaignManagement.getManagedCampaigns();
		var categories         = campaignManagement.getCategories();
		
		for( category in managedCampaigns ){
			for( profitability in managedCampaigns[ category ] ){
				var priorities = Object.keys( managedCampaigns[ category ][ profitability ] );
				if( priorities.length != 1 ){
					throw new Error( 'expected exactly one priority, but got : ' + priorities.length );
				}
				managedCampaigns[ category ][ profitability ] 
					= managedCampaigns[ category ][ profitability ][ priorities[ 0 ] ];
			}
		}
		
		Logger.log( 'suspended: '  + JSON.stringify( suspendedCampaigns, null, 2 ) );
		Logger.log( 'managed: '    + JSON.stringify( managedCampaigns,   null, 2 ) );
		Logger.log( 'categories: ' + JSON.stringify( categories,         null, 2 ) );
		
		var sqrGrouped = group( sqr ).by( determineCategory( categories ) ).all();
		
		delete sqrGrouped[ NO_CATEGORY ];
		
		var ngrams = computeNgrams( sqrGrouped );
		
		Logger.log( '----------------' );
		
		ngrams = filterWords( ngrams, categories ); // remove stop-words, ngrams with less than MIN_CLICKS clicks, and ngrams = category
		
		computePerformance( ngrams );
		
		//Logger.log( 'ngrams: ' + JSON.stringify( ngrams, null, 2 ) );
		
		var res = {};
		Object.entries( ngrams ).forEach( function( [ category, obj ] ){
			
			res[ category ] = {};
			
			PROFITABILITY_BUCKETS.forEach( function( profitability ){
				res[ category ][ profitability ] = Object.entries( obj ).filter( function( [ word, metrics ] ){
					return metrics.Performance == profitability;
				}).map( function( [ word, metrics ] ){
					return word;
				});
			});
			
		});
		
		Logger.log( 'res: ' + JSON.stringify( res, null, 2 ) );
		
		categories.forEach( function( category ){
			Logger.log( 'Category: ' + category );
			var threeCampaigns = managedCampaigns[ category ]; //camelize
			
			var words = res[ category ];
			
			if( ! words ){
				Logger.log( 'no words found for category ' + category );
				return;
			}
			
			if( ! threeCampaigns ){
				Logger.log( 'no campaigns found for category ' + category );
				return;
			}
			
			//Logger.log( 'managedCampaigns: ' + JSON.stringify( managedCampaigns, null, 2 ) );
			//Logger.log( 'category: ' + category ); //camelize
			
			fenceThreeCampaigns( threeCampaigns, words, category, categories );
		});
		Logger.log( 'end' );
	} catch ( error ){
		var accountName = AdWordsApp.currentAccount().getName();
		var subject = 'Error in ' + SCRIPT_NAME + ' ' + accountName;
		var message = error + '\n' + error.stack;
		Logger.log( subject + ' -> ' + message );
		if ( ! AdWordsApp.getExecutionInfo().isPreview() ){
			ERROR_REPORTING_EMAILS.forEach( function( email ){
				MAIL_APP.sendEmail( email, subject, message );
			});
		} else {
			Logger.log( 'don\'t send error-emails in preview-mode' );
		}
		throw error;
    }

}

