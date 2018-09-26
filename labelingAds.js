
var MAX_ALLOWED_DURATION_IN_SECONDS = 15 * 60; // 15 minutes
var EXPECTED_DURATION_PER_CAMPAIGN_IN_SECONDS = 5;
// POSSIBLE_DIVISORS must be divisors of 24, must contain 24 and be in ascending order
var POSSIBLE_DIVISORS = [ 1, 2, 3, 4, 6, 8, 12, 24 ];

var _ = (function(){
	// Polyfills
	Object.values = Object.values || ( function( obj ){
		return Object.keys( obj ).map( function( key ){
			return obj[key]
		})
	});
	String.trim = function( value ){
		return value.trim();
	};
	function properties(){
		var args = Array.prototype.slice.call( arguments );
		var f = function( item ){
			return args.map( function( arg ){
				apply( item, arg );
			});
		};
		f.name1 = args.join( '_' ); // this improves groupBy() output
		return f;
	}
	function apply( item, arg ){
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
		throw new Error( 'apply() can\'t determine what to do with ' + item + ' and ' + arg );
	}
	function property(){
		var args = Array.prototype.slice.call( arguments );
		var f = function( item ){
			// do NOT use reduce here, because apply will interpret the third argument :(
			var res = item;
			args.forEach( function( arg ){ res = apply( res, arg ) } );
			return res;
		};
		f.name1 = args.join( '_' ); // this improves groupBy() output
		f.equals = function( value ){
			return function( item ){
				return f( item ) == value;
			}
		};
		f.eq = f.equals;
		f.lt = function( value ){
			return function( item ){
				return f( item ) < value;
			}
		};
		f.le = function( value ){
			return function( item ){
				return f( item ) <= value;
			}
		};
		f.gt = function( value ){
			return function( item ){
				return f( item ) > value;
			}
		};
		f.endsWith = function( value ){
			return function( item ){
				var x = f( item );
				return x.indexOf( value ) == x.length - value.length;
			}
		};
		f.isEmpty = function(){
			return function( item ){
				var x = f( item );
				return x == '';
			}
		};
		f.isNotEmpty = function(){
			return function( item ){
				var x = f( item );
				return x != '';
			}
		};
		f.isDefined = function(){
			return function( item ){
				var x = f( item );
				return typeof x != 'undefined';
			}
		}
		return f;
	}
	function clone( obj ){
		if ( obj === null || typeof( obj ) !== 'object' || 'isActiveClone' in obj ){
			return obj;
		}

		var temp;
		if ( obj instanceof Date ){
			temp = new obj.constructor(); //or new Date( obj );
		} else {
			temp = obj.constructor();
		}

		for ( var key in obj ){
			if ( Object.prototype.hasOwnProperty.call( obj, key ) ){
				obj[ 'isActiveClone' ] = null;
				temp[ key ] = clone( obj[ key ] );
				delete obj[ 'isActiveClone' ];
			}
		}
		return temp;
	}
	function partition( arr ){
		var clone1 = this.clone;
		return {
			clone : clone1,
			by: function( keyName ){
				var res = {};

				for ( var i = 0; i < arr.length; i++ ){
					var obj = this.clone( arr[ i ] );
					var key;
					if ( typeof keyName == 'function' ){
						key = keyName( obj );
					} else {
						key = obj[ keyName ];
					}

					// init
					res[ key ] = ( res[ key ] || [] );
					if( typeof keyName != 'function' ){
						delete obj[ keyName ];
					}
					res[ key ].push( obj );
				}
				return res;
			}
		};
	}
	function iteratorToList( iter ){
		var list = [];
		while( iter.hasNext() ){
			list.push( iter.next() );
		}
		return list;
	}
	function not( predicate ){
		return function( item ){
			return ! predicate( item );
		}
	}
	function snakeToCamel( str ){
		var res = str
			.replace( /_+(.)/g, function( x, chr ){
			return chr.toUpperCase();
		});
		return res.charAt( 0 ).toUpperCase() + res.slice( 1 );
	}
	function camelToSnake( str ){
		return str.replace( /\.?([A-Z])/g, function( x, y ){ return '_' + y.toLowerCase() } ).replace( /^_/, '' );
	}
	function hash( value ){
		value = value + '';
		var hash = 0;
		if ( value.length == 0 ) return hash;
		for( i = 0; i < value.length; i++ ){
			var char1 = value.charCodeAt( i );
			hash = ( ( hash << 5 ) - hash ) + char1;
			hash = hash & hash; // Convert to 32bit integer
		}
		return Math.abs( hash );
	}
	function equals( value ){
		return function( x ){ return x == value };
	}
	function modulo( value ){
		return function( x ){ return x % value };
	}
	function listToMap( list, keySelector, valueSelector ){
		var map = {};
		
		if( ! valueSelector ){
			valueSelector = function( x ){ return x };
		}
		
		list.forEach( function( item, index ){
			map[ keySelector( item, index ) ] = valueSelector( item, index );
		});
		return map;
	}
	return {
		toString		: function(){ return 'my tools class'; },
		property 		: property,
		properties		: properties,
		partition		: partition,
		clone			: clone,
		iteratorToList	: iteratorToList,
		not				: not,
		snakeToCamel	: snakeToCamel,
		camelToSnake	: camelToSnake,
		hash			: hash,
		equals			: equals,
		modulo			: modulo,
		listToMap		: listToMap,
	};
})();

