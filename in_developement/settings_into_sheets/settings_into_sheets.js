
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


var SETTINGS1 = [
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

var SETTINGS2 = [
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

var SCRIPT_NAME = 'settings_into_sheets';
	
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


function main(){
	try{
		Logger.log( 'start' );
		settingsFromSheets();
	
	
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












