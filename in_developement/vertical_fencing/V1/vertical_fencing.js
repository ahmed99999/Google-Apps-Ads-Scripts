// --------------------------------------
// ---- SETTINGS ------------------------

// This setting is only needed, if script runs on MCC-level
// ACCOUNTS contains the names of all accounts for which the script is executed
var ACCOUNTS = [];

var AND_OR_SOURCE = 'OR';
var AND_OR_TARGET = 'OR';

var SOURCE = {
	CAMPAIGN : {
		NAME_CONTAINS : [ '|EXM' ],
		NAME_DOES_NOT_CONTAIN : [],
		STATUS_IN : [ 'ENABLED'  ],
	},
	AD_GROUP : {
		STATUS_IN : [ 'ENABLED' ],
	},
	KEYWORD : {
		STATUS_IN : [ 'ENABLED' ],
	},
};

var TARGET = {
	CAMPAIGN : {
		NAME_CONTAINS : [ '|DSA|' ],
		NAME_DOES_NOT_CONTAIN : [],
		STATUS_IN : [ 'ENABLED' ],
	},
};

/*
 * In MCC-Accounts the lists must be created manually! 
 * If the script creates MCC-Negative-Lists then these lists are broken
 * ( they can't be attached to any campaigns ).
*/

var NEGATIVE_LIST_BASE_NAME = 'exact_fencing';

var ERROR_REPORTING_EMAILS = [ 'a.tissen@pa.ag' ];

var SAMPLE_SIZE = 3;
var PREVIEW_ITEM_LIMIT = 50;

// ---- END OF SETTINGS -----------------

// ---- CONSTANTS -----------------------

var SCRIPT_NAME = 'campaign_fencing';
var LOW_SEARCH_VOLUME = 'low search volume';
var ELIGIBLE = 'eligible';
var CAMPAIGN_LEVEL = 2;
var KEYWORD_LEVEL = 4;

// --------------------------------------

function merge( obj1, obj2 ){
	var res = {};
	for( key in obj1 ){
		res[ key ] = obj1[ key ];
	}
	for( key in obj2 ){
		if( typeof res[ key ] == 'undefined' ){
			res[ key ] = obj2[ key ];
		} else if( Array.isArray( res[ key ] ) && Array.isArray( obj2[ key ] ) ){
			res[ key ] = res[ key ].concat( obj2[ key ] ).filter( onlyUnique );
		} else if( typeof res[ key ] == 'object' && res[ key ] != null && typeof obj2[ key ] == 'object' && obj2[ key ] != null ){
			res[ key ] = merge( res[ key ], obj2[ key ] );
		} else{
			throw new Error( 'can\'t merge ' + JSON.stringify( obj1, null, 2 ) + ' and ' + JSON.stringify( obj2, null, 2 ) );
		}
	}
	return res;
}

Object.values = function( obj ){
	var vals = [];
	for( var key in obj ){
		vals.push( obj[ key ] );
	}
	return vals;
};

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

function toList( iterator ){
	var list = [];
	while( iterator.hasNext() ){
		list.push( iterator.next() );
	}
	return list;
}

function property( prop ){
	return function( item ){
		if( typeof item[ prop ] == 'function' ){
			return item[ prop ]();
		}
		return item[ prop ];
	};
}

function call( obj, func ){ return function( item ){ return obj[ func ]( item ) } };

function formatKeyword( keyword , matchType ){
	var matchTypes = {
		Exact 	: '[' + keyword + ']',
		Phrase	: '"' + keyword + '"',
		Broad	: keyword,
	};
	return matchTypes [ matchType ];
}

function group( rows ){
	return {
		by : function( keyAttribute ){	
			return {
				sum : function( value ){
					var res = {};
					rows.forEach( function( row ){
						var key = row[ keyAttribute ];
						res[ key ] = ( res[ key ] || 0 ) + row[ value ];
					});
					return res;
				},
				count : function(){
					var res = {};
					rows.forEach( function( row ){
						var key = row[ keyAttribute ];
						res[ key ] = ( res[ key ] || 0 ) + 1;
					});
					return res;
				},
				any : function(){
					var res = {};
					rows.forEach( function( row ){
						var key = row[ keyAttribute ];
						res[ key ] = row;
					});
					return res;
				},
				all : function(){
					var res = {};
					rows.forEach( function( row ){
						var key = row[ keyAttribute ];
						res[ key ] = res[ key ] || [];
						res[ key ].push( row );
					});
					return res;
				}
			};
		}
	};
}

