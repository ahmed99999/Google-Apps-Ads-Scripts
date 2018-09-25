
// -- SETTINGS --------------

var REDUNDANT_KEYWORD_LABEL_NAME = 'pa - redundant_keyword_script';
var SIMILAR_KEYWIRD_LABEL_NAME = 'pa - similar_keyword_script';
var DEBUG_MODE = false;

// -- CONSTANTS ------------
var SEPARATOR = '_';

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

function searchForKeywordsToBeLabeledAsPluralSingle( keywordsOfOneAdgroup ){
  var keywordsToBeLabeledAsPluralSingle = [];
   
  for(var i = 0 ; i< keywordsOfOneAdgroup.length ;i++){
      for(var j = 0 ; j < i ;j++){

          var groupI = keywordsOfOneAdgroup[i];
          var groupJ = keywordsOfOneAdgroup[j];
          
          var statement =   i != j              
              && keywordsToBeLabeledAsPluralSingle.indexOf(groupJ) < 0 
              && keywordsToBeLabeledAsPluralSingle.indexOf(groupI) < 0 
              && groupI.words.length !=  groupJ.words.length ;

          if (! statement) continue ;
          if ( levenshtein(groupI.words , groupJ.words ) != 1 ) continue ;
        
          if (groupI.QualityScore < groupJ.QualityScore ){
              keywordsToBeLabeledAsPluralSingle.push(groupI);
          } else if (groupI.QualityScore > groupJ.QualityScore){
              keywordsToBeLabeledAsPluralSingle.push(groupJ);
          }else {
              if (groupI.Clicks < groupJ.Clicks){
                  keywordsToBeLabeledAsPluralSingle.push(groupI);
              } else if(groupI.Clicks > groupJ.Clicks){
                      keywordsToBeLabeledAsPluralSingle.push(groupJ);              
              }else{
                  if (groupI.Impressions < groupJ.Impressions){
                  keywordsToBeLabeledAsPluralSingle.push(groupI);
                  }else if(groupI.Impressions > groupJ.Impressions){
                    keywordsToBeLabeledAsPluralSingle.push(groupJ);
                  }else{
                    if (groupI.words.length > groupJ.words.length){
                      keywordsToBeLabeledAsPluralSingle.push(groupI);
                    }else {
                      keywordsToBeLabeledAsPluralSingle.push(groupJ);                        
                    }
                  }
              }                    
          }                      
      }
  }
  return keywordsToBeLabeledAsPluralSingle;
}


