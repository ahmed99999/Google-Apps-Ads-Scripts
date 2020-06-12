
var config = {
	"DESCRIPTION" : "" ,
	"INSTRUCTIONS": "",
	"VERSION" : 1,
	"VERSION_TAG" : "stable",
	"TYPE":"MCC",
	"settings" : {
		"EMAIL_SHEET_URL" : "https://docs.google.com/spreadsheets/d/1iZL5WysFdXAoEb7ROmXLmrPb5ETeUx_y_cESoxdKrLo/edit#gid=0",
		"SHEET_NAME" : "settings",
		"BIGQUERY_PROJECT_ID" : "biddy-io",
		"SCRIPT_INSTANCE" : 1,
		"MAX_SHOW_CAMPAIGNS_PER_CHECK" : 20,
		"ERROR_REPORTING_EMAIL" : "a.tissen@pa.ag",
		"DEBUGGING" : false,
		"EXCLUDED_CHECKS" : [
			"HasRecommendedBudget",
			"Labels",
			"LabelIds",
			"RecommendedBudgetAmount",
			"BiddingStrategyName",
			"BiddingStrategyId",
			"Amount",
			"BiddingStrategyType"
		],
		"EXCLUDED_CHECKS2" : {
			"137-176-3172" : [
				"AdSchedules"
			]
		},
		"ENUMERABLE_CHECKS" : [
			"NegativeKeywords",
			"NegativeKeywordLists",
			"LabelIds",
			"Labels",
			"CustomParameters",
			"Languages",
			"ExcludedContentLabels",
			"TargetedProximities",
			"TargetedLocations",
			"ExcludedLocations",
			"AdSchedules",
			"ExcludedAudiences",
			"Audiences",
			"ExcludedTopics",
			"Topics",
			"BudgetId"
		]
	}
};

var settings = ( typeof this[ 'dataJSON' ] != 'undefined' ? JSON.parse( dataJSON.settings ) : config.settings );
for( key in settings ){
    this[ key ] = settings[ key ];
}

// -------------------------------------
// ------- MANDATORY SETTINGS ----------

var CONSTANTS = {
	BIGQUERY_DATASET_PREFIX : 'campaign_settings',
	SCRIPT_NAME : 'Campaign_Settings_Checker_BQ_',
	ACCOUNT_ID_COLUMN_INDEX : 1, // 0-based
	EMAIL_COLUMN_INDEX : 2, // 0-based
	ACCOUNTS_LIMIT : 50,
	// Just an AdWords constant. don't change it!
	TARGET_SETTING_CONSTANT : 'USER_INTEREST_AND_LIST',
	VALUE_DELIMITER : ', ',
	BIG_QUERY_NULL_MARKER : 'NULL',
};

