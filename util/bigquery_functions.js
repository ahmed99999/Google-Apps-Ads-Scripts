
var BIGQUERY = ( function(){
	var DROP_EXISTING_TABLES = false;
	var PARTITION_EXPIRATION = true;
	var CHUNK_SIZE = 30000;
	
	function createDataset( projectId, datasetId ){
		if( datasetExists( projectId, datasetId ) ){
			return;
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
	
	function createTable(
			projectId,
			datasetId,
			tableName,
			fields,
			partitionExpirationInDays,
			requirePartitionFilter
		){
			
		if( tableExists( projectId, datasetId, tableName ) ){
			Logger.log( tableName + ' already exists' );
			return;
		}
		
		var table = {
			friendlyName : tableName,
			schema : {},
			tableReference : {
				projectId : projectId,
				datasetId : datasetId,
				tableId : tableId,
			},
		};

		table.schema.fields = Object.entries( fields )
			.map( function( [ fieldName, type ] ){
				return {
					name : fieldName,
					type : type,
					descrption : '',
				};
			})
		;

		if( partitionExpirationInDays ){
			table.timePartitioning = {
				type : 'DAY',
				expirationMs : 1000 * 60 * 60 * 24 * partitionExpirationInDays,
			};
			if( requirePartitionFilter ){
				table.timePartitioning.requirePartitionFilter = requirePartitionFilter;
			}
		}
		
		try{
			table = BigQuery.Tables.insert(
				table,
				projectId,
				datasetId
			);
		}catch( error ){
			Logger.log( '----------------------> ' + error + ' - ' + tableName );
		}
		Logger.log( 'Table %s created.', tableName );
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
		function isNumeric( n ){
			return ! isNaN( parseFloat( n ) ) && isFinite( n );
		}
		if( typeof value == 'string' ){
			// remove thousand separator
			var num = value.split( ',' ).join( '' );
			if( isNumeric( num ) ){
				return num;
			}
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
		// dropTable( tableName );
		// createTable( tableName, FIELDS );
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
						nullMarker : 'null',
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
				throw new Error ( JSON.stringify( job.status.errors, null, 2 ) );
			}
		}
		Logger.log( JSON.stringify( states, null, '\t' ) );
		
		if( states[ 'RUNNING' ] ){
			Utilities.sleep( 5000 );
			checkJobs( projectId, jobIds );
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
				return row.f.map( property( 'v' ) );
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
	  
		var job = BigQuery.Jobs.query( queryRequest, projectId );

		var counter = 0;
		waitLimit = waitLimit || 10;
		
		while( ! job.jobComplete && counter++ < waitLimit ){
			Logger.log( 'wait for query job to complete' );
			Utilities.sleep( 1000 );
		}
	  
		if( job.jobComplete ){
			var matrix = job.rows.map( function( row ){
				return row.f.map( property( 'v' ) );
			});
			// Logger.log( matrix.length );
			return matrix;
		}
		var message = 'BQ query job is not complete after ' + waitLimit + ' seconds.';
		Logger.log( message );
		throw new Error( message );
	}
	/*
		Parses Bigquery query results to JSON.
	*/
	function bqQueryParser( schema ){
		/*
			Strips "f" and "v" objects/properties from Bigquery query result.
		*/
		function stripUselessBoilerplate( x ){
			if( typeof x != 'object' ){
				return x; // scalar
			}
			x = ( x.f || x )
				.map( _.property( 'v' ) )
				.map( stripUselessBoilerplate )
			;
			return x;
		}
		/*
			recursive parser
		*/
		function parse1( schema, x ){
			if( typeof schema == 'undefined' ){
				throw new Error( 'schema is undefined, x is ' + JSON.stringify( x, null, 2 ) );
			}
			if( ! Array.isArray( x ) ){ // scalar
				return {
					name : schema.name,
					value : x,
				};
			}
			if( Array.isArray( schema ) ){ // zip to an object
				if( schema.length != x.length ){
					throw new Error( 'lenghts differ' );
				}
				var arr = [];
				for( var i = 0; i < schema.length; i++ ){
					arr.push( parse1( schema[ i ], x[ i ] ) );
				}
				var obj = {};
				arr.forEach( function( y ){
					obj[ y[ 'name' ] ] = y[ 'value' ];
				});
				return obj;
			}
			if( schema.mode == 'REPEATED' ){ // list of objects
				if( schema.fields ){
					return {
						name : schema.name,
						value : x.map( function( xx ){
							return parse1( schema.fields, xx );
						}),
					};
				}
				return { // list of scalars
					name : schema.name,
					value : x,
				};
			}
			throw new Error( 'x is an array, but schema is not: ' + JSON.stringify( x, null, 2 ) + ' <-> ' + JSON.stringify( schema, null, 2 ) );
		}
		return {
			parse : function( x ){ return parse1( schema, stripUselessBoilerplate( x ) ) },
		}
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
		bqQueryParser		: bqQueryParser,
	}
})();
