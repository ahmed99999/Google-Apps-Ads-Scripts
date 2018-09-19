
// -- SETTINGS --------------



// -- CONSTANTS ------------
// don't change
var LABEL_NAME = 'redundant_keyword_script';
var DEBUG_MODE = true;

// ------------------

function searchForKeywordsToBeLabeled( keywordsOfOneAdgroup ){
    var keywordsToBeLabeled = [];

    keywordsOfOneAdgroup.forEach( function( keywordObj ){
        var resultList = keywordsOfOneAdgroup.filter( function( keywordObjToBeLabeled ){
            
            if( keywordObj.adgroupId == keywordObjToBeLabeled.adgroupId 
                && keywordObj.keywordId == keywordObjToBeLabeled.keywordId ){
                    // same object. skip
                return false;
            }
            var allWordsContained = keywordObj.words.map( function( word ){
                return keywordObjToBeLabeled.words.indexOf( word ) >= 0;
            }).reduce( function( a, b){
                return a && b;
            }, true );
    
            return allWordsContained;
        });
        keywordsToBeLabeled = keywordsToBeLabeled.concat( resultList );
    });
    return keywordsToBeLabeled;
}

function getReportRows(){
    var query = 'SELECT Id, CampaignId, Criteria, KeywordMatchType, AdGroupId '
        + 'FROM KEYWORDS_PERFORMANCE_REPORT '
        + 'WHERE KeywordMatchType = "BROAD" '
        + 'AND IsNegative = "FALSE" ' 
        + 'AND CampaignStatus = "ENABLED" ' 
        + 'AND AdGroupStatus = "ENABLED" ' 
        + 'AND Status = "ENABLED" ' 
    ;
    var iterator = AdWordsApp.report( query ).rows();
    return iteratorToList( iterator );
}

function iteratorToList( iter ){
    var result = [];
    while( iter.hasNext() ){
        result.push( iter.next() );
    }
    return result;
}

function prepareKeywords( mapOfKeywordLists ) {
    var result = {};

    for( adgroupId in mapOfKeywordLists ){
        result[ adgroupId ] = mapOfKeywordLists[ adgroupId ].map( function( keyword ){
            return {
                words :  keyword.Criteria.replace( /\+/g, '' ).split( ' ' ),
                keywordId : keyword.Id,
                adgroupId : keyword.AdGroupId,
                text : keyword.Criteria,
            };
        });
    }

    return result;
}

function main() {
    Logger.log( 'start' );

    Logger.log( 'create label' + LABEL_NAME );

    AdWordsApp.createLabel( LABEL_NAME );

    Logger.log( 'retrieve report and prepare keywords' );

    var mapOfKeywordLists = {};
    getReportRows().forEach( function( row ){
        var adgroupId =  row[ 'AdGroupId' ];
        mapOfKeywordLists[ adgroupId ] = mapOfKeywordLists[ adgroupId ] || [];
        mapOfKeywordLists[ adgroupId ].push( row );
    });
    var mapOfPreparedKeywords = prepareKeywords( mapOfKeywordLists );

    Logger.log( 'search for keywords to be labeled' );

    keywordsToBeLabeled = [];    
    for( adgroupId in mapOfPreparedKeywords ){
        keywordsToBeLabeled = keywordsToBeLabeled.concat( searchForKeywordsToBeLabeled( mapOfPreparedKeywords[ adgroupId ] ) );
    }

    Logger.log( 'Get a map of AdWords Keyword-Objects needed for labeling' );

    var keywordMap = {};
    iteratorToList( AdWordsApp.keywords().get() ).forEach( function( keyword ){
        var key = keyword.getAdGroup().getId() + '_' + keyword.getId();
        keywordMap[ key ] = keyword;
    });

    
    Logger.log( 'label keywords' );
    keywordsToBeLabeled.forEach( function( keyword ){
        var key = keyword.adgroupId + '_' + keyword.keywordId;
        var keyword2 = keywordMap[ key ];
        Logger.log(
                'Campaign: ' + keyword2.getCampaign().getName() 
                + ', Adgroup: '  + keyword2.getAdGroup().getName() 
                + ', Keyword: ' + keyword.text
        );
        if( ! DEBUG_MODE ){
            keyword2.applyLabel( LABEL_NAME );
        }
    });


}




















