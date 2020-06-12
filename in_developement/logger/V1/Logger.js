
if( !Object.entries ){
	Object.entries = function( obj ){
		var ownProps = Object.keys( obj ),
			i = ownProps.length,
			resArray = new Array( i ); // preallocate the Array
		while( i-- ){
			resArray[ i ] = [ ownProps[ i ], obj[ ownProps[ i ] ] ];
		}
		return resArray;
	};
}

if( !Object.values ){
	Object.values = function( obj ){
		var ownProps = Object.keys( obj ),
			i = ownProps.length,
			resArray = new Array( i ); // preallocate the Array
		while( i-- ){
			resArray[ i ] = obj[ ownProps[ i ] ];
		}
		return resArray;
	};
}

function ExecutionInfoTool( functionArguments ){
	var REFERENCE = {
		projectId : 'biddy-io',
		datasetId : 'scripts',
		tableId   : 'execution_info',
	};
	var startTimestamp = null;
	var id = null;

	function trackMccSelects(){
		if( typeof MccApp != 'undefined' ){
			var oldSelect = MccApp.select;
			MccApp.select = function( account ){
				//Logger.log( 'select was called' + account.getCustomerId() + ' ' + account.getName() );
				mccSelect( account );
				return oldSelect.apply( MccApp, arguments );
			}
		}
	}
	trackMccSelects();

	function trackParallelExecutions(){
		if( typeof MccApp != 'undefined' ){
			var oldAccounts = MccApp.accounts;
			var oldExecuteInParallel = null;
			MccApp.accounts = function(){
				var selector = oldAccounts.apply( MccApp, arguments );
				
				oldExecuteInParallel = selector.executeInParallel;
				
				selector.executeInParallel = function( functionName, callbackFunctionName, input ){
					input = ( input || '' ) + '|id=' + id;
					return oldExecuteInParallel.call(
						selector,
						functionName,
						callbackFunctionName,
						input
					);
				};
				return selector;
			}
		}
	}
	trackParallelExecutions();

	function formatDatetime( date ){
		date = date || new Date();
		function pad( number, digits ){
			number = '' + number;
			while( number.length < digits ){
				number = '0' + number;
			}
			return number;
		}
		var res = ''
			+ date.getFullYear() + '-'
			+ pad( date.getMonth() + 1, 2 ) + '-'
			+ pad( date.getDate(), 2 ) + ' '
			+ pad( date.getHours(), 2 ) + ':'
			+ pad( date.getMinutes(), 2 ) + ':'
			+ pad( date.getSeconds(), 2 )
		;
		return res;
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
		if( typeof arg[ item ] != 'undefined' ){
			return arg[ item ];
		}
		throw new Error( 'apply() can\'t determine what to do with ' + JSON.stringify( item, null, 2 ) + ' and ' + arg );
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

	function createTable( reference, fields, partitionExpirationInDays,	requirePartitionFilter ){
		
		function tableExists( reference ){
			var pageToken = null;
			var resultsPerPage = 150;
			var finished = false;
			
			do{
				var tables = BigQuery.Tables.list(
					reference.projectId,
					reference.datasetId,
					{
						pageToken  : pageToken,
						maxResults : resultsPerPage,
					}
				);
				pageToken = tables.nextPageToken;
				if ( tables.tables != null ){
					for( var i = 0; i < tables.tables.length; i++ ){
						var table = tables.tables[ i ];
						if( table.tableReference.tableId == reference.tableId ){
							return true;
						}
					}
				}
			}while( pageToken );
			
			return false;
		}
			
		if( tableExists( reference ) === true ){
			//Logger.log( reference.tableId + ' already exists' );
			return;
		}
		
		var table = {
			friendlyName : reference.tableId,
			schema : {},
			tableReference : reference,
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
				reference.projectId,
				reference.datasetId
			);
		}catch( error ){
			Logger.log( '----------------------> ' + error + ' - ' + reference.tableId );
		}
		Logger.log( 'Table %s created.', reference.tableId );
	}

	function createDataset( reference ){
		function datasetExists( reference ){
			// Get a list of all datasets in project.
			var datasets = BigQuery.Datasets.list( reference.projectId );
			var datasetExists = false;
			// Iterate through each dataset and check for an id match.
			if( datasets.datasets != null ){
				for( var i = 0; i < datasets.datasets.length; i++ ){
					var dataset = datasets.datasets[ i ];
					if( dataset.datasetReference.datasetId == reference.datasetId ){
						return true;
					}
				}
			}
			return false;
		}
		if( datasetExists( reference ) ){
			//Logger.log( 'Data set already exists: ' + reference.datasetId );
			return;
		}
		
		var dataSet = {
			friendlyName : reference.datasetId,
			datasetReference : reference,
		};
		dataSet = BigQuery.Datasets.insert( dataSet, reference.projectId );
		Logger.log( 'Created dataset with id %s.', dataSet.id );
	}

	function truncateTable( reference ){
		var job = {
			configuration : {
				load : {
					destinationTable : reference,
					// autodetect : true,
					skipLeadingRows     : 0,
					writeDisposition    : 'WRITE_TRUNCATE',
					createDisposition   : 'CREATE_IF_NEEDED', // this is not needed, because it is default
					nullMarker          : 'null',
					allowQuotedNewlines : true,
				},
			},
		};
		var insertJob = BigQuery.Jobs.insert(
			job,
			reference.projectId,
			Utilities.newBlob( '', 'application/octet-stream' )
		);
		return insertJob.jobReference.jobId;
	}

	function loadIntoBigquery( reference, matrix ){
		function toChunks( matrix ){
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
				if( typeof value == 'undefined' ){
					return 'null';
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
				value = value.replace( /\n/g, '"\n"' );
				if( value.indexOf(',') >= 0 ){
					value = value.replace( new RegExp( ',', 'g' ), '' );
				}
				return value;
			}
			var rows = matrix.map( function( row ){
				return row.map( prepareForBigQuery ).join( ',' );
			});
			var chunkSize = ( typeof CHUNK_SIZE != 'undefined' ) ? CHUNK_SIZE : 30000;
			var res = splitArray( rows, chunkSize )
				.map( function( rows ){ return rows.join( '\n' ) } )
			;
			return res;
		}
		function prepareMatrix( matrix ){
			if( typeof matrix.length == 'undefined' ){
				matrix = Object.values( matrix );
			}
			var headers = null;
			if( typeof matrix[ 0 ].length == 'undefined' ){
				headers = Object.keys( matrix[ 0 ] );
			}
			matrix = matrix.map( function( row ){
				if( typeof row.length == 'undefined' ){
					return Object.values( row );
				}
				return row;
			});
			matrix = matrix.map( function( row ){
				return row.map( function( value ){
					var res = value;
					if( value === '' ){
						res = 'null';
					}
					if( typeof value == 'boolean' ){
						res = '' + value;
					}
					return res;
				});
			});
			if( headers ){
				// Add headers to the beginning of the array
				matrix.unshift( headers );
			}
			return matrix;
		}
		function determineType( column ){
			function isNumber( n ){
				return Number( n ) == n;
			}
			function isInt( n ){
				return Number( n ) == n && n % 1 === 0;
			}
			function and( a, b ){
				return a && b;
			}
			function isDatetime( str ){
				return str.match( /^\d\d\d\d-\d\d-\d\d \d\d\:\d\d\:\d\d$/ );
			}
			function isDate( str ){
				return str.match( /^\d\d\d\d-\d\d-\d\d$/ );
			}
			function isBoolean( str ){
				var res = false
					|| str === true
					|| str === false
					|| str === 'true'
					|| str === 'TRUE'
					|| str === 'false'
					|| str === 'FALSE'
				;
				
				return res;
			}
			
			column = column.filter( function( x ){ return typeof x != 'undefined' } );
			
			if( column.length == 0 ){
				// fallback to default type
				// TODO: how to improve this?
				return 'STRING';
			}
			
			if( column.map( isNumber ).reduce( and, true ) ){
				if( column.map( isInt ).reduce( and, true ) ){
					return 'INTEGER';
				}else{
					return 'FLOAT';
				}
			}
			if( column.map( isDate ).reduce( and, true ) ){
				return 'DATE';
			}
			if( column.map( isDatetime ).reduce( and, true ) ){
				return 'DATETIME';
			}
			if( column.map( isBoolean ).reduce( and, true ) ){
				return 'BOOLEAN';
			}
			return 'STRING';
		}
		
		//Logger.log( 'matrix: ' + JSON.stringify( matrix, null, 2 ) );
		matrix = prepareMatrix( matrix );
		//Logger.log( 'matrix: ' + JSON.stringify( matrix, null, 2 ) );
		
		var job = {
			configuration : {
				load : {
					destinationTable : reference,
					// autodetect : true,
					skipLeadingRows     : 0,
					//writeDisposition    : 'WRITE_TRUNCATE',
					writeDisposition    : 'WRITE_APPEND', // Since we load chunks it must be append! Do not use 'WRITE_TRUNCATE' here!
					createDisposition   : 'CREATE_IF_NEEDED', // this is not needed, because it is default
					nullMarker          : 'null',
					allowQuotedNewlines : true,
				},
			},
		};
		
		var csv = toChunks( matrix )[ 0 ];
		
		var insertJob = BigQuery.Jobs.insert(
			job,
			reference.projectId,
			Utilities.newBlob( csv, 'application/octet-stream' )
		);
		
		//Logger.log( 'job-id: ' + insertJob.jobReference.jobId );
		
		return insertJob.jobReference.jobId;
	}

	//----------------------------------------------
	
	function truncate(){
		truncateTable( REFERENCE );
	}
	
	function isManagerAccount(){
		if( typeof MccApp == 'undefined' ){
			// works in the case that nobody deleted the MccApp
			return false;
		}
		// +++++++++++++++++
		var iter = MccApp.accounts().get();
		var mccAppIsMocked = iter.totalNumEntities() == 1
			&& iter.next().getCustomerId() != AdsApp.currentAccount().getCustomerId();
		if( mccAppIsMocked ){
			return false;
		}
		var mccAppIsNotMocked = iter.totalNumEntities() > 1 || ! mccAppIsMocked;
		if( mccAppIsNotMocked ){
			return true;
		}
		// +++++++++++++++++
		var isMcc = false;
		try{
			AdWordsApp.report( 'SELECT CanManageClients FROM ACCOUNT_PERFORMANCE_REPORT' );
		}catch( error ){
			isMcc = true;
		}
		return isMcc;
	}
	
	function getStackTrace( aRealError ){
		var myError = aRealError;
		var fakeMessage = '';
		if( ! myError ){
			try{
				throw new Error( fakeMessage );
			}catch( myDummyError ){
				myError = myDummyError;
			}
		}
		var stack = myError.stack;
		
		// format stack
		stack = stack
			.replace( /\t/g, '' )
		;
		
		// Logger.log( 'stack0 ' + JSON.stringify( stack, null, 2 ) );
		
		stack = stack.split( '\n' )
			.map( function( line ){
				var arr = line.match( /at [^:]+\:(\d+) \((\w+)\)/ );
				if( arr && arr.length >= 3 ){
					return {
						codePosition : 'at ' + arr[ 1 ],
						functionName : arr[ 2 ],
					};
				}
			})
			.filter( function( x ){ return x != null } )
		;
		// Logger.log( 'stack1 ' + JSON.stringify( stack, null, 2 ) );
		// Logger.log( 'realError: ' + aRealError );
		
		stack.reverse();
		
		// Logger.log( 'stack2 ' + JSON.stringify( stack, null, 2 ) );
		
		if( ! aRealError ){
			stack.pop(); // remove getStackTrace()
			stack.pop(); // remove executionInfo()
			stack.pop(); // remove start/end/error()
		}
		// Logger.log( 'stack3 ' + JSON.stringify( stack, null, 2 ) );
		
		var functionName = null;
		if( stack.length > 0 ){
			functionName = stack[ stack.length - 1 ].functionName;
		}
		var functionStack = stack.map( property( 'functionName' ) ).join( ' > ' );
		var positionStack = stack.map( property( 'codePosition' ) ).join( ' > ' );
		
		return {
			functionName  : functionName,
			functionStack : functionStack,
			positionStack : positionStack,
			fileName      : myError.fileName,
			lineNumber    : ( aRealError != null ? aRealError.lineNumber : null ),
			message       : myError.message,
		};
	}
	
	function prepareBigquery( reference ){
	
		var fields = {
			script_name    : 'STRING',
			account_id     : 'INTEGER',
			account_name   : 'STRING',
			is_mcc         : 'BOOLEAN',
			event_type     : 'STRING',
			status         : 'STRING',
			execution_type : 'STRING', // NON_MCC, MCC_MAIN, MCC_THREAD, THREAD_RESULT, MCC_FINAL
			start_time     : 'DATETIME',
			time           : 'DATETIME',
			create_quota   : 'INTEGER',
			get_quota      : 'INTEGER',
			remaining_time : 'INTEGER',
			is_preview     : 'BOOLEAN',
			function_name  : 'STRING',
			function_stack : 'STRING',
			position_stack : 'STRING',
			log            : 'STRING',
			message        : 'STRING',
			file_name      : 'STRING',
			line_number    : 'INTEGER',
			id             : 'STRING',
		};
		
		createDataset( reference );
		
		var partitionExpirationInDays = 1000;
		var requirePartitionFilter    = false;
		
		createTable(
			reference,
			fields,
			partitionExpirationInDays,
			requirePartitionFilter
		);
	}
	
	function determineExecutionType( eventType, isMcc, functionArguments, stackTraceObj ){
		// NON_MCC, MCC, MCC_THREAD, THREAD_RESULT, MCC_FINAL
		if( eventType == 'MCC_SELECT' ){
			return 'MCC';
		}
		if( isMcc ){
			if( functionArguments
				&& functionArguments.length == 1 
				&& functionArguments[ 0 ].length > 0
				&& typeof functionArguments[ 0 ][ 0 ].getError       == 'function'
				&& typeof functionArguments[ 0 ][ 0 ].getStatus      == 'function'
				&& typeof functionArguments[ 0 ][ 0 ].getCustomerId  == 'function'
				&& typeof functionArguments[ 0 ][ 0 ].getReturnValue == 'function'
				){
					return 'MCC_FINAL';
			}
			try{
				AdWordsApp.report( 'SELECT CanManageClients FROM ACCOUNT_PERFORMANCE_REPORT' );
			}catch( error ){
				return 'MCC';
			}
			return 'MCC_THREAD';
		}
		return 'NON_MCC';
	}
	
	function getFormattedTime(){
		return formatDatetime(
			new Date(
				Utilities.formatDate(
					new Date(),
					'Europe/Berlin',
					'MMM dd,yyyy HH:mm:ss'
				)
			)
		);
	}
	
	function prepareExecutionInfo( eventType, status, error, functionArguments, account ){
		
		prepareBigquery( REFERENCE );
		
		var scriptName    = typeof SCRIPT_NAME != 'undefined' ? SCRIPT_NAME : 'unknown script';
		var accountName   = account.getName();
		var accountId     = account.getCustomerId().replace( /-/g, '' );
		var createQuota   = AdsApp.getExecutionInfo().getRemainingCreateQuota();
		var getQuota      = AdsApp.getExecutionInfo().getRemainingGetQuota();
		var remainingTime = AdsApp.getExecutionInfo().getRemainingTime();
		var isPreview     = AdsApp.getExecutionInfo().isPreview();
		var isMcc         = isManagerAccount();
		
		// Logger.log( 'prepareExecutionInfo' );
		
		var myLog         = Logger.getLog().replace( /\w+ \w+ \d\d \d\d\:\d\d\:\d\d \w+ \d\d\d\d INFO/g, 'INFO' );
		
		// Logger.log( 'prepareExecutionInfo' );
		
		var time          = getFormattedTime();
		var startTime     = startTimestamp;
		var stackTraceObj = getStackTrace( error );
		
		var functionName = stackTraceObj.functionName;
		var functionStack = stackTraceObj.functionStack;
		var positionStack = stackTraceObj.positionStack;
		var message = stackTraceObj.message;
		var fileName = stackTraceObj.fileName;
		var lineNumber = stackTraceObj.lineNumber; 
		
		var executionType = determineExecutionType(
			eventType,
			isMcc,
			functionArguments,
			stackTraceObj
		);
		
		if( executionType == 'MCC_FINAL' && eventType == 'START' ){
			functionArguments[ 0 ].forEach( function( result ){
				var accountName   = MccApp.accounts().withIds( [ result.getCustomerId() ] ).get().next().getName();
				var accountId     = result.getCustomerId().replace( /-/g, '' );
				var executionType = 'THREAD_RESULT';
				var status = result.getStatus();
				var myLog = null;
				var eventType = 'INFO';
				var message = result.getError() || result.getReturnValue();
				if( message == 'undefined' ){
					// if a thread has no return statement then the string 'undefined' is returned
					message = null;
				}
				
				// Logger.log( 'message: ' + message );
				// Logger.log( 'error: ' + result.getError() );
				// Logger.log( 'returnValue: ' + result.getReturnValue() );
				
				var row = [
					scriptName,
					accountId,
					accountName,
					isMcc,
					eventType,
					status,
					executionType,
					startTime,
					time,
					createQuota,
					getQuota,
					remainingTime,
					isPreview,
					functionName,
					functionStack,
					positionStack,
					myLog,
					message,
					fileName,
					lineNumber,
					id
				];
				executionInfo( row, REFERENCE );
			});
		}
		var row = [
			scriptName,
			accountId,
			accountName,
			isMcc,
			eventType,
			status,
			executionType,
			startTime,
			time,
			createQuota,
			getQuota,
			remainingTime,
			isPreview,
			functionName,
			functionStack,
			positionStack,
			myLog,
			message,
			fileName,
			lineNumber,
			id,
		];
		executionInfo( row, REFERENCE );
	}
	
	function executionInfo( row, reference ){
		//Logger.log( 'row: ' + JSON.stringify( row, null, 2 ) );
		
		// var headers = Object.keys( fields );
		var rows = [ row ];
		loadIntoBigquery( reference, rows );
	}
	
	function init( functionArguments ){
		//Logger.log( 'start call' );
		var inheritedId = null;
		if(	functionArguments.length > 0 ){
			//&& typeof functionArguments[ 0 ] == 'string' // internal Ads Script Error :(
			if( functionArguments[ 0 ].split ){
				var arr = functionArguments[ 0 ].split( '|id=' );
				if( arr.length == 2 ){
					inheritedId = arr[ 1 ];
					functionArguments[ 0 ] = arr[ 0 ];
				}
			}else if( functionArguments[ 0 ].forEach ){
				var results = functionArguments[ 0 ];
				var x = {};
				results.forEach( function( result ){
					var returnValue = result.getReturnValue();
					if( ! returnValue ){
						returnValue = result.getError();
						if( ! returnValue ){
							return;
						}
					}
					//Logger.log( 'returnValue: ' + returnValue );
					var arr = returnValue.split( '|id=' );
					if( arr.length == 2 ){
						x[ arr[ 1 ] ] = 1;
					}
				});
				var ids = Object.keys( x );
				//Logger.log( 'ids: ' + JSON.stringify( ids, null, 2 ) );
				/*if( ids.length > 1 ){
					throw new Error( 'threads have diffferent ids? very strange case' );
				}
				if( ids.length == 0 ){
					throw new Error( 'no threads?' );
				}*/
				if( ids.length == 1 ){
					inheritedId = ids[ 0 ];
				}
				// remove ids from returnValues and errors
				results.forEach( function( result ){
					var oldGetError = result.getError;
					result.getError = function(){
						var error = oldGetError();
						if( ! error ){
							return error;
						}
						var arr = error.split( '|id=' );
						if( arr.length == 2 ){
							error = arr[ 0 ];
						}
						return error;
					};
					
					var oldGetter = result.getReturnValue;
					result.getReturnValue = function(){
						var returnValue = oldGetter();
						if( ! returnValue ){
							return returnValue;
						}
						var arr = returnValue.split( '|id=' );
						if( arr.length == 2 ){
							returnValue = arr[ 0 ];
						}
						return returnValue;
					};
				});
			}else{
				Logger.log( 'Neither a string nor an array' );
			}
		}
		startTimestamp = getFormattedTime();
		id = inheritedId || Utilities.getUuid();
		prepareExecutionInfo( 'START', 'OK', null, functionArguments, AdsApp.currentAccount() );
	}
	init( functionArguments );
	
	function mccSelect( account ){
		prepareExecutionInfo( 'MCC_SELECT', 'OK', null, null, account );
	}
	
	function end( functionArguments ){
		// Logger.log( 'end call' );
		prepareExecutionInfo( 'END', 'OK', null, functionArguments, AdsApp.currentAccount() );
	}
	
	function error( error, functionArguments ){
		error.message = ( error.message || '' ) + '|id=' + id;
		prepareExecutionInfo( 'ERROR', 'ERROR', error, functionArguments, AdsApp.currentAccount() );
	}
	
	function insertId( returnValue ){
		if( typeof returnValue == 'undefined' ){
			return '|id=' + id;
		}
		if( typeof returnValue == 'string' ){
			return returnValue + '|id=' + id;
		}
		return returnValue;
	}
	
	return {
		end      : end,
		error    : error,
		truncate : truncate,
		insertId : insertId,
	};
};