function onlyUnique( value, index, self ){
    return self.indexOf( value ) === index;
}

function flatten( acc, val ){
	return acc.concat( val );
}

function surround( prefix, postfix ){
	return function( str ){ return prefix + str + postfix };
}

function getConditions( level, settings ){
	function selector( obj, selectors, defaultValue ){
		if( ! selectors || ! selectors.length ){
			throw new Error( 'selectors must be an non-empty array' );
		}
		var x = obj;
		var i = 0;
		while( x && i < selectors.length ){
			x = x[ selectors[ i++ ] ];
		}
		if( x ){
			return x;
		}
		return defaultValue;
	}
	
	/*
	 * level[ 0 .. 5 ]. 0 == mcc, 1 == account, 2 == campaign, 3 = ad-group, 4 = keyword, 5 = ad
	*/

	var conditions = [];
	if( level >= 2 ){
		conditions = conditions
			.concat( selector( settings, [ 'CAMPAIGN', 'NAME_CONTAINS' ], [] ).map( surround( 'CampaignName CONTAINS "', '"' ) ) )
			.concat( selector( settings, [ 'CAMPAIGN', 'NAME_DOES_NOT_CONTAIN' ], [] ).map( surround( 'CampaignName DOES_NOT_CONTAIN "', '"' ) ) )
		;
	}
	var campaignStatusIn = selector( settings, [ 'CAMPAIGN', 'STATUS_IN' ], [] );
	if( campaignStatusIn.length > 0 && level >= 2 ){
		conditions.push( 'CampaignStatus IN [ ' + campaignStatusIn.join( ', ' ) + ' ] ' );
	}
	var adGroupStatusIn = selector( settings, [ 'AD_GROUP', 'STATUS_IN' ], [] );
	if( adGroupStatusIn.length > 0 && level >= 3 ){
		conditions.push( 'AdGroupStatus IN [ ' + adGroupStatusIn.join( ', ' ) + ' ] ' );
	}
	var KeywordStatusIn = selector( settings, [ 'KEYWORD', 'STATUS_IN' ], [] );
	if( KeywordStatusIn.length > 0 && level >= 3 ){
		conditions.push( 'Status IN [ ' + KeywordStatusIn.join( ', ' ) + ' ] ' );
	}
	return conditions;
}

