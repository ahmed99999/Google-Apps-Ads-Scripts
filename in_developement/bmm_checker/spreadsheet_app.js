
//Reference https://developers.google.com/shopping-content/v2/reference/v2/


// ------ START OF SETTINGS ----------

// Create a new Google Sheet and insert URL here:
var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1tKMdFaam5pSz8g5rE8pj4VaZgalLTXWXFMx0z0ZC-0M/edit#gid=0';

// ------ END OF SETTINGS ------------
// -----------------------------------
// -----------------------------------


var TABS = [
	{
		tabName    : '1. SUMMARY',
		method     : 'getSummary',
		sortColumn : 'Account Name',
		type       : 'output',
		columns    : [
			{
				name : 'Account Name',
				isKey : true,
			},
			{
				name : 'Status',
				isKey : true,
			},
			{
				name : 'Problem',
				isKey : true,
			},
			{
				name : 'Count',
			},
		],
	},
	{
		tabName    : '2. SETTINGS',
		method     : 'importNewAccounts',
		type       : 'input',
		columns    : [
			{
				name : 'Account Name',
				isKey : true,
			},
			{
				name : 'Emails',
			},
		],
	},
];

// --- CONSTANTS ---------
var SCRIPT_NAME = 'test_spreadsheets';

var ERROR_REPORTING_EMAILS = [ 'a.tissen@pa.ag' ];

var MILLIS_IN_A_DAY = 1000 * 60 * 60 * 24;

// -----------------------

