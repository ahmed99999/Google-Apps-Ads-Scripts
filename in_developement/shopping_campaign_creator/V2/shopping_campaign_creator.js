/*
 * This scripts manages schopping campaigns according to
 * categories from feed ( determined by custom-label-0 ).
 * It expects to have enough suspended shopping campaigns
 * to be present in account which can be used to for new
 * categories found in feed. If a new category is found,
 * a tripple of suspended shopping campaigns is renamed, 
 * relabeled and adjusted for the use for this category.
 * If a category is removed from feed (not found any more)
 * then the 3 campaigns are suspended (renamed, paused,..)
 * for later use.
 *
*/


// ----- START OF SETTINGS -----------------
/*
// TARGET_ACCOUNT_ID is only required if this script is executed inside of an MCC-account.
// Otherwise it is ignored.
// TARGET_ACCOUNT_ID determines the client account,
// for which shopping campaigns should be managed.
// 9031124505; // die Kartenmacherei DE (shopping)
// 4753357988; // Script-Account #4
var TARGET_ACCOUNT_ID = 'only relevant when used in MCC accoutns';

// Merchant Center ID
var MERCHANT_ID = '8308173';

// Default CPC-bid for new product partitions
var CPC = .3;

// Determines whether the script should suspend (
// rename, pause, label, remove product groups )
// campaigns which belong to a category which is
// not found in the feed ( determined by 
// custome-label-0 ).
// if SUSPEND_CAMPAIGNS is set to true then the script
// will suspend such campaigns. Otherwise not.
var SUSPEND_CAMPAIGNS = false;

// Who to send email notifications to in case of errors?
var ERROR_REPORTING_EMAILS = [ 'a.tissen@pa.ag' ];

// Use only these categories for shopping
// campaign management. Ignore all other 
// custom-label-0's found in shopping-feed.
// Leave CATEGORY_FILTER empty ( [] ) to use 
// this script for all categories ( custom-label-0's ).
var CATEGORY_FILTER = [
	'karten > geburt > geburtskarten > danksagungskarten',
	'karten > geburtstag > geburtstagseinladungen > 50. geburtstag',
];

*/

var SETTINGS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1sNZhnyXDgagSqw3qpXZGomHEyP7UsRCAloMIGHYOVSM/edit#gid=0';

var SETTINGS = [
	{
		name                   : 'TARGET_ACCOUNT_ID',
		description            : ''
			+ 'The client account, for which '
			+ 'shopping campaigns should be managed.',
		type                   : 'account',
		value                  : '',
		is_required            : false,
		examples               : [ '123-456-7890', 1234567890 ],
	},
	{
		name                   : 'MERCHANT_ID',
		description            : 'Merchant Center ID',
		type                   : 'int',
		value                  : '',
		is_required            : true,
		examples               : [ '1234567' ],
	},
	{
		name                   : 'CPC',
		description            : 'Default CPC-bid for new product partitions.',
		type                   : 'money',
		value                  : '',
		is_required            : true,
		examples               : [ .3 ],
	},
	{
		name                   : 'SUSPEND_CAMPAIGNS',
		description            : ''
			+ 'Determines whether the script should suspend ( '
			+ 'rename, pause, label, remove product groups )'
			+ 'campaigns which belong to a category which is'
			+ 'not found in the feed ( determined by '
			+ 'customer-label-0 )'
			,
		type                   : 'boolean',
		value                  : 'FALSE',
		is_required            : false,
		examples               : [ true, false ],
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
		name                   : 'CATEGORY_FILTER',
		description            : ''
			+ 'Limits the categories for shopping '
			+ 'campaign management to those listed here.'
			+ 'Ignores all custom-label-0\'s found in '
			+ 'shopping-feed which are not listed here.'
			+ 'Leave CATEGORY_FILTER empty ( [] ) to use '
			+ 'this script for all categories ( custom-label-0\'s )',
		type                   : 'string[]',
		value                  : [],
		allow_empty            : true,
		is_required            : false,
		examples               : [
			[],
			[
				'karten > geburt > geburtskarten > danksagungskarten',
				'karten > geburtstag > geburtstagseinladungen > 50. geburtstag',
			]
		],
	},
];

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