function negativeKeywordListWrapper( baseName ){
	var SUFFIX = '_part_';
	var ITEM_LIMIT = 5000;
	
	function getNegativeLists(){
		index = -1;
		lists = [];
		while( ( iterator = AdWordsApp.negativeKeywordLists().withCondition( 'Name = "' + baseName + SUFFIX + ++index + '"' ).get() ).hasNext() ){
			var list = iterator.next();
			lists.push( list );
		}
		return lists;
	}
	
	// rebalance the lists.
	function rebalance(){
		var negativeLists = getNegativeLists();
		
		for( forwardIndex = 0; forwardIndex < negativeLists.length; forwardIndex++ ){
			for( backwardIndex = negativeLists.length - 1; backwardIndex > forwardIndex; backwardIndex-- ){
				var forwardList = negativeLists[ forwardIndex ];
				var backwardList = negativeLists[ backwardIndex ];
				var backwardKeywords = toList( backwardList.negativeKeywords().get() );
				var freeCapacity = ITEM_LIMIT - forwardList.negativeKeywords().get().totalNumEntities();
				var keywordsToMove = backwardKeywords.slice( 0, freeCapacity );
				
				forwardList.addNegativeKeywords( keywordsToMove.map( property( 'getText' ) ) );
				// remove kws from backwardList
				keywordsToMove.forEach( property( 'remove' ) );
			}
		}
	}
	
	function getKeywords(){
		var result = getNegativeLists()
			.map( property( 'negativeKeywords' ) )
			.map( property( 'get' ) )
			.map( toList )
			.reduce( flatten, [] );
		return result;
	}
	
	function removeKeywords( negKeywords ){
		var removed = [];
		getNegativeLists().forEach( function( negList ){
			toList( negList.negativeKeywords().get() ).forEach( function( keyword ){
				if( negKeywords.indexOf( keyword.getText() ) >= 0 ){
					removed.push( keyword.getText() );
					keyword.remove();
				}
			});
		});
		rebalance();
		return removed;
	}

	function addKeywords( newKeywords ){
		var oldKeywords = this.getKeywords().map( property( 'getText' ) );
		Logger.log( 'some of ' + oldKeywords.length + ' old keywords: ' + oldKeywords.slice( 0, SAMPLE_SIZE ) );
		newKeywords = newKeywords.filter( function( keyword ){ return oldKeywords.indexOf( keyword ) == -1 });		
		
		// this is done only to create a copy of the list...
		var keywordsToAdd = newKeywords.map( function( x ){ return x } );
		// Logger.log( newKeywords.length );
		
		var negLists = getNegativeLists();
		negLists.forEach( function( negList ){
			var size = negList.negativeKeywords().get().totalNumEntities();
			var freeCapacity = ITEM_LIMIT - size;
			var countItemsToTake = Math.min( freeCapacity, newKeywords.length );
			var items = newKeywords.splice( 0, countItemsToTake );
			negList.addNegativeKeywords( items );
		});
		
		// all lists are full.
		// if we still have neg. keywords to add then we need to start creating new lists
		var index = negLists.length;
		while( newKeywords.length > 0 ){
			var name = baseName + SUFFIX + index++;
			
			if( typeof MccApp != 'undefined' && ! MccApp.isFake ){
				throw 'Pls create the negative list "' + name + '" manually. If the script would create it, it would be broken -> it\'s a Google bug :-(';
			}
			Logger.log( 'create list ' + name );
			
			var op = AdWordsApp.newNegativeKeywordListBuilder().withName( name ).build();
			if( !op.isSuccessful() ){
				throw new Error( 'could not create a negative list: ' + name );
			}
			list = op.getResult();
			
			var countItemsToTake = Math.min( ITEM_LIMIT, newKeywords.length );
			var items = newKeywords.splice( 0, countItemsToTake );
			
			list.addNegativeKeywords( items );
		}
		
		if( newKeywords.length > 0 ){
			throw new Error( 'newKeywords is still not empty' );
		}
		return keywordsToAdd;
	}
	
	function attachCampaigns( campaigns ){
		var countAttachments = 0;

		getNegativeLists().forEach( function( negList ){
			getItems( function(){
				var attachedCampaignIds = [];
				var iterator = AdsApp.negativeKeywordLists().withIds( [ negList.getId() ] ).get();
				if( iterator.hasNext() ){
					attachedCampaignIds = toList( iterator.next().campaigns().get() ).map( property( 'getId' ) );
				}else{
					Logger.log( negList.getName() + ' seems to be a new list. It is not visible from sub-accounts yet...' );
				}
				var ids = campaigns.map( property( 'getId' ) ).filter( function( id ){ return attachedCampaignIds.indexOf( id ) == -1 } );
				toList( AdsApp.campaigns().withIds( ids ).get() ).forEach( function ( campaign ){
					countAttachments++;
					campaign.addNegativeKeywordList( negList );
				});
			});
		});
		return countAttachments;
	}

	function retainAll( keywordsToRetain ){
		var keywords = [];
		var negativeLists = getNegativeLists();
		negativeLists.forEach( function( negativeList ){
			var negativeKeywords = toList( negativeList.negativeKeywords().get() );
			negativeKeywords.forEach( function( negativeKeyword ){
				if( keywordsToRetain.indexOf( negativeKeyword.getText() ) < 0 ){
					keywords.push( negativeKeyword.getText() );
					negativeKeyword.remove();
				}
			});
		});
		return keywords;
	}
	
	return {
		getKeywords 		: getKeywords,
		removeKeywords 		: removeKeywords,
		addKeywords 		: addKeywords,
		retainAll			: retainAll,
		attachCampaigns		: attachCampaigns
	};
}

