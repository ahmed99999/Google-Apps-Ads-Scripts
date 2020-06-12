
/*
TODO:
	- format email
	- autoResizeColumns doesn't work properly
	- Idea: Notification about new feeds from same account
	- Idea: Notification about feeds in progress
	- replace #NUM! with "-" in "Item Errors%" column in 1.FEEDS tab
*/


//Reference https://developers.google.com/shopping-content/v2/reference/v2/


// ------ START OF SETTINGS ----------

// Create a new Google Sheet and insert its ID (or URL) here:
var SPREADSHEET_ID = '1SFC6f2G8OaFtjNUIINrl8TmnQlka-wkh91n-njVnh-U';

var DO_WARNING_AND_ERROR_TABS = true;

var MAX_FEED_NAME_LENGTH = 40;

// ------ END OF SETTINGS ------------
// -----------------------------------
// -----------------------------------

var SCRIPT_NAME = 'Shopping_Feed_Monitoring';

var ERROR_REPORTING_EMAILS = [ 'a.tissen@pa.ag' ];

var COLUMNS = {
	account                  : 'Account Name',
	targetCountry            : 'Target Country',
	name                     : 'Feed Name',
	itemsTotal               : 'Items Total',
	itemsTotalChange         : 'Items Total Change',
	//itemsValid             : 'Items Valid',
	itemsError               : 'Item Errors',
	itemsErrorChange         : 'Item Errors Change',
	itemsErrorPercentage     : 'Item Errors %',
	processingStatus         : 'Status',
	lastUpdate               : 'Last Update',
	fetchSchedule            : 'Feed Schedule',
	severity                 : 'Issue Severity',
	numItems                 : 'Nr Issues',
	issueId                  : 'Issue Type',
	lastChecked              : 'Last Checked',
	examples                 : 'Data Quality Issue Examples',
	datafeedId               : 'Feed Id',
	errorMessage             : 'Error Message',
	errorCode                : 'Error Code',
	errorCount               : 'Nr Errors',
	errorExamples            : 'Error Examples',
	warningMessage           : 'Warning Message',
	warningCode              : 'Warning Code',
	warningCount             : 'Nr Warnings',
	warningExamples          : 'Warning Examples',
	emails                   : 'Emails',
	errorPercentageThreshold : 'Notify me if Error % gets Greater Than',
	errorIncreaseThreshold   : 'Notify me if number of new Errors exceeds',
	itemsTotalIncrease       : 'Notify me if total number of items increases by %',
	itemsTotalDecrease       : 'Notify me if total number of items decreases by %',
	statusChanged            : 'Notify me if feed status changed',
	noUpdateSinceDays        : 'Notify me if last feed update is X days ago',
};

// --- CONSTANTS ---------
var SHEET_URL_PREFIX = 'https://docs.google.com/spreadsheets/d/';
var MILLIS_IN_A_DAY = 1000 * 60 * 60 * 24;

// -----------------------

var TAB_NAMES = {
	feeds             : '1. FEEDS',
	errors            : '2. ERRORS',
	warnings          : '3. WARNINGS',
	dataQualityIssues : '4. Data Quality Issues',
	settings          : '5. SETTINGS',
	
};