var mySpreadSheetApp = ( function(){
	
	// --------- Polyfills ---------------------
	Object.values = Object.values || ( function( obj ){
		return Object.keys( obj ).map( function( key ){
			return obj[ key ];
		});
	});

	// --------- Enchance Functionals ----------
	Array.prototype.map    = enchanceFunctional( Array.prototype.map );
	Array.prototype.filter = enchanceFunctional( Array.prototype.filter );

	function apply( item, mapper, index, array ){
		if( typeof mapper == 'function' ){
			return mapper( item, index, array );
		}
		if(
			typeof mapper == 'string'
			&& typeof item[ mapper ] == 'function'
		){
			return item[ mapper ]();
		}
		if( 
			typeof mapper == 'string'
			&& typeof item[ mapper ] != 'undefined'
		){
			return item[ mapper ];
		}
		
		if( typeof mapper[ item ] != 'undefined' ){
			return mapper[ item ];
		}
		
		if(
			typeof mapper == 'object'
			&& Object.prototype.toString.call( mapper ) == '[object Object]'
		){
			//console.log( 'obj' );
			var res = {};
			Object.keys( mapper ).forEach( function( key ){
				res[ key ] = apply( item, mapper[ key ] );
			});
			return res;
		}
		
		if(
			typeof mapper == 'object'
			&& Object.prototype.toString.call( mapper ) == '[object Array]'
		){
			//console.log( 'arr' );
			return mapper.map( function( mapperX ){
				return apply( item, mapperX, index, array );
			});
		}
		
		throw new Error(
			'apply() can\'t determine what to do with '
			+ JSON.stringify( item, null, 2 )
			+ ' and '
			+ mapper
		);
	}

	function enchanceFunctional( originalFunctional ){
		return function(){
			var mapperList = [].slice.call( arguments );
			var finalMapper = function( item, index, array ){
				var res = item;
				mapperList.forEach( function( mapper ){
					res = apply( res, mapper, index, array );
				} );
				return res;
			};
			return originalFunctional.call( this, finalMapper );
		};
	}

	//--------- Tools --------------------------
	var _ = {
		toList : function( iter, max ){
			var list = [];
			while( iter.hasNext() && ( typeof max == 'undefined' || max-- > 0 ) ){
				list.push( iter.next() );
			}
			return list;
		},
		matchData : function( oldData, newData, keys ){
			var res = {
				oldOnly : [],
				updated : [],
				newOnly : [],
			};
			
			var groupedNew = group( newData ).byAll( keys );
			oldData.forEach( function( oldItem ){
				var newItem = keys.reduce(
					function( prev, key ){
						return prev ? prev[ oldItem[ key ] ] : prev;
					},
					groupedNew
				);
				if( !newItem ){
					res.oldOnly.push( oldItem );
				}else{
					res.updated.push(
						{
							oldItem : oldItem,
							newItem : newItem,
						}
					);
				}
			});
			var groupedOld = group( oldData ).byAll( keys );
			newData.forEach( function( newItem ){
				var oldItem = keys.reduce(
					function( prev, key ){
						return prev ? prev[ newItem[ key ] ] : prev;
					},
					groupedOld
				);
				if( !oldItem ){
					res.newOnly.push( newItem );
				}
			});
			
			return res;
		},
		group : function( rows ){
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
				throw new Error( 'apply() can\'t determine what to do with ' + JSON.stringify( item, null, 2 ) + ' and ' + arg );
			}
			if( ! rows ){
				throw new Error( 'rows is undefined' );
			}
			if( ! Array.isArray( rows ) ){
				throw new Error( 'rows must be an array' );	
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
			};
		},
		equals : function( value ){
			return function( item ){
				return value == item;
			}
		},
		flatten : function( acc, arr ){
			if( ! Array.isArray( arr ) ){
				throw new Error( 'flatten expected an array, but got: ' + ( typeof arr ) );
			}
			return acc.concat( arr );
		},
		isDefined : function( value ){
			return value != null;
		},
		onlyUnique : function ( value, index, self ){
			return self.indexOf( value ) === index;
		},
	};

	for( key in _ ){
		this[ key ] = _[ key ];
	}
	
	// --------------------
	
	function initSheet( sheetIdOrUrl, sheetName ){
		var book;
		book = SpreadsheetApp.openByUrl( sheetIdOrUrl );
		
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

	function readTableFromSheet( sheetIdOrUrl, sheetName ){
		var sheet = initSheet( sheetIdOrUrl, sheetName );
		
		//book = SpreadsheetApp.openById( sheetIdOrUrl ).getSheetByName( sheetName ).getFilter();
		
		var f = sheet.getFilter();
		
		if( ! f ){
			return [];
		}
		var table = f.getRange().getValues();
		var headers = table.shift();
		
		return table.map( function( row ){
			var res = {};
			headers.forEach( function( header, index ){ res[ header ] = row[ index ] } );
			return res;
		});
	}

	function writeTableIntoSheet( sheetIdOrUrl, data, tab ){
		var sheet = initSheet( sheetIdOrUrl, tab.tabName );
		sheet.setFrozenRows( 0 );
		
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
		var a1 = sheet.getRange( 'A1' );
		a1.setValue( tab.tabName );
		a1.setFontSize( 18 );
		
		if( data.length == 0 ){
			return;
		}
		var rowOffset = 3;
		
		// prepare data, make a table
		var headers = Object.keys( data[ 0 ] );
		data = data.map( Object.values );
		data.unshift( headers );
		
		var rowStart = rowOffset;
		var rowEnd = rowOffset + data.length - 1;
		var colStart = 1;
		var colEnd = headers.length;
		
		var rc = 'R' + rowStart + 'C' + colStart + ':R' + rowEnd + 'C' + colEnd;
		
		var range = sheet.getRange( rc );
		range.setFontSize( 10 );
		range.setValues( data );
		var filter = range.createFilter();
		if( tab.sortColumn ){
			var sortColumnPosition = tab
				.columns
				.map( 'name' )
				.indexOf( tab.sortColumn )
				+ 1
			;
			filter.sort( sortColumnPosition, false /* false means descending */ );
		}
		
		var headerRc = 'R' + rowStart + 'C' + colStart + ':R' + rowStart + 'C' + colEnd;
		var headerRange = sheet.getRange( headerRc );
		headerRange.setFontSize( 12 );
		headerRange.setFontWeight( 'bold' );
		headerRange.protect();
		
		sheet.setFrozenRows( rowOffset );
		
		tab.columns.forEach( function( column, index ){
			var rowStart = rowOffset + 1;
			var rowEnd = rowOffset + data.length - 1;
			var colStart = index + 1;
			var colEnd = index + 1;
			var rc = 'R' + rowStart + 'C' + colStart + ':R' + rowEnd + 'C' + colEnd;
			var range = sheet.getRange( rc );
			if( column.numberFormat ){
				range.setNumberFormat( column.numberFormat );
			}
			column.conditionalFormats.forEach( function( format ){
				//Logger.log( 'format: ' + JSON.stringify( format, null, 2 ) );
				var rule = SpreadsheetApp.newConditionalFormatRule()
					.setRanges( [ range ] )
				;
				var keys = [
					'whenNumberGreaterThan',
					'whenCellEmpty',
					'whenCellNotEmpty',
					'whenFormulaSatisfied',
					'whenNumberBetween', // two params -> doesn't work
					'whenNumberNotBetween', // two params -> doesn't work
					'whenNumberEqualTo',
					'whenNumberGreaterThan',
					'whenNumberGreaterThanOrEqualTo',
					'whenNumberLessThan',
					'whenNumberLessThanOrEqualTo',
					'whenNumberNotEqualTo',
					'whenTextContains',
					'whenTextDoesNotContain',
					'whenTextEndsWith',
					'whenTextEqualTo',
					'whenTextStartsWith',
					
					'setBackground',
					'setBold',
					'setFontColor',
					'setItalic',
					'setStrikethrough',
					'setUnderline',
				];
				
				keys.forEach( function( key ){
					if( typeof format[ key ] != 'undefined' ){
						//Logger.log( key + '( ' + format[ key ] + ' )' );
						rule = rule[ key ]( format[ key ] );
					}
				});
				
				if( format.min ){
					//Logger.log( 'min' );
					rule = rule.setGradientMinpointWithValue(
							format.min.color,
							SpreadsheetApp.InterpolationType.NUMBER,
							format.min.value
						)
					;
				}
				if( format.mid ){
					//Logger.log( 'mid' );
					rule = rule.setGradientMidpointWithValue(
							format.mid.color,
							SpreadsheetApp.InterpolationType.NUMBER,
							format.mid.value
						)
					;
				}
				if( format.max ){
					//Logger.log( 'max' );
					rule = rule.setGradientMaxpointWithValue(
							format.max.color,
							SpreadsheetApp.InterpolationType.NUMBER,
							format.max.value
						)
					;
				}
				var rules = sheet.getConditionalFormatRules();
				rules.push( rule.build() );
				sheet.setConditionalFormatRules( rules );
			});
		});
		
		// this doesn't work:
		// autoResize has to wait for previous operations to finish
		// Utilities.sleep( 1000 * 5 );
		sheet.autoResizeColumns( 1, sheet.getMaxColumns() );
		
	}

	function addOldColumns( updated ){
		// I think this is used only in input-tabs to update new columns
		// If new columns are introduced to an input-tab then this function
		// should be called
		updated.forEach( function( pair ){
			var newColumns = Object.keys( pair.newItem );
			Object.keys( pair.oldItem ).forEach( function( oldColumn ){
				if( newColumns.indexOf( oldColumn ) == -1 ){
					pair.newItem[ oldColumn ] = pair.oldItem[ oldColumn ];
				}
			});
		});
	}

	function updateDeltaColumns( allColumns, updatedColumns ){
		allColumns
			.filter( 'deltaOf', isDefined )
			.forEach( function( column ){
				updatedColumns.forEach( function( pair ){
					pair.newItem[ column.name ] =
						  pair.newItem[ column.deltaOf ]
						- pair.oldItem[ column.deltaOf ]
					;
				});
			})
		;
	}

	function validateColumns( row, tab ){
		var columns = Object.keys( row );
		var expectedColumns = tab.columns.map( 'name' );
		expectedColumns.forEach( function( expectedColumn ){
			if( columns.indexOf( expectedColumn ) == -1 ){
				throw new Error(
					'Expected column '
					+ expectedColumn
					+ ' but found only: '
					+ columns.join( ', ' )
				);
			}
		});
		columns.forEach( function( column ){
			if( expectedColumns.indexOf( column ) == -1 ){
				throw new Error(
					'Found unexpected column: '
					+ column
					+ '. Expected to find only: '
					+ expectedColumns.join( ', ' )
				);
			}
		});
	}
	
	function truncateString( str, maxLength ){
		if( str.length <= maxLength ){
			return str;
		}
		var firstHalf  = Math.floor( ( maxLength - 3 ) / 2 );
		var secondHalf = Math.ceil( ( maxLength - 3 ) / 2 );
		return str.substring( 0, firstHalf )
			+ '...'
			+ str.substring( str.length - secondHalf, str.length )
		;
	}
	
	function addDefaults( tabs ){
		// set defaults for all columns
		var COLUMN_DEFAULTS = {
			isKey              : false,
			conditionalFormats : [],
			deltaOf            : null,
		}
		tabs.forEach( function( tab ){
			tab.columns.forEach( function( column ){
				Object.keys( COLUMN_DEFAULTS ).forEach( function( property1 ){
					if( typeof column[ property1 ] == 'undefined' ){
						column[ property1 ] = COLUMN_DEFAULTS[ property1 ];
					}
				});
			});
		});
	}
	
	return function( tabs, accounts ){
		addDefaults( tabs );
		
		var results = tabs.map( function( tab ){
			var oldData = readTableFromSheet( SPREADSHEET_URL, tab.tabName );
			var func = function( account ){
				return this[ tab.method ]( tab, account );
			};
			var data = accounts.map( func ).reduce( flatten, [] );
			
			var keys = tab.columns.filter( 'isKey' ).map( 'name' );
			
			if( tab.type == 'input' ){
				// For input tabs switch data and oldData
				var dummy = data;
				data = oldData;
				oldData = dummy;
			}
			
			var matched = matchData( oldData, data, keys );
			
			updateDeltaColumns( tab.columns, matched.updated );
			
			// Logger.log( 'keys: ' + JSON.stringify( keys, null, 2 ) );
			// Logger.log( 'oldData: ' + JSON.stringify( oldData, null, 2 ) );
			// Logger.log( 'data: ' + JSON.stringify( data, null, 2 ) );
			// Logger.log( 'matched: ' + JSON.stringify( matched, null, 2 ) );
			
			var newData = [].concat(
				matched.oldOnly,
				matched.updated.map( 'newItem' ),
				matched.newOnly
			);
			return {
				tab     : tab,
				data    : newData,
				matched : matched,
				keys    : keys,
			};
		});
		
		Logger.log( 'write into sheets' );
		results.forEach( function( result ){
			writeTableIntoSheet(
				SPREADSHEET_URL,
				result.data,
				result.tab
			);
		});
		
	};
})();

function main(){
	try{
		Logger.log( 'start' );
		
		var accounts = toList( MccApp.accounts().get() );
		
		mySpreadSheetApp(
			TABS,
			accounts
		);
		
		//var settings = results.filter( 'tab', 'tabName', equals( TAB_NAMES.settings ) )[ 0 ];
		
		Logger.log( 'end' );
		
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

function importNewAccounts( tab, account ){
	return [{
		'Account Name' : account.getName(),
		'Emails' : '',
	}];
}

function getSummary( tab, account ){
	return [{
		'Account Name' : account.getName(),
		'Status' : 'test',
		'Problem' : 'test2',
		'Count' : 1,
	}];
}

// Logging into Bigquery + Email-support

// BigQuery.Jobs.insert(
var nonce = new Date().getTime(); // circumvent cache
var url = 'https://storage.googleapis.com/adwords-scripts-144712.appspot.com/components.js' + '?v=' + nonce;
eval( UrlFetchApp.fetch( url ).getContentText() );



