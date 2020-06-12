
//------------------------------ CONSTANTS ------------------------------------

var culomnToNumber = {
    A : 1, B : 2, C : 3, D : 4, E : 5, F : 6, G : 7, H : 8, I : 9, J :10, K :11,	
    L :12, M :13, N :14, O :15,	P :16, Q :17, R :18, S :19, T :20, U :21, V :22,	
    W :23, X :24, Y :25, Z :26
};

//------------------------------- SETTINGS -------------------------------------
function makeChanges( row, column, sheet ){
    var SHEETS = {
        accountids_ppc: function( row, column, sheet ){
            if ( column <= 13 ) printChanges( row, 23 , sheet );
            if ( column == 14 ) printChanges( row, 24, sheet );
            if ( column == 16 ) printChanges( row, 25, sheet );
            if (
                column >= 17 &&
                column <= 22
            ) printChanges( row, 26, sheet );
        },
        accountids_psa: function( row, column, sheet ){
            if ( column <= 10 ) printChanges( row, 16, sheet );
            if ( column == 11 ) printChanges( row, 17, sheet );
            if ( column == 13 ) printChanges( row, 18, sheet );
            if (
                column >= 14 &&
                column <= 15
            ) printChanges( row, 19, sheet );        
        }
    };
    var sheetName = sheet.getSheetName().toLowerCase().replace(/ /g, '' );
    SHEETS[ sheetName ]( row, column, sheet );
}

//-------------- !!!!!- IMPORTANT - !!!!! : 

//      - Order does matter : make sure that the data you insert in the next tables (arrays/Lists)
//        have the same index as in the SHEETS table. for Example : the data of the first sheet 
//        should always be in the first index of all tables because the first sheetName is in the
//        position of the SHEETS tables, so all the other tables have to follow the same pattern

//-------------- END OF IMPORTANT -------------------

function printChanges ( row, column, sheet ){
    sheet.getRange( row, column ).setValue(new Date());
}

function onEdit( evt ){
    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getActiveSheet();
    var rangeColumn = evt.range.getColumn();
    var rangeRow = evt.range.getRow();
    makeChanges( rangeRow, rangeColumn, sheet );
}
