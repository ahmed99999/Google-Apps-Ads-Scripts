
var BIGQUERY_PROJECT_ID = 'biddy-io';
var BIGQUERY_DATASET_ID = 'pa_airbnb';
var SEND_ERROR_MESSAGES_TO = 'a.tissen@pa.ag';
var MAILGUN_URL = 'https://api.mailgun.net/v3/mg.peakace.de/messages';
var MAILGUN_AUTH = 'Basic YXBpOmtleS1hYWZmMmI2MGU4MmNkMWYwOTIwYWYxNDUzZWM0MDcyOA==';
var MAILGUN_FROM = 'adwords_scripts@mg.peakace.de';
var RECREATE_VIEWS = false;
var CREATE_GEOTARGETS = true;
var GEOTARGETS_URL = 'https://developers.google.com/adwords/api/docs/appendix/geo/geotargets-2020-03-03.csv';//'https://goo.gl/cZXkiJ';
var GEOTARGETS_TABLE_NAME = 'p_Geotargets';
var TIMEZONE = 'Europe/Berlin';

//var PARTITION_EXPIRATION_DAYS = 1000;
//var REQUIRE_PARTITION_FILTER = true;
//var VIEW_PREFIX = 'biddy_';

// ----- CONSTANTS --------
var SCRIPT_NAME = 'Transfer-Service-Augmenter';
var TARGET_SETTING_CONSTANT = 'USER_INTEREST_AND_LIST';
var TABLE_NAME_PREFIX = 'p_';

var ACCOUNT_ID = AdWordsApp.currentAccount().getCustomerId().split( '-' ).join( '' );

// ------------------------

