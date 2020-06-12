var CUSTOMER = 'Airbnb';

// adWords doesn't allow more than 50 accounts
var ACCOUNT_LIMIT = 50;

// print debug messages?
var DEBUG = true;

// for internal use
var DELIMITER = '<^^>';

var NAME_OF_SCRIPT = 'Duplicate BMM Keyword Checker';
var ADMIN_EMAIL = 'at@peakace.de';

var LABEL_NAME = 'PA_duplicate_keyword';
var DUPLICATE_KEYWORD_CHECKER_LABEL = 'PA_duplicate_keyword_checker';

var CHUNK_SIZE = 50000;
var CHUNK_SIZE_SCALING = 1.2;

// -------------------------------



function main(){
	log('start');
	
	MccApp
		.accounts()
		//.withIds( getAccountIds() )
		.withLimit( ACCOUNT_LIMIT )
		.executeInParallel(
			'processAccount',
			'finalProcessing'
		);
	
	
}


function processAccount(){
  try{
    var account = AdWordsApp.currentAccount();
    if( account.getName() ){
      log( 'account ' +  account.getName() );
    } else {
      debug( 'ignore empty account: ' + account.getCustomerId() );
      return;
    }
    
    var campaignSelector1 = campaignSelector();
    
    campaignSelector1.setCampaignSelectionHandler(
      function( campaignSelection ){
        checkDuplicateBMM( campaignSelection.map( methodCall('getId') ) );
        debug( 'adjust label-marker' );
        adjustLabelMarker( labelCampaignSelector, campaignSelection[ campaignSelection.length -1 ] );
      }
    );
    
    forAllItems(
      AdWordsApp.campaigns(),
      campaignSelector1.next,
      labelCampaignSelector
    );
  }catch( error ){
    Logger.log( error );
    mailGun( ADMIN_EMAIL, NAME_OF_SCRIPT + ' is broken' ,  JSON.stringify( error ) );
  }
}


function campaignSelector(){
	var chunkSize = CHUNK_SIZE;
	var sumKeywords = 0;
	var sumAds = 0;
	var campaignSelection = [];
	var callback = null;
	
	return {
		setCampaignSelectionHandler : function( callback1 ){
			callback = callback1;
		},
		next : function( campaign, isLast ){
			sumKeywords += campaign.keywords().get().totalNumEntities();
			sumAds += campaign.ads().get().totalNumEntities();
			campaignSelection.push( campaign );
			
			if( isLast || sumKeywords > chunkSize || sumAds > chunkSize ){
				chunkSize = chunkSize * CHUNK_SIZE_SCALING;
				callback( campaignSelection	);
				Logger.log(
					sumKeywords + ' keywords, '
					+ sumAds + ' ads. '
					+ campaignSelection.length + ' campaigns. '
					+ 'New chunkSize: ' + chunkSize
				);
				sumKeywords = 0;
				sumAds = 0;
				campaignSelection = [];
			}
		}
	};
}

function onlyBroad( keyword ){
	return keyword['KeywordMatchType'] == 'Broad';
}
function isBMM( keyword ){
	return keyword['Criteria']
		.split(' ')
		.filter( function( word ){ return word.indexOf('+') != 0 } ).length == 0;
}

function assert( condition, message ){
	if( ! condition ){
		throw new Error( message );
	}
}