var TABS = [
	{	tabName : TAB_NAMES.feeds,
		method  : 'getFeed',
		sortColumn : COLUMNS.itemsTotal,
		type    : 'output',
		columns : [
			{
				name : COLUMNS.account,
				isKey : true,
			},
			{
				name : COLUMNS.targetCountry,
				isKey : true,
			},
			{
				name : COLUMNS.name,
				isKey : true,
			},
			{
				name : COLUMNS.itemsTotal,
			},
			{
				name : COLUMNS.itemsTotalChange,
				deltaOf : COLUMNS.itemsTotal,
				numberFormat : '+##0;-##0;-;@',
			},
			{
				name : COLUMNS.itemsError,
				conditionalFormats : [
					{
						whenNumberGreaterThan : 0,
						setBackground : '#FFAAAA',
					},
				],
			},
			{
				name : COLUMNS.itemsErrorChange,
				deltaOf : COLUMNS.itemsError,
				numberFormat : '+##0;-##0;-;@',
				conditionalFormats : [
					{
						whenNumberGreaterThan : 0,
						setBackground : '#FFAAAA',
					},
				],
			},
			{
				name : COLUMNS.itemsErrorPercentage,
				numberFormat : '##0%;##0%;0%;@',
				conditionalFormats : [
					{
						min : { color : '#FFFFFF', value : 0   },
						mid : { color : '#FFAAAA', value : 0.1 },
						max : { color : '#FF8888', value : 1   },
					},
				],
			},
			{
				name : COLUMNS.processingStatus,
				conditionalFormats : [
					{
						whenTextEqualTo : 'failure',
						setBackground : '#FFAAAA',
					},
					{
						whenTextEqualTo : 'none',
						setBackground : '#AAAAAA',
					},
					{
						whenTextEqualTo : 'in progress',
						setBackground : '#AAFFFF',
					},
				],
			},
			{
				name : COLUMNS.lastUpdate,
			},
			{
				name : COLUMNS.fetchSchedule,
			},
		],
	},
	{	tabName : TAB_NAMES.errors,
		method  : 'getErrors',
		sortColumn : COLUMNS.errorCount,
		type    : 'output',
		columns : [
			{
				name : COLUMNS.account,
				isKey : true,
			},
			{
				name : COLUMNS.datafeedId,
				isKey : true,
			},
			{
				name : COLUMNS.errorMessage,
			},
			{
				name : COLUMNS.errorCode,
			},
			{
				name : COLUMNS.errorCount,
				conditionalFormats : [
					{
						whenNumberGreaterThan : 0,
						setBackground : '#FFAAAA',
					},
				],
			},
			{
				name : COLUMNS.errorExamples,
			},
		],
	},		
	{	tabName : TAB_NAMES.warnings,
		method  : 'getWarnings',
		sortColumn : COLUMNS.warningCount,
		type    : 'output',
		columns : [
			{
				name : COLUMNS.account,
				isKey : true,
			},
			{
				name : COLUMNS.datafeedId,
				isKey : true,
			},
			{
				name : COLUMNS.warningMessage,
			},
			{
				name : COLUMNS.warningCode,
				conditionalFormats : [
					{
						whenNumberGreaterThan : 0,
						setBackground : '#FFFFAA',
					},
				],
			},
			{
				name : COLUMNS.warningCount,
			},
			{
				name : COLUMNS.warningExamples,
			},
		],
	},	
	{	tabName : TAB_NAMES.dataQualityIssues,
		method  : 'getFeedDataQualityIssues',
		sortColumn : COLUMNS.numItems,
		type    : 'output',
		columns : [
			{
				name : COLUMNS.account,
				isKey : true,
			},
			{
				name : COLUMNS.severity,
			},
			{
				name : COLUMNS.numItems,
			},
			{
				name : COLUMNS.issueId,
			},
			{
				name : COLUMNS.lastChecked,
			},
			{
				name : COLUMNS.examples,
			},
		],
	},	
	{	tabName : TAB_NAMES.settings,
		method  : 'getFeed2',
		//sortColumn : COLUMNS.itemsTotal,
		type    : 'input',
		columns : [
			{
				name : COLUMNS.account,
				isKey : true,
			},
			{
				name : COLUMNS.targetCountry,
				isKey : true,
			},
			{
				name : COLUMNS.name,
				isKey : true,
			},
			{
				name : COLUMNS.emails,
			},
			{
				name   : COLUMNS.errorPercentageThreshold,
				target : COLUMNS.itemsErrorPercentage,
				numberFormat : '##0%;##0%;0%;@',
			},
			{
				name   : COLUMNS.errorIncreaseThreshold,
				target : COLUMNS.itemsErrorChange,
			},
			{
				name   : COLUMNS.itemsTotalIncrease,
				target : COLUMNS.itemsTotalChange,
				numberFormat : '##0%;##0%;0%;@',
			},
			{
				name   : COLUMNS.itemsTotalDecrease,
				target : COLUMNS.itemsTotalChange,
				numberFormat : '##0%;##0%;0%;@',
			},
			{
				name   : COLUMNS.statusChanged,
				target : COLUMNS.processingStatus,
			},
			{
				name   : COLUMNS.noUpdateSinceDays,
				target : COLUMNS.fetchSchedule,
			},
		],
	},
];
// set defaults for all columns
var COLUMN_DEFAULTS = {
	isKey              : false,
	conditionalFormats : [],
	deltaOf            : null,
}
TABS.forEach( function( tab ){
	tab.columns.forEach( function( column ){
		Object.keys( COLUMN_DEFAULTS ).forEach( function( property1 ){
			if( typeof column[ property1 ] == 'undefined' ){
				column[ property1 ] = COLUMN_DEFAULTS[ property1 ];
			}
		});
	});
});

