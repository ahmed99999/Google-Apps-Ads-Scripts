var FILE_NAME = 'access.log-2018_04_17';
var DIVIDER = '|<>_';

var BIGQUERY_PROJECT_ID = 'biddy-io';
var BIGQUERY_DATASET_ID = 'bqml_tutorial';
var BIGQUERY_TABLE_NAME_LOGS = 'logs';
var BIGQUERY_TABLE_NAME_ANALYTICS = 'analytics';
var BIGQUERY_CHUNK_SIZE = 30000;
var BIGQUERY_SCHEMA_LOGS = {
  ip : 'STRING',
  datetime : 'STRING',
  request_type : 'STRING',
  resource : 'STRING',
  protocol : 'STRING',
  http_code : 'INTEGER',
  some_number : 'INTEGER',
  client : 'STRING',
  domain : 'STRING',
};
var BIGQUERY_SCHEMA_ANALYTICS = {
  source : 'STRING',
  keyword : 'STRING',
  domain : 'STRING',
  path : 'STRING',
  visitis : 'STRING',
};


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
	return {
		toString		: function(){ return 'my tools class'; },
		property 		: property,
		properties		: properties,
		log				: log,
	};
})();
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

function toCsvChunks( matrix ){
	var rows = matrix.map( function( row ){
		return row.map( prepareForBigQuery ).join( ',' );
	});
	return splitArray( rows, BIGQUERY_CHUNK_SIZE ).map( function( rows ){ return rows.join( '\n' ) } );
}

function tableExists( tableId ){
	var pageToken = ''; // start with empty pageToken
	var resultsPerPage = 1500;
	var finished = false;
	
	while( ! finished ){
		// Get a list of a part of all tables in the dataset.
		var tables = BigQuery.Tables.list(
			BIGQUERY_PROJECT_ID,
			BIGQUERY_DATASET_ID,
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
	table.tableReference.datasetId = BIGQUERY_DATASET_ID;
	table.tableReference.projectId = BIGQUERY_PROJECT_ID;
	table.tableReference.tableId = tableName;
	if( partitionPeriod ){
		table.timePartitioning = { type : partitionPeriod };
	}

	table = BigQuery.Tables.insert(
		table,
		BIGQUERY_PROJECT_ID,
		BIGQUERY_DATASET_ID
	);
	Logger.log('Table %s created.', tableName);
}

function splitArray( arr, chunkSize ){
	var i, res = [];
	for( i = 0; i < arr.length; i += chunkSize ){
		res.push( arr.slice( i, i + chunkSize ) );
	}
	return res;
}

function prepareForBigQuery( value ){
  function isNumeric(n) {
    return ! isNaN( parseFloat( n ) ) && isFinite( n );
  }
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
						projectId: BIGQUERY_PROJECT_ID,
						datasetId: BIGQUERY_DATASET_ID,
						tableId: tableName
					},
					skipLeadingRows: 0, // We have no a header row, so nothing to skip.
					writeDisposition	: 'WRITE_APPEND', // Since we load chunks it must be append! Do not use 'WRITE_TRUNCATE' here!
				}
			}
		};
		try{
			var insertJob = BigQuery.Jobs.insert( job, BIGQUERY_PROJECT_ID, blobData );
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
/**
 * Lists Analytics accounts.
 */
function listAccounts() {
  var accounts = Analytics.Management.Accounts.list();
  if (accounts.items && accounts.items.length) {
    for (var i = 0; i < accounts.items.length; i++) {
      var account = accounts.items[i];
      Logger.log('Account: name "%s", id "%s".', account.name, account.id);

      // List web properties in the account.
      listWebProperties(account.id);
    }
  } else {
    Logger.log('No accounts found.');
  }
}

/**
 * Lists web properites for an Analytics account.
 * @param  {string} accountId The account ID.
 */
function listWebProperties( accountId ){
  var webProperties = Analytics.Management.Webproperties.list(accountId);
  if (webProperties.items && webProperties.items.length) {
    for (var i = 0; i < webProperties.items.length; i++) {
      var webProperty = webProperties.items[i];
      Logger.log('\tWeb Property: name "%s", id "%s".', webProperty.name,
          webProperty.id);

      // List profiles in the web property.
      listProfiles(accountId, webProperty.id);
      }
  } else {
    Logger.log('\tNo web properties found.');
  }
}

/**
 * Logs a list of Analytics accounts profiles.
 * @param  {string} accountId     The Analytics account ID
 * @param  {string} webPropertyId The web property ID
 */
function listProfiles( accountId, webPropertyId ){
  // Note: If you experience "Quota Error: User Rate Limit Exceeded" errors
  // due to the number of accounts or profiles you have, you may be able to
  // avoid it by adding a Utilities.sleep(1000) statement here.

  var profiles = Analytics.Management.Profiles.list(accountId,
      webPropertyId);
  if (profiles.items && profiles.items.length) {
    for (var i = 0; i < profiles.items.length; i++) {
      var profile = profiles.items[i];
      Logger.log('\t\tProfile: name "%s", id "%s".', profile.name,
          profile.id);
    }
  } else {
    Logger.log('\t\tNo web properties found.');
  }
}


/**
 * Runs a report of an Analytics profile ID. Creates a sheet with the report.
 * @param  {string} profileId The profile ID.
 */
function runReport( profileId ){
  var today = new Date();
  var oneWeekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);

  var startDate = Utilities.formatDate(oneWeekAgo, Session.getScriptTimeZone(),
      'yyyy-MM-dd');
  var endDate = Utilities.formatDate(today, Session.getScriptTimeZone(),
      'yyyy-MM-dd');

  var tableId = 'ga:' + profileId;
  var metric = 'ga:pageviews';
  var options = {
    'dimensions': 'ga:source,ga:keyword,ga:hostname,ga:pagePath',
    'sort': '-ga:pageviews,ga:source',
    'filters': 'ga:medium==organic',
    //'max-results': 25,
  };
	var report = Analytics.Data.Ga.get( tableId, startDate, endDate, metric, options );
	if( report.rows ){
		//Logger.log( JSON.stringify( report.columnHeaders, null, 2 ) );
		Logger.log( JSON.stringify( report.rows, null, 2 ) );
		return report.rows;
	} else {
		Logger.log( 'No rows returned.' );
		return [[]];
	}
}