function computeNumParts( countAllCampaigns ){
	return POSSIBLE_DIVISORS.filter( function( divisor ){
		if( divisor == 24 ){
			return true; // 24 is always allowed
		}
		var res = ( countAllCampaigns <= MAX_ALLOWED_DURATION_IN_SECONDS / EXPECTED_DURATION_PER_CAMPAIGN_IN_SECONDS * divisor );
		return res;
	})[ 0 ];
}

function computeCurrentCampaignIds(){
    var query = 'SELECT CampaignId FROM CAMPAIGN_PERFORMANCE_REPORT WHERE CampaignStatus IN [ "ENABLED", "PAUSED" ]';
	
	var allCampaignIds = _.iteratorToList( AdWordsApp.report( query ).rows() )
		.map( _.property( 'CampaignId' ) )
	;
	var numParts = computeNumParts( allCampaignIds.length );
	var currentPart = ( new Date().getHours() ) % numParts;
	
	var currentCampaignIds = allCampaignIds
		.filter( _.property( _.hash, _.modulo( numParts ), _.equals( currentPart ) ) )
	;
	return [ currentCampaignIds, currentPart, numParts ];
}

// -- SETTINGS --------------

var REDUNDANT_KEYWORD_LABEL_NAME = 'pa - redundant_keyword_script';
var SIMILAR_KEYWIRD_LABEL_NAME = 'pa - similar_keyword_script';
var DEBUG_MODE = true;
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
   
	for( var i = 0 ; i < keywordsOfOneAdgroup.length; i++ ){
		for(var j = 0 ; j < i ;j++){
			var keyword1 = keywordsOfOneAdgroup[ i ];
			var keyword2 = keywordsOfOneAdgroup[ j ];

			var statement = i != j
				&& keywordsToBeLabeledAsPluralSingle.indexOf( keyword2 ) < 0
				&& keywordsToBeLabeledAsPluralSingle.indexOf( keyword1 ) < 0
				&& keyword1.words.length !=  keyword2.words.length;

			if( ! statement ){
				continue;
			}
			if( levenshtein( keyword1.words , keyword2.words ) != 1 ){
				continue;
			}

			if( keyword1.QualityScore < keyword2.QualityScore ){
				keywordsToBeLabeledAsPluralSingle.push( keyword1 );
			} else if ( keyword1.QualityScore > keyword2.QualityScore ){
				keywordsToBeLabeledAsPluralSingle.push( keyword2 );
			} else {
				if( keyword1.Clicks < keyword2.Clicks ){
					keywordsToBeLabeledAsPluralSingle.push( keyword1 );
				} else if( keyword1.Clicks > keyword2.Clicks ){
					keywordsToBeLabeledAsPluralSingle.push( keyword2 );
				}else{
					if( keyword1.Impressions < keyword2.Impressions ){
						keywordsToBeLabeledAsPluralSingle.push( keyword1 );
					}else if( keyword1.Impressions > keyword2.Impressions ){
						keywordsToBeLabeledAsPluralSingle.push( keyword2 );
					}else{
						if( keyword1.words.length > keyword2.words.length ){
							keywordsToBeLabeledAsPluralSingle.push( keyword1 );
						}else {
							keywordsToBeLabeledAsPluralSingle.push( keyword2 );                        
						}
					}
				}
			}
		}
	}
	return keywordsToBeLabeledAsPluralSingle;
}


