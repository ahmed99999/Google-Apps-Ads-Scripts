/**

* Creates a Date Stamp if a column is edited.

*/
//------------------------------- SETTINGS -------------------------------------
var SHEETS = [ 'Sheet1' , 'Sheet2'];

//-------------- !!!!!- IMPORTANT - !!!!! : 

//      - Order does matter : make sure that the data you insert in the next tables (arrays/Lists)
//        have the same index as in the SHEETS table. for Example : the data of the first sheet 
//        should always be in the first index of all tables because the first sheetName is in the
//        position of the SHEETS tables, so all the other tables have to follow the same pattern

//-------------- END OF IMPORTANT -------------------


// the first column of the range that needs to be checked for any updates 
var START_CHECK_COLUMN = [ 'A', 'A'];

// the last column of the range that needs to be checked for any updates 
var END_CHECK_COLUMN = [ 'E', 'C'];

// the first row of the range that needs to be checked for any updates 
var START_CHECK_ROW = [ 9, 1];

// the last roe of the range that needs to be checked for any updates 
var END_CHECK_ROW = [ 9, 3];

// the date cell of each sheet inside this spreadSheet
var DATE_CELL_COLUMN =[ 'G', 'K'];

//------------------------------ CONSTANTS ------------------------------------

var culomnToNumber = {
    A : 1, B : 2, C : 3, D : 4, E : 5, F : 6, G : 7, H : 8, I : 9, J :10, K :11,	
    L :12, M :13, N :14, O :15,	P :16, Q :17, R :18, S :19, T :20, U :21, V :22,	
    W :23, X :24, Y :25, Z :26
}

function onEdit( evt ){
    
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    
    var rangeColumn = evt.range.getColumn();
    var rangeRow = evt.range.getRow();
    var settingsIndex = SHEETS.indexOf( sheet.getSheetName() );
  
    if ( 
        settingsIndex >= 0 && 
        (
            START_CHECK_ROW[ settingsIndex ] <= END_CHECK_ROW[ settingsIndex ] &&
            culomnToNumber[ START_CHECK_COLUMN[ settingsIndex ] ] <= culomnToNumber[ END_CHECK_COLUMN[ settingsIndex ] ]
        )
    ) {
        //checks the column to ensure it is on the one we want to cause the date to appear.
        if ( 
            rangeRow >= START_CHECK_ROW[ settingsIndex ] &&
            rangeRow <= END_CHECK_ROW[ settingsIndex ] &&
            rangeColumn >= culomnToNumber[ START_CHECK_COLUMN[ settingsIndex ] ] &&
            rangeColumn <= culomnToNumber[ END_CHECK_COLUMN[ settingsIndex ] ]
        ) {
            sheet.getRange( DATE_CELL_COLUMN[ settingsIndex ] + rangeRow ).setValue(new Date());
        }
    }
}