function getReportRows(){
    var query = 'SELECT Id, CampaignId, Criteria, KeywordMatchType, AdGroupId, QualityScore, Clicks, Impressions '
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

function levenshtein(a, b) {
  if(a.length === 0) return b.length;
  if(b.length === 0) return a.length;

  var matrix = [];

  // increment along the first column of each row
  var i;
  for(i = 0; i <= b.length; i++){
    matrix[i] = [i];
  }

  // increment each column in the first row
  var j;
  for(j = 0; j <= a.length; j++){
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for(i = 1; i <= b.length; i++){
    for(j = 1; j <= a.length; j++){
      if(b.charAt(i-1) == a.charAt(j-1)){
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                                Math.min(matrix[i][j-1] + 1, // insertion
                                         matrix[i-1][j] + 1)); // deletion
      }
    }
  }

  return matrix[b.length][a.length];
}

function prepareKeywords( mapOfKeywordLists ) {
    var result = {};

    for( adgroupId in mapOfKeywordLists ){
        result[ adgroupId ] = mapOfKeywordLists[ adgroupId ].map( function( keyword ){
            return {
                words :  keyword.Criteria.replace( /\+/g, '' ).toLowerCase().split( ' ' ),
                keywordId : keyword.Id,
                adgroupId : keyword.AdGroupId,
                text : keyword.Criteria
            };
        });
    }

    return result;
}

function prepareKeywordsPluralSinglar( mapOfKeywordLists ) {
    var result = {};

    for( adgroupId in mapOfKeywordLists ){
        result[ adgroupId ] = mapOfKeywordLists[ adgroupId ].map( function( keyword ){
            return {
                words :  keyword.Criteria.replace( /\+/g, '' ).toLowerCase(),
                keywordId : keyword.Id,
                adgroupId : keyword.AdGroupId,
                text : keyword.Criteria,
              	QualityScore : keyword.QualityScore == '--' ? 0 : keyword.QualityScore,
              	Clicks : keyword.Clicks,
              	Impressions : keyword.Impressions
            };
        });
    }

    return result;
}

function main() {
    Logger.log( 'start' );
	
	if( ! DEBUG_MODE ){
		Logger.log( 'create label' + REDUNDANT_KEYWORD_LABEL_NAME + ' and ' + SIMILAR_KEYWIRD_LABEL_NAME);
	}
    
    if(! AdWordsApp.labels().withCondition('Name = "' + REDUNDANT_KEYWORD_LABEL_NAME +'"').get().hasNext() ){
        AdWordsApp.createLabel( REDUNDANT_KEYWORD_LABEL_NAME );
    } 	
    
    Logger.log( 'retrieve report and prepare keywords' );

    var mapOfKeywordLists = {};
    getReportRows().forEach( function( row ){
        var adgroupId =  row[ 'AdGroupId' ];
        mapOfKeywordLists[ adgroupId ] = mapOfKeywordLists[ adgroupId ] || [];
        mapOfKeywordLists[ adgroupId ].push( row );
    });
  
    var mapOfPreparedKeywords = prepareKeywords( mapOfKeywordLists );
  
  	keywordsToBeLabeled = [];   
    for( adgroupId in mapOfPreparedKeywords ){
        keywordsToBeLabeled = keywordsToBeLabeled.concat( searchForKeywordsToBeLabeled( mapOfPreparedKeywords[ adgroupId ] ) );
    } 	 	

    Logger.log( 'Get a map of AdWords Keyword-Objects needed for labeling' );

  var keywordMap = {};
    iteratorToList( AdWordsApp.keywords().get() ).forEach( function( keyword ){
        var key = keyword.getAdGroup().getId() + SEPARATOR + keyword.getId();
        keywordMap[ key ] = keyword;
    });
    
	var warningIssued = false;
    Logger.log( 'label keywords' );
  
  var sel = AdWordsApp.labels().withCondition('Name = "' + REDUNDANT_KEYWORD_LABEL_NAME +'"').get();  
  
  if( ! sel.hasNext() ){
    throw new Error( 'something wrong happend : try again in an Hour or so.' );
  }
  	var Label = sel.next();
        
    keywordsToBeLabeled.forEach( function( keyword ){
        var key = keyword.adgroupId + SEPARATOR + keyword.keywordId;
        var keyword2 = keywordMap[ key ];
		if( keyword2 ){
			Logger.log(
					  'Campaign: '  + keyword2.getCampaign().getName()
					+ ', Adgroup: ' + keyword2.getAdGroup().getName()
					+ ', Keyword: ' + keyword.text
			);
          
			if( ! DEBUG_MODE 
               //&& ! typeof (
               		//keyword2.labelIds().find(function (id) {
                //	return id == Label.getId(); 
               // 	})
            //	) == 'undefined'              
              )
            {
				keyword2.applyLabel( REDUNDANT_KEYWORD_LABEL_NAME );
			}	
		}else{
			if( ! warningIssued ){
				warningIssued = true;
				Logger.log( 'if iterator exceeded limit of 50000 then keywords might be missing. ignore them' );
			}
		}
    });
  
  Logger.log('================================================================== Singular Plural==================================================');
  
  if(! AdWordsApp.labels().withCondition('Name = "' + SIMILAR_KEYWIRD_LABEL_NAME +'"').get().hasNext() ){
        AdWordsApp.createLabel( SIMILAR_KEYWIRD_LABEL_NAME );
    }
  
  var mapOfKeywordListsPlural = {};

  getReportRows().forEach( function( row ){
    var campaignId =  row[ 'CampaignId' ];
    mapOfKeywordListsPlural[ campaignId ] = mapOfKeywordListsPlural[ campaignId ] || [];
    mapOfKeywordListsPlural[ campaignId ].push( row );
  });
  
  var mapOfPreparedKeywordsPluralSingular = prepareKeywordsPluralSinglar( mapOfKeywordListsPlural );
  	
  keywordsToBeLabeledAsPluralSingle = [];
  for( campaignId in mapOfPreparedKeywordsPluralSingular ){
    keywordsToBeLabeledAsPluralSingle = keywordsToBeLabeledAsPluralSingle.concat( searchForKeywordsToBeLabeledAsPluralSingle( mapOfPreparedKeywordsPluralSingular[ campaignId ] ) );
  }
  
  var warningIssued1 = false;
   Logger.log( 'label keywords PluralSingle' );
  
  sel = AdWordsApp.labels().withCondition('Name = "' + SIMILAR_KEYWIRD_LABEL_NAME +'"').get();  

  if( ! sel.hasNext() ){
    throw new Error( 'something wrong happend : try again in an Hour or so.' );
  }
  Label = sel.next();

  keywordsToBeLabeledAsPluralSingle.forEach( function( keyword ){
    var key = keyword.adgroupId + SEPARATOR + keyword.keywordId;
    var keyword2 = keywordMap[ key ];
    if( keyword2 ){
      Logger.log(
        'Campaign: '  + keyword2.getCampaign().getName()
        + ', Adgroup: ' + keyword2.getAdGroup().getName()
        + ', Keyword: ' + keyword.text
        + ', QualityScore: ' + keyword.QualityScore
        + ', Clicks: ' + keyword.Clicks
        + ', Impressions: ' + keyword.Impressions
      );

      if( ! DEBUG_MODE
         //&& ! typeof (
         //		keyword2.LabelIds.find(function (id) {
         // 	return id == Label.getId(); 
         // 	})
         //) == 'undefined'              
        )
      {
        keyword2.applyLabel( SIMILAR_KEYWIRD_LABEL_NAME );
      }	
    }else{
      if( ! warningIssued1 ){
        warningIssued1 = true;
        Logger.log( 'if iterator exceeded limit of 50000 then keywords might be missing. ignore them' );
      }
    }
  });

}










