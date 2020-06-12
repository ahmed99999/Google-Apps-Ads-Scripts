
function saveData( sheetUrl, sheetName, data, maxRows ){
	var values = [];
	for( key in data ){
		//Logger.log( '' + key + ': ' + data[key]	);
		values.push( [ key ].concat( data[ key ] ) );
	}
	// sort in ascending order by date
	values.sort( function( a, b ){
		return stringToDate( a[ 0 ] ).getTime() - stringToDate( b[ 0 ] ).getTime();
	});
	
	if( values.length > maxRows ){
		// We can't store indefinitely many data rows.
		// Remove old rows if there are too many rows.
		values.splice( 0, values.length - maxRows );
	}
	
	var sheet = initSheet( sheetUrl, sheetName );
	sheet.clear();
	
	var countColumns = values[0].length;
	if( sheet.getMaxColumns() < countColumns ){
		sheet.insertColumns( sheet.getMaxColumns(), countColumns - sheet.getMaxColumns() );
	}
	
	var countRows = values.length;
	if( sheet.getMaxRows() < countRows ){
		sheet.insertRows( sheet.getMaxRows(), countRows - sheet.getMaxRows() );
	}
	// Logger.log( 'dimensions. width: ' + values[0].length + ' height: ' + values.length );

	sheet.getRange( 1, 1, values.length, values[0].length ).setValues( values );
}


function saveConvLag( account, now, daysToRetrieve, maxRows, sheetUrl ){
	var metric = 'Conversions';
	// order is ascending by date
	var rows = retrieveReport( [ 'Date' ].concat( [ metric ] ), now, daysToRetrieve );
	
	// Sort in DESCENDING order by date and time
	rows.sort( function( a, b ){
		return objToDate( b ).getTime() - objToDate( a ).getTime();
	});
	
	// seems like array 'rows' can be empty
	if( rows.length ){
		// square parenthesis prevent googleSheets from interpreting our key as date ( which would screw retrieval later )
		var key = '[' + dateToString( now, '-' ) + ']';
		
		var conversions = rows.map( property( metric ) );
	
		// Logger.log( key + ': ' + conversions );
		var sheetName = account.getName() + ' [ ' + account.getCustomerId() + ']';
		
		var data = loadData( sheetUrl, sheetName );
		
		data[ key ] = conversions;
		
		saveData( sheetUrl, sheetName, data, maxRows );

	}
}