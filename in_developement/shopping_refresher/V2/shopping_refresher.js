/*
 * This script adds missing partitions to shopping ad groups.
 * This is usefull for bidding and reporting.
 * Example:
 * Suppose a product partition with following sub-divisions:
 * - Product-Id X ( one product ) ( Max-CPC bid = 2€ )
 * - Product-Id Y ( one product ) ( Max-CPC bid = 1€ )
 * - Everything Else ( no products ) ( Max-CPC bid = 0,50€ )
 *
 * A new product with product id Z appears in the feed:
 * - Product-Id X ( one product ) ( Max-CPC bid = 2€ )
 * - Product-Id Y ( one product ) ( Max-CPC bid = 1€ )
 * - Everything Else ( one product ) ( Max-CPC bid = 0,50€ )
 *
 * This script ( if set up for this ) will create an additional partition
 * for the new product:
 * - Product-Id X ( one product ) ( Max-CPC bid = 2€ )
 * - Product-Id Y ( one product ) ( Max-CPC bid = 1€ )
 * - Product-Id Z ( one product ) ( Max-CPC bid = 0.50€ )
 * - Everything Else ( no products ) ( Max-CPC bid = 0.50€ )
 *
*/


// ----- START OF SETTINGS ----------------------------------

var SCRIPT_NAME = 'shopping_refresher';

var SETTINGS_SHEET_URL = 'https://docs.google.com/spreadsheets/d/1sNZhnyXDgagSqw3qpXZGomHEyP7UsRCAloMIGHYOVSM/edit#gid=0';

var SETTINGS = [
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
		name                   : 'MERCHANT_ID',
		description            : 'Merchant Center ID',
		type                   : 'int',
		value                  : '',
		is_required            : true,
		examples               : [ '1234567' ],
	},
	{
		name                   : 'EXECUTE_ONLY_FOR_PARTITION_TYPES',
		description            : 'Shopping Dimensions which should be managed by this script',
		type                   : 'string[]',
		value                  : [ 'item id', ],
		is_required            : true,
		examples               : [ 'item id', ],
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
];

/*

// TARGET_ACCOUNT_ID is only required if this script is executed inside of an MCC-account.
// Otherwise it is ignored
// TARGET_ACCOUNT_ID determines the client account, for which shopping partitions should be refreshed.
// 1182117027; // die Kartenmacherei
// 4753357988; // Script-Account #4
var TARGET_ACCOUNT_ID = 'only relevant when used in MCC accoutns';

// Merchant Center ID
var MERCHANT_ID = '8308173';

// Determines which partition types should be refreshed.
var EXECUTE_ONLY_FOR_PARTITION_TYPES = [
	'item id',
	// 'brand',
	// 'category',
	// 'channel',
	// 'channel exclusivity',
	// 'condition',
	// 'custom label 0',
	// 'custom label 1',
	// 'custom label 2',
	// 'custom label 3',
	// 'custom label 4',
	// 'product type',
];


*/

// Determines for which campaigns and/or ad groups this script should be executed.
// Keep all lists empty ( [] ) to run this script for all shopping campaigns and adgroups.
var CONDITIONS = {
	CAMPAIGN : {
		NAME_CONTAINS: [ 'DE-Shopping_Low_karten > geburt > geburtskarten > danksagungskarten_High' ],
		NAME_DOES_NOT_CONTAIN : [],
		STATUS_IN : [ 'ENABLED'  ],
	},
	AD_GROUP : {
		NAME_CONTAINS:[], //'DE-Shopping-Geburt-high'
		NAME_DOES_NOT_CONTAIN:[],
		STATUS_IN : [ 'ENABLED' ],
	}
};

// Determines the amount of information provided in logs.
// If VERBOSE is set to true then more information is provided.
// This is usefull for script developement and debugging.
var VERBOSE = false;

// ------- END OF SETTINGS ----------------------------------








// _____ CONSTANTS __________

var PATH_SEPARATOR = ' / ';

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

var BUILDER_NAMES = {
    'brand'               : 'brand',
    'category'            : 'category',
    'channel'             : 'channel',
    'channel exclusivity' : 'channelExclusivity',
    'condition'           : 'condition',
    'custom label 0'      : 'customLabel',
    'custom label 1'      : 'customLabel',
    'custom label 2'      : 'customLabel',
    'custom label 3'      : 'customLabel',
    'custom label 4'      : 'customLabel',
    'item id'             : 'itemId',
    'product type'        : 'productType',
};

