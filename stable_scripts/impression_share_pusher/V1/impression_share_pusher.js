
var config = {
	"DESCRIPTION" : "" ,
	"INSTRUCTIONS": "",
	"VERSION" : 1,
	"VERSION_TAG" : "stable",
	"settings" : {		
		"MAILGUN_URL" : "https://api.mailgun.net/v3/mg.peakace.de/messages",
		"MAILGUN_AUTH" : "Basic YXBpOmtleS1hYWZmMmI2MGU4MmNkMWYwOTIwYWYxNDUzZWM0MDcyOA==",
		"MAILGUN_FROM" : "adwords_scripts@mg.peakace.de",
		"BIGQUERY_PROJECT_ID" : "biddy-io",
		"BIGQUERY_DATASET_ID" : "peak_ace_active_clients_transfer",
		"SCRIPT_NAME" : "Impression_Share_Pusher",
		"SEND_ERROR_MESSAGES_TO" : "a.tissen@pa.ag"
	}
};

var config = JSON.parse( dataJSON.settings );
for( key in config ){
	this[ key ] = config[ key ];
}

var BIGQUERY = {
	PROJECT_ID : BIGQUERY_PROJECT_ID,
DATASET_ID : BIGQUERY_DATASET_ID,
PARTITION_EXPIRATION_MS : 1000 * 60 * 60 * 24 * 8, // null => don't set expiration. one year = 1000 * 60 * 60 * 24 * 365,
// if "empty response" occurs, then BIGQUERY_CHUNK_SIZE should be reduced
CHUNK_SIZE : 30000,
PARTITION: 'DAY',
// Truncate existing data, otherwise will append.
TABLE_NAME_PREFIX : 'p_',
	TABLES : {
		AccountMetrics : {
		'ExternalCustomerId'				: 'INTEGER',
		'SearchBudgetLostImpressionShare'	: 'FLOAT',
		'SearchImpressionShare'				: 'FLOAT',
		'SearchRankLostImpressionShare'		: 'FLOAT',
		'Impressions'						: 'INTEGER',
		'Date'								: 'DATE',
		//'Device'							: 'STRING',
		//'AdNetworkType1'					: 'STRING',
	}
},
}

function computeDuringToYesterday( days ){
// from 90 days ago to yesterday;
var now = new Date( Utilities.formatDate( new Date(), 'Europe/Berlin', 'MMM dd,yyyy HH:mm:ss' ) );
//var days = 90;
var yesterday = new Date( now.getTime() - 1000 * 60 * 60 * 24 * 1 );
var before = new Date( now.getTime() - 1000 * 60 * 60 * 24 * ( days + 1 ) );
return _.dateToString( before, '' ) + ', ' + _.dateToString( yesterday, '' );
}

function main(){

try{
	var mccId = AdWordsApp.currentAccount().getCustomerId().split( '-' ).join( '' );
	var mccName = AdWordsApp.currentAccount().getName();

	var allAccounts = ( typeof MccApp == 'undefined' ) ? [ AdWordsApp.currentAccount() ] : iteratorToList(
		MccApp.accounts()
		.withCondition( 'Impressions > 0' )
		.forDateRange( 'LAST_14_DAYS' )
		.orderBy( 'Clicks DESC' )
		.get()
	);
	
	//allAccounts = [ MccApp.accounts().withIds( [ '1371763172' ] ).get().next() ];
	
	Logger.log( allAccounts.length + ' accounts found' );
	
	allAccounts.forEach( function( account ){
		MccApp.select( account );
		
		var rows = retrieveReport(
			Object.keys( BIGQUERY.TABLES.AccountMetrics ),
			'ACCOUNT_PERFORMANCE_REPORT',
			//'Device = "DESKTOP"' // where
			//+ ' AND AdNetworkType1 = "SEARCH"'
			null // no where clause
			,
			computeDuringToYesterday( 90 )
			//'20180915,20181216'
		);
		
		// Logger.log( JSON.stringify( rows, null, 2 ) );
		upload( { AccountMetrics : rows }, mccId );
	});
	
} catch ( error ){
	sendEmail( SEND_ERROR_MESSAGES_TO, 'Error in ' + SCRIPT_NAME + ' ' + mccName, error + '\n' + error.stack );
	Logger.log( 'Error in ' + SCRIPT_NAME + ' ' + mccName + ' -> ' + error + '\n' + error.stack );
	throw error;
}
}


