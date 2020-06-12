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
				res[ key ] = value.split(',').map( _.trim() );
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
		var sheet = initSheet( sheetUrl, sheetName );
		return loadSheet2( sheet );
	}
	
	function accountPredicate( cellValue ){
		return ( typeof cellValue == 'string' && cellValue.match( /^\d\d\d-\d\d\d-\d\d\d\d$/ ) ) 
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
