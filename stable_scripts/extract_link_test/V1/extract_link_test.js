var config = {
	"DESCRIPTION" : "" ,
	"INSTRUCTIONS": "",
	"VERSION" : 1,
	"VERSION_TAG" : "stable",
	"settings" : {
	}
};


var config = JSON.parse( dataJSON.settings );
for( key in config ){
	this[ key ] = config[ key ];
}

function main() {

    // ----------------------------- Settings ------------------------------- //

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheets()[0];
    var checkingURLSheetsValues = sheet.getRange("P2:P").getValues();
    var firstValue = getBeginingOfChecking( checkingURLSheetsValues ) + 2;
    var BLOCKLIMITATION = 10;
    var lastRow = sheet.getMaxRows();
    var lastValue = ( lastRow <= ( firstValue + BLOCKLIMITATION ) ) ? "" : ( firstValue + BLOCKLIMITATION ) ;
    var sourceURLs = sheet.getRange("D"+firstValue+":D"+lastValue).getValues();
    var targetURLs = sheet.getRange("E"+firstValue+":E"+lastValue).getValues();    
    var linkTextColumn = 'M';    
    results = [];

    // ---------------------------------------------------------------------- //

    Logger.log('la taille : ' + sourceURLs.length);

    var indexes = {
        targetUrlIndex              : 0 ,
        linkTextSheetIndex          : firstValue ,
        checkingURLsInSheetIndex    : firstValue
    }
    
    sourceURLs.forEach(function(sourceURL){

        // if (checkingURLSheetsValues[indexes.checkingURLsInSheetIndex][0] == 'done'){
        //     incrementIndexes( indexes ) ;
        //     return;
        // }
    
        var regExp = preparingRegex ( targetURLs[indexes.targetUrlIndex][0] );  
        var HttpURL = httpToHttpsOrOpposite( targetURLs[indexes.targetUrlIndex][0] ) ;
        var regExp2 = preparingRegex( HttpURL );

        try {
            var source = UrlFetchApp.fetch( sourceURL[0] , { muteHttpExceptions : true });
            if( source.getResponseCode() != 200 ){
                sheet.getRange("Q" + indexes.linkTextSheetIndex).setValue(source.getResponseCode()+" response");
                sheet.getRange(linkTextColumn + indexes.linkTextSheetIndex).setValue("");
                sheet.getRange("P"+indexes.checkingURLsInSheetIndex).setValue('done');
                incrementIndexes( indexes ) ;
                return;
            }  
        } catch (error) {
            sheet.getRange("Q" + indexes.linkTextSheetIndex).setValue("Error response");
            sheet.getRange(linkTextColumn + indexes.linkTextSheetIndex).setValue("");
            sheet.getRange("P"+indexes.checkingURLsInSheetIndex).setValue('done');
            incrementIndexes( indexes ) ;
            return;
        }          

        var reponce = source.getContentText();
        var aElemeent = reponce.split(regExp)[1];
        if ( aElemeent ) {
            var insdeElement = getTextContent( aElemeent ) ;       
            sheet.getRange(linkTextColumn + indexes.linkTextSheetIndex).setValue(insdeElement);            
        }  else {
            var aElemeent2 = reponce.split(regExp2)[1];
            if  ( aElemeent2 ) {
                var insdeElement2 = getTextContent( aElemeent2 ) ;
                sheet.getRange(linkTextColumn + indexes.linkTextSheetIndex).setValue(insdeElement2);
            } else {
                sheet.getRange(linkTextColumn + indexes.linkTextSheetIndex).setValue("");
                sheet.getRange("Q" + indexes.linkTextSheetIndex).setValue("Target URL not found inside source URL");
            }
        }
        sheet.getRange("P"+indexes.checkingURLsInSheetIndex).setValue('done');
        incrementIndexes( indexes ) ;
    });
}

function getTextContent ( aElemeent ) {
    var Ele = aElemeent.split('</a>')[0];
    var regExp1 = /<[^>]*>/;
    return ( Ele.indexOf('<img') >= 0 ) ? 'Image' : Ele.split(regExp1).join(" ") ;     
}

function incrementIndexes( indexes ) {
    Object.keys(indexes).forEach( function ( key ) {
        indexes[key] ++ ;
    });
}

function preparingRegex ( URL ) {
    var regx1 = '<a\\s[^>]*href="\s*';
    var targetURL =  URL.replace(/\//g , "\\/")
                        .replace(/\./g , "\\.")
                        .replace(/\?/g , "\\?")
                        .replace(/\|/g , "\\|")
                        .replace(/\^/g , "\\^")
                        .replace(/\$/g , "\\$")
                        .replace(/\*/g , "\\*")
                        .replace(/\+/g , "\\+")
                        .replace(/\(/g , "\\(")
                        .replace(/\)/g , "\\)")
                        .replace(/\[/g , "\\[")
                        .replace(/\]/g , "\\]")
                        .replace(/\</g , "\\<")
                        .replace(/\>/g , "\\>")
                        .replace(/\{/g , "\\{")
                        .replace(/\}/g , "\\}");
    var regx2 = '[^"]*/*"[^>]*>';
    return new RegExp ( regx1 + targetURL + regx2 );
}

function httpToHttpsOrOpposite( URL ) {
    return ( URL.indexOf('https') >= 0 ) ? URL.replace('https' , 'http') : URL.replace('http' , 'https') ;
}

function testTargetPageExistanseInSourcePage () {

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = ss.getSheets()[0];
    var sourceURLs = sheet.getRange("D2:D").getValues();
    var targetURLs = sheet.getRange("E2:E").getValues();
    var targetUrlIndex = 0 ;
    var linkTextSheetIndex = 2 ;

    sourceURLs.forEach(function (sourceURL) {

        try {
            var source = UrlFetchApp.fetch( sourceURL[0] , { muteHttpExceptions : true });            
        } catch (error) {
            sheet.getRange("o" + linkTextSheetIndex).setValue("404 response");
            linkTextSheetIndex++;
            targetUrlIndex++;
            Logger.log(error);
            return;
        }

        var responceCode = source.getResponseCode();
        if( responceCode != 200 ) {
            sheet.getRange("o" + linkTextSheetIndex).setValue(responceCode+" response");
            linkTextSheetIndex++;
            targetUrlIndex++;
            return;
        }
        var response = source.getContentText();
        var existOrNot = ((response.indexOf( targetURLs[targetUrlIndex][0] ) >= 0) || (response.indexOf( httpToHttpsOrOpposite (targetURLs[targetUrlIndex][0]) ) >= 0));
        var value = (existOrNot) ? 'yes' : 'no' ;
        sheet.getRange("o" + linkTextSheetIndex).setValue(value);
        linkTextSheetIndex++;
        targetUrlIndex++;
    });
}

function getBeginingOfChecking( checkingURLSheetsValues ) {
    var index = 0;
    var checkingURLLength = checkingURLSheetsValues.length;
    while (index < checkingURLLength && checkingURLSheetsValues[index][0] != '' ) {
        index++;    
    }    
    try {
        if ( index == checkingURLLength ) {
            throw "Sheet All checked";
        }
        return index ;
    } catch (error) {
        Logger.log(error);
    }
}

function noFollowExist( URL ) {
    return (URL.indexOf('rel="nofollow "') >=0 ) ;
}