function retrieveReport( fields, report, where, during ){
var query = ''
	+ ' SELECT ' + fields.join( ', ' ) // + ', Clicks'
	+ ' FROM ' + report
			+ ( where ? ' WHERE ' + where : '' )
	+ ( during ? ' DURING ' + during : '' )
			;
// Logger.log( query );
Logger.log( 'query: ' + query );
return parse( AdWordsApp.report( query ), fields );
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

function isNumeric(n) {
return ! isNaN( parseFloat( n ) ) && isFinite( n );
}

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


// ----------------------------------

function computeTableName( tableName, mccId ){
var fullTableName = BIGQUERY.TABLE_NAME_PREFIX + tableName + '_' + mccId;
return fullTableName;
}

function upload( res, mccId ){
Logger.log('load into BigQuery');

var jobIds = [];

Object.keys( BIGQUERY.TABLES ).forEach( function( tableName ){
	var fields = BIGQUERY.TABLES[ tableName ];
	var csvData = toCsvChunks( toCSV( res[ tableName ], fields ) );
	var fullTableName = computeTableName( tableName, mccId );

	createTable( fullTableName, fields, BIGQUERY.PARTITION );
	jobIds = jobIds.concat( loadIntoBigquery( csvData, fullTableName ) );
	
});
Logger.log( 'done' );
checkJobs( jobIds );
}


function toCsvChunks( matrix ){
var rows = matrix.map( function( row ){
	return row.map( prepareForBigQuery ).join( ',' );
});
return splitArray( rows, BIGQUERY.CHUNK_SIZE ).map( function( rows ){ return rows.join( '\n' ) } );
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

function splitArray( arr, chunkSize ){
var i, res = [];
for( i = 0; i < arr.length; i += chunkSize ){
	res.push( arr.slice( i, i + chunkSize ) );
}
return res;
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
	if( BIGQUERY.PARTITION_EXPIRATION_MS ){
		table.timePartitioning.expirationMs = BIGQUERY.PARTITION_EXPIRATION_MS;
	}
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

function loadIntoBigquery( csvChunks, tableName ){
// dropTable( tableName );
// createTable( tableName, BIGQUERY.FIELDS, BIGQUERY.PARTITION );
var uploader = loadIntoBigqueryTable( tableName );
var bigQueryJobIds = csvChunks.map( uploader ).filter( _.property( 'isPresent' ) ).map( _.property( 'get' ) );
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
		return optional( insertJob.jobReference.jobId );
	}catch( error ){
		// sometimes we get "No schema specified on job or table." here
		Logger.log( error + ' - ' + tableName );
		return optional( error );
	}
};
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

// one year = 1000 * 60 * 60 * 24 * 365
function adjustPartitionExpiration( tableName, ms ){
getTables()
	.filter( _.property( 'tableReference', 'tableId' ).eq( tableName ) )
	.filter( _.property( 'type' ).eq( 'TABLE' ) )
	.filter( _.property( 'timePartitioning' ).isDefined() )
	.forEach( function( table ){
		var ref = table.tableReference;
		table.timePartitioning.expirationMs = ms;
		BigQuery.Tables.patch( table, ref.projectId, ref.datasetId, ref.tableId );
	})
;
}


var _ = (function(){

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
function dateToString( date, delimiter, withHours ){
	return addLeadingZeros( date.getFullYear(), 4 ) + delimiter +
		addLeadingZeros( date.getMonth() + 1, 2 ) + delimiter +
		addLeadingZeros( date.getDate(), 2 ) +
		( withHours ? ' ' + addLeadingZeros( date.getHours(), 2 ) + ':' + addLeadingZeros( date.getMinutes(), 2 ) : '' )
	;
}
function addLeadingZeros( number, digits ){
	var res = '' + number;
	while ( res.length < digits ){
		res = '0' + res;
	}
	return res;
}
return {
	toString		: function(){ return 'my tools class'; },
	property 		: property,
	log				: log,
	dateToString 	: dateToString,
};
})();


function iteratorToList( iter ){
var list = [];
while( iter.hasNext() ){
	list.push( iter.next() );
}
return list;
}

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