function toSheetUrl( sheetIdOrUrl ){
	if( sheetIdOrUrl.indexOf( SHEET_URL_PREFIX ) == 0 ){
		return sheetIdOrUrl;
	}
	return SHEET_URL_PREFIX + sheetIdOrUrl;
}

function initSheet( sheetIdOrUrl, sheetName ){
	var book;
	if( sheetIdOrUrl.indexOf( SHEET_URL_PREFIX ) == 0 ){
		book = SpreadsheetApp.openByUrl( sheetIdOrUrl );
	}else{
		book = SpreadsheetApp.openById( sheetIdOrUrl );
	}
	/* 
	if ( !sheetName ){
		sheetName = book.getSheetName();
	}
	*/
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

function processTab( accounts ){
	return function( tab ){
		var oldData = readTableFromSheet( SPREADSHEET_ID, tab.tabName );
		var feed = [];
		try{
			feed = this[ tab.method ]( accounts, tab );
		}catch( error ){
			if( error.message && error.message.indexOf( 'Internal error' ) >= 0 ){
				Logger.log( 'ignore Shopping API "Internal error"' );
			}
			throw error;
		}
		
		var keys = tab.columns.filter( 'isKey' ).map( 'name' );
		
		if( tab.type == 'input' ){
			// For input tabs switch feed and oldData
			var dummy = feed;
			feed = oldData;
			oldData = dummy;
		}
		
		var matched = matchData( oldData, feed, keys );
		
		// This is only needed 
		// to introduce new columns for input tabs
		// addoldColumns( matched.updated );
		
		updateDeltaColumns( tab.columns, matched.updated );
		
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
	};
}

function computeAlerts2( newFeedRow, oldFeedRow, setting ){
	var emails = setting[ COLUMNS.emails ];
	/*Logger.log(
		  ' feedRow: ' + JSON.stringify( feedRow, null, 2 )
		+ ' setting: ' + JSON.stringify( setting, null, 2 )
	);
	*/
	var res = [];
	
	var newValue  = newFeedRow[ COLUMNS.itemsErrorChange ];
	var threshold =    setting[ COLUMNS.errorIncreaseThreshold ];
	if( threshold != '' && newValue > threshold ){
		var alert = {
			account         : newFeedRow[ COLUMNS.account ],
			targetCountry   : newFeedRow[ COLUMNS.targetCountry ],
			name            : newFeedRow[ COLUMNS.name ],
			metric          : COLUMNS.itemsErrorChange,
			setting         : COLUMNS.errorIncreaseThreshold,
			threshold       : threshold,
			value           : newValue,
			emails          : emails,
		};
		res.push( alert );
	}
	
	var oldValue = oldFeedRow[ COLUMNS.itemsTotal ];
	var newValue = newFeedRow[ COLUMNS.itemsTotal ];

	var threshold = setting[ COLUMNS.itemsTotalIncrease ];
	if( threshold != '' ){
		threshold += 1;
		if( oldValue > 0 && newValue / oldValue > threshold ){
			var alert = {
				account         : newFeedRow[ COLUMNS.account ],
				targetCountry   : newFeedRow[ COLUMNS.targetCountry ],
				name            : newFeedRow[ COLUMNS.name ],
				metric          : COLUMNS.itemsTotal,
				setting         : COLUMNS.itemsTotalIncrease,
				threshold       : threshold,
				newValue        : newValue,
				oldValue        : oldValue,
				emails          : emails,
			};
			res.push( alert );
		}
	}
	
	var threshold = setting[ COLUMNS.itemsTotalDecrease ];
	if( threshold != '' ){
		if( oldValue > 0 && newValue / oldValue < threshold ){
			var alert = {
				account         : newFeedRow[ COLUMNS.account ],
				targetCountry   : newFeedRow[ COLUMNS.targetCountry ],
				name            : newFeedRow[ COLUMNS.name ],
				metric          : COLUMNS.itemsTotal,
				setting         : COLUMNS.itemsTotalDecrease,
				threshold       : threshold,
				newValue        : newValue,
				oldValue        : oldValue,
				emails          : emails,
			};
			res.push( alert );
		}
	}
	
	var newValue = newFeedRow[ COLUMNS.itemsErrorPercentage ];
	var oldValue = oldFeedRow[ COLUMNS.itemsErrorPercentage ];
	
	var threshold = setting[ COLUMNS.errorPercentageThreshold ];
	if( threshold != '' && newValue > threshold && oldValue <= threshold ){
		var alert = {
			account         : newFeedRow[ COLUMNS.account ],
			targetCountry   : newFeedRow[ COLUMNS.targetCountry ],
			name            : newFeedRow[ COLUMNS.name ],
			metric          : COLUMNS.itemsErrorPercentage,
			setting         : COLUMNS.errorPercentageThreshold,
			threshold       : threshold,
			newValue        : newValue,
			oldValue        : oldValue,
			emails          : emails,
		};
		res.push( alert );
	}
	
	var newValue = newFeedRow[ COLUMNS.processingStatus ];
	var oldValue = oldFeedRow[ COLUMNS.processingStatus ];
	var check = setting[ COLUMNS.statusChanged ];
	if(
		newValue != oldValue
		&& newValue == 'failure'
		&& ( check == 'yes' || check === true )
	){
		var alert = {
			account         : newFeedRow[ COLUMNS.account ],
			targetCountry   : newFeedRow[ COLUMNS.targetCountry ],
			name            : newFeedRow[ COLUMNS.name ],
			metric          : COLUMNS.processingStatus,
			setting         : COLUMNS.statusChanged,
			check           : check,
			newValue        : newValue,
			oldValue        : oldValue,
			emails          : emails,
		};
		res.push( alert );
	}
	
	var newValue  = newFeedRow[ COLUMNS.lastUpdate ];
	var threshold = setting[ COLUMNS.noUpdateSinceDays ];
	if( threshold != '' ){
		var minUpdateDelayThreshold = 2;
		if( threshold < minUpdateDelayThreshold ){
			Logger.log(
				threshold
				+ ' is not a valid setting for update-delay. Adjusting to '
				+ minUpdateDelayThreshold
			);
			threshold = minUpdateDelayThreshold;
		}
		if(
			Math.floor(
				(
					  new Date().getTime()
					- new Date( newValue ).getTime()
				) / MILLIS_IN_A_DAY
			)
			== threshold
			){
				var alert = {
					account         : newFeedRow[ COLUMNS.account ],
					targetCountry   : newFeedRow[ COLUMNS.targetCountry ],
					name            : newFeedRow[ COLUMNS.name ],
					metric          : COLUMNS.lastUpdate,
					setting         : COLUMNS.noUpdateSinceDays,
					threshold       : threshold + ' days',
					value           : newValue,
					emails          : emails,
				};
				res.push( alert );
		}
	}
	return res;
}

function computeAlerts( feeds, settings, keyNames ){
	var oldGroupedFeeds = group(
			feeds.matched.updated.map( 'oldItem' )
		).byAll( keyNames )
	;
	var newGroupedFeeds = group( feeds.data ).byAll( keyNames );
	
	function findRow( keys, grouped ){
		return keys.reduce(
				function( obj, key ){
					return obj ? obj[ key ] : obj
				},
				grouped
		);
	}
	
	return settings.map( function( setting ){
		var keys = keyNames.map( setting );
		
		var newfeedRow = findRow( keys, newGroupedFeeds );
		var oldFeedRow = findRow( keys, oldGroupedFeeds );
		
		if(
			newfeedRow
			&& oldFeedRow
			&& newfeedRow[ COLUMNS.processingStatus ] != 'in progress'
		){
			return computeAlerts2( newfeedRow, oldFeedRow, setting );
		}
		return [];
	})
	.reduce( flatten, [] );
}

function getAccounts(){
	var accountIdentifiers = ShoppingContent
		.Accounts
		.authinfo()
		.accountIdentifiers
	;
	return accountIdentifiers.map( function( id ){
			// if merchantId is present then it's a single account
			if( id.merchantId ){
				var name = ShoppingContent
					.Accounts
					.get( id.merchantId, id.merchantId )
					.name
				;
				return [{
					aggrigator_id : id.aggregatorId,
					id            : id.merchantId,
					name          : name,
				}];
			}
			// otherwise it's an aggrigator account
			try{
				var res = ShoppingContent
					.Accounts
					.list( id.aggregatorId )
					.resources
					.map( function( account ){
						return {
							aggrigator_id : id.aggregatorId,
							id   : account.id,
							name : account.name,
						};
					})
				;
				return res;
			}catch( error ){
				if(
					error.message.indexOf(
						'API call to content.accounts.list failed with error: User cannot access account'
					) >= 0
				){
					Logger.log( 'can\'t access account ' + id.aggregatorId + '. Skip it.' );
					return [];
				}
				throw error;
			}
		})
		.reduce( flatten, [] )
	;
}

function getAggrigators(){
	return ShoppingContent
		.Accounts
		.authinfo()
		.accountIdentifiers
		.map( 'aggregatorId' )
	;
}

function formatAlert( alert ){
	var prefix = '<p>For account "'
		+ alert.account
		+ '" in country "'
		+ alert.targetCountry
		+ '" for the feed "'
		+ alert.name
		+ '" '
	;
	var postfix = ' from "'
		+ alert.oldValue
		+ '" to "'
		+ alert.newValue
		+ '".<br>'
		+ 'Threshold is : "'
		+ alert.threshold
		+ '"</p>'
	;
	
	var messages = {};
	messages[ COLUMNS.errorPercentageThreshold ] =
		prefix + 'the error percentage increased' + postfix
	;
	messages[ COLUMNS.errorIncreaseThreshold ] =
		prefix
		+ 'the number of new errors increased by '
		+ alert.value
		+ '.<br>Threshold is '
		+ alert.threshold
		+ '</p>'
	;
	messages[ COLUMNS.itemsTotalIncrease ] =
		prefix + 'the total number of items increased' + postfix
	;
	messages[ COLUMNS.itemsTotalDecrease ] =
		prefix + 'the total number of items decreased' + postfix
	;
	messages[ COLUMNS.statusChanged ] =
		prefix + 'the status changed' + postfix
	;
	messages[ COLUMNS.noUpdateSinceDays ] =
		prefix + 'there was no update since ' + alert.value + '</p>'
	;
	
	return messages[ alert.setting ];
}

function formatAlerts( alerts ){
	return alerts.map( formatAlert ).join( '<br><br>' )
		+ '<br><br>'
		+ '<a href="' + toSheetUrl( SPREADSHEET_ID ) + '">'
		+ 'All Feeds and Settings'
		+ '</a>'
	;
}

function sendEmails( alerts ){
	
	var uniqueEmails = alerts
		.map( 'emails' )
		.map( split( ',' ) )
		.reduce( flatten, [] )
		.map( String.trim )
		.filter( onlyUnique )
	;
	Logger.log( 'unique emails: ' + uniqueEmails + '' );
	
	uniqueEmails.forEach( function( emailAdress ){
		
		var alertsForUser = alerts
			.filter( 'emails', contains( emailAdress ) )
		;
		
		Logger.log(
			'Send '
			+ formatAlerts( alertsForUser )
			+ ' to '
			+ emailAdress
			+ ''
		);
		
		MailApp.sendEmail({
			to: emailAdress,
			subject: SCRIPT_NAME + ' alerts',
			htmlBody: formatAlerts( alertsForUser ),
		});
	});
}

function main(){
	try{
		Logger.log( 'start' );
		
		var accounts = getAccounts();
		
		Logger.log( 'accoutns:\n' + accounts.map(
			function( account ){
				return Object.keys( account )
					.map( function( key ){ return key + ': ' + account[ key ] } )
					.join( ', ' )
				;
			} ).join( '\n' )
		);

		//accounts = accounts.filter( 'id', equals( '10505194' ) );
		//Logger.log( accounts );

		var tabs = [ TABS[ 0 ], TABS[ 4 ] ];

		if( DO_WARNING_AND_ERROR_TABS ){
			tabs = TABS;
		}
		var results = tabs.map( processTab( accounts ) );

		Logger.log( 'write into sheets' );
		results.forEach( function( result ){
			writeTableIntoSheet(
				SPREADSHEET_ID,
				result.data,
				result.tab
			);
		});

		var feeds    = results.filter( 'tab', 'tabName', equals( TAB_NAMES.feeds ) )[ 0 ];
		var settings = results.filter( 'tab', 'tabName', equals( TAB_NAMES.settings ) )[ 0 ];

		//Logger.log( 'settings: ' + JSON.stringify( settings, null, 2 ) );

		var alerts = computeAlerts( feeds, settings.data, settings.keys );

		var alertsText = JSON.stringify( alerts, null, 2 );
		Logger.log( 'alerts: ' + alertsText );

		sendEmails( alerts );

		Logger.log( 'end' );

	} catch ( error ){
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

function getFeed2( accounts, tab ){
	return accounts.map( function( account ){
		return listShoppingResources( account, 'Datafeeds' ).map( function( resource ){
			return ( resource.targets || [{
				country  : resource.targetCountry,
				language : resource.targetLanguage,
			}]).map( function( target ){
				var row = {};
				row[ COLUMNS.account ]                  = account.name;
				row[ COLUMNS.targetCountry ]            = resource.targetCountry || target.country;
				row[ COLUMNS.name ]                     = truncateString( resource.name, MAX_FEED_NAME_LENGTH );
				row[ COLUMNS.emails ]                   = '';
				row[ COLUMNS.errorPercentageThreshold ] = '';
				row[ COLUMNS.errorIncreaseThreshold ]   = '';
				row[ COLUMNS.itemsTotalIncrease ]       = '';
				row[ COLUMNS.itemsTotalDecrease ]       = '';
				row[ COLUMNS.statusChanged ]            = '';
				row[ COLUMNS.noUpdateSinceDays ]        = '';
				
				validateColumns( row, tab );
				return row;
			});
		}).reduce( flatten, [] );
	}).reduce( flatten, [] );
}

function getFeed( accounts, tab ){
	return accounts.map( function( account ){
		return listShoppingResources( account, 'Datafeeds' ).map( function( resource ){
			return ( resource.targets || [{
				country  : resource.targetCountry,
				language : resource.targetLanguage,
			}]).map( function( target ){
				var status = ShoppingContent
					.Datafeedstatuses
					.get(
						account.id,
						resource.id,
						target
					)
				;
				var errors = ( status.itemsTotal || 0 )	- ( status.itemsValid || 0 );
				var row = {};
				
				row[ COLUMNS.account ]              = account.name;
				row[ COLUMNS.targetCountry ]        = resource.targetCountry || target.country;
				row[ COLUMNS.name ]                 = truncateString( resource.name, MAX_FEED_NAME_LENGTH );
				row[ COLUMNS.itemsTotal ]           = status.itemsTotal || 0;
				row[ COLUMNS.itemsTotalChange ]     = 0;
				//row[ COLUMNS.itemsValid ]       = status.itemsValid || 0;
				row[ COLUMNS.itemsError ]           = errors;
				row[ COLUMNS.itemsErrorChange ]     = 0;
				row[ COLUMNS.itemsErrorPercentage ] = 
					//Math.round(
						row[ COLUMNS.itemsError ] / ( row[ COLUMNS.itemsTotal ] || 1 )
					//)
				;
				/*
				if( account.name == 'Jaromondo' ){
					row[ COLUMNS.itemsErrorPercentage ] = .9;
				}
				*/
				
				row[ COLUMNS.processingStatus ]     = status.processingStatus;
				row[ COLUMNS.lastUpdate ]           = ( status.lastUploadDate || 'none' )
					.slice( 0, 10 )
				;
				row[ COLUMNS.fetchSchedule ]        = resource.fetchSchedule
					? resource.fetchSchedule.hour + ' Uhr'
					: 'not scheduled'
				;
				validateColumns( row, tab );
				return row;
			});
		}).reduce( flatten, [] );
	}).reduce( flatten, [] );
}

function getErrors( accounts, tab ){
	return getFeedErrorsOrWarnings( accounts, 'errors', tab );
}

function getWarnings( accounts, tab ){
	return getFeedErrorsOrWarnings( accounts, 'warnings', tab );
}

function getFeedErrorsOrWarnings( accounts, type, tab ){
	var noErrorsOrWarnings = {
		message  : 'no ' + type,
		count    : 0,
		code     : '-',
		examples : [],
	};
	var prefix = type.slice( 0, -1 );
	return accounts.map( function( account ){
		return listShoppingResources( account, 'Datafeedstatuses' ).map( function( resource ){
			return ( resource[ type ] || [ noErrorsOrWarnings ] ).map( function( errorOrWarning ){
				var row = {};
				row[ COLUMNS.account ]                = account.name;
				row[ COLUMNS.datafeedId ]             = resource.datafeedId;
				row[ COLUMNS[ prefix + 'Message' ] ]  = errorOrWarning.message.substring( 0, 100 );
				row[ COLUMNS[ prefix + 'Code' ] ]     = errorOrWarning.code;
				row[ COLUMNS[ prefix + 'Count' ] ]    = errorOrWarning.count;
				row[ COLUMNS[ prefix + 'Examples' ] ] = ( errorOrWarning.examples || [] ).slice( 0, 3 )
					.map( formatExample( 'value' ) )
					.join( '\n' )
				;
				validateColumns( row, tab );
				return row;
			});
		}).reduce( flatten, [] );
	}).reduce( flatten, [] );
}

function getFeedDataQualityIssues( accounts, tab ){
	var noDataQualityIssues = {
		severity     : 'none',
		numItems     : 'none',
		id           : '--',
		lastChecked  : '--',
		exampleItems : [],
	};
	return accounts.map( function( account ){
		var dataQualityIssues = ShoppingContent.Accountstatuses.get(
			account.id, // accountId
			account.id // merchantId
		).dataQualityIssues || [ noDataQualityIssues ];
		
		return dataQualityIssues.map( function( dataQualityIssue ){
			var row = {};
			row[ COLUMNS.account ]     = account.name;
			row[ COLUMNS.severity ]    = dataQualityIssue.severity;
			row[ COLUMNS.numItems ]    = dataQualityIssue.numItems;
			row[ COLUMNS.issueId ]     = dataQualityIssue.id;
			row[ COLUMNS.lastChecked ] = dataQualityIssue.lastChecked;
			row[ COLUMNS.examples ]    = dataQualityIssue.exampleItems
				.slice( 0, 3 )
				.map( formatExample( 'submittedValue' ) )
				.join( '\n' )
			;
			validateColumns( row, tab );
			
			return row;
		});
	}).reduce( flatten, [] );
}

function listShoppingResources( account, entityType ){
	return ShoppingContent[ entityType ].list( account.id ).resources || [];
}

function formatExample( valueName ){
	return function( example ){
		return example.itemId
			+ ': '
			+ ( example[ valueName ] || 'no value' ).substring( 0, 10 )
		;
	}
}

// --------- Polyfills ---------------------
Object.values = Object.values || ( function( obj ){
	return Object.keys( obj ).map( function( key ){
		return obj[ key ];
	});
});

Object.entries = Object.entries || ( function( obj ){
	return Object.keys( obj ).map( function( key ){
		return [ key, obj[ key ] ];
	});
});

String.trim = function( value ){
	return value.trim();
};

Number.prototype.times = function( callback ){
	for( var i = 1; i <= Number( this.valueOf() ); i++ ){
		callback( i );
	};
}

// --------- Enchance Functionals ----------
Array.prototype.map    = enchanceFunctional( Array.prototype.map );
Array.prototype.filter = enchanceFunctional( Array.prototype.filter );

function isValid( item, mapper ){
	return typeof mapper == 'function'
		|| typeof item[ mapper ] == 'function'
		|| typeof item[ mapper ] != 'undefined'
	;
}

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

function split( delimiter ){
	return function( str ){
		return str.split( delimiter );
	};
}

function contains( str2 ){
	return function( str1 ){
		return str1.indexOf( str2 ) >= 0;
	};
}

//--------- Tools --------------------------
var _ = {
	merge : function( oldData, newData, keys ){
		var matched = matchData( oldData, newData, keys );
		return [].concat(
			matched.oldOnly,
			matched.updated.map( 'newItem' ),
			matched.newOnly
		);
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
	property : function(){
		function apply( item, arg, index, array ){
			if( typeof arg == 'function' ){
				return arg( item, index, array );
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
		var args = Array.prototype.slice.call( arguments );
		return function( item, index, array ){
			// do NOT use reduce here, because apply will interpret the third argument :(
			var res = item;
			args.forEach( function( arg ){ res = apply( res, arg, index, array ) } );
			return res;
		};
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
	},
	equals : function( value ){
		return function( item ){
			return value == item;
		}
	},
	unequalTo : function( value ){
		return function( item ){
			return value != item;
		}
	},
	flatten : function( acc, value ){
		return acc.concat( value );
	},
	isNumber : function( value ){
		return !isNaN( parseFloat( value ) ) && isFinite( value );
	},
	isDefined : function( value ){
		return value != null;
	},
	onlyUnique : function ( value, index, self ){
		return self.indexOf( value ) === index;
	},
}

for( key in _ ){
	this[ key ] = _[ key ];
}

function isLastUpdatedToday( spreadSheetId, timeZone ){
	function format( date ){
		return Utilities.formatDate( date, timeZone, 'yyyy-MM-dd\'T\'HH:mm:ss' );
	}
	var now = new Date( format( new Date() ) );
	var last = DriveApp.getFolderById( spreadSheetId ).getLastUpdated();
	var lastModified = new Date( format( last ) );
	//Logger.log( now );
	//Logger.log( lastModified );
	return now.getYear() == lastModified.getYear()
		&& now.getMonth() == lastModified.getMonth()
		&& now.getDate() == lastModified.getDate()
    ;
}

// Logging into Bigquery + Email-support

// BigQuery.Jobs.insert(
var nonce = new Date().getTime(); // circumvent cache
var url = 'https://storage.googleapis.com/adwords-scripts-144712.appspot.com/components.js' + '?v=' + nonce;
eval( UrlFetchApp.fetch( url ).getContentText() );