function getReportRows( compainIds ){
    var query = 'SELECT Id, CampaignId, Criteria, KeywordMatchType, AdGroupId, QualityScore, Clicks, Impressions '
        + 'FROM KEYWORDS_PERFORMANCE_REPORT '
        + 'WHERE KeywordMatchType = "BROAD" '
    		+ 'AND CampaignId IN  ["' + compainIds.join('","') + '"] '
        + 'AND IsNegative = "FALSE" ' 
        + 'AND CampaignStatus = "ENABLED" ' 
        + 'AND AdGroupStatus = "ENABLED" ' 
        + 'AND Status = "ENABLED" ' 
    ;
  Logger.log( query );
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


function processAccount(){
    Logger.log( 'start' );

  var accountName = AdWordsApp.currentAccount().getName();
  if( accountName == '' ){
    // ignore empty Accounts
    return;
  }
  [ currentCampaignIds, currentPart, numParts ] = computeCurrentCampaignIds();
  Logger.log( accountName + ' - ' + currentPart + ' - ' + numParts + ' - countCampaigns: ' + currentCampaignIds.length );
	
	if( ! DEBUG_MODE ){
		Logger.log( 'create label' + REDUNDANT_KEYWORD_LABEL_NAME + ' and ' + SIMILAR_KEYWIRD_LABEL_NAME );
	}
    
    if(! AdWordsApp.labels().withCondition('Name = "' + REDUNDANT_KEYWORD_LABEL_NAME +'"').get().hasNext() ){
        AdWordsApp.createLabel( REDUNDANT_KEYWORD_LABEL_NAME );
    } 	
    
    Logger.log( 'retrieve report and prepare keywords' );

    var mapOfKeywordLists = {};
    getReportRows( currentCampaignIds ).forEach( function( row ){
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

  var selector = AdWordsApp.keywords();
  
  var condition =  'CampaignId IN [ "' + currentCampaignIds.join( '", "' ) + '"]';
  Logger.log( condition );
 selector =   selector.withCondition( condition );
  
  var keywordMap = {};
    iteratorToList( selector.get() ).forEach( function( keyword ){
        var key = keyword.getAdGroup().getId() + SEPARATOR + keyword.getId();
        keywordMap[ key ] = keyword;
    });
    
	var warningIssued = false;
    Logger.log( 'label keywords' );
  
  /*
  var sel = AdWordsApp.labels().withCondition('Name = "' + REDUNDANT_KEYWORD_LABEL_NAME +'"').get();  
  if( ! sel.hasNext() ){
    throw new Error( 'something wrong happend : try again in an Hour or so.' );
  }
  	var Label = sel.next();
  */
  
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

  getReportRows( currentCampaignIds ).forEach( function( row ){
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
  
  /*
  sel = AdWordsApp.labels().withCondition('Name = "' + SIMILAR_KEYWIRD_LABEL_NAME +'"').get();  
  if( ! sel.hasNext() ){
    throw new Error( 'something wrong happend : try again in an Hour or so.' );
  }
  Label = sel.next();
*/

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


var MAIL_APP = ( function (){
	var SEND_EMAILS_THROUGH_MAILGUN = true;
	var URL = 'https://api.mailgun.net/v3/mg.peakace.de/messages';
	var FROM = 'adwords_scripts@mg.peakace.de';
	var AUTHORISATION = 'Basic YXBpOmtleS1hYWZmMmI2MGU4MmNkMWYwOTIwYWYxNDUzZWM0MDcyOA==';
	
	function sendEmail( recipient, subject, text, html ){
		if( !text && !html ){
			throw new Error( 'Neither text-body nor html supplied for email.' );
		}
		if( SEND_EMAILS_THROUGH_MAILGUN ){
			return mailGunSender( recipient, subject, text, html );
		}
		mailAppSender( recipient, subject, text, html );
	}

	function mailAppSender( recipient, subject, text, html ){
		MailApp.sendEmail(
			recipient,
			subject,
			text,
			{
				name: subject,
				htmlBody : html
			}
		);
	}

	function mailGunSender( recipient, subject, text, html ){
		if ( html ){
			if ( !text ){
				text = 'this is supposed to be a html email. Seems like your device doesn\'t support html emails.';
			}
			html = '<html><body>' + html + '</body></html>';
		} else {
			html = null;
		}
		Logger.log( 'fetch URL' );

		return UrlFetchApp.fetch(
			URL,
			{
				method : 'post',
				payload : {
					from : FROM,
					to: recipient,
					subject : subject,
					text : text,
					html : html,
				},
				headers : {
					Authorization : AUTHORISATION,
				}
			}
		);
	}
	
	return {
		sendEmail	: sendEmail,
	}
})();

var ERROR_REPORTING_EMAIL = 'a.bakhabou@pa.ag';
    
var SCRIPT_NAME = 'redundat_keywords_with_big_accounts' ;

function main(){
  try{
    if( typeof (MccApp) != 'undefined' ){
       	MccApp.accounts().executeInParallel( 'processAccount' );
       }else {
        processAccount();
       }
	 
    }catch( error ){
		var accountName = AdWordsApp.currentAccount().getName();
		var subject = 'Error in ' + SCRIPT_NAME + ' ' + accountName;
		var message = error + '\n' + error.stack;
		Logger.log(  subject + ' -> ' + message );
		MAIL_APP.sendEmail( ERROR_REPORTING_EMAIL, subject, message );
		throw error;
	}
}