var GETTER_SETTER_NAME = {
    'brand'               : 'Name',
    'category'            : 'Name',
    'channel'             : 'Channel',
    'channel exclusivity' : 'ChannelExclusivity',
    'condition'           : 'Condition',
    'custom label 0'      : 'Value',
    'custom label 1'      : 'Value',
    'custom label 2'      : 'Value',
    'custom label 3'      : 'Value',
    'custom label 4'      : 'Value',
    'item id'             : 'Value',
    'product type'        : 'Value',
};

// __________________________


function settingsFromSheets(){
	var SETTINGS_RANGE = 'A:B';
	var SETTINGS_VALUE_COLUMN = 'B';
	var ALLOW_INVALID = false;
	
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
			if( Object.prototype.hasOwnProperty.call( item, arg ) ){
				return item[ arg ];
			}
			if( typeof arg[ item ] != 'undefined' ){
				return arg[ item ];
			}
			
			throw new Error( 'apply() can\'t determine what to do with '
				+ JSON.stringify( item, null, 2 ) 
				+ ' and ' + 
				JSON.stringify( arg, null, 2 )
			);
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

		function properties(){
			var args = Array.prototype.slice.call( arguments );
			return function( item ){
				// do NOT use reduce here, because apply will interpret the third argument :(
				return args.map( function( arg ){ return apply( item, arg ) } );
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
			properties : properties,
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
	
	for( var name in _ ){
		this[ name ] = _[ name ];
	}
	
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

function apply( item, arg ){
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
	throw new Error( 'apply() can\'t determine what to do with ' + item + ' and ' + arg );
}

function property(){
	var args = Array.prototype.slice.call( arguments );
	var f = function( item ){
		// do NOT use reduce here, because apply will interpret the third argument :(
		var res = item;
		args.forEach( function( arg ){ res = apply( res, arg ) } );
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
	f.endsWith = function( pattern ){
		return function( item ){
			var str = f( item );
			var index = str.indexOf( pattern );
			return index >= 0 && index == str.length - pattern.length;
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

function flatten( acc, val ){
	return acc.concat( val );
}

function splitBy( separator ){
	return function( str ){ return str.split( separator ) };
}

function skipFirst(){
	return function( arr ){ return arr.slice( 1 ) };
}

function satisfies( pattern ){
	if( typeof pattern == 'string' ){
		pattern = new RegExp( pattern );
	}
	return function( str ){
		return pattern.test( str );
	}
}

function endsWith( pattern ){
	return function( str ){
		//if( typeof pattern == 'string' ){
		var index = str.indexOf( pattern );
		return index >= 0 && index == str.length - pattern.length;
	};
}

function startsWith( pattern ){
	return function( str ){ return str.indexOf( pattern ) == 0 };
}

function equals( other ){
	return function( item ){ return item == other };
}

function not( predicate ){
	return function( item ){ return ! predicate( item ) };
}

function toList( iterator ){
	var list = [];
	while( iterator.hasNext() ){
		list.push( iterator.next() );
	}
	return list;
}

function surround( prefix, postfix ){
	return function( str ){ return prefix + str + postfix };
}

function buildConditions() {
	return []
	.concat( CONDITIONS.CAMPAIGN.NAME_CONTAINS.map( surround(' CampaignName CONTAINS "', '" ')) )
	.concat( CONDITIONS.CAMPAIGN.NAME_DOES_NOT_CONTAIN.map( surround(' CampaignName DOES_NOT_CONTAIN "', '" ')) )
	.concat( CONDITIONS.AD_GROUP.NAME_CONTAINS.map( surround( ' AdGroupName CONTAINS "' ,'" ' )) )
	.concat( CONDITIONS.AD_GROUP.NAME_DOES_NOT_CONTAIN.map( surround(' AdGroupName DOES_NOT_CONTAIN "', '" ')) )
	.concat( CONDITIONS.CAMPAIGN.STATUS_IN.map( surround( ' CampaignStatus IN [ "', '"]' ) ))
	.concat( CONDITIONS.AD_GROUP.STATUS_IN.map( surround( ' AdGroupStatus IN ["' , '"] ' )) );
}

function getShoppingAdgroups(){
	var conditions = buildConditions();
	var adGroupSelector = AdsApp.shoppingAdGroups();
	conditions.forEach( function ( condition ){
		adGroupSelector = adGroupSelector.withCondition( condition );
	});
	return group( toList( adGroupSelector.get() ) ).by( 'getId' ).any();
}

function getReport( report, fields, conditions ){
	if( fields && Array.isArray( fields ) ){
		fields = fields.map( function( str ){ return str.trim() } ).join( ', ' );
	}
	if( conditions && conditions.length > 0 ){
		conditions = ' WHERE ' + conditions.join( ' AND ' );
	}else{
		conditions = '';
	}

	var query = 'SELECT ' + fields + ' FROM ' + report + conditions;
	
	return toList( AdWordsApp.report( query ).rows() );
}

function group( rows ){
	return {
		by : function( keyAttribute ){
			return {
				sum : function( value ){
					var res = {};
					rows.forEach( function( row ){
						var key = apply( row, keyAttribute );
						res[ key ] = ( res[ key ] || 0 ) + row[ value ];
					});
					return res;
				},
				count : function(){
					var res = {};
					rows.forEach( function( row ){
						var key = apply( row, keyAttribute );
						res[ key ] = ( res[ key ] || 0 ) + 1;
					});
					return res;
				},
				any : function(){
					var res = {};
					rows.forEach( function( row ){
						var key = apply( row, keyAttribute );
						res[ key ] = row;
					});
					return res;
				},
				all : function(){
					var res = {};
					rows.forEach( function( row ){
						var key = apply( row, keyAttribute );
						res[ key ] = res[ key ] || [];
						res[ key ].push( row );
					});
					return res;
				}
			};
		}
	};
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

function parsePath( path ){
	//Logger.log( 'path: ' + path );
	if( path.charAt( path.length - 1 ) == '/' ){
		// Subdivisions have a slash at the end. remove it
		path = path.substring( 0, path.length - 2 );
	}
	var res = {};
	path.split( PATH_SEPARATOR )
		.filter( function( str ){ return str.indexOf( '*' ) == -1 } )
		.forEach( function( keyValuePair ){
			var ar = keyValuePair.split( ' = ' );
			var key = ar[ 0 ];
			var value = ar[ 1 ].replace( /"/g, '' )
				//.toLowerCase()
				.trim()
			;
			var before = res[ key ];
			res[ key ] = ( before ? ( before + ' > ' ) : '' ) + value;
		})
	;
	//Logger.log( 'res: ' + JSON.stringify( res, null, 2 ) );
	return res;
}

function doForAllProdcutsFromShoppingAPI( handler, limit ){
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

function test( handler ){
	var product = {
		googleProductCategory : 'Bürobedarf > Schreibwaren > Etiketten & Anhängerschilder > ',
		customLabel1 : 'Design: Cosmic Christmas',
		offerId : 'teot9sg-f600-c04',
		productType : 'Anhänger > Weihnachten > Weihnachtskarten > Geschenkanhänger',
	};
	handler( product );
}

function main(){ // >>>>>>>>>>>>>>>>> MAIN <<<<<<<<<<<<<<<<<<<<<<
	try {
		settingsFromSheets();
		if( typeof MccApp != 'undefined' ){
			MccApp.select( MccApp.accounts().withIds( [ TARGET_ACCOUNT_ID ] ).get().next() );
		}

		/*
			var adGroupId = 80678452467;
			var adGroup = AdsApp.shoppingAdGroups().withIds( [ adGroupId ] ).get().next();
			var root = adGroup.rootProductGroup();
			toList( root.children().get() ).forEach( function( node ){
				Logger.log( node.asCategory().getName() + ' | ' + node.isOtherCase() );
			});
			return;
		*/

		var info = computeInfo();
		Logger.log( 'info: ' + JSON.stringify( info, null, 2 ) );

		var result = {};

		var productSupplier = doForAllProdcutsFromShoppingAPI;
		//var productSupplier = test;

		var limit = 1000; // unlimited

		productSupplier( myHandler( info, result ), limit );

		var keys = Object.keys( result );
		Logger.log( 'result:\n' + keys.join( '\n' ) );

		if( keys.length > 0 ){
			Logger.log( 'create product groups ' );
		}
		var countNew = keys.reduce(
			function( accumulator, key ){
				var item = result[ key ];
				Logger.log( JSON.stringify( item, null, 2 ) );

				var success = createNewProductIdPartition(
					item.dimension,
					item.adGroup,
					item.path,
					item.cpcBid,
					item.value
				);
				return accumulator + success;
			},
			0
		);
		
		Logger.log( 'countNew: ' + countNew );
			
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

function computeValue2( dimension, path, product ){
	var value = product[ HEADERS[ dimension ] ];
	if( [ 'category', 'product type' ].indexOf( dimension ) >= 0  ){
		var n = path[ dimension ] ? path[ dimension ].split( ' > ' ).length : 0;
		value = value.split( ' > ' )[ n ];
	}
	return value;
}

function myHandler( partitions, result ){
	var adGroups = getShoppingAdgroups();
	
	return function( product ){
		partitions.filter( function( partition ){
			var value = computeValue2( partition.dimension, partition.path, product );
			//Logger.log( 'value: ' + value );
			if( value == null ){
				// product does't have a this attribute
				return false;
			}
			
			var isNew = partition.values
				.map( property( 'toLowerCase' ) )
				.indexOf( value.replace( /"/g, '' ).toLowerCase() ) == -1
			;
			//Logger.log( 'isNew: ' + isNew );
			
			var pathMatches = Object.keys( partition.path ).filter( function( attributeName ){
				var productValue = product[ HEADERS[ attributeName ] ];
				//productValue = productValue ? productValue.toLowerCase() : productValue;
				var partitionValue = partition.path[ attributeName ]
					//.toLowerCase()
				;
				if( productValue == null ){
					// product doesn't have this attribute
					// it doesn't match
					return false;
				}
				if( partitionValue == null ){
					throw 'partitioinValue is null';
				}
				var theyMatch = productValue.toLowerCase() == partitionValue.toLowerCase();
				if( [ 'category', 'product type' ].indexOf( attributeName ) >= 0 ){
					theyMatch = productValue
						.toLowerCase()
						.indexOf( partitionValue.toLowerCase() )
						== 0
					;
				}
				if( VERBOSE ){
					Logger.log(
						'match ' + ( theyMatch ? '' : 'not ' ) + 'found for '
						+ attributeName
						+ ': ' 
						+ productValue
						+ ' |||| '
						+ partitionValue
					);
					//Logger.log( JSON.stringify( product, null, 2 ) );
				}
				return !theyMatch;
			}).length == 0;
			
			//Logger.log( partition.dimension + ', path-match: ' + pathMatches
			//	+ ', is new: ' + isNew );
			
			return pathMatches && isNew;
		}).forEach( function( partition ){
			var adGroup = adGroups[ partition.adGroupId ];
			
			var value = computeValue2( partition.dimension, partition.path, product );
			
			var key = adGroup.getId() + ': ' + Object.keys( partition.path )
				.map( function( attribute ){
					return attribute + ' = ' + partition.path[ attribute ];
				})
				.join( ' | ' )
				+ ' ||| '
				+ partition.dimension + ' = ' + value
			;
			result[ key ] = {
				dimension : partition.dimension,
				adGroup   : adGroup,
				path      : partition.path,
				cpcBid    : partition.cpcBid,
				value     : value,
			};
		});
	};
}

function computeKey( node ){
	var type = node.getDimension();
	if( type == 'CUSTOM_LABEL' ){
		type = node.asCustomLabel().getType();
		type = type.replace( 'ATTRIBUTE', 'LABEL' );
	}
	return type.replace( /_/g, ' ' ).toLowerCase();
}

function computeValue( node, key ){
	var asMethodName = 'as'
		+ BUILDER_NAMES[ key ].charAt( 0 ).toUpperCase()
		+ BUILDER_NAMES[ key ].substring( 1 )
	;
	var getterMethodName = 'get' + GETTER_SETTER_NAME[ key ];
	var value = node[ asMethodName ]()[ getterMethodName ]();
	if( VERBOSE ){
		Logger.log( '.' + asMethodName + '().' + getterMethodName + '() == ' + value );
	}
	return value;
}

function followPath2( node, path, targetDepth, depth ){
	depth = depth || 0;
	targetDepth = targetDepth ||
		(
			Object.keys( path ).length
			+ ( path[ 'category' ] ? path[ 'category' ].split( ' > ' ).length - 1 : 0 )
			+ ( path[ 'product type' ] ? path[ 'product type' ].split( ' > ' ).length - 1 : 0 )
		)
	;
	if( depth == targetDepth ){
		// stop recursion. we found the right level
		return node;
	}
	
	var children = toList( node.children().get() );
	
	children = children.filter( function( node ){
		if( node.isOtherCase() ){
			return false;
		}
		var key = computeKey( node );
		var value = computeValue( node, key );
		if( value == null ){
			throw 'value for key ' + key + ' is null -> ' + node.getDimension();
		}
		if( path[ key ] == null ){
			throw 'path[ ' + key + ' ] is null';
		}
		var match = path[ key ].toLowerCase() == value.toLowerCase();
		if( [ 'category', 'product type' ].indexOf( key ) >= 0 ){
			match = path[ key ].toLowerCase().indexOf( value.toLowerCase() ) >= 0;
		}
		return match;
	});
	if( children.length != 1 ){
		throw 'Expected exactly one node matching ' 
			+ JSON.stringify( path, null, 2 )
			+ ' but got: ' + children.length
		;
	}
	return followPath2( children[ 0 ], path, targetDepth, depth + 1 );
	
	/*
	var key = computeKey( node );
	var value = computeValue( node, key );
	Logger.log(
		key
		+ ' => '
		+ value
	);
	*/
}

function createNewProductIdPartition( dimension, adGroup, path, cpcBid, value ){
	var root = adGroup.rootProductGroup();
	
	var parentNode = followPath2( root, path );
	
	var builderName = BUILDER_NAMES[ dimension ] + 'Builder';
	var setterName  = 'with' + GETTER_SETTER_NAME  [ dimension ];
	
	if( VERBOSE ){
		Logger.log( 'builderName: ' + builderName );
		Logger.log( 'setterName: ' + setterName );
		Logger.log( 'parentNode: ' + parentNode );
		Logger.log( 'dimension: ' + dimension );
		Logger.log( 'value: ' + value );
	}
	
	var builder = parentNode
		.newChild()
		[ builderName ]()
		[ setterName ]( value )
	;
	
	if( cpcBid.indexOf( 'auto' ) == -1 ){
		builder = builder
			.withBid( cpcBid )
	}
	
	if( dimension.indexOf( 'custom label' ) == 0 ){
		builder = builder.withType( dimension.replace( / /g, '_' ).toUpperCase() );
	}
		
	var operation = builder.build();
	if( !operation.isSuccessful() ){
		Logger.log( 'Operation errors: ' + operation.getErrors() );
	}else{
		Logger.log( 'new ' + dimension + ': ' + value 
			+ ' in ' + adGroup.getName() + ' created' );
	}
	return operation.isSuccessful();
}

function computeInfo(){
	var headers = [ 'AdGroupId', 'ProductGroup', 'IsNegative', 'CpcBid' ];
	
	var partitions = getReport(
			'PRODUCT_PARTITION_REPORT',
			headers,
			buildConditions()
			//.concat( [ 'PartitionType = "UNIT"' ] )
		)
		.map( buildRow( headers ) )
	;
	
	var groupedPartitions = group( partitions ).by( 'AdGroupId' ).all();
	
	var regex = '(' + EXECUTE_ONLY_FOR_PARTITION_TYPES.join( '|' ) + ') = \\*$';
	
	var res2 = Object.keys( groupedPartitions ).map( function( adGroupId ){
		var paths = groupedPartitions[ adGroupId ].map( property( 'ProductGroup' ) );
		var everythingElse_ = groupedPartitions[ adGroupId ]
			.filter( property( 'IsNegative', equals( 'false' ) ) )
			.filter( property( 'ProductGroup', satisfies( regex ) ) )
		;
		
		var res = everythingElse_.map(
			function( everythingElse ){
				var path = everythingElse[ 'ProductGroup' ];
				var dimension = path.match( regex )[ 1 ];
				
				var pathLength = path.split( PATH_SEPARATOR ).length;
				var pathPrefix = path.substring( 0, path.lastIndexOf( ' / ' ) );
				
				var values = paths
					.filter( not( equals( path ) ) )
					.filter( startsWith( pathPrefix ) )
					.filter( function( otherPath ){
						var otherLength = otherPath.split( PATH_SEPARATOR ).length;
						return otherLength == pathLength;
					})
					.map(
						function( path ){
							var arr = path.split( ' = ' );
							var res3 = arr[ arr.length - 1 ]
								.replace( /"/g, '' )
								.replace( / \//g, '' ) // sub-divisions trailing slash
							;
							return res3;
						}
					)
				;
				return {
					dimension  : dimension,
					adGroupId  : adGroupId,
					path       : parsePath( path ),
					values     : values,
					cpcBid     : everythingElse[ 'CpcBid' ],
				};
			}
		);
		return res;
	})
		.reduce( flatten, [] )
	;
	return res2;
}