function matchTypeCheck( keywordsFromAllAccounts ){
	var matchTypeCounts = group( keywordsFromAllAccounts ).by( 'KeywordMatchType' ).count();
	var counts = Object.values( matchTypeCounts );
	if( counts.reduce( function( a, b ){ return Math.max( a, b ) }, 0 ) != counts.reduce( function( a, b ){ return a + b }, 0 ) ){
		var exampleKeywords = group( keywordsFromAllAccounts ).by( 'KeywordMatchType' ).any();
		throw new Error( 'keywords with heterogeneous match types found: ' + JSON.stringify( exampleKeywords, null, 2 ) );
	}
}

function fromReport(){
	var selects = [].slice.call( arguments );
	return function( level, conditions, sourceOrTarget ){
		var list = [];
		var levels = [ null, 'ACCOUNT', 'CAMPAIGN', 'AD_GROUP', 'KEYWORDS', 'AD' ];
		var query = 'SELECT ' + selects.join( ', ' ) + ' FROM ' + levels[ level ] + '_PERFORMANCE_REPORT ';
		var query2 = query + (( conditions.length > 0 ) ? 'WHERE '+ conditions.join( ' AND ' ) : '');
		Logger.log( 'Query AND : ' +  query2 );
		list = list.concat( toList( AdWordsApp.report( query2 ).rows() ) );
		
		if( ( sourceOrTarget === 'SOURCE' && AND_OR_SOURCE === 'OR' )
				|| ( sourceOrTarget === 'TARGET' && AND_OR_TARGET === 'OR' ) ){
			var restConditions = conditions.filter( function( condition ){ return condition.indexOf( 'CampaignName' ) < 0 } );
			var campaignNameConditions = filterConditions( 'CampaignName', conditions );
			campaignNameConditions.forEach( function( condition ){
				var query2 = query + ' WHERE CampaignName CONTAINS ' + condition + ' ';
				var rest = campaignNameConditions.filter( function( c ){ return c !== condition } );
				rest.forEach( function( c ){
					query2 += ' AND CampaignName DOES_NOT_CONTAIN ' + c + ' ';
				});
				query2 += ( restConditions.length > 0 ) ? ( ' AND ' + restConditions.join( ' AND ' ) ) : '';
				Logger.log( 'Query XOR : ' + query2 );
				list = list.concat( toList( AdWordsApp.report( query2 ).rows() ) );
			});
		} 
		return list;
	};
}

function filterConditions( selector, conditions ){
	return conditions.filter( function( condition ){	
		return condition.indexOf( selector + ' CONTAINS ' ) >= 0;
	}).map( function( condition ){
		return condition.replace( selector + ' CONTAINS ', '' );
	});
}

function fromAdsScriptsAPI( level, conditions, source ){
	var levels = [ null, 'accounts', 'campaigns', 'adGroups', 'keywords' ];
	var selector = AdWordsApp[ levels[ level ] ]();
	var selector2 = selector;
	conditions.forEach( function( condition ){ selector2 = selector2.withCondition( condition ) } );
	var list = toList( selector2.get() );
	if ( (source ==='SOURCE' && AND_OR_SOURCE === 'OR') || (source ==='TARGET' && AND_OR_TARGET === 'OR') ){
		var CampaignNameConditions = filterConditions( 'CampaignName', conditions );
		var restConditions = conditions.filter( function( condition ){ return (condition.indexOf( 'CampaignName' ) < 0); });
		CampaignNameConditions.forEach( function( condition ){
			var selector2 = selector;
			selector2 = selector2.withCondition( 'CampaignName CONTAINS ' + condition );
			var rest = CampaignNameConditions.filter( function( c ){ return c !== condition });
			rest.forEach( function( c ){
				selector2 = selector2.withCondition( 'CampaignName DOES_NOT_CONTAIN ' + c );
			});
			restConditions.forEach( function( con ){
				selector2 = selector2.withCondition( con );
			});
			list = list.concat( toList( selector2.get() ) );
		});
	}	
	
	return list;
}

function getKeywords( settings, obtainer, source ){
	return getItems( obtainer, KEYWORD_LEVEL, settings, source );
}

function getCampaigns( settings, obtainer, sourceOrTarget ){
	return getItems( obtainer, CAMPAIGN_LEVEL, settings, sourceOrTarget );
}