function myFunction() {
	// Account: name "peakace.de", id "39598427".
	//listAccounts();
	createTable( BIGQUERY_TABLE_NAME_LOGS, BIGQUERY_SCHEMA_LOGS, 'DAY' );
	createTable( BIGQUERY_TABLE_NAME_ANALYTICS, BIGQUERY_SCHEMA_ANALYTICS, 'DAY' );

	var res = runReport( 141080830 );
	
	var csvData = toCsvChunks( res );
	var jobIds = loadIntoBigquery( csvData, BIGQUERY_TABLE_NAME_ANALYTICS );
	
	return;
  
	
  // Log the name of every file in the user's Drive.
  var files = DriveApp.getFiles();
  while (files.hasNext()) {
    var file = files.next();
    var fileName = file.getName();
    if( fileName == FILE_NAME ){
      var data = file.getBlob().getDataAsString();
      var res = data.split( '\n' )
      .map( function( row ){
        return row.split( '"' ).map( function( part, index ){
          if( index % 2 == 1 ){
            return part.replace( /\s/g, DIVIDER ) 
          }
          return part;
        })
        .join( '"' );
      })
      .map( function( row ){
        return row.split( ' ' ).map( function( part ){ return part.split( DIVIDER ).join( ' ' ) } );
      })
      .filter( function( row ){
        return row.length >= 11;
      })
      .map( function( row ){
        if( row[ 5 ].substring( 0, 1 ) == '"' ){
          row[ 5 ] = row[ 5 ].substring( 1 ); 
        }
        if( row[ 5 ].substring( row[ 5 ].length - 1 ) == '"' ){
          row[ 5 ] = row[ 5 ].substring( 0, row[ 5 ].length - 1 ); 
        }
        if( row[ 9 ].substring( 0, 1 ) == '"' ){
          row[ 9 ] = row[ 9 ].substring( 1 ); 
        }
        if( row[ 9 ].substring( row[ 9 ].length - 1 ) == '"' ){
          row[ 9 ] = row[ 9 ].substring( 0, row[ 9 ].length - 1 ); 
        }
        if( row[ 10 ].substring( 0, 1 ) == '"' ){
          row[ 10 ] = row[ 10 ].substring( 1 ); 
        }
        if( row[ 10 ].substring( row[ 10 ].length - 1 ) == '"' ){
          row[ 10 ] = row[ 10 ].substring( 0, row[ 10 ].length - 1 ); 
        }
        var x = row[ 5 ].split( ' ' );
        /*
        return {
          ip : row[ 0 ],
          datetime : row[ 3 ].substring( 1 ) + ' ' + row[ 4 ].substring( 0, row[ 4 ].length - 1 ),
          request_type : x[ 0 ],
          resource : x[ 1 ],
          protocol : x[ 2 ],
          http_code : row[ 6 ],
          some_number : row[ 7 ],
          client : row[ 9 ],
          domain : row[ 10 ],
        };*/
        return [
          row[ 0 ],
          row[ 3 ].substring( 1 ) + ' ' + row[ 4 ].substring( 0, row[ 4 ].length - 1 ),
          x[ 0 ],
          x[ 1 ],
          x[ 2 ],
          row[ 6 ],
          row[ 7 ],
          row[ 9 ],
          row[ 10 ],
        ];
      })
      ;
 
      var csvData = toCsvChunks( res );
      var jobIds = loadIntoBigquery( csvData, BIGQUERY_TABLE_NAME_LOGS );
      
      Logger.log( '' + res.length );
      Logger.log( '' + JSON.stringify( res[ 0 ], null, 2 ) );
    }
  }
}
