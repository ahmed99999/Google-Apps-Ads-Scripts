
var TARGET_FILES_URLS = {
    'AIR - Brand - Nicht-Städte': 'https://docs.google.com/spreadsheets/d/1k3R0PAmmq_axW8rUtDQH5QHGYf2X6cFFp6Q5avQVAXQ/edit#gid=0',
    'AIR - Brand - Städte': 'https://docs.google.com/spreadsheets/d/1ggfAyHbnxbILCCT1JwtHm2CPOcDPrIHGGLd6HFP073g/edit#gid=0',
    'AIR - Generic - Nicht-Städte': 'https://docs.google.com/spreadsheets/d/1WahwlTqsXXZqUIFBPCx51fRtTyIc2hrCYgRZpA6_yq4/edit#gid=0',
    'AIR - Generic - Städte': 'https://docs.google.com/spreadsheets/d/1jyTQNHo6FUYclviIO4yFdhnkfxR6f2Jlq-78mhvMH9o/edit#gid=0',
    'Berlin': 'https://docs.google.com/spreadsheets/d/1_gP9-3DKviqzSGY2MzDAI-NYX3kVQAbf1rXLKVAtCO0/edit#gid=0'
};

var LABELS = [
    'AIR - Brand - Nicht-Städte',
	'AIR - Brand - Städte',
	'AIR - Generic - Nicht-Städte',
	'AIR - Generic - Städte',
    'Berlin'
];

function toList( iterator ){
	var list = [];
	while( iterator.hasNext() ){
		list.push( iterator.next() );
	}
	return list;
}

function propertyMap ( prop ){
    return function( item ){ return property( item, prop ); };
}

function property( item, prop ){
    if ( typeof prop == 'undefined' ) return item;
    if ( typeof item[ prop ] == 'function' ) return item[ prop ]();
    return item[ prop ];
}

function group( rows ){
    return {
        by: function( attributes, prop ){
            var list = {};
            if ( ! Array.isArray( attributes ) ) attributes = [ attributes ];
            attributes.forEach( function( attribute ){
                rows.forEach( function( row ){
                    list[ attribute ] = list[ attribute ] || [];
                    if ( property( row, prop ).indexOf( attribute ) >= 0 ) list[ attribute ].push( row );
                });
            });
            return list;
        }
    };
}

function isAuctionInsightsFile ( file ){
    var fileName = file.getName().toLowerCase();
    var condition = LABELS.reduce( function( conditionValue, label ){
        return conditionValue || ( fileName.indexOf( label.toLowerCase() ) >= 0 );
    }, false );
    return ( condition && ( file.getMimeType().indexOf('spreadsheet') >= 0 ) );
}

function processSheetName( sheet ){
    var oldSeetName = property( sheet, 'getName' ).toLowerCase();
    if ( oldSeetName.indexOf('performance') >= 0 ) return 'Performance Data';
    if ( oldSeetName.indexOf('device') >= 0 ) return 'Auction Insights By Device';
    return 'Auction Insights';
}

function processAuctionInsightReport( auctionFiles ){
    return function( label ){
        var currentFiles = auctionFiles[ label ];
        var currentMainFile = SpreadsheetApp.openByUrl( TARGET_FILES_URLS[ label ] );
        var currentMainFileOldReports = currentMainFile.getSheets().filter( doNotContaionProperty('settings', 'getName') );
        currentMainFileOldReports.forEach( function( currentMainFileOldReport){
            currentMainFile.deleteSheet( currentMainFileOldReport );
        });
        currentFiles.forEach( function( currentFile ){
            var currentSheetOfFile = SpreadsheetApp.open( currentFile ).getSheets()[0];
            var newSheetName = processSheetName( currentSheetOfFile );
            var newCopiedSheet = currentSheetOfFile.copyTo( currentMainFile );
            newCopiedSheet.setName( newSheetName );
            DriveApp.removeFile( currentFile );
        });
    };
}

function doNotContaionProperty( attribute, prop ){
    return function( item ){
        return ( property( item, prop ).toLowerCase().indexOf( attribute ) < 0 );
    };
}

function wasCreatedToday ( file ){
    var today = new Date();
    var fileCreatedDate = file.getDateCreated();
    return ( 
        today.getDate() == fileCreatedDate.getDate() &&
        today.getMonth() == fileCreatedDate.getMonth() &&
        today.getYear() == fileCreatedDate.getYear()
    );
}

function testInputLabelsData(){
    var mainLabelSheets = Object.keys( TARGET_FILES_URLS );
    mainLabelSheets.forEach( function( mainLabelSheet ){
        if ( LABELS.indexOf( mainLabelSheet ) < 0 )
            throw new Error( 'check your labels, TARGET_FILES_URLS and LABELS sould be the same labels' );
    });
    return true;
}

function Main(){
    testInputLabelsData();

    var files = toList( DriveApp.getFiles() )
    .filter( isAuctionInsightsFile )
    .filter( doNotContaionProperty('main', 'getName') )
    .filter( wasCreatedToday );

    var newAuctionFiles = group( files ).by( LABELS, 'getName' );
    Logger.log( JSON.stringify( newAuctionFiles, null, 2 ) );
    LABELS.forEach( processAuctionInsightReport( newAuctionFiles ) );
}