// -------------------------------------

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
				obj[ 'isActiveClone' ] = null;
				temp[ key ] = clone( obj[ key ] );
				delete obj[ 'isActiveClone' ];
			}
		}
		return temp;
	}
	function partition( arr ){
		var clone1 = this.clone;
		return {
			clone : clone1,
			by: function( keyName ){
				var res = {};

				for ( var i = 0; i < arr.length; i++ ){
					var obj = this.clone( arr[ i ] );
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
	function iteratorToList( iter ){
		var list = [];
		while( iter.hasNext() ){
			list.push( iter.next() );
		}
		return list;
	}
	function not( predicate ){
		return function( item ){
			return ! predicate( item );
		}
	}
	function snakeToCamel( str ){
		var res = str
			.replace( /_+(.)/g, function( x, chr ){
			return chr.toUpperCase();
		});
		return res.charAt( 0 ).toUpperCase() + res.slice( 1 );
	}
	function camelToSnake( str ){
		return str.replace( /\.?([A-Z])/g, function( x, y ){ return '_' + y.toLowerCase() } ).replace( /^_/, '' );
	}
	function hash( value ){
		value = value + '';
		var hash = 0;
		if ( value.length == 0 ) return hash;
		for( i = 0; i < value.length; i++ ){
			var char1 = value.charCodeAt( i );
			hash = ( ( hash << 5 ) - hash ) + char1;
			hash = hash & hash; // Convert to 32bit integer
		}
		return Math.abs( hash );
	}
	function equals( value ){
		return function( x ){ return x == value };
	}
	function modulo( value ){
		return function( x ){ return x % value };
	}
	function listToMap( list, keySelector, valueSelector ){
		var map = {};
		
		if( ! valueSelector ){
			valueSelector = function( x ){ return x };
		}
		
		list.forEach( function( item, index ){
			map[ keySelector( item, index ) ] = valueSelector( item, index );
		});
		return map;
	}
	return {
		toString		: function(){ return 'my tools class'; },
		property 		: property,
		properties		: properties,
		partition		: partition,
		clone			: clone,
		iteratorToList	: iteratorToList,
		not				: not,
		snakeToCamel	: snakeToCamel,
		camelToSnake	: camelToSnake,
		hash			: hash,
		equals			: equals,
		modulo			: modulo,
		listToMap		: listToMap,
	};
})();

var BIGQUERY = ( function(){
	var TRUNCATE_EXISTING_DATASETS = false;
	var TRUNCATE_EXISTING_TABLES = false;
	var PARTITION_EXPIRATION = false;
	var CHUNK_SIZE = 30000;
	
	function createDataset( projectId, datasetId ){
		if( datasetExists( projectId, datasetId ) ){
			if( TRUNCATE_EXISTING_DATASETS ){
				BigQuery.Datasets.remove( projectId, datasetId, { 'deleteContents' : true } );
				Logger.log( 'Truncated dataset ' + projectId + '.' + datasetId );
			} else {
				return;
			}
		}
		// Create new dataset.
		var dataSet = BigQuery.newDataset();
		dataSet.friendlyName = datasetId;
		dataSet.datasetReference = BigQuery.newDatasetReference();
		dataSet.datasetReference.projectId = projectId;
		dataSet.datasetReference.datasetId = datasetId;

		dataSet = BigQuery.Datasets.insert( dataSet, projectId );
		Logger.log( 'Created dataset with id %s.', dataSet.id );
	}

	function datasetExists( projectId, datasetId ){
		// Get a list of all datasets in project.
		var datasets = BigQuery.Datasets.list( projectId );
		var datasetExists = false;
		// Iterate through each dataset and check for an id match.
		if( datasets.datasets != null ){
			for( var i = 0; i < datasets.datasets.length; i++ ){
				var dataset = datasets.datasets[ i ];
				if( dataset.datasetReference.datasetId == datasetId ){
					datasetExists = true;
					break;
				}
			}
		}
		return datasetExists;
	}

	function dropTable( projectId, datasetId, tableName ){
		if ( tableExists( projectId, datasetId, tableName ) ) {
			BigQuery.Tables.remove( projectId, datasetId, tableName );
			Logger.log( 'Table %s dropped.', tableName );
		}
	}
	
	function createTable( projectId, datasetId, tableName, fields ){
		if( tableExists( projectId, datasetId, tableName ) ){
			if( TRUNCATE_EXISTING_TABLES ){
				dropTable( projectId, datasetId, tableName );
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
		table.tableReference.datasetId = datasetId;
		table.tableReference.projectId = projectId;
		table.tableReference.tableId = tableName;

		if( PARTITION_EXPIRATION ){
			table.timePartitioning = BigQuery.newTimePartitioning();
			table.timePartitioning.type = 'DAY';
			table.timePartitioning.expirationMs = 1000 * 60 * 60 * 24 * PARTITION_EXPIRATION;
			table.timePartitioning.requirePartitionFilter = true;
		}
		
		try{
			table = BigQuery.Tables.insert(
				table,
				projectId,
				datasetId
			);
		}catch( error ){
			// sometimes we get "table already exists" here
			// we can ignore this error
			// should be fixed by now
			Logger.log( '----------------------> ' + error + ' - ' + tableName );
		}
		Logger.log('Table %s created.', tableName);
	}

	function tableExists( projectId, datasetId, tableId ){
		var pageToken = ''; // start with empty pageToken
		var resultsPerPage = 150;
		var finished = false;
		
		while( ! finished ){
			// Get a list of a part of all tables in the dataset.
			var tables = BigQuery.Tables.list(
				projectId,
				datasetId,
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

	function getTables( projectId, datasetId ){
		var pageToken = null; // start with empty pageToken
		var resultsPerPage = 150;
		var res = [];
		do{
			// Get a list of a part of all tables in the dataset.
			var tables = BigQuery.Tables.list(
				projectId,
				datasetId,
				{
					pageToken  : pageToken || '',
					maxResults : resultsPerPage
				}
			);
			pageToken = tables.nextPageToken;
		  
			res = res.concat( tables.tables || [] );
		}while( pageToken );
		
		return res;
	}

	function copyTable( projectId, datasetId, srcTableId, destTableId ){
		var job = {
			configuration: {
				copy: {
					destinationTable: {
						projectId	: projectId,
						datasetId	: datasetId,
						tableId  	: destTableId
					},
					sourceTable : {
						projectId	: projectId,
						datasetId	: datasetId,
						tableId		: srcTableId
					},
					createDisposition	: 'CREATE_IF_NEEDED',
					writeDisposition	: 'WRITE_TRUNCATE',
				}
			}
		};
		BigQuery.Jobs.insert( job, projectId );
	}

	function prepareForBigQuery( value ){
		if( value == null ){
			return CONSTANTS.BIG_QUERY_NULL_MARKER;
		}
		
		function isNumeric( n ){
			return ! isNaN( parseFloat( n ) ) && isFinite( n );
		}
		if( typeof value == 'string' ){
			// remove thousand separator
			var num = value.split( ',' ).join( '' );
			if( isNumeric( num ) ){
				return num;
			}
			// Fixed bug: for empty strings " value.indexOf( '%' ) == value.length - 1 " returns true.
			// To fix this we need to check the length to being > 0
			if( value.length > 0 && value.indexOf( '%' ) == value.length - 1 ){
				var num = value.substring( 0, value.length - 1 );
				if( isNumeric( num ) ){
					return num / 100;
				}
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
		function splitArray( arr, chunkSize ){
			var i, res = [];
			for( i = 0; i < arr.length; i += chunkSize ){
				res.push( arr.slice( i, i + chunkSize ) );
			}
			return res;
		}
		var rows = matrix.map( function( row ){
			return row.map( prepareForBigQuery ).join( ',' );
		});
		return splitArray( rows, CHUNK_SIZE ).map( function( rows ){ return rows.join( '\n' ) } );
	}

	function toMatrix( obj ){
		return Object.values( obj ).map( Object.values );
	}
	
	function loadIntoBigquery( projectId, datasetId, tableName, matrix ){
		if( typeof matrix.length == 'undefined' ){
			matrix = toMatrix( matrix );
		}
		matrix = matrix.map( function( row ){
			if( typeof row.length == 'undefined' ){
				return Object.values( row );
			}
			return row;
		});
		var uploader = loadIntoBigqueryTable( projectId, datasetId, tableName );
		var bigQueryJobIds = toCsvChunks( matrix ).map( uploader );
		return bigQueryJobIds;
	}

	function loadIntoBigqueryTable( projectId, datasetId, tableName ){
		return function( data ){
			// Convert to Blob format.
			var blobData = Utilities.newBlob( data, 'application/octet-stream' );
			// Create the data upload job.
			var job = {
				configuration: {
					load: {
						destinationTable: {
							projectId: projectId,
							datasetId: datasetId,
							tableId: tableName
						},
						skipLeadingRows: 0, // We have no a header row, so nothing to skip.
						writeDisposition	: 'WRITE_APPEND', // Since we load chunks it must be append! Do not use 'WRITE_TRUNCATE' here!
						nullMarker : CONSTANTS.BIG_QUERY_NULL_MARKER,
					}
				}
			};
			try{
				var insertJob = BigQuery.Jobs.insert( job, projectId, blobData );
				//Logger.log('Load job started for %s. Check on the status of it here: ' +
				//   'https://bigquery.cloud.google.com/jobs/%s', tableName,
				//   projectId);
				return insertJob.jobReference.jobId;
			}catch( error ){
				// sometimes we get "No schema specified on job or table." here. Not recently..
				Logger.log( error + ' - ' + tableName );
				return 'error';
			}
		};
	}

	function checkJob( projectId, jobId ){
		do{
			var job = BigQuery.Jobs.get( projectId, jobId );
			Logger.log( JSON.stringify( job, null, 2 ) + ' Sleep 10 sec' );
			
			Utilities.sleep(1000 * 10 );
			
		}while( job.status && job.status.state == 'RUNNING' );
		Logger.log( 'final job: ' + JSON.stringify( job, null, 2 ) );
	}
	
	function checkJobs( projectId, jobIds ){
		var states = {};
		for( var i in jobIds ){
			var jobId = jobIds[ i ];
			if( jobId == 'error' ){
				continue;
			}
			var job = BigQuery.Jobs.get( projectId, jobId );
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

	function queryTable( projectId, datasetId, tableId ){
		var result = [];
		var pageToken = ''; // empty pageToken
		var resultsPerPage = 10000;
		var finished = false;
		//var processed = 0;
		
		while( ! finished ){
			var data = BigQuery.Tabledata.list(
				projectId,
				datasetId,
				tableId,
				{
					pageToken  : pageToken,
					maxResults : resultsPerPage
				}
			);
			result = result.concat( ( data.rows || [] ).map( function( row ){
				return row.f.map( _.property( 'v' ) );
			}));
			pageToken = data.pageToken;
			if( ! pageToken ){
				finished = true;
			}
			//processed += data.rows ? data.rows.length : 0;
			//Logger.log( processed + ' / ' + data.totalRows + ' processed ' );
		}
		//Logger.log( 'result: ' + JSON.stringify( result ) );
		return result;
	}

	function queryBigqueryAsync( query, projectId ){
		var queryRequest = BigQuery.newQueryRequest();
		queryRequest.query = query;
		queryRequest.useLegacySql = false;
	  
		var job = BigQuery.Jobs.query( queryRequest, projectId );
	}

	function queryBQ( query, waitLimit ){
		var queryRequest = BigQuery.newQueryRequest();
		queryRequest.query = query;
		queryRequest.useLegacySql = false;
	  
		var queryResults = BigQuery.Jobs.query( queryRequest, projectId );
		var jobId = queryResults.jobReference.jobId;
		
		var counter = 0;
		waitLimit = waitLimit || 7;
		sleepTimeMs = 1000;
		
		while( ! queryResults.jobComplete && counter++ < waitLimit ){
			Logger.log( 'wait for query job to complete' );
			Utilities.sleep( sleepTimeMs );
			sleepTimeMs *= 2;
			queryResults = BigQuery.Jobs.getQueryResults( projectId, jobId );
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
	
	return {
		queryTable 			: queryTable,
		queryBQ 			: queryBQ,
		checkJobs 			: checkJobs,
		loadIntoBigquery 	: loadIntoBigquery,
		copyTable			: copyTable,
		getTables			: getTables,
		tableExists			: tableExists,
		createTable			: createTable,
		dropTable			: dropTable,
		datasetExists		: datasetExists,
		createDataset		: createDataset,
	}
})();

var MAIL_APP = ( function (){
	var SEND_EMAILS_THROUGH_MAILGUN = true;
	var URL = 'https://api.mailgun.net/v3/mg.peakace.de/messages';
	var FROM = 'adwords_scripts@mg.peakace.de';
	var AUTHORISATION = 'Basic YXBpOmtleS1hYWZmMmI2MGU4MmNkMWYwOTIwYWYxNDUzZWM0MDcyOA==';
	
	function sendEmail( recipient, subject, text, html ){
		if( !text && !html ){
			throw new Error( 'Neither text-body nor html supplied for email.' );
		}
		if( SEND_EMAILS_THROUGH_MAILGUN ){
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
				name: subject,
				htmlBody : html
			}
		);
	}

	function mailGunSender( recipient, subject, text, html ){
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
			URL,
			{
				method : 'post',
				payload : {
					from : FROM,
					to: recipient,
					subject : subject,
					text : text,
					html : html,
				},
				headers : {
					Authorization : AUTHORISATION,
				}
			}
		);
	}
	
	return {
		sendEmail	: sendEmail,
	}
})();

// ####################################################
// ####################################################

var GOOGLE_SHEETS = ( function (){
	var HAS_HEADER_ROW = true;
	
	function autoResizeColumns( sheet ){
		for( var column = 1; column <= sheet.getLastColumn(); column++ ){
			sheet.autoResizeColumn( column );
		}
	}
	
	function getMapOfLists( keyColumnIndex, valueColumnIndex, sheetUrl, sheetName, keyPredicate ){
		var values = loadSheet( sheetUrl, sheetName );
		var res = {};
		for( var index = HAS_HEADER_ROW ? 1 : 0; index < values.length; index++ ){
			var key =  values[ index ][ keyColumnIndex ];
			var value = values[ index ][ valueColumnIndex ];
			
			if( !keyPredicate || keyPredicate( key ) ){
				res[ key ] = value.split(',').map( String.trim );
			}
		}
		return res;
	}
	
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
		sheetUrl = sheetUrl;
		sheetName = sheetName;
		var sheet = initSheet( sheetUrl, sheetName );
		return loadSheet2( sheet );
	}
	
	function accountPredicate( cellValue ){
		return ( typeof cellValue == 'string' && cellValue.match( /^\d\d\d-\d\d\d-\d\d\d\d$/ ) );
	}
	
	function getAccountIds( sheetUrl, sheetName, columnIndex ){
		var res = [];
		var values = loadSheet( sheetUrl, sheetName );
		for( var index = HAS_HEADER_ROW ? 1 : 0; index < values.length; index++ ){
			var cellValue = values[ index ][ columnIndex ];
			if( accountPredicate( cellValue ) ){
				res.push( cellValue );
			}else{
				Logger.log( 'WARNING: ' + cellValue + ' is not a valid account-id. Expected: xxx-xxx-xxxx' );
			}
		}
		return res;
	}
	
	function getAccountEmailMap( accountIndex, emailIndex, sheetUrl, sheetName ){
		return getMapOfLists(
			accountIndex,
			emailIndex,
			sheetUrl,
			sheetName, 
			accountPredicate
		);
	}
	
	return {
		loadSheet			: loadSheet,
		//getMapOfLists		: getMapOfLists,
		getAccountIds		: getAccountIds,
		getAccountEmailMap 	: getAccountEmailMap,
	};
})();
// ####################################################
// ####################################################

var CONFIG = ( function(){
	var res = {
		REPORT: {
			NAME: 'CAMPAIGN_PERFORMANCE_REPORT',
			KEY : [ 'CampaignId' ],
			FIELDS: {
				AccountCurrencyCode 				: 'STRING',
				AccountDescriptiveName 				: 'STRING',
				AccountTimeZone						: 'STRING',
				AdvertisingChannelSubType	 		: 'STRING',
				AdvertisingChannelType	 			: 'STRING',
				Amount	 							: 'STRING',// -> duplicate to BudgetAmount
				BaseCampaignId	 					: 'INTEGER',
				BiddingStrategyId	 				: 'STRING',
				BiddingStrategyName	 				: 'STRING',// -> duplicate to StrategyName
				BiddingStrategyType	 				: 'STRING',// -> duplicate to StrategyType
				BudgetId							: 'STRING',
				CampaignDesktopBidModifier		 	: 'STRING',
				CampaignGroupId	 					: 'STRING',
				CampaignId	 						: 'INTEGER',
				CampaignMobileBidModifier	 		: 'STRING',
				CampaignName						: 'STRING',
				CampaignStatus	 					: 'STRING',
				CampaignTabletBidModifier	 		: 'STRING',
				CampaignTrialType	 				: 'STRING',
				CustomerDescriptiveName	 			: 'STRING',
				EndDate	 							: 'STRING',
				EnhancedCpcEnabled	 				: 'STRING',
				ExternalCustomerId	 				: 'STRING',
				FinalUrlSuffix	 					: 'STRING',
				HasRecommendedBudget				: 'STRING',
				IsBudgetExplicitlyShared			: 'STRING',
				LabelIds							: 'STRING',
				Labels								: 'STRING',
				MaximizeConversionValueTargetRoas	: 'STRING',
				Period								: 'STRING',
				RecommendedBudgetAmount				: 'STRING',
				ServingStatus						: 'STRING',
			}
		},
		DATABASE_FIELDS : {
			ad_rotation_type			: 'STRING',
			delivery_method				: 'STRING',
			budget_amount				: 'STRING', // has a duplicate (see above)
			budget_total_amount			: 'STRING',
			budget_is_shared			: 'STRING',
			targeting_setting			: 'STRING',
			strategy_type				: 'STRING',
			strategy_source				: 'STRING',
			strategy_name				: 'STRING', // has a duplicate (see above)
			tracking_template			: 'STRING',
			custom_parameters			: 'STRING',
			negative_keywords			: 'STRING',
			negative_keyword_lists		: 'STRING',
			languages					: 'STRING',
			excluded_content_labels		: 'STRING',
			platforms					: 'STRING',
			targeted_proximities		: 'STRING',
			targeted_locations			: 'STRING',
			excluded_locations			: 'STRING',
			ad_schedules				: 'STRING',
			excluded_audiences			: 'STRING',
			excluded_topics				: 'STRING',
			topics						: 'STRING',
			audiences					: 'STRING',
		},
	};
	for( var fieldName in res.REPORT.FIELDS ){
		var type = res.REPORT.FIELDS[ fieldName ];
		var snake = _.camelToSnake( fieldName );
		res.DATABASE_FIELDS[ snake ] = type;
	}
	return res;
})();

function splitArray( arr, chunkSize ){
	var i, res = [];
	for( i = 0; i < arr.length; i += chunkSize ){
		res.push( arr.slice( i, i + chunkSize ) );
	}
	return res;
}

function main(){
	/*
	Logger.log( 'setup' );
	var accounts = _.iteratorToList(  MccApp
		.accounts()
		.get()
	);
  
	var text = accounts.map( function( account ){
		return account.getName() + '\t' + account.getCustomerId() + '\t' + '' + ERROR_REPORTING_EMAIL;
	}).join( '\n' );
  
	Logger.log( text );
	return;
	*/
	try{
		Logger.log( 'start' + ( DEBUGGING ? ' DEBUGGING-MODE !!!!' : '' ) );
		
		var mccId = cleanAccountName().toLowerCase();
		
		BIGQUERY.createDataset( BIGQUERY_PROJECT_ID, CONSTANTS.BIGQUERY_DATASET_PREFIX + '_' + mccId );
		
		var accountIds = GOOGLE_SHEETS.getAccountIds(
			EMAIL_SHEET_URL,
			SHEET_NAME,
			CONSTANTS.ACCOUNT_ID_COLUMN_INDEX
		);
		
		accountIds = splitArray( accountIds, CONSTANTS.ACCOUNTS_LIMIT )[ SCRIPT_INSTANCE - 1 ];
		if( ! accountIds ){
			Logger.log( 'No accounts configured for this script instance. Terminate. ' );
			return;
		}
		var limit = CONSTANTS.ACCOUNTS_LIMIT;
		if( DEBUGGING ){
			accountIds = [ accountIds[ 0 ] ];
			limit = 1;
		}
		Logger.log( accountIds );
		
		var selector = MccApp
			.accounts()
			.withIds( accountIds )
			.withLimit( limit )
			.executeInParallel( 'processAccount', 'finalProcessing', JSON.stringify({
				mccId : mccId,
			}));
	} catch ( error ){
		var accountName = AdWordsApp.currentAccount().getName();
		var subject = 'Error in ' + CONSTANTS.SCRIPT_NAME + '' + SCRIPT_INSTANCE + ' ' + accountName;
		var message = error + '\n' + error.stack;
		Logger.log(  subject + ' -> ' + message );
		MAIL_APP.sendEmail( ERROR_REPORTING_EMAIL, subject, message );
		throw error;
	}
}

var MAX_ALLOWED_DURATION_IN_SECONDS = 15 * 60; // 15 minutes
var EXPECTED_DURATION_PER_CAMPAIGN_IN_SECONDS = 5;
// POSSIBLE_DIVISORS must be divisors of 24, must contain 24 and be in ascending order
var POSSIBLE_DIVISORS = [ 1, 2, 3, 4, 6, 8, 12, 24 ];

function computeNumParts( countAllCampaigns ){
	return POSSIBLE_DIVISORS.filter( function( divisor ){
		if( divisor == 24 ){
			return true; // 24 is always allowed
		}
		var res = ( countAllCampaigns <= MAX_ALLOWED_DURATION_IN_SECONDS / EXPECTED_DURATION_PER_CAMPAIGN_IN_SECONDS * divisor );
		return res;
	})[ 0 ];
}

function computeCurrentCampaignIds(){
    var query = 'SELECT CampaignId FROM CAMPAIGN_PERFORMANCE_REPORT WHERE CampaignStatus IN [ "ENABLED", "PAUSED" ]';
	
	var allCampaignIds = _.iteratorToList( AdWordsApp.report( query ).rows() )
		.map( _.property( 'CampaignId' ) )
	;
	var numParts = computeNumParts( allCampaignIds.length );
	var currentPart = ( new Date().getHours() ) % numParts;
	
	var currentCampaignIds = allCampaignIds
		.filter( _.property( _.hash, _.modulo( numParts ), _.equals( currentPart ) ) )
	;
	return [ currentCampaignIds, currentPart, numParts ];
}

function computeKey( key_ ){
	return function( row ){
		return key_
			.map( function( key ){ return row[ key ] } )
			.join( '_' )
		;
	};
}

function getDataFromAdwords( currentCampaignIds ){
	
	var isFirst = true;
	
	if( DEBUGGING ){
		Logger.log( 'campaign performance report' );
	}
	var reportAttributes = checkCampaignAttributes( currentCampaignIds );
	
	// ------ Audiences ----------------------
	//
	if( DEBUGGING ){
		Logger.log( 'Audiences' );
	}
	var query = 'SELECT CampaignId, UserListName '
		+ 'FROM AUDIENCE_PERFORMANCE_REPORT '
		+ 'WHERE CriterionAttachmentLevel = "CAMPAIGN" '
		+ 'AND CampaignId IN [ "' + currentCampaignIds.join( '", "' ) + '" ] '
	;
	if( DEBUGGING ){
		Logger.log( query );
	}
	var audiences = {};
	_.iteratorToList( AdWordsApp.report( query ).rows() )
		.forEach( function( row ){
			var campaignId = row[ 'CampaignId' ];
			audiences[ campaignId ] = audiences[ campaignId ] || [];
			audiences[ campaignId ].push( row[ 'UserListName' ] );
		})
	;
	for( campaignId in audiences ){
		audiences[ campaignId ] = audiences[ campaignId ].sort().join(', ');
	}
	//
	// ---------------------------------------
	var keySelector = computeKey( CONFIG.REPORT.KEY );
	
	var result = {};
	
	var campaigns = AdWordsApp.campaigns()
		.withCondition( 'Status IN ["ENABLED","PAUSED"]' )
		.withCondition( 'CampaignId IN [ "' + currentCampaignIds.join( '", "' ) + '" ]' )
		.get();
	
	_.iteratorToList( campaigns ).map( function( campaign, index ){
		if( DEBUGGING ){
			var index_limit = 2;
			if( index > index_limit ){
				return;
			}
			Logger.log( 'campaign ' + index );
			if( index == index_limit ){
				Logger.log( 'DEBUG-MODE: skip all other campaigns..' );
			}
		}
		var campaignId = campaign.getId();
		var campaignName = campaign.getName();
		var targeting = campaign.targeting();
		var display = campaign.display();
		var bidding = campaign.bidding();
		var urls = campaign.urls();
		
		function zeroPad( number ){
			return Utilities.formatString( '%02d', number);
		}
		
		var row = {
			AdRotationType : campaign.getAdRotationType(),
			DeliveryMethod : campaign.getBudget().getDeliveryMethod(),
			BudgetAmount : campaign.getBudget().getAmount(),
			BudgetTotalAmount : campaign.getBudget().getTotalAmount(),
			BudgetIsShared : campaign.getBudget().isExplicitlyShared(),
			TargetingSetting : targeting.getTargetingSetting( CONSTANTS.TARGET_SETTING_CONSTANT ),
			StrategyType : bidding.getStrategyType(),
			StrategySource : bidding.getStrategySource(),
			StrategyName : ( bidding.getStrategy() || { getName : function(){ return null } } ).getName(),
			TrackingTemplate : urls.getTrackingTemplate(),
			CustomParameters : urls.getCustomParameters(),
			NegativeKeywords : _.iteratorToList( campaign.negativeKeywords()		.get() 	).map( _.property( 'getText' ) ).sort().join( CONSTANTS.VALUE_DELIMITER ),
			NegativeKeywordLists : _.iteratorToList( campaign.negativeKeywordLists().get() 	).map( _.property( 'getName' ) ).sort().join( CONSTANTS.VALUE_DELIMITER ),
			Languages : _.iteratorToList( targeting.languages()			.get() 	).map( _.property( 'getName' ) ).sort().join( CONSTANTS.VALUE_DELIMITER ),
			ExcludedContentLabels : _.iteratorToList( targeting.excludedContentLabels().get() ).map( _.property( 'getContentLabelType' ) ).sort().join( CONSTANTS.VALUE_DELIMITER ),
			Platforms : _.iteratorToList( targeting.platforms()			.get() 	).map( _.property( 'getName' ) ).sort().join( CONSTANTS.VALUE_DELIMITER ),
			TargetedProximities : _.iteratorToList( targeting.targetedProximities()	.get() 	).map( _.property( 'getAddress' ) ).sort().join( CONSTANTS.VALUE_DELIMITER ),
			TargetedLocations : _.iteratorToList( targeting.targetedLocations()	.get() 	).map( _.property( 'getName' ) ).sort().join( CONSTANTS.VALUE_DELIMITER ),
			ExcludedLocations : _.iteratorToList( targeting.excludedLocations()	.get() 	).map( _.property( 'getName' ) ).sort().join( CONSTANTS.VALUE_DELIMITER ),
			AdSchedules : _.iteratorToList( targeting.adSchedules().get() 	).map( function( schedule ){
				var res = schedule.getDayOfWeek()
					+ ' ' + schedule.getStartHour()
					+ ':' + zeroPad( schedule.getStartMinute() )
					+ ' to ' + schedule.getEndHour()
					+ ':' + zeroPad( schedule.getEndMinute() )
					+ ' bid-modifier: ' + schedule.getBidModifier() + ''
				;
				return res;
			}).sort().join( CONSTANTS.VALUE_DELIMITER ),
			ExcludedAudiences : _.iteratorToList( targeting.excludedAudiences()	.get() 	).map( _.property( 'getAudienceId' ) ).sort().join( CONSTANTS.VALUE_DELIMITER ),
			ExcludedTopics : _.iteratorToList( display.excludedTopics()		.get() 	).map( _.property( 'getTopicId' ) ).sort().join( CONSTANTS.VALUE_DELIMITER ),
			Topics : _.iteratorToList( display.topics()				.get() 	).map( _.property( 'getTopicId' ) ).sort().join( CONSTANTS.VALUE_DELIMITER ),
			Audiences : audiences[ campaignId ],
		};
		
		var attributes = reportAttributes[ campaignId ];
		for( attribute in attributes ){
			row[ attribute ] = attributes[ attribute ];
		}
		
		if( isFirst ){
			if( DEBUGGING ){
				Logger.log( JSON.stringify( row, null, '\t' ) );
			}
			isFirst = false;
		}
		result[ keySelector( row ) ] = row;
	});
	return result;
}

function compareRows( key, bigQueryRow, adWordsRow ){
	function isNumeric( n ){
		return ! isNaN( parseFloat( n ) ) && isFinite( n );
	}
	if( !adWordsRow ){
		return [];
		// this happens supposedly due to adwords-scripts timeouts. 
		// script can't finish and therefore can't write into bigquery
		// and therefore some campaign-rows are missing.
		// Don't alert users about this, since it is misleading.
		/*
		return {
			attribute : 'MISSING_CAMPAIGN',
			campaignId : bigQueryRow[ 'CampaignId' ],
			campaignName : bigQueryRow[ 'CampaignName' ],
			bigQueryValue : 'was present',
			adWordsValue : 'supposedly deleted',
		};
		*/
	}
	
	function normalizeValue( value ){
		if( value == null ){
			return 'null';
		}
		value = value + '';
		if( value.indexOf( '%' ) >= 0 ){
			var possibleNumber = value.replace( /%/g, '' ).replace( /,/g, '' );
			if( isNumeric( possibleNumber ) ){
				return ( possibleNumber / 100 ) + '';
			}
		}
		var possibleNumber = value.replace( /,/g, '' );
		if( isNumeric( possibleNumber ) ){
			return possibleNumber;
		}
		return value;
	}
	
	var results = [];
	for( var attribute in adWordsRow ){
		
		var bigQueryValue = bigQueryRow[ attribute ];
		var adWordsValue = normalizeValue( adWordsRow[ attribute ] );
		
		// Values in Bigquery are normalized. Therefore we need to normalize the new value for comparison.
		
		if( '' + bigQueryValue != adWordsValue ){
			results.push({
				attribute : attribute,
				campaignId : adWordsRow[ 'CampaignId' ],
				campaignName : adWordsRow[ 'CampaignName' ],
				bigQueryValue : bigQueryValue,
				adWordsValue : adWordsValue,
			});
		}
	}
	return results;
}

function handleConflicts( conflictList ){
	var result = {};
	conflictList.forEach( function( conflict ){
		var attribute = conflict.attribute;
		
		if( ! result[ attribute ] ){
			result[ attribute ] = {
				campaign : {},
				countCampaigns : 0,
				countOtherCampaigns : 0,
			};
		}
		if( result[ attribute ].countCampaigns < MAX_SHOW_CAMPAIGNS_PER_CHECK ){
			// campaign-limit not reached yet
			result[ attribute ].countCampaigns++;
			result[ attribute ].campaign[ conflict.campaignName ] = {
				bigQueryValue : conflict.bigQueryValue,
				adWordsValue  : conflict.adWordsValue
			};
		}else{
			// campaign-limit reached
			result[ attribute ].countOtherCampaigns++;
		}
	});
	return result;
}

function cleanAccountName(){
	var res = AdWordsApp.currentAccount().getName()
			.replace(/\W+/g, '_' )
			.replace( /\u00dc/g, 'Ue' )
			.replace( /\u00fc/g, 'ue' )
			.replace( /\u00c4/g, 'Ae' )
			.replace( /\u00e4/g, 'ae' )
			.replace( /\u00d6/g, 'Oe' )
			.replace( /\u00f6/g, 'oe' )
			.replace( /\u00df/g, 'ss' )
			+ '_'
			+ AdWordsApp.currentAccount().getCustomerId().replace( /\W+/g, '' );
	return res;
}

function processAccount( params ){
	try{
		var account = AdWordsApp.currentAccount();
		var accountId = account.getCustomerId();
		var accountName = account.getName();
		//Logger.log( 'process ' + accountName );
		params = JSON.parse( params );
		var mccId = params.mccId.toLowerCase();
		
		[ currentCampaignIds, currentPart, numParts ] = computeCurrentCampaignIds();
		Logger.log(
			'process ' + accountName
			+ ': ' + currentCampaignIds.length + ' campaigns '
			+  ', current part: ' + currentPart	+  ' out of ' + numParts
		);
		if( currentCampaignIds.length == 0 ){
			// the work is partitioned in parts.
			// the part which is due this hour is empty ( no campaigns )
			Logger.log( account.getName() + ': nothing to do -> quit' );
			return;
		}
		
		// ------- Data From BigQuery --------------
		//											|
		var datasetId = CONSTANTS.BIGQUERY_DATASET_PREFIX + '_' + mccId;
		var tableName = cleanAccountName() + '_' + currentPart;
		
		BIGQUERY.createTable( BIGQUERY_PROJECT_ID, datasetId, tableName, CONFIG.DATABASE_FIELDS );
		
		var bigQueryData = BIGQUERY.queryTable( BIGQUERY_PROJECT_ID, datasetId, tableName );
		
		var fields = Object.keys( CONFIG.DATABASE_FIELDS ).map( _.snakeToCamel );
		
		if( DEBUGGING ){
			Logger.log( 'db-fields in camel notation: ' + fields );
		}
		
		// campaignId -> FieldName -> value
		// example: 1234567890 -> CampaignName -> "Brand - Test"
		bigQueryData = _.listToMap(
			bigQueryData.map( function( row ){
				return _.listToMap(
					row,
					function( item, index ){ return fields[ index ] }, // key selector
					function( item, index ){ return item } // value selector
				);
			})
			, computeKey( CONFIG.REPORT.KEY )
		);
		//											|
		// -----------------------------------------
		
		// get data from AdWords as map of maps
		// Logger.log('get Adwords report');
		var adWordsData = getDataFromAdwords( currentCampaignIds );
		
		// accountName -> conflicts -> campaign -> { oldValue, newValue }
		var res = {
			accountName : account.getName(),
			accountId : account.getCustomerId(),
			conflicts : {},
			bigQueryJobIds : [],
		};
		var countBigQueryData = 0;
		
		// Logger.log('compute differences');
		var allConflicts = [];
		for( var key in bigQueryData ){
			countBigQueryData++;
			
			var bigQueryRow = bigQueryData[ key ];
			var adWordsRow = adWordsData[ key ];
		
			allConflicts = allConflicts.concat( compareRows(
				key,
				bigQueryRow,
				adWordsRow
			));
		}
		if( DEBUGGING ){
			Logger.log( countBigQueryData + ' rows from bigQuery' );
		}
		res.conflicts = handleConflicts( allConflicts );
		// --------------------------------------------------
		
		
		
		// ---------- Put new data into BigQuery ------------
		if( ! DEBUGGING ){
			BIGQUERY.dropTable( BIGQUERY_PROJECT_ID, datasetId, tableName );
			BIGQUERY.createTable( BIGQUERY_PROJECT_ID, datasetId, tableName, CONFIG.DATABASE_FIELDS );
			
			//Logger.log('load into BigQuery');
			var jobIds = BIGQUERY.loadIntoBigquery( BIGQUERY_PROJECT_ID, datasetId, tableName, adWordsData );
			res.bigQueryJobIds = res.bigQueryJobIds.concat( jobIds );	
		}else{
			res.bigQueryJobIds =  [];
		}
		
		// --------------------------------------------------
		
		var json = JSON.stringify( res, null, '\t' );
		if( DEBUGGING ){
			Logger.log( 'json: ' +  json );
		}
		Logger.log( accountName + ' done. ' );
		return json;
	} catch ( error ){
		var accountName = AdWordsApp.currentAccount().getName();
		var subject = 'Error in ' + CONSTANTS.SCRIPT_NAME + '' + SCRIPT_INSTANCE + ' ' + accountName;
		var message = error + '\n' + error.stack;
		Logger.log(  subject + ' -> ' + message );
		MAIL_APP.sendEmail( ERROR_REPORTING_EMAIL, subject, message );
		throw error;
	}
}

function tryParseJson( str ){
	var res = {
		source : str,
		valid : false,
		getResultOrSource : function(){ return this.valid ? this.result : this.source },
	};
	
	if( typeof str !== 'string' ){
		res.exception = new Error( 'not a string' );
		return res;
	}
	
    try {
        res.result = JSON.parse( str );
        res.valid = true;
    }catch( e ){
		res.exception = e;
    }
    return res;
}

// emailMap[ email ][ 0,1,2 ... ] 
function resultsToEmailMap( results, emails ){
	var emailMap = {};
	
	results
		.filter( _.not( _.property( 'getReturnValue' ).eq( 'undefined' ) ) ) // ignore empty results
		.forEach( function( result ){
			var accountId = result.getCustomerId();
			var emailsForThisAccount = emails[ accountId ] || [];
			
			if( emailsForThisAccount.length == 0 ){
				Logger.log( 'WARNING: No emails regiestered for account-id: ' + accountId );
			}
			
			emailsForThisAccount.forEach( function( email ){
				emailMap[ email ] = emailMap[ email ] ? emailMap[ email ] : [];
				if( result.getReturnValue() != null ){ // thread had no error
					var res = tryParseJson( result.getReturnValue() ).getResultOrSource();
					var conflicts = {};
					for( attribute in res.conflicts ){
						if( EXCLUDED_CHECKS.concat( EXCLUDED_CHECKS2[ accountId ] || [] ).indexOf( attribute ) == -1 ){
							conflicts[ attribute ] = res.conflicts[ attribute ];
						}
					}
					if( DEBUGGING ){
						Logger.log( 'result-return-value: ' + result.getReturnValue() );
					}
					if( Object.keys( conflicts ).length > 0 ){
						var res2 = formatResult( conflicts, res.accountName, 'old', 'new' );
						emailMap[ email ].push( res2 );	
					}
				}
			});
		})
	;
	return emailMap;
}

function formatResult( conflicts, accountName, firstValueType, secondValueType ){
	var html = '<style>th, td { border: 1px solid #ddd;}</style>';
	
	html += '<table style="padding:10px;border-collapse:collapse;">';
	for( check in conflicts ){
		if( ENUMERABLE_CHECKS.indexOf( check ) >= 0 ){
			html += '<tr> <td colspan="2"> <h2>' + accountName + '</h2> </td> <td colspan="1"> <h3> ' + check + ' </h3> </td> </tr>';
			html += '<tr style="background-color:rgb(200,200,200);"> <td> Campaign </td> <td> '
					+ 'added ' + check + ' </td> <td> removed ' + check + ' </td> </tr>';
			
			for( campaignName in conflicts[ check ].campaign ){
				var bigQueryValue = ( conflicts[ check ].campaign[ campaignName ].bigQueryValue || '' ).split( ',' );
				var adWordsValue = ( conflicts[ check ].campaign[ campaignName ].adWordsValue || '' ).split( ',' );
				
				var added = adWordsValue.filter( function( x ){ return bigQueryValue.indexOf( x ) == -1 } ).join( ',' );
				var removed = bigQueryValue.filter( function( x ){ return adWordsValue.indexOf( x ) == -1 } ).join( ',' );
				
				html += '<tr> <td > ' + campaignName + ' </td> <td> ' + added + ' </td> <td> ' + removed + ' </td></tr>';
			}
			if( conflicts[ check ].countOtherCampaigns > 0 ){
				html += '<tr> <td colspan="3"> ... and ' + conflicts[ check ].countOtherCampaigns + ' other campaigns </td> </tr>';
			}
		}else{
			html += '<tr> <td colspan="2"> <h2>' + accountName + '</h2> </td> <td colspan="1"> <h3> ' + check + ' </h3> </td> </tr>';
			html += '<tr style="background-color:rgb(200,200,200);"> <td> Campaign </td> <td> '
					+ firstValueType + ' value </td> <td> ' + secondValueType + ' value </td> </tr>';
			
			for( campaignName in conflicts[ check ].campaign ){
				var bigQueryValue = conflicts[ check ].campaign[ campaignName ].bigQueryValue;
				var adWordsValue = conflicts[ check ].campaign[ campaignName ].adWordsValue;
				
				html += '<tr> <td > ' + campaignName + ' </td> <td> ' + bigQueryValue + ' </td> <td> ' + adWordsValue + ' </td></tr>';
			}
			if( conflicts[ check ].countOtherCampaigns > 0 ){
				html += '<tr> <td colspan="3"> ... and ' + conflicts[ check ].countOtherCampaigns + ' other campaigns </td> </tr>';
			}
		}
	}
	html += '</table>';
	
	return html;
}

function finalProcessing( results ){
	var subject = CONSTANTS.SCRIPT_NAME + '' + SCRIPT_INSTANCE + ' ' + AdWordsApp.currentAccount().getName();
	try{
		Logger.log( 'final processing' );
		var emails = GOOGLE_SHEETS.getAccountEmailMap(
			CONSTANTS.ACCOUNT_ID_COLUMN_INDEX,
			CONSTANTS.EMAIL_COLUMN_INDEX,
			EMAIL_SHEET_URL,
			SHEET_NAME
		);
		
		var emailMap = resultsToEmailMap( results, emails );
		
		if( DEBUGGING ){
			Logger.log( 'emailMap: ' + JSON.stringify( emailMap, null, 2 ) );
		}
		
		for( email in emailMap ){
			var conflicts = emailMap[ email ];
			if( conflicts.length == 0 ){
				Logger.log( 'No conflicts found for ' + email );
				continue;
			}
			if( DEBUGGING ){
				Logger.log( 'send emails only to ' + ERROR_REPORTING_EMAIL + ' in debug mode.' );
				Logger.log( JSON.stringify( conflicts[ 0 ], null, 2 ) );
				email = ERROR_REPORTING_EMAIL;
			}
			Logger.log( 'Sending email with ' + conflicts.length + ' conflicts to ' + email + '.' );
			var html = conflicts.join( '<br>' )	+ '<br> Manage subscriptions: ' + EMAIL_SHEET_URL;
			MAIL_APP.sendEmail( email, subject, null, html );
		}
		Logger.log( 'end' );
	}catch( error ){
		var subject = 'Error in ' + subject;
		var message = error + '\n' + error.stack;
		Logger.log(  subject + ' -> ' + message );
		MAIL_APP.sendEmail( ERROR_REPORTING_EMAIL, subject, message );
		throw error;
	}
}

function checkCampaignAttributes( currentCampaignIds ){
	var query = 'SELECT ' + Object.keys( CONFIG.REPORT.FIELDS ).join( ', ' ) + ' '
		+ 'FROM CAMPAIGN_PERFORMANCE_REPORT '
		+ 'WHERE CampaignId IN [ "' + currentCampaignIds.join( '", "' ) + '" ] '
	;
	// Logger.log( query );
	var result = {};
	
	_.iteratorToList( AdWordsApp.report( query ).rows() )
		.forEach( function( row ){
			var campaignId = row[ 'CampaignId' ];
			Object.keys( CONFIG.REPORT.FIELDS ).forEach( function( attr ){
				result[ campaignId ] = result[ campaignId ] || {};
				result[ campaignId ][ attr ] = row[ attr ];
			});
		})
	;
	return result;
}