var originalFunctions = {};
[ 'main', 'processAccount', 'finalProcessing' ].forEach( function( functionName ){
	if( typeof this[ functionName ] == 'function' ){
		originalFunctions[ functionName ] = this[ functionName ];
	}
});

var code =
	Object.entries(
		originalFunctions
	).map( function( [ functionName ] ){
		return [
			'function ' + functionName + '(){',
			'	var exInfo = ExecutionInfoTool( arguments );',
			'	try{',
			//'		Logger.log( \'it works!\' ); ',
			//'		exInfo.truncate();',
			'       var result = undefined;',
			'		if( typeof ' + functionName + ' == \'function\' ){',
			'			result = originalFunctions[ \'' + functionName + '\'].apply( null, arguments );',
			'		}',
			'		exInfo.end( arguments );',
			'       return exInfo.insertId( result );',
			'	}catch( error ){',
			'		exInfo.error( error, arguments );',
			'		throw error;',
			'	}',
			'}',
		].join( ' ' );
	})
;
for( var index in code ){
	//Logger.log( 'code: ' + code[ index ] );
	eval( code[ index ] );
}




/*

// BigQuery.Jobs.insert(
var nonce = new Date().getTime(); // circumvent cache
var url = 'https://storage.googleapis.com/adwords-scripts-144712.appspot.com/Logger.js' + '?v=' + nonce;
eval( UrlFetchApp.fetch( url ).getContentText() );

*/