var _ = (function(){
	// Polyfills
	Object.values = Object.values || ( function( obj ){
		return Object.keys( obj ).map( function( key ){
			return obj[key]
		})
	});
	String.trim = function( value ){
		return value.trim();
	};
	function properties(){
		var args = Array.prototype.slice.call( arguments );
		var f = function( item ){
			return args.map( function( arg ){
				apply( item, arg );
			});
		};
		f.name1 = args.join( '_' ); // this improves groupBy() output
		return f;
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
		f.endsWith = function( value ){
			return function( item ){
				var x = f( item );
				return x.indexOf( value ) == x.length - value.length;
			}
		};
		f.startsWith = function( value ){
			return function( item ){
				var x = f( item );
				return x.indexOf( value ) == 0;
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
	function log( value ){
		value = JSON.stringify( value, null, '\t' );
		if( typeof Logger !== 'undefined' ){
			var now = new Date( Utilities.formatDate( new Date(), 'Europe/Berlin', 'MMM dd,yyyy HH:mm:ss' ) );
			var now = addLeadingZeros( now.getHours(), 2) + ':' + addLeadingZeros( now.getMinutes(), 2 );
			value = now + ' ' + value;
			Logger.log( value );
		}else{
			document.write( value + '<br>' );
		}
	}
	function not( func ){
		return function( item ){ return ! func( item ) };
	}
	function camelToSnake( str ){
		return str.replace( /\.?([A-Z])/g, function( x, y ){ return '_' + y.toLowerCase() } ).replace( /^_/, '' );
	}
	return {
		toString		: function(){ return 'my tools class'; },
		property 		: property,
		properties		: properties,
		log				: log,
		not				: not,
		camelToSnake	: camelToSnake,
	};
})();

var BIGQUERY = {
	PROJECT_ID : BIGQUERY_PROJECT_ID,
	DATASET_ID : BIGQUERY_DATASET_ID,
	PARTITION_EXPIRATION_MS : null, // null => don't set expiration. one year = 1000 * 60 * 60 * 24 * 365,
	// if "empty response" occurs, then BIGQUERY_CHUNK_SIZE should be reduced
	CHUNK_SIZE : 30000,
	PARTITION: 'DAY',
	// Truncate existing data, otherwise will append.
	TABLE_NAME_PREFIX : TABLE_NAME_PREFIX,
	FIELDS: {
		CampaignSettings: {
			'ExternalCustomerId'    : 'INTEGER',
			'CampaignId'            : 'INTEGER',
			'AdRotationType'        : 'STRING',
			'DeliveryMethod'        : 'STRING',
			'TargetingSetting'      : 'STRING',
			'Languages'             : 'STRING',
			'ExcludedContentLabels' : 'STRING',
			'ExcludedLocations'     : 'STRING',
			'TargetSearchNetwork'   : 'BOOLEAN',
			'TargetContentNetwork'  : 'BOOLEAN',
		},
		CampaignNegativeLists: {
			'ExternalCustomerId'	: 'INTEGER',
			'ListId'				: 'INTEGER',
			'ListName'				: 'STRING',
		},
		CampaignNegativeListMappings: {
			'ExternalCustomerId'	: 'INTEGER',
			'ListId'				: 'INTEGER',
			'CampaignId'			: 'INTEGER',
		},
		CampaignNegativeListKeywords: {
			'ExternalCustomerId'	: 'INTEGER',
			'ListId'				: 'INTEGER',
			'MatchType'				: 'STRING',
			'Text'					: 'STRING',
		},
		CampaignNegativeKeywords: {
			'ExternalCustomerId'	: 'INTEGER',
			'CampaignId'			: 'INTEGER',
			'MatchType'				: 'STRING',
			'Text'					: 'STRING',
		},
		ExtensionsSitelinks: {
			'ExternalCustomerId'	: 'INTEGER',
			'Id'					: 'INTEGER',
			'Status'				: 'STRING',
			'Description1'			: 'STRING',
			'Description2'			: 'STRING',
			'LinkText'				: 'STRING',
			'Schedules'				: 'STRING',
			'IsMobilePreferred'		: 'BOOLEAN',
			'CustomParameters'		: 'STRING',
			'FinalUrl'				: 'STRING',
			'MobileFinalUrl'		: 'STRING',
			'TrackingTemplate'		: 'STRING',
			'StartDate'				: 'DATE',
			'EndDate'				: 'DATE',
			'AccountLevel'			: 'BOOLEAN',
		},
		ExtensionsPhoneNumbers: {
			'ExternalCustomerId'	: 'INTEGER',
			'Id'					: 'INTEGER',
			'Status'				: 'STRING',
			'Country'				: 'STRING',
			'PhoneNumber'			: 'STRING',
			'Schedules'				: 'STRING',
			'IsMobilePreferred'		: 'STRING',
			'AccountLevel'			: 'BOOLEAN',
		},
		ExtensionsMobileApps: {
			'ExternalCustomerId'	: 'INTEGER',
			'Id'					: 'INTEGER',
			'Status'				: 'STRING',
			'AppId'					: 'STRING',
			'LinkText'				: 'STRING',
			'Store'					: 'STRING',
			'Schedules'				: 'STRING',
			'IsMobilePreferred'		: 'STRING',
			'CustomParameters'		: 'STRING',
			'FinalUrl'				: 'STRING',
			'MobileFinalUrl'		: 'STRING',
			'TrackingTemplate'		: 'STRING',
			'StartDate'				: 'DATE',
			'EndDate'				: 'DATE',
			'AccountLevel'			: 'BOOLEAN',
		},
		ExtensionsCallouts: {
			'ExternalCustomerId'	: 'INTEGER',
			'Id'					: 'INTEGER',
			'Status'				: 'STRING',
			'Text'					: 'STRING',
			'Schedules'				: 'STRING',
			'IsMobilePreferred'		: 'STRING',
			'StartDate'				: 'DATE',
			'EndDate'				: 'DATE',
			'AccountLevel'			: 'BOOLEAN',
		},
		ExtensionsSnippets: {
			'ExternalCustomerId'	: 'INTEGER',
			'Id'					: 'INTEGER',
			'Status'				: 'STRING',
			'Header'				: 'STRING',
			'Values'				: 'STRING',
			'Schedules'				: 'STRING',
			'IsMobilePreferred'		: 'STRING',
			'StartDate'				: 'DATE',
			'EndDate'				: 'DATE',
			'AccountLevel'			: 'BOOLEAN',
		},
		ExtensionsMessages: {
			'ExternalCustomerId'	: 'INTEGER',
			'Id'					: 'INTEGER',
			'Status'				: 'STRING',
			'BusinessName'			: 'STRING',
			'CountryCode'			: 'STRING',
			'ExtensionText'			: 'STRING',
			'PhoneNumber'			: 'STRING',
			'Schedules'				: 'STRING',
			'IsMobilePreferred'		: 'STRING',
			'StartDate'				: 'DATE',
			'EndDate'				: 'DATE',
			'AccountLevel'			: 'BOOLEAN',
		},
		ExtensionsCampaignMap: {
			'ExternalCustomerId'	: 'INTEGER',
			'Id'					: 'INTEGER',
			'CampaignId'			: 'INTEGER',
			'EntityType'			: 'STRING',
		},
		ExtensionsDisapproved : {
			'ExternalCustomerId'	: 'INTEGER',
			//'AttributeValues' 	: 'STRING',
			'DisapprovalShortNames' : 'STRING',
			'PlaceholderType' 		: 'STRING',
			'Status' 				: 'STRING',
			'ValidationDetails' 	: 'STRING',
			'FeedId' 				: 'INTEGER',
			'FeedItemId' 			: 'INTEGER',
			'IsSelfAction' 			: 'STRING'
			// , 'CampaignName', 'CampaignId'
		},
	}
};

var EXTENSION_TYPES = {
	1 : 'sitelinks',
	2 : 'phoneNumbers',
	3 : 'mobileApps',
	7 : 'locations',
	30 : 'acciliateLocations',
	8 : 'reviews',
	17 : 'callouts',
	24 : 'snippets', // structured snippet
	31 : 'messages',
	35 : 'price',
	38 : 'promotion',
	10 : 'adCustomizers',
	61 : 'dynamicSearchAdFeeds',
	77 : 'locationTargets',
	12 : 'education',
	13 : 'flights',
	14 : 'custom',
	15 : 'hotels',
	16 : 'realEsatate',
	18 : 'travel',
	19 : 'local',
	20 : 'jobs',
};

var EXTENSIONS = [ 'sitelinks', 'phoneNumbers', 'mobileApps', 'callouts', 'snippets', 'messages' ];

var EXTENSION_LOGIC = {
	sitelinks : function( item1, item ){
		item1.Description1 		= item.getDescription1();
		item1.Description2 		= item.getDescription2();
		item1.LinkText 			= item.getLinkText();
		item1.CustomParameters	= item.urls().getCustomParameters() + '';
		item1.FinalUrl 			= item.urls().getFinalUrl();
		item1.MobileFinalUrl 	= item.urls().getMobileFinalUrl();
		item1.TrackingTemplate 	= item.urls().getTrackingTemplate();
	},
	phoneNumbers : function( item1, item ){
		item1.Description1 		= item.getCountry();
		item1.Description2 		= item.getPhoneNumber();
	},
	mobileApps : function( item1, item ){
		item1.AppId 		= item.getAppId();
		item1.LinkText 		= item.getLinkText();
		item1.Store 		= item.getStore();
	},
	callouts : function( item1, item ){
		item1.Text	 		= item.getText();
	},
	snippets : function( item1, item ){
		item1.Header = item.getHeader();
		item1.Values = item.getValues() + '';
	},
	messages : function( item1, item ){
		item1.BusinessName = item.getBusinessName();
		item1.CountryCode = item.getCountryCode();
		item1.ExtensionText = item.getExtensionText();
		item1.PhoneNumber = item.getPhoneNumber();
	}
};

function optional( value, message ){
	var error = message ? new Error( message ) : new Error( 'No such value!' );
	var isNull = ( value === undefined || value === null );
	var optional_ = optional;
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
				return optional_( method.apply( value, args ) );
			}else if( typeof value[ method ] == 'function' ){
				return optional_( value[ method ].apply( value, args ) );
			}else{
				return optional_( value[ method ] );
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
		filter : 		function( predicate )			{ return isNull || predicate( value ) ? this : optional_() },
		onlyIf : 		function( method )				{ return isNull || value[ method ]() ? this : optional_() },
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
};

function apply( item, selector ){
	if( typeof selector == 'undefined' ){
		throw new Error( 'undefined function selector' );
	}
	if( typeof selector == 'function' ){
		return selector( item );
	}
	if( typeof item == 'object' && typeof item[ selector ] == 'function' ){
		return item[ selector ]();
	}
	if( typeof item == 'object' ){
		return item[ selector ];
	}
}

function currentItems( items, currentPart, outOf, orderBy ){
	if( typeof orderBy != 'undefined' ){
		items.sort( function( a, b ){
			return apply( a, orderBy ) - apply( b, orderBy );
		});
	}
	
	var countItems = items.length;
	
	var result = items.filter( function( item, index ){
		return index >= Math.ceil( currentPart / outOf * countItems ) && index < ( currentPart + 1 ) / outOf * countItems;
	});
	
	return result;
}

function iteratorToList( iter ){
  var list = [];
  while( iter.hasNext() ){
    list.push( iter.next() );
  }
  return list;
}

function toCsvChunks( matrix ){
	var rows = matrix.map( function( row ){
		return row.map( prepareForBigQuery ).join( ',' );
	});
	return splitArray( rows, BIGQUERY.CHUNK_SIZE ).map( function( rows ){ return rows.join( '\n' ) } );
}

function loadIntoBigquery( csvChunks, tableName ){
	// dropTable( tableName );
	// createTable( tableName, BIGQUERY.FIELDS, BIGQUERY.PARTITION );
	var uploader = loadIntoBigqueryTable( tableName );
	var bigQueryJobIds = csvChunks.map( uploader ).filter( _.property( 'isPresent' ) ).map( _.property( 'get' ) );
	return bigQueryJobIds;
}

function toCSV( data, fields ){
	var columns = Object.keys( fields );
	return data.map( function( obj ){
		return columns.map( function( column ){
			var res = obj[ column ];
			if( res === undefined ){
				//Logger.log( 'no column ' + column + ' found in ' + JSON.stringify( obj, null, '\t' ) );
			}
			return res;
		});
	});
}

function addLeadingZeros( number, digits ){
	var res = '' + number;
	while ( res.length < digits ){
		res = '0' + res;
	}
	return res;
}

function dateToString( date, delimiter, withHours ){
	delimiter = delimiter || '-';
	return addLeadingZeros( date.getFullYear(), 4 ) + delimiter +
		addLeadingZeros( date.getMonth() + 1, 2 ) + delimiter +
		addLeadingZeros( date.getDate(), 2 ) +
		( withHours ? ' ' + addLeadingZeros( date.getHours(), 2 ) + ':' + addLeadingZeros( date.getMinutes(), 2 ) : '' )
	;
}

function convertToTimeZone( date, timeZone ){
	return new Date( Utilities.formatDate( date, timeZone, 'MMM dd,yyyy HH:mm:ss' ) );
}

function computeNow( timeZone ){
	var now = convertToTimeZone( new Date(), timeZone );
	now.setTime( now.getTime() );
	return now;
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

function retrieveReport( fields, report, where, during ){
	var query = ''
		+ ' SELECT ' + fields.join( ', ' ) // + ', Clicks'
		+ ' FROM ' + report
        + ( where ? ' WHERE ' + where : '' )
		+ ( during ? ' DURING ' + during : '' )
        ;
	// Logger.log( query );

	return parse( AdWordsApp.report( query ), fields );
}

function getTableSchema( tableName ){
	return BigQuery.Tables.get(
		BIGQUERY.PROJECT_ID,
		BIGQUERY.DATASET_ID,
		tableName
	).schema.fields;
}

function counter(){
	var map = {};
	
	function check( item ){
		map[ item ] = map[ item ] || 0;
		map[ item ]++;
	}
	
	function toList(){
		var res = Object.keys( map ).map( function( key ){
			return { item : key, count : map[ key ] };
		});
		res.sort( function( a, b ){
			return b.count - a.count; // desc
		});
		return res;
	}
	
	function toString(){
		return '' + toList().map( function( x ){ return x.item + ': ' + x.count });
	}
	
	return {
		check : check,
		toList : toList,
		toString : toString,
	};
}

function truncateTodaysPartition( projectId, datasetId, tableId, clusteringFields ){
	var now = new Date( Utilities.formatDate( new Date(), 'Europe/Berlin', 'MMM dd,yyyy HH:mm:ss' ) );
	var year = now.getFullYear();
	var month = now.getMonth() + 1;
	var day = now.getDate();
	
	
	month = ( month < 10 ? '0' : '' ) + month;
	day = ( day < 10 ? '0' : '' ) + day;
	
	var today = year + '-' + month + '-' + day;
	var dateStr = '$' + year + month + day;
	
	queryBigqueryAsync(
		projectId,
		'SELECT * FROM `' + projectId + '.' + datasetId + '.' + tableId + '` WHERE _PARTITIONDATE = \'' + today + '\' LIMIT 0',
		'WRITE_TRUNCATE',
		datasetId,
		tableId + dateStr,
		clusteringFields
	);
}

function queryBigqueryAsync( projectId, query, writeDisposition, datasetId, tableId, clusteringFields ){
	var job = {
		configuration: {
			query: {
				query : query,
				useLegacySql : false,
			}
		}
	}
	if( datasetId && tableId ){
		job.configuration.query.destinationTable = {
			projectId: projectId,
			datasetId: datasetId,
			tableId: tableId,
		};
		job.configuration.query.createDisposition = 'CREATE_IF_NEEDED';
		job.configuration.query.writeDisposition = writeDisposition; // 'WRITE_APPEND'; // WRITE_TRUNCATE
		job.configuration.query.timePartitioning = {
			type : 'DAY',
			expirationMs : 1000 * 60 * 60 * 24 * PARTITION_EXPIRATION_DAYS,
			requirePartitionFilter : REQUIRE_PARTITION_FILTER,
		};
	}
	if( clusteringFields ){
		job.configuration.query.clustering = {
			fields : clusteringFields,
		};
	}
	//log( 'job: ' + JSON.stringify( job, null, 2 ) );
	return BigQuery.Jobs.insert( job, projectId );
}

function main(){
	Logger.log( 'start' );
	
	try{
		if( ! BIGQUERY.PROJECT_ID || BIGQUERY.PROJECT_ID == '' ){
			throw new Error( 'Unfinished configuration: please enter your project_id' );
		}
		if( ! BIGQUERY.DATASET_ID || BIGQUERY.DATASET_ID == '' ){
			throw new Error( 'Unfinished configuration: please enter your dataset_id' );
		}
		
		Object.keys( BIGQUERY.FIELDS ).forEach( function( tableName ){
			var fields = BIGQUERY.FIELDS[ tableName ];
			var fullTableName = BIGQUERY.TABLE_NAME_PREFIX + tableName + '_' + ACCOUNT_ID;
			createTable( fullTableName, fields, BIGQUERY.PARTITION );
		});
		
		if( CREATE_GEOTARGETS ){
			var tableName = GEOTARGETS_TABLE_NAME + '_' + AdWordsApp.currentAccount().getCustomerId().split( '-' ).join( '' );
			if( !tableExists( tableName ) ){ // prevents duplicate entries in Geotargets
				Logger.log( 'Create Geo Targets' );
				var geo = UrlFetchApp.fetch( GEOTARGETS_URL, { method: 'get' } ).getContentText();
				createTable( tableName, {
					CriteriaId : 'INTEGER',
					Name : 'STRING',
					CanonicalName: 'STRING',
					ParentID : 'INTEGER',
					CountryCode : 'STRING',
					TargetType : 'STRING',
					Status : 'STRING'},
					null // no partitionPeriod for Geo
				);
				var blobData = Utilities.newBlob( geo, 'application/octet-stream' );
				var jobId = loadDataToBigquery( tableName, blobData, 1 );
			}
		}
		
		var now = computeNow( AdWordsApp.currentAccount().getTimeZone() );
		Logger.log( dateToString( now ) );
		
		var mccName = AdWordsApp.currentAccount().getName();
		var allAccounts = ( typeof MccApp == 'undefined' ) ? [ AdWordsApp.currentAccount() ] : iteratorToList(
			MccApp.accounts()
			.withCondition( 'Impressions > 0' )
			.forDateRange( 'LAST_14_DAYS' )
			.orderBy( 'Clicks DESC' )
			.get()
		);
		
		const HOURS_PER_DAY = 24;
		var currentPart = now.getHours();
		var accounts = allAccounts;
		/*currentItems(
			allAccounts,
			currentPart,
			HOURS_PER_DAY,
			'getCustomerId'
		);*/

		/*
		if( ONLY_THIS_ACCOUNT && ONLY_THIS_ACCOUNT.length > 0 ){
			accounts = allAccounts.filter( _.property( 'getName' ).equals( ONLY_THIS_ACCOUNT ) );	
		}
		*/
	  
		var mccId = AdWordsApp.currentAccount().getCustomerId().split( '-' ).join( '' );
		Logger.log( 'Current accounts (' + accounts.length + '): ' + accounts.map( _.property( 'getName' ) ) );
	 
		var accountIds = accounts.map( _.property( 'getCustomerId' ) );
	 
		try {
			if( typeof MccApp == 'undefined' ){
				processAccount( mccId );
				finalProcessing( undefined );
			}else{
				var app = MccApp
					.accounts()
					.withIds( accountIds );
				app
				//.withLimit( 2 )
				//.withIds( account )
					.executeInParallel( 'processAccount', 'finalProcessing', '' + mccId );
			}
		} catch ( error ){
			sendEmail( SEND_ERROR_MESSAGES_TO, 'Error in ' + SCRIPT_NAME + ' ' + mccName, error + '\n' + error.stack );
			Logger.log( 'Error in ' + SCRIPT_NAME + ' ' + mccName + ' -> ' + error + '\n' + error.stack );
			throw error;
		}
	}catch( error ){
		Logger.log( 'Error in ' + SCRIPT_NAME + ' ' + AdWordsApp.currentAccount().getName() + ' -> ' + error + '\n' + error.stack );
		 // 'throw' replaces the stack trace. To preserve the stack we add it to the message
		error.message += ' <-> ' + error.stack;
		throw error;
	}
}

function pad( value, digits ){
	value = value + '';
	while( value.length < digits ){
		value = '0' + value;
	}
	return value;
}

function adWordsDateToString( obj ){
	if( ! obj ){
		return obj;
	}
	return pad( obj.year, 4 ) + '-' + pad( obj.month, 2 ) + '-' + pad( obj.day, 2 );
}

function extensions1( extensionType, accountIdForBigquery ){
	var list = [];
	//Extensions​PhoneNumbers
	var siteLinksMap = {};
	
	var go = function( status1 ){
		var selector = AdWordsApp
			.extensions()
			[ extensionType ]();
		if( status1 ){
			selector = selector.withCondition( 'Status IN [\'' + status1 + '\']' );
		}
			
		iteratorToList( selector.get() ).forEach( function( item ){
			var item1 = {
				ExternalCustomerId : accountIdForBigquery,
				Id : item.getId(),
				Status : status1,
				Schedules : item.getSchedules() + '',
				IsMobilePreferred : item.isMobilePreferred(),
				StartDate : adWordsDateToString( item.getStartDate() ),
				EndDate : adWordsDateToString( item.getEndDate() ),
				AccountLevel : false,
			};
			EXTENSION_LOGIC[ extensionType ]( item1, item );
			siteLinksMap[ item.getId() ] = item1;
			list.push( item1 );
		});
	};
	
	// no other way to get status from extensions :/
	[ 'REMOVED', 'ENABLED' ].forEach( go );

	iteratorToList(
		AdWordsApp
		.currentAccount()
		.extensions()
		[ extensionType ]()
		.get()
	).forEach( function( item ){
		siteLinksMap[ item.getId() ].AccountLevel = true;
	});
	
	// Logger.log( list.length + ' ' + extensionType + ' found' );
	return list;
}

function processAccount( mccId ){
	mccId = mccId / 1;
	var account = AdWordsApp.currentAccount();
	var accountId = account.getCustomerId();
	var accountIdForBigquery = accountId.split( '-' ).join( '' ) / 1;
	var accountName = account.getName();
	Logger.log( 'process ' + accountName );
	
	try{
		var isFirst = true;
		
		var result = {};
		Object.keys( BIGQUERY.FIELDS ).forEach( function( key ){ result[ key ] = [] } );
		
		result[ 'ExtensionsDisapproved' ] = retrieveReport(
			Object.keys( BIGQUERY.FIELDS.ExtensionsDisapproved ),
			'PLACEHOLDER_FEED_ITEM_REPORT',
			'DisapprovalShortNames != "" AND Status = "ENABLED"'
		).map( function( x ){
			x.PlaceholderType = EXTENSION_TYPES[ x.PlaceholderType ] || x.PlaceholderType;
			x.ExternalCustomerId = accountIdForBigquery;
			return x;
		})
		//.filter( function( x ){ return ! ( x.PlaceholderType > 0 ) } )
		;
		/*
		EXTENSIONS.forEach( function( extensionType ){
			var bigLetter = extensionType.substring( 0, 1 ).toUpperCase() + extensionType.substring( 1 );
			
			result[ 'Extensions' + bigLetter ] = extensions1( extensionType, accountIdForBigquery );
		});
		*/
		
		/*
		// campaign negative lists
		iteratorToList( AdWordsApp.negativeKeywordLists().withLimit( 50000 ).get() )
		.forEach( function( list ){
			result.CampaignNegativeLists.push( { ExternalCustomerId : accountIdForBigquery, ListId : list.getId(), ListName : list.getName() } );

			iteratorToList( list.campaigns().get() )
			.forEach( function( campaign ){
				result.CampaignNegativeListMappings.push( { ExternalCustomerId : accountIdForBigquery, ListId : list.getId(), CampaignId : campaign.getId() } );
			});

			iteratorToList( list.negativeKeywords().get() ).forEach( function( negKeyword ){
				result.CampaignNegativeListKeywords.push( {
					ExternalCustomerId : accountIdForBigquery,
					ListId : list.getId(),
					MatchType : negKeyword.getMatchType(),
					Text : negKeyword.getText()
				});
			});
		});
		*/
		
		var campaigns = AdWordsApp.campaigns().withCondition( 'Status = "ENABLED"' ).get();
		
		var campaignsSearchNetwork = iteratorToList(
			AdWordsApp
				.campaigns()
				.withCondition( 'Status = "ENABLED"' )
				.withCondition( 'TargetSearchNetwork = TRUE' )
				.get()
		).map( _.property( 'getId' ) );
		var campaignsContentNetwork = iteratorToList(
			AdWordsApp
				.campaigns()
				.withCondition( 'Status = "ENABLED"' )
				.withCondition( 'TargetContentNetwork = TRUE' )
				.get()
		).map( _.property( 'getId' ) );
		
		var i = 0;
		while( campaigns.hasNext() ){
			//if( CAMPAIGN_LIMIT && i++ > CAMPAIGN_LIMIT ){ break; }
			var campaign = campaigns.next();
			var campaignId = campaign.getId();
			var campaignName = campaign.getName();
			
			iteratorToList( campaign.negativeKeywords().get() )
			.forEach( function( negKeyword ){
				result.CampaignNegativeKeywords.push(
					{
						ExternalCustomerId : accountIdForBigquery,
						CampaignId : campaignId,
						MatchType : negKeyword.getMatchType(),
						Text : negKeyword.getText()
					}
				);
			});

			var targeting = campaign.targeting();
			
			var languages = targeting.languages().get();
			var languages1 = [];
			while( languages.hasNext() ){
			  var language = languages.next();
			  languages1.push( language.getName() );
			}
			
			var excludedContentLabels = targeting.excludedContentLabels().get();
			var excludedContentLabels1 = [];
			while( excludedContentLabels.hasNext() ){
			  var label = excludedContentLabels.next();
			  excludedContentLabels1.push( label.getContentLabelType() );
			}
			
			var excludedLocations = targeting.excludedLocations().get();
			var excludedLocations1 = [];
			while( excludedLocations.hasNext() ){
			  var x = excludedLocations.next();
			  excludedLocations1.push( x.getName() );
			}
			
			var lang = languages1.join( ', ' );
			if( lang == '' ){
				lang = null;
			}
			var ecl = excludedContentLabels1.join( ', ' );
			if( ecl == '' ){
				ecl = null;
			}
			var exLoc = excludedLocations1.join( ', ' );
			if( exLoc == '' ){
				exLoc = null;
			}
			
			var extensions = campaign.extensions();
			
			EXTENSIONS.forEach( function( extensionType ){
				iteratorToList(
					extensions
					[ extensionType ]()
					.get()
				).forEach( function( item ){
					result.ExtensionsCampaignMap.push({
						ExternalCustomerId : accountIdForBigquery,
						Id : item.getId(),
						CampaignId : campaignId,
						EntityType : extensionType,
					});
				});	
			});
			
			var row = {
				ExternalCustomerId    : accountIdForBigquery,
				CampaignId            : campaignId,
				AdRotationType        : campaign.getAdRotationType(),
				DeliveryMethod        : campaign.getBudget().getDeliveryMethod(),
				TargetingSetting      : campaign.targeting().getTargetingSetting( TARGET_SETTING_CONSTANT ),
				Languages             : lang,
				ExcludedContentLabels : ecl,
				ExcludedLocations     : exLoc,
				TargetSearchNetwork   : campaignsSearchNetwork.indexOf( campaign.getId() ) >= 0,
				TargetContentNetwork  : campaignsContentNetwork.indexOf( campaign.getId() ) >= 0,
			};
			if( isFirst ){
				Logger.log( JSON.stringify( row, null, '\t' ) );
				isFirst = false;
			}
			result.CampaignSettings.push( row );
		}
		Logger.log( accountName + ' done. ' + result.CampaignSettings.length + ' campaigns.' );
		// Logger.log( JSON.stringify( res, null, '\t' ) );
		
		upload( result, mccId );
		
		//return JSON.stringify( result );
	} catch ( error ){
		sendEmail( SEND_ERROR_MESSAGES_TO, 'Error in ' + SCRIPT_NAME + ' ' + accountName, error + '\n' + error.stack );
		Logger.log( 'Error in ' + SCRIPT_NAME + ' ' + accountName + ' -> ' + error + '\n' + error.stack );
		throw error;
	}
}

function finalProcessing( results ){
	var isPreview = AdWordsApp.getExecutionInfo().isPreview();
	var mccName = AdWordsApp.currentAccount().getName();
	var mccId = AdWordsApp.currentAccount().getCustomerId().split( '-' ).join( '' );
	
	// views for p_ tables
	recreateViews( mccId );
}

function upload( res, mccId ){
	Logger.log('load into BigQuery');
	
	var jobIds = [];
	
	Object.keys( res ).forEach( function( tableName ){
		var fields = BIGQUERY.FIELDS[ tableName ];
		if( !fields ){
			Logger.log( 'no fields found for tableName: ' + tableName + ' Possible tableNames are: ' + Object.keys( BIGQUERY.FIELDS ) );
			return;
		}
		var csvData = toCsvChunks( toCSV( res[ tableName ], fields ) );
		var fullTableName = BIGQUERY.TABLE_NAME_PREFIX + tableName + '_' + mccId;

		// Tables are created in main(). Skip this step here. Otherwise each thread tries to create tables..
		// createTable( fullTableName, fields, BIGQUERY.PARTITION );
		jobIds = jobIds.concat( loadIntoBigquery( csvData, fullTableName ) );
		
	});
	Logger.log( 'done' );
	checkJobs( jobIds );
}

function recreateViews( mccId ){
	var now = computeNow( AdWordsApp.currentAccount().getTimeZone() );
	Logger.log( dateToString( now ) );
	var date = now.yyyymmdd( '-' );

	Object.keys( BIGQUERY.FIELDS ).forEach( function( tableName ){
		var fullTableName = BIGQUERY.TABLE_NAME_PREFIX + tableName + '_' + mccId;
		
		var viewName = tableName + '_' + mccId;
		createViewForTable( fullTableName, viewName, date );
	});
}

function createView( viewName, query ){
	if ( tableExists( viewName ) ){
		if( RECREATE_VIEWS ){
			dropView( viewName );
		}else{
			Logger.log( 'View %s already exists. Don\'t recreate it.', viewName );
			return;	
		}
	}

	var table = BigQuery.newTable();
	
	table.friendlyName = viewName;

	table.tableReference = BigQuery.newTableReference();
	table.tableReference.datasetId = BIGQUERY.DATASET_ID;
	table.tableReference.projectId = BIGQUERY.PROJECT_ID;
	table.tableReference.tableId = viewName;
	
	table.view = {
		query : query,
		useLegacySql : false
	};
	
	try{
		BigQuery.Tables.insert(
			table,
			BIGQUERY.PROJECT_ID,
			BIGQUERY.DATASET_ID
		);
		Logger.log( 'View ' + viewName + ' created.' );
	}catch( error ){
		Logger.log( '----------------------> ' + error + ' - ' + viewName );
		throw error;
	}
}

Date.prototype.yyyymmdd = function( delimiter ) {
  var mm = this.getMonth() + 1; // getMonth() is zero-based
  var dd = this.getDate();

  return [this.getFullYear(),
          (mm>9 ? '' : '0') + mm,
          (dd>9 ? '' : '0') + dd
         ].join( delimiter );
};

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
	return partition1( arr, false );
}

function partitionToLists( arr ){
	return partition1( arr, true );
}

function partition1( arr, toLists ){
	return {
		by: function( keyName ){
			var res = {};

			for ( var i = 0; i < arr.length; i++ ){
				var obj = clone( arr[i] );
				var key;
				if( Array.isArray( keyName ) ){
					key = [];
					keyName.forEach( function( keyName2 ){
						if ( typeof keyName2 == 'function' ){
							key.push( keyName2( obj ) );
						} else {
							key.push( obj[ keyName2 ] );
							delete obj[ keyName2 ];
						}
					});
					key = key.join( ID_SEPARATOR );
				}else{
					if ( typeof keyName == 'function' ){
						key = keyName( obj );
					} else {
						key =  obj[ keyName ];
						delete obj[ keyName ];
					}
				}
				// init
				if( toLists ){
					res[ key ] = ( res[ key ] || [] );
					res[ key ].push( obj );
				}else{
					res[ key ] = obj;
				}
			}
			return res;
		}
	};
}


// ++++++++++++++++++++++++++++++++++++++++++

function loadDataToBigquery( tableName, data, skipLeadingRows ){
	// Create the data upload job.
	var job = {
		configuration: {
			load: {
				destinationTable: {
					projectId: BIGQUERY.PROJECT_ID,
					datasetId: BIGQUERY.DATASET_ID,
					tableId: tableName
				},
				skipLeadingRows : skipLeadingRows ? skipLeadingRows : 0,
				//nullMarker : '--'
			}
		}
	};

	var insertJob = BigQuery.Jobs.insert( job, BIGQUERY.PROJECT_ID, data );
	return insertJob.jobReference.jobId;
}

function getTables(){
	var pageToken = null; // start with empty pageToken
	var resultsPerPage = 150;
	var res = [];
	do{
		// Get a list of a part of all tables in the dataset.
		var tables = BigQuery.Tables.list(
			BIGQUERY.PROJECT_ID,
			BIGQUERY.DATASET_ID,
			{
				pageToken  : pageToken || '',
				maxResults : resultsPerPage
			}
		);
		pageToken = tables.nextPageToken;
		
		//Logger.log( tables );
		
		res = res.concat( tables.tables || [] );
	}while( pageToken );
	
	return res;
}

function createDataset() {
	if( datasetExists() ){
		Logger.log( 'Data set already exists: ' + BIGQUERY.DATASET_ID );
		return;
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
	if ( tableExists( tableName ) ){
		BigQuery.Tables.remove( BIGQUERY.PROJECT_ID, BIGQUERY.DATASET_ID, tableName );
		Logger.log('Table %s dropped.', tableName );
	}
}

function dropView( viewName ){
	if ( tableExists( viewName ) ){
		BigQuery.Tables.remove( BIGQUERY.PROJECT_ID, BIGQUERY.DATASET_ID, viewName );
		Logger.log('View %s dropped.', viewName );
	}
}

function createViewForTable( tableName, viewName, date ){
	var query = '#StandardSQL \n' +
		'SELECT \n' +
			'*, \n' +
			'DATE ( \'' + date + '\' ) AS _LATEST_DATE, \n' +
			'DATE ( _PARTITIONTIME ) AS _DATA_DATE \n' +
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.' + tableName + '` \n';
	dropView( viewName );
	createView( viewName, query );
}

function createTable( tableName, fields, partitionPeriod ) {
	if( tableExists( tableName ) ){
		Logger.log( 'table ' + tableName + ' already exists. Don\'t recreate it.' );
		return;
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
	if( partitionPeriod ){
		table.timePartitioning = { type : partitionPeriod };
	}

	table = BigQuery.Tables.insert(
		table,
		BIGQUERY.PROJECT_ID,
		BIGQUERY.DATASET_ID
	);
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

function deleteViewWithPrefix( prefix ){
	var pageToken = ''; // start with empty pageToken
	var resultsPerPage = 1511;
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
		Logger.log( 'page-token: ' + tables.nextPageToken );
		if( ! pageToken ){
			finished = true;
		}
		// Iterate through each table and check for an id match.
		if ( tables.tables != null ){
			for( var i = 0; i < tables.tables.length; i++ ){
				var table = tables.tables[ i ];
				if( table.tableReference.tableId.indexOf( prefix ) == 0 ){
					dropTable( table.tableReference.tableId );
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

function isNumeric(n) {
  return ! isNaN( parseFloat( n ) ) && isFinite( n );
}

function prepareForBigQuery( value ){
	if( value === null ){
		return undefined;
	}
	if( typeof value == 'string' ){
		// remove thousand separator
		var num = value.split( ',' ).join( '' );
		if( isNumeric( num ) ){
			return num;
		}
		// bug found: value.indexOf( '%' ) == value.length - 1 is true for empty strings
		// to fix it, we check whether the string actually contains '%'
		if( value.indexOf( '%' ) > 0 && value.indexOf( '%' ) == value.length - 1 ){
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

/**
 * Creates a BigQuery insertJob to load csv data.
 *
 */
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
			return optional( insertJob.jobReference.jobId );
		}catch( error ){
			// sometimes we get "No schema specified on job or table." here
			Logger.log( error + ' - ' + tableName );
			return optional( error );
		}
	};
}

function jobIdToStatus( jobId ){
	if( jobId.lastIndexOf( '.' ) >= 0 ){
		// Invalid job ID "biddy-io:US.job_nLbcaw3YDYShaqKhy-QYbVbYDyQs"
		// Need to remove "biddy-io:US." part
		jobId = jobId.substring( jobId.lastIndexOf( '.' ) + 1 );
	}
	var job = BigQuery.Jobs.get( BIGQUERY.PROJECT_ID, jobId );
	if( ! job.status ){
		return 'BigqueryStatusBug';
	}
	return job.status.state;
}

function checkJobs( jobIds ){
	var states = {};
	for( var i in jobIds ){
		var jobId = jobIds[ i ];
		var job = BigQuery.Jobs.get( BIGQUERY.PROJECT_ID, jobId );
		if( ! job.status ){
			// strange bug from bigquery?
			continue;
		}
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

// +++++++++++++++++++++++++++++++++++++

// ####################################################
// ####################################################

function sendEmail( to, subject, text ){
	if( !text ){
		throw new Error( ' no text supplied for Email ' );
	}
	if( MAILGUN_AUTH && MAILGUN_AUTH.length > 0 ){
		return mailGunSender( to, subject, text );	
	}else{
		return MailApp.sendEmail( to, subject, text );
	}
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
		MAILGUN_URL,
		{
			"method": "post",
			"payload": {
				'from': MAILGUN_FROM,
				'to': to,
				'subject': subject,
				'text': text,
				'html': html,
			},
			"headers": {
				"Authorization": MAILGUN_AUTH,
			}
		}
	 );
}

// ####################################################
// ####################################################
