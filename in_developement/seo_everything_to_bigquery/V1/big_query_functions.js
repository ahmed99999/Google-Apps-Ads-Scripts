

function dropTable( tableName ){
	if ( tableExists( tableName ) ){
		BigQuery.Tables.remove( BIGQUERY_PROJECT_ID, BIGQUERY_DATASET_ID, tableName );
		Logger.log( 'Table %s dropped.', tableName );
	}
}

function datasetExists() {
	// Get a list of all datasets in project.
	var datasets = BigQuery.Datasets.list( BIGQUERY_PROJECT_ID );
	var datasetExists = false;
	// Iterate through each dataset and check for an id match.
	if( datasets.datasets != null ){
		for( var i = 0; i < datasets.datasets.length; i++ ){
			var dataset = datasets.datasets[ i ];
			if( dataset.datasetReference.datasetId == BIGQUERY_DATASET_ID ){
				datasetExists = true;
				break;
			}
		}
	}
	return datasetExists;
}
	
function createDataset(){
	if( datasetExists() ){
		Logger.log( 'dataset already exists' );
		return;
	}
	// Create new dataset.
	var dataSet = BigQuery.newDataset();
	dataSet.friendlyName = BIGQUERY_DATASET_ID;
	dataSet.datasetReference = BigQuery.newDatasetReference();
	dataSet.datasetReference.projectId = BIGQUERY_PROJECT_ID;
	dataSet.datasetReference.datasetId = BIGQUERY_DATASET_ID;

	dataSet = BigQuery.Datasets.insert( dataSet, BIGQUERY_PROJECT_ID );
	Logger.log( 'Created dataset with id %s.', dataSet.id );
}

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

function createTable( tableName, schema, partitionPeriod ) {
	if( tableExists( tableName ) ){
		Logger.log( 'table ' + tableName + ' already exists. Don\'t recreate it.' );
		return;
	}

	// Create new table.
	var table = BigQuery.newTable();
	var bigQueryFields = [];

	// Add each field to table schema.
	var fieldNames = Object.keys( schema );
	for( var i = 0; i < fieldNames.length; i++ ){
		var fieldName = fieldNames[ i ];
		var bigQueryFieldSchema = BigQuery.newTableFieldSchema();
		bigQueryFieldSchema.description = fieldName;
		bigQueryFieldSchema.name = fieldName;
		bigQueryFieldSchema.type = schema[ fieldName ];
      
		bigQueryFields.push( bigQueryFieldSchema );
	}

	table.schema = BigQuery.newTableSchema();
	table.schema.fields = bigQueryFields;
	table.friendlyName = tableName;

	table.tableReference = BigQuery.newTableReference();
	table.tableReference.projectId = BIGQUERY_PROJECT_ID;
	table.tableReference.datasetId = BIGQUERY_DATASET_ID;
	table.tableReference.tableId = tableName;
	/*if( partitionPeriod ){
		table.timePartitioning = { type : partitionPeriod };
	}*/

	table = BigQuery.Tables.insert(
		table,
		BIGQUERY_PROJECT_ID,
		BIGQUERY_DATASET_ID
	);
	Logger.log( 'Table %s created.', tableName );
}

function splitArray( arr, chunkSize ){
	var i, res = [];
	for( i = 0; i < arr.length; i += chunkSize ){
		res.push( arr.slice( i, i + chunkSize ) );
	}
	return res;
}

function prepareForBigQuery( value ){
  function isNumeric( n ){
    return ! isNaN( parseFloat( n ) ) && isFinite( n );
  }
  if( value === undefined ){
	// bigquery doesn't work with undefined, but null works
    return null;
  }
  if( value === null ){
    return null;
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
		value = value.substring( 0, value.length - 1 );
		if( isNumeric( value ) ){
			return value / 100;
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

function checkJob( projectId, jobId ){
  do{
    var job = BigQuery.Jobs.get( projectId, jobId );
    Logger.log( JSON.stringify( job, null, 2) + ' Sleep 10 sec' );
    
    Utilities.sleep(1000 * 10 );
    
  }while( job.status.state == 'RUNNING' );
  Logger.log( 'final job: ' + JSON.stringify( job, null, 2) );
}

