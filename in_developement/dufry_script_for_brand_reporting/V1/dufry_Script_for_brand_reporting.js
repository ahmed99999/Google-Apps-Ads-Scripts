
var SS = SpreadsheetApp.getActive();
var REPORTING_SHEET_NAME = "Dufry_Estee-Lauder_All-locations";
var WEEK_SHEETS_BASE_NAME = "Dufry - cw";
var REPORTING_SHEET = SS.getSheetByName( REPORTING_SHEET_NAME );

function getWeekSheets( baseName ){
    return SS.getSheets()
    .filter( function( sheet ){ 
        return ( sheet.getName().indexOf( baseName ) >= 0 );
    });
}

function itemNotEmpty( item ){
    return (
        typeof item !== 'undefined' &&
        item !== '' &&
        item !== "''''" 
    );
}

function rowNotEmpty( row ){
    return row.reduce( function( value, item ){ return itemNotEmpty( item ) && value }, true);
}

function getSheetsData( sheet ){
    var lastRow = sheet.getLastRow();
    var lastColumn = sheet.getLastColumn();
    var range = sheet.getRange( 16, 1, lastRow, lastColumn );
    return range.getValues().filter( rowNotEmpty );
}

function Main(){
    var weekSheets = getWeekSheets( WEEK_SHEETS_BASE_NAME );
    var data = [];
    weekSheets.forEach( function( sheet ){
        data = data.concat( getSheetsData( sheet ) );
    });

    REPORTING_SHEET.getRange( 2, 1, REPORTING_SHEET.getMaxRows(), REPORTING_SHEET.getMaxColumns() ).clear();
    REPORTING_SHEET.getRange( 2, 1, data.length, 11 ).setValues( data );
}