function quote( str ){
	return '"' + str.replace(/"/g, '\\"' ) + '"';
}

function findKeyword( campaignName, adgroupName, keyword ){
	var iterator = AdWordsApp
		.keywords()
		.withCondition( 'CampaignName  = ' + quote( campaignName ) )
		.withCondition( 'AdGroupName   = ' + quote( adgroupName  ) )
		.withCondition( 'Text 		   = ' + quote( keyword	    ) )
		.withCondition( 'AdGroupStatus IN [ENABLED, PAUSED]' )
		.withCondition( 'CampaignStatus IN [ENABLED, PAUSED]' )
		.withCondition( 'Status IN [ENABLED, PAUSED]' )
		.withCondition( 'KeywordMatchType = BROAD' )
		.get();

	assert( iterator.totalNumEntities() == 1,
		AdWordsApp.currentAccount().getName() + '. ' +
		'Expected only one keyword ' + keyword + ' in adgroup ' + adgroupName + ' in campaign ' + campaignName + '.' +
		'But found ' + iterator.totalNumEntities() + '.' );
		
	if( iterator.hasNext() ){
		return iterator.next();
	}
}

function checkDuplicateBMM( campaignIds, alerts ){
	
	createLabel( LABEL_NAME );

	
	var map = downloadKeywords( campaignIds );
	
	for( var key in map ){ // for each adgroup
		var campaignName = key.split( DELIMITER )[0];
		var adgroupName  = key.split( DELIMITER )[1];
		
		var arr = map[ key ];
		
		var maxClicks = 0;
		
		for( var index in arr ){
			maxClicks = Math.max( maxClicks, arr[ index ].clicks );
		}
		var foundBest = false
		for( var index in arr ){ // for each duplicate keyword
			var keyword = arr[ index ].keyword;
			var clicks  = arr[ index ].clicks;
			
			//debug( keyword + ': ' + clicks + ' / ' + maxClicks );
			
			if( foundBest || clicks < maxClicks ){
				// add label PA_duplicate_keyword
				var k1 = findKeyword( campaignName, adgroupName, keyword );
				k1.applyLabel( LABEL_NAME );
			} else {
				// this keyword has more clicks than its duplicates
				// dont add a label to it
				foundBest = true;
			}
		}
		
		
		/*alerts.push(
			{
				campaignName : key.split('_')[0],
				adgroupName  : key.split('_')[1],
				keywords 	 : map[ key ]
			}
		);*/
	}
}

function downloadKeywords( campaignIds ){
	
	var map = {};
	
	var i = 0;
	
	retrieveAdwordsReport(
		[ 'CampaignName', 'AdGroupName', 'Criteria', 'KeywordMatchType', 'Clicks', 'Labels' ], // SELECT
		'KEYWORDS_PERFORMANCE_REPORT', // FROM
		[	'CampaignStatus in [ENABLED, PAUSED]', // WHERE
			'AdGroupStatus in [ENABLED, PAUSED]',
			'Status in [ENABLED, PAUSED]',
			//'CampaignName = "WWW:DTM:SRC:ITA+Venice"',
			//'AdGroupName = "Venice:Apartment:Private+BMM"',
			'KeywordMatchType = BROAD',
			'CampaignId in [' + campaignIds + ']'
		],
		'20170119,20170317', // DURING
		function( row ){
			if( isBMM( row ) && row['Labels'].indexOf( LABEL_NAME ) == -1 ){
				var normalizedString = row['Criteria'].split(' ').sort().join(' ').toLowerCase();
				var key1 =
					row['CampaignName']	+ DELIMITER +
					row['AdGroupName']	+ DELIMITER +
					normalizedString;
				map[ key1 ] = map[ key1 ] || [];
				map[ key1 ].push( { keyword : row['Criteria'], clicks : row['Clicks'] } );
			}
			
			if( ++i % 10000 == 0 ){
				debug( i );
			}
		}
	);
	
	for( var key1 in map ){
		// ignore bmm keywords without duplicates
		if( map[ key1 ].length == 1 ){
			delete map[ key1 ];
		}
	}
	
	return map;
}


function SELECT(){
	var fields = Array.prototype.slice.call( arguments );
	return {
		FROM : function( report ){
			return {
				DURING : function( from, to ){
					return {
						FOR_EACH : function( callback ){
							retrieveAdwordsReport( fields, report, [], from + ',' + to, callback );
						}
					};
				},
				WHERE : function(){
					var conditions = Array.prototype.slice.call( arguments );
					return {
						DURING : function( from, to ){
							return {
								FOR_EACH : function( callback ){
									retrieveAdwordsReport( fields, report, conditions, from + ',' + to, callback );
								}
							};
						},
						FOR_EACH : function( callback ){
							retrieveAdwordsReport( fields, report, conditions, '', callback );
						}
					};
				},
				FOR_EACH : function( callback ){
					retrieveAdwordsReport( fields, report, [], '', callback );
				}
			};
		}
	};
}

function retrieveAdwordsReport( fieldNames, reportName, conditions, during, callback ){
	
    var query =   'SELECT ' + fieldNames.join(',') + ' '
				+ 'FROM ' 	+ reportName + ' '
				+ ( conditions.length > 0 ? 'WHERE ' : '')	+ conditions.join(' AND ') + ' '
				+ ( during && during.length > 0 ? 'DURING ' : '' ) + ( during ? during : '' )
	;
	
	//debug( query );
	
	var rows = AdWordsApp.report( query ).rows();
	
	while( rows.hasNext() ){
		callback( rows.next() );
	}
}

function finalProcessing( results ){
	debug('no final processing');
	return;
}

function forAllCampaigns( callBack ){
	var campaignIterator = AdWordsApp.campaigns().get();
	while (campaignIterator.hasNext()) {
		var campaign = campaignIterator.next();
		if( campaign.isRemoved() ){
			continue;
		}
		callBack( campaign );
	}
}

function getMapFromArray( data, keyColumn, valueColumn ){
	var res = {};
	for( var index = 1; index < data.length; index++ ){
		var accountId 	 = data[ index ][ keyColumn ];
		res[ accountId ] = data[ index ][ valueColumn ];
	}
	return res;
}

function debug( value ){
	if( DEBUG ){
		Logger.log( value );
	}
}

function log( value ){
	Logger.log( value );
}




// ####################################################
// ####################################################

function mailGunHtml( to, subject, html ){
  return mailGunSender( to, subject, null, html );
}

function mailGun( to, subject, text ){
  return mailGunSender( to, subject, text );
}

function mailGunSender( to, subject, text, html ){
	if( html ){
		if( ! text ){
			text = 'this is supposed to be a html email. Seems like your device doesn\'t support html emails.';
		}
		html = '<html><body>' + html + '</body></html>';
	}else{
		html = null;
	}
	
	return UrlFetchApp.fetch(
		'https://api.mailgun.net/v3/mg.peakace.de/messages',
		{
			"method" : "post",
			"payload" : {
				'from' 		: "adwords_scripts@mg.peakace.de",
				'to' 		: to,
				'subject' 	: subject,
				'text'		: text,
				'html'		: html,
			},
			"headers": {
				"Authorization" : "Basic YXBpOmtleS1hYWZmMmI2MGU4MmNkMWYwOTIwYWYxNDUzZWM0MDcyOA==",
			}
		}
	);
}

// ####################################################
// ####################################################


function createLabel( labelName ){
	
	var label = findLabel( labelName );
	
	if( ! label ){
		AdWordsApp.createLabel( labelName );
		return findLabel( labelName );
	}else{
		return label;
	}
}

function labelCampaignSelector( label ){
	return label.campaigns();
}
function labelAdgroupSelector( label ){
	return label.adGroups();
}

function methodCall( functionName ){
	return function( x ){ return x[ functionName ](); };
}



function forAllItems( selector, callBack, labelSelector ){
	var firstItemId = findFirstItemId( labelSelector );
	var iterator = selector.orderBy("Name").get();
	var found = false;
	while( iterator.hasNext() ){
		var item = iterator.next();
		if( item.isRemoved() ){
			continue;
		}
		if( !found && firstItemId ){
			if( item.getId() == firstItemId ){
				found = true;
			}
			continue;
		}
		callBack( item, !iterator.hasNext() );
		
		/*
		if( AdWordsApp.getExecutionInfo().getRemainingTime() < ( 30 - STOP_AFTER_MINUTES ) * 60 ){
			Logger.log( 'stop' );
			// less than 2 Minutes left
			break;
		}
		*/
	}
	processResults( labelSelector );
}

function processResults( selector ){
	var label = findLabel( DUPLICATE_KEYWORD_CHECKER_LABEL );
	removeLabel( label, selector, DUPLICATE_KEYWORD_CHECKER_LABEL );
}


function findLabel( labelName ){
	
	var labelSelector = AdWordsApp.labels()
		.withCondition('Name = "' + labelName + '"');
	
	var labelIterator = labelSelector.get();
	if( labelIterator.hasNext() ){
		return labelIterator.next();
	}
}


function findFirstItemId( labelToSelector ){
	var label = findLabel( DUPLICATE_KEYWORD_CHECKER_LABEL );
	if( !label ){
		return null;
	}
	var iterator = labelToSelector( label ).get();
	var count = iterator.totalNumEntities();
	var firstItem = count > 0 ? iterator.next() : null;
	
	if( count > 1 ){
		// something went wrong
		// there should be at most one labeled item
	}
	if( firstItem ){
		return firstItem.getId();
	}
}


/*
 * Remove the label from all campaigns and adgroups. Then add it to the arguments.
 * "selector" argument takes a label and returns a selector of items
 * from which the label should be removed.
 * Finally the label will be applied to the item argument.
*/
function adjustLabelMarker( selector, item ){
	
	var labelName = DUPLICATE_KEYWORD_CHECKER_LABEL;
	
	// create label if needed
	var label = createLabel( labelName );
	
	removeLabel( label, selector, labelName );
	
	item.applyLabel( labelName );
}

function removeLabel( label, selector, labelName ){
	// in preview-mode the label would not be created
	// therefore we need to check wheter it is present
	
	if( label ){
		forEach( selector( label ), function( item1  ){ item1.removeLabel( labelName ) } );
	}
}

function forEach( selector, process ){
	var iterator = selector.get();
	while( iterator.hasNext() ){
		var item = iterator.next();
		process( item );
	}
}