// This setting should not be changed if the script is already
// working (or has been working) in account.
var MODE = 1;

// This determines how campaigns are expected to be named
// for the script to be able to extract information from its names.
// Don't change this if the script is already (or has been running)
// running in account.
var CAMPAIGN_NAME_SCHEME = {
	MANAGED : {
		PREFIX : 'DE-Shopping',
		GROUPS : [
			[ 'Low', 'Medium', 'High' ], // profitability
			/[a-zA-Z0-9 >ßöäüÖÄÜ\.]+/,
			[ 'Low', 'Medium', 'High' ], // priority
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
			[ 'Low', 'Medium', 'High' ], // priority
		],
		EXTRACTION_ORDER : {
			1 : 'INDEX',
			2 : 'PRIORITY',
			// one-based ( zero is full match )
		},
	},
};

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

// ----- END OF SETTINGS -----------------









// ------ CONSTANTS --------------
var HEADERS = {
    'brand'           : 'brand',
    'category'        : 'googleProductCategory',
    'channel'         : 'channel',
    // 'channel exclusivity' : '????',
    'condition'       : 'condition',
    'custom label 0'  : 'customLabel0',
    'custom label 1'  : 'customLabel1',
    'custom label 2'  : 'customLabel2',
    'custom label 3'  : 'customLabel3',
    'custom label 4'  : 'customLabel4',
    'item id'         : 'offerId',
    'product type'    : 'productType',
};
var MILLIS_IN_A_DAY = 1000 * 60 * 60 * 24;
var SCRIPT_NAME = 'shopping campaign manager';
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
			throw new Error( 'rows is undefined' );
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
		var mapper = property.apply( null, arguments );
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

	function surround( prefix, postfix ){
		return function( str ){ return prefix + str + postfix };
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

	function call2( obj, method ){
		return function( parameter1, parameter2 ){
			return obj[ method ]( parameter1, parameter2 );
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
		surround : surround,
		oneParam : oneParam,
		call : call,
		call2 : call2,
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
			throw new Error( 'can\'t determine how to create regexp from ' + arrayOrString );
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
	
	function getShoppingCampaigns( conditions ){
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
	
	return {
		getManagedCampaigns   : getManagedCampaigns,
		getSuspendedCampaigns : getSuspendedCampaigns,
		
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

function suspendCampaigns( managedCampaigns, suspendedCampaigns, categories ){
	
	var obsoleteCategories = Object
		.keys( managedCampaigns )
		//.map( property( 'toLowerCase' ) )
		.filter(
			notIn(
				categories
			//.map( property( 'toLowerCase' ) )
			)
		)
	;
	
	if( obsoleteCategories.length > 0 ){
		Logger.log( 'Found obsolete categories: ' + obsoleteCategories );
	}else{
		// nothing to do
		return;
	}
	
	obsoleteCategories.forEach( function( category ){
		var largestIndex = Object.keys( suspendedCampaigns )
			.map( function( index ){ return index / 1 } )
			.reduce( call2( Math, 'max' ), -1 )
		;
		var nextIndex = largestIndex + 1;
		Logger.log( 'next index: ' + nextIndex );
		suspendedCampaigns[ nextIndex ] = {};
		
		PROFITABILITY_BUCKETS.forEach( function( profitability ){
			PRIORITY_BUCKETS.forEach( function( priority ){
				priority = camelize( priority );
				profitability = camelize( profitability );
				/*
				Logger.log( 'category: ' + category );
				Logger.log( Object.keys( managedCampaigns[ category ] ) );
				Logger.log( '3) profitability: ' + profitability );
				Logger.log( 'priority: ' + priority );
				*/
				var campaign = managedCampaigns[ category ][ profitability ][ priority ];
				if( ! campaign ){
					// the combination of profitability and priority does not exist
					return;
				}
				
				var adGroup = toList( campaign.adGroups().get() )[ 0 ]; // TODO: fix index out of bounds
				var root = adGroup.rootProductGroup()
				if( root ){
					root.remove();
				}
				campaign.applyLabel( SUSPENDED_LABEL );
				campaign.pause();
				
				campaign.setName(
					CAMPAIGN_NAME_SCHEME.SUSPENDED.PREFIX
					+ SEPARATOR
					+ nextIndex
					+ SEPARATOR
					+ priority
				);
				suspendedCampaigns[ nextIndex ][ priority ] = campaign;
			});
			delete managedCampaigns[ category ][ profitability ];
		});
	});
}

function newCampaigns( managedCampaigns, suspendedCampaigns, categories ){
	
	var newCategories = categories
		.map( property( 'toLowerCase' ) )
		.filter(
			notIn(
				Object.keys( managedCampaigns )
				.map( property( 'toLowerCase' ) )
			)
		)
	;
	
	if( newCategories.length > 0 ){
		Logger.log( 'found new categories: ' + newCategories );
	}else{
		// nothing to do
		return;
	}
	
	function computeProfitability( priority, modus ){
		if( modus == 2 ){
			return priority;
		}else{
			// modus == 1
			if( priority == 'Medium' ){
				return 'Medium';
			}
			if( priority == 'High' ){
				return 'Low';
			}
			if( priority == 'Low' ){
				return 'High';
			}
		}
	}
	
	var largestIndex = Object.keys( suspendedCampaigns ).map( function( index ){ return index / 1 } )
		.reduce( call2( Math, 'max' ), -1 )
	;
	Logger.log( 'largest index : ' + largestIndex );
	
	while( newCategories.length > 0 && largestIndex >= 0 ){
		var threeCampaigns = suspendedCampaigns[ largestIndex ];
		
		delete suspendedCampaigns[ largestIndex ];
		
		var largestIndex = Object.keys( suspendedCampaigns ).map( function( index ){ return index / 1 } )
			.reduce( call2( Math, 'max' ), -1 )
		;
		Logger.log( 'largest index : ' + largestIndex );
	
		var category = newCategories.pop();
		managedCampaigns[ category ] = {};
		
		Object.keys( threeCampaigns ).forEach( function( priority ){
			var profitability = computeProfitability( priority, MODE );
			var campaign = threeCampaigns[ priority ];
			Logger.log( 'priority: ' + priority );
			
			managedCampaigns[ category ][ profitability ] = {};
			managedCampaigns[ category ][ profitability ][ priority ] = threeCampaigns[ priority ];
			
			campaign.setName(
				[
					CAMPAIGN_NAME_SCHEME.MANAGED.PREFIX
					,profitability
					,category
					,priority
				]
				.join( SEPARATOR )
			);
			campaign.enable();
			campaign.removeLabel( SUSPENDED_LABEL );
			var adGroup = toList( campaign.adGroups().get() )[ 0 ]; // TODO: fix index out of bounds
			Logger.log( 'adGroup: ' + adGroup );
			
			var root = adGroup.createRootProductGroup().getResult();
			
			Logger.log( 'root: ' + root );
			
			var group = root
				.newChild()
				.customLabelBuilder()
				.withType( 'CUSTOM_LABEL_0' )
				.withValue( category )
				.withBid( CPC )
				.build()
				.getResult()
			;
			Logger.log( 'created new product group: ' + group );

			toList(
				root
					.children()
					//.withCondition( 'ProductGroup CONTAINS \'OtherCase\'' )
					.get()
			).forEach( function( productGroup ){
				if( productGroup.isOtherCase() ){
					productGroup.exclude();
				}
				Logger.log( 'found product group: ' + productGroup + ' - ' + productGroup.isOtherCase() );
			});
		});
	}
	if( newCategories.length > 0 ){
		throw new Error( 'could not creatre campaigns (no suspended campaigns left)'
			+ 'for following categories: ' + newCategories.join( '\n' )
		);
	}
}

function doForAllProdcutsFromShoppingAPI( handler, limit ){
	function buildRow( headers ){
		return function( row ){
			var res = {};
			headers.forEach( function( header ){
				res[ header ] = row[ header ];
			});
			return res;
		};
	}
	var maxSaveInteger = 9007199254740991;
	limit = limit || maxSaveInteger;
	var largestAllowedValue = 250;
	var args = { maxResults: Math.max( 0, Math.min( largestAllowedValue, limit ) ) };
	var headers = Object.keys( HEADERS ).map( property( HEADERS ) );
	//function( header ){ return HEADERS[ header ] }
	
	var countCalls = 0;
	do{
		data = ShoppingContent.Products.list( MERCHANT_ID, args );
		args.pageToken = data.nextPageToken;
		
		var parsed = data.resources
			.filter( property( 'source', equals( 'feed' ) ) )
			.slice( 0, limit - countCalls * args.maxResults )
			//.map( function( x ){ Logger.log( JSON.stringify( x, null, 2 ) ); return x } )
			.map( buildRow( headers ) )
		;
		
		if( countCalls == 0 ){
			Logger.log(
				'first product: '
				+ JSON.stringify( parsed[ 0 ], null, 2 )
			);
		}
		
		parsed.forEach( handler );
		countCalls++;
		if( countCalls % 40 == 0 ){
			Logger.log( 'products proessed: ' + ( countCalls * args.maxResults ) );
		}
	} while ( args.pageToken && countCalls * args.maxResults < limit ); // && false
}

function customLabelAggregator(){
	var labels = {};
	
	return {
		accept : function( product ){
			var customLabel0 = product[ 'customLabel0' ];
			
			if( customLabel0.indexOf( 'Karten >' ) != 0 ){
				return;
			}
			labels[ customLabel0 ] = 1;
		},
		getLabels : function(){ return Object.keys( labels ) },
	};
}

function main(){
	try{
		Logger.log( 'start' );
		settingsFromSheets();
		
		var handler = customLabelAggregator();
		
		doForAllProdcutsFromShoppingAPI( handler.accept, 1000000 );
		
		categories = handler.getLabels();
		
		Logger.log( 'count labels: ' + categories.length );
		Logger.log( 'customLabel0\'s: ' + categories.slice( 0, 10 ).join( '\n' ) );

		if( CATEGORY_FILTER.length > 0 ){
			categories = categories
				.filter( function( category ){
					var res = CATEGORY_FILTER
						.map( function( x ){ return x.toLowerCase() } )
						.indexOf( category.toLowerCase() ) >= 0
					;
					return res;
				})
			;
		}
		
		Logger.log( 'count labels: ' + categories.length );
		Logger.log( 'customLabel0\'s: ' + categories.slice( 0, 10 ).join( '\n' ) );
		
		if( typeof MccApp != 'undefined' ){
			MccApp.select( MccApp.accounts().withIds( [ TARGET_ACCOUNT_ID ] ).get().next() );
		}
		createLabels();
		
		var campaignManagement = CampaignManagement( CAMPAIGN_NAME_SCHEME );
		var suspendedCampaigns = campaignManagement.getSuspendedCampaigns();
		var managedCampaigns   = campaignManagement.getManagedCampaigns();

		Logger.log( 'suspended: ' + JSON.stringify( suspendedCampaigns, null, 2 ) );
		Logger.log( 'managed: '   + JSON.stringify( managedCampaigns,   null, 2 ) );

		if( SUSPEND_CAMPAIGNS ){
			suspendCampaigns( managedCampaigns, suspendedCampaigns, categories );
		}
		newCampaigns( managedCampaigns, suspendedCampaigns, categories );
		
	}catch( error ){
		var accountName = AdWordsApp.currentAccount().getName();
		var subject = 'Error in ' + SCRIPT_NAME + ' ' + accountName;
		var message = error + '\n' + error.stack;
		Logger.log( subject + ' -> ' + message );
		if ( ! AdWordsApp.getExecutionInfo().isPreview() ){
			ERROR_REPORTING_EMAILS.forEach( function( email ){
				MailApp.sendEmail( email, subject, message );
			});
		} else {
			Logger.log( 'don\'t send error-emails in preview-mode' );
		}
		throw error;
	}
}


