
// Bigquery settings
var PROJECT_LOCATION = 'US'; // bigquery default location is US
var PROJECT_ID = 'biddy-io'; // Bigquery project id
var DATASET_ID = 'Eva_Bastelbudde'; // Bigquery dataset id
var TABLE_ID = 'ao_export_promoads_businessdata';

var SHEET_URL = 'https://docs.google.com/spreadsheets/d/1y_WflbY5N-l2kpD8rmNHVO6vVFHsRHT26ay07dpfNlE/edit?ts=5da475da#gid=1134916556';
var SHEET_NAME = 'promoBusinessDataUpload';


function main(){
	var query = 'SELECT ExternalCustomerId, CampaignName, Datum, Aktion, title2, desc1, path1 ' + 
		'FROM `' + PROJECT_ID + '.' + DATASET_ID + '.' + TABLE_ID + '`'
	;
	
  // to test sheet upload:
	//var query = 'SELECT 1 AS x, \'test\' AS y';

	var result = queryBigquery( query );

	Logger.log( JSON.stringify( result, null, 2 ) );
	
	var sheet = initSheet( SHEET_URL, SHEET_NAME );
	
	if( result.length == 0 ){
		Logger.log( 'No data to write to the sheet' );
		return;
	}
	
	var headers = Object.keys( result[ 0 ] );
	var data = result.map( Object.values );
  data.unshift( headers );
  
  sheet.clear();
  
  sheet.getRange(
		1,
		1,
		data.length,
		data[ 0 ].length
	).setValues( data );

}

// --------- Polyfills ---------------------
Object.values = Object.values || ( function( obj ){
	return Object.keys( obj ).map( function( key ){
		return obj[key]
	})
});
String.trim = function( value ){
	return value.trim();
};

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


var _ = {
	property : function(){
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
		var args = Array.prototype.slice.call( arguments );
		var f = function( item ){
			// do NOT use reduce here, because apply will interpret the third argument :(
			var res = item;
			args.forEach( function( arg ){ res = apply( res, arg ) } );
			return res;
		};
		f.name1 = args.join( '_' ); // this improves groupBy() output
		return f;
	},
	equals : function( value ){
		return function( item ){
			return value = item;
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
	
}


/*
	Parses Bigquery query results to JSON.
*/
function bqQueryParser( schema ){
	/*
		Strips "f" and "v" objects/properties from Bigquery query result.
	*/
	function stripUselessBoilerplate( x ){
		if( x === null || typeof x != 'object' ){
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
		throw new Error( 'x is an array, but schema is not: '
			+ JSON.stringify( x, null, 2 ) + ' <-> ' + JSON.stringify( schema, null, 2 ) );
	}
	return {
		parse : function( x ){ return parse1( schema, stripUselessBoilerplate( x ) ) },
	}
}

function queryResults( jobId, projectId ){
	var pageToken = null; // start with empty pageToken
	var resultsPerPage = 10000;
	var res = [];
	
	if( ! jobId ){
		throw new Error( 'JobId is undefined' );
	}
	
	if( ! projectId ){
		throw new Error( 'projectId is undefined' );
	}
	var schema = null;
	do{
		/*
		Logger.log( 'projectId: ' + projectId );
		Logger.log( 'jobId: ' + jobId );
		Logger.log( 'pageToken: ' + pageToken );
		Logger.log( 'maxResults: ' + resultsPerPage );
		*/
		var results = BigQuery.Jobs.getQueryResults(
			projectId,
			jobId,
			{
				pageToken  : pageToken || '',
				maxResults : resultsPerPage
			}
		);
		pageToken = results.nextPageToken;
		schema = results.schema.fields;
		res = res.concat( results.rows || [] );
	}while( pageToken );

	//log( JSON.stringify( fields, null, 2 ) );
	
	return res.map( bqQueryParser( schema ).parse );
	
	// res = res.map( stripUselessBoilerplate );
	// Logger.log( 'result from bq: ' + JSON.stringify( res, null, 2 ) );
	// return res;
}

function queryBigqueryAsync(
		query,
		projectId,
		writeDisposition,
		datasetId,
		tableId,
		clusteringFields
	){
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
		job.configuration.query.writeDisposition = writeDisposition;
			// 'WRITE_APPEND'; // WRITE_TRUNCATE
	}
	if( clusteringFields ){
		job.configuration.query.clustering = {
			fields : clusteringFields,
		};
	}
	//log( 'job: ' + JSON.stringify( job, null, 2 ) );
	return BigQuery.Jobs.insert( job, projectId );
}

function waitForJob( jobId ){
	var job = getJob( jobId );
	if( job.status && job.status.state == 'RUNNING' ){
		var seconds = 1; // can't be an argument due to forEach parameter issue, sadly
		Utilities.sleep( ( seconds || 1 ) * 1000 );
		return waitForJob( jobId );
	}
	return job;
}

function sanitizeJobId( jobId ){
	if( jobId.lastIndexOf( '.' ) >= 0 ){
		// Invalid job ID "our_project_id:US.job_nLbcaw3YDYShaqKhy-QYbVbYDyQs"
		// Need to remove "our_project_id:US." part
		jobId = jobId.substring( jobId.lastIndexOf( '.' ) + 1 );
	}
	return jobId;
}

function getJob( jobId, projectId ){
	jobId = sanitizeJobId( jobId );
	var job = BigQuery.Jobs.get( ( projectId || PROJECT_ID ), jobId );
	return job;
}

function queryBigquery( query, projectId ){

	var projectId = projectId || PROJECT_ID;
	
	var job = queryBigqueryAsync( query, projectId );
	
	var jobId = job.id.substring( ( PROJECT_ID + ':' + PROJECT_LOCATION + '.' ).length );
	
	waitForJob( jobId );
	
	var result = queryResults( jobId, projectId );
	
	//Logger.log( 'result: ' + JSON.stringify( result, null, 2 ) );
	
	return result;
}