function getItems( obtainer, level, settings, source ){
	level = typeof level != 'undefined' ? level : 2;

	var mccAccount = AdWordsApp.currentAccount();
	var accounts = getSelectedAccounts();
	items = [];
	accounts.forEach( function( account ){
		MccApp.select( account );
		var conditions = getConditions( level, settings );
		items = items.concat( obtainer( level, conditions, source ) );
	});
	MccApp.select( mccAccount );
	return items;
}

function getSelectedAccounts(){
	var accountSelector = MccApp.accounts();
	if( ACCOUNTS.length > 0 ) {
		accountSelector.withCondition( 'CustomerDescriptiveName IN [ "' + ACCOUNTS.join( '","' ) + '" ] ' );
	} else{
		return [];
	}
	return toList( accountSelector.get() );
}

function campaignSelectionPreview(){

	function previewSelectedAccounts(){
		var accounts = getSelectedAccounts();
		if( accounts.length > 0 ){
			Logger.log( 'preview selected accounts : ' );
		} else {
			Logger.log( 'no accounts selected' );
		}
		accounts.forEach( function( account, index ){
			Logger.log( index + ' : ' + account.getName() );
		});
	}
	
	function previewCampaigns( campaigns, campaignType ){
		if( campaigns.length > 0 ){
			Logger.log( 'preview some of the ' + campaigns.length + ' ' + campaignType + ' campaigns : ' );
		} else{
			Logger.log( ' no ' + campaignType + ' campaigns selected' );
		}
		var size = Math.min( PREVIEW_ITEM_LIMIT, campaigns.length );
		for( var index = 0; index < size; index++ ){
			Logger.log( index + ' : ' + campaigns[ index ][ 'CampaignName' ] );
		}
	}

	function previewAllNonTargetNonSourceCampaigns(){
		var sourceCampaigns = getCampaigns( SOURCE, fromReport( 'CampaignName' ) ).map( property( 'CampaignName' ) );
		var targetCampaigns = getCampaigns( TARGET, fromReport( 'CampaignName' ) ).map( property( 'CampaignName' ) );
		var allCampaigns = getCampaigns( {},     fromReport( 'CampaignName' ) ).map( property( 'CampaignName' ) );
		
		var nonSourceNonTargetCampaigns = allCampaigns.filter( function( campaign ){
			return sourceCampaigns.indexOf( campaign ) == -1 && targetCampaigns.indexOf( campaign ) == -1;
		}).map( function( x ){ return { CampaignName : x } } );
		previewCampaigns( nonSourceNonTargetCampaigns, 'Non Source Non Target' );
	}

	return {
		previewSelectedAccounts					: previewSelectedAccounts,
		previewAllSourceCampaings				: function(){ previewCampaigns( getCampaigns( SOURCE, fromReport( 'CampaignName' ) ), 'source' ) },
		previewAllTargetCampaings				: function(){ previewCampaigns( getCampaigns( TARGET, fromReport( 'CampaignName' ) ), 'target' ) },
		previewAllNonTargetNonSourceCampaigns	: previewAllNonTargetNonSourceCampaigns
	};
}

function checkCampaignSourceTargetOverlap(){
	Logger.log( 'checkCampaignSourceTargetOverlap' );
	var sourceAndTargetCampaigns = getCampaigns( merge( SOURCE, TARGET ), fromReport( 'CampaignName' ) );
	if( sourceAndTargetCampaigns.length > 0 ){
		throw new Error( 'Source-Target-Campaign-Overlap detected' );
	}
}

var MccApp = MccApp || {
	select : function(){},
	accounts : function(){
		return {
			executeInParallel : function( processAccountFuncName, finalProcessingFunc, strParam ){
				var res = '' + this[ processAccountFuncName ]( strParam );
				// call processAccountFuncName - supply parameters based on strParam
				// use the return value from the processAccountFunc to build the argument for the finalProcessingFunc
				// call finalProcessingFunc
				var finalParam = {
					getResults : function(){
						return [ res ];
					},
				}
				this[ finalProcessingFunc ]( finalParam );
			},
			withCondition : function( ignoreThisArg ){},
			get : function(){
				var accessed = false;
				return {
					hasNext : function(){ return !accessed },
					next 	: function(){ accessed = true; return AdWordsApp.currentAccount() },
				};
			},
		};
	},
	isFake : true,
};

function main(){
	try {
		Logger.log('start');
		var campaignSelection = campaignSelectionPreview();
		campaignSelection.previewSelectedAccounts();
		campaignSelection.previewAllSourceCampaings();
		campaignSelection.previewAllTargetCampaings();
		campaignSelection.previewAllNonTargetNonSourceCampaigns();

		checkCampaignSourceTargetOverlap();

		// step1: gather all positive keywords
		var keywordsFromAllAccounts = getKeywords( SOURCE, fromReport( 'SystemServingStatus', 'Criteria', 'KeywordMatchType' ), 'SOURCE' );
		Logger.log( 'found ' + keywordsFromAllAccounts.length + ' keywords ' );
		matchTypeCheck( keywordsFromAllAccounts );

		// step2: remove broad-match-modifier, format and group keywords
		keywordsFromAllAccounts.forEach( function( keyword ){
			keyword.Criteria = formatKeyword( keyword.Criteria.replace( /\+/g, '' ), keyword[ 'KeywordMatchType' ] );
		});
		var keywordsFromAllAccounts2 = group( keywordsFromAllAccounts ).by( 'SystemServingStatus' ).all();
		var nonLsvKeywords = keywordsFromAllAccounts2[ ELIGIBLE ] || [];
		var lsvKeywords = keywordsFromAllAccounts2[ LOW_SEARCH_VOLUME ] || [];

		// Logger.log( 'found ' + nonLsvKeywords.length + ' non-lsv-keywords ' );
		// Logger.log( 'found ' + lsvKeywords.length + ' lsv-keywords ' );

		// step3: add/remove to/from negative-keyword-lists
		var negativeList = negativeKeywordListWrapper( NEGATIVE_LIST_BASE_NAME );

		Logger.log( 'add ' 		+ nonLsvKeywords.length + ' non-lsv keywords. sample: ' + JSON.stringify( nonLsvKeywords.slice( 0, SAMPLE_SIZE ), null, 2 ) );
		Logger.log( 'remove ' 	+ lsvKeywords.length 	+ ' lsv keywords. sample: ' 	+ JSON.stringify( lsvKeywords.slice( 0, SAMPLE_SIZE ), null, 2 ) );
		var added 	= negativeList.addKeywords( nonLsvKeywords.map( property( 'Criteria' ) ) );
		var removed = negativeList.removeKeywords( lsvKeywords.map( property( 'Criteria' ) ) );
		var cleaned = negativeList.retainAll( 	nonLsvKeywords.map( property( 'Criteria' ) ) );
		Logger.log( 'some of the ' +   added.length + '   added keywords: ' +   added.slice( 0, SAMPLE_SIZE ) );
		Logger.log( 'some of the ' + removed.length + ' removed keywords: ' + removed.slice( 0, SAMPLE_SIZE ) );
		Logger.log( 'some of the ' + cleaned.length + ' cleaned keywords: ' + cleaned.slice( 0, SAMPLE_SIZE ) );

		// step4: add lists to all target campaigns
		var campaigns = getCampaigns( TARGET, fromAdsScriptsAPI , 'TARGET' );
		var countAttachments = negativeList.attachCampaigns( campaigns );

		Logger.log( 'Attach '
			+ ' lists'
			+ ' to '
			+ campaigns.length
			+ ' campaign'
			+ ( campaigns.length == 1 ? '' : 's' )
			+ ' ( ' + countAttachments + ' attachmets )'
		);
	} catch ( error ){
		var accountName = AdWordsApp.currentAccount().getName();
		var subject = 'Error in ' + SCRIPT_NAME + ' ' + accountName;
		var message = error + '\n' + error.stack;
		Logger.log( subject + ' -> ' + message );
		if ( ! AdWordsApp.getExecutionInfo().isPreview() ){
			ERROR_REPORTING_EMAILS.forEach( function( email ){
				MAIL_APP.sendEmail( email, subject, message );
			});
		} else {
			Logger.log( 'don\'t send error-emails in preview-mode' );
		}
		throw error;
    }
}