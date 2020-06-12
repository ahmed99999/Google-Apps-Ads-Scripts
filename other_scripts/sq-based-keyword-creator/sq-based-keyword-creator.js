
// -------- SETTINGS -------------------------------
var EXCLUDE_CLOSE_VARIANTS_TIME_SPAN = 90; // one day
var TIME_SPAN = 90; // duration in days
var LABEL_NAME = 'CREATED_BY_SQ_SCRIPT';
// conversion-metric (Conversions or AllConversions)
METRICS = [
	{ metric : 'Clicks', isGreaterThan : 5 },
	{ metric : 'Impressions', isGreaterThan : 10 },
	{ metric : 'Conversions', isGreaterThan : 1 },
	{ metric : 'ConversionValue', isGreaterThan : 0 },
];

var EMAILS = [ 'a.tissen@pa.ag','db@peakace.de' ];
var ONLY_ENABLED_CAMPAIGNS = true;
var ONLY_ENABLED_ADGROUPS = true;

// -------- CONSTANTS ------------------------------
// One currency unit is one million micro amount.
var MICRO_AMOUNT_MULTIPLIER = 1000000;
var BROAD_SUFFIX = '(broad)';
var EXACT_SUFFIX = '(exact)';
var NEW_LINE = '<br>';
var MAX_QUERY_LENGTH = 80;
var SEND_EMAILS = true;

var _ = (function(){
	function addLeadingZeros( number, digits ){
		var res = '' + number;
		while ( res.length < digits ){
			res = '0' + res;
		}
		return res;
	}
	function dateToString( date, delimiter, withHours ){
		return addLeadingZeros( date.getFullYear(), 4 ) + delimiter +
			addLeadingZeros( date.getMonth() + 1, 2 ) + delimiter +
			addLeadingZeros( date.getDate(), 2 ) +
			( withHours ? ' ' + addLeadingZeros( date.getHours(), 2 ) + ':' + addLeadingZeros( date.getMinutes(), 2 ) : '' )
		;
	}
	function duringLastDays( days ){
		var today = new Date();
		var before = new Date( today.getTime() - 1000 * 60 * 60 * 24 * days );
		return ' DURING ' + dateToString( before, '' ) + ', ' + dateToString( today, '' );
	}
	function addToMultiMap( map, key, value ){
		if( ! map[ key ] ){
			map[ key ] = [];
		}
		map[ key ].push( value );
	}
	function iteratorToList( iter ){
		var list = [];
		while( iter.hasNext() ){
			list.push( iter.next() );
		}
		return list;
	}
	function iteratorToMap( iter, property ){
		var map = {};
		while( iter.hasNext() ){
			var item = iter.next();
			
			if( typeof property == 'function' ){
				map[ property( item ) ] = item;
			}else if( typeof item[ property ] == 'function' ){
				map[ item[ property ]() ] = item;
			}else{
				map[ item[ property ] ] = item;
			}
		}
		return map;
	}
	function listToMap( list, property ){
		var map = {};
		list.forEach( function( item ){
			if( typeof property == 'function' ){
				map[ property( item ) ] = item;
			}else if( typeof item[ property ] == 'function' ){
				map[ item[ property ]() ] = item;
			}else{ 
				map[ item[ property ] ] = item;
			}
		});
		return map;
	}
	function properties(){
		var args = Array.prototype.slice.call( arguments );
		var f = function( item ){
			return args.map( function( arg ){
				if( typeof arg == 'function' ){
					return arg( item );
				}else if( typeof item[ arg ] == 'function' ){
					return item[ arg ]();
				}else{
					return item[ arg ];
				}
			});
		};
		f.name1 = args.join( '_' ); // this improves groupBy() output
		return f;
	}
	function property(){
		var args = Array.prototype.slice.call( arguments );
		var f = function( item ){
			var res = item;
			args.forEach( function( arg ){
				if( typeof arg == 'function' ){
					res = arg( res );
				}else if( typeof res[ arg ] == 'function' ){
					res = res[ arg ]();
				}else{
					res = res[ arg ];
				}
			});
			return res;
		};
		f.name1 = args.join( '_' ); // this improves groupBy() output
		f.equals = function( value ){
			return function( item ){
				return f( item ) == value;
			}
		};
		f.lt = function( value ){
			return function( item ){
				return f( item ) < value;
			}
		};
		f.endsWith = function( value ){
			return function( item ){
				var x = f( item );
				return x.indexOf( value ) == x.length - value.length;
			}
		};
		return f;
	}
	function not( predicate ){
		var res = function( x ){
			return false == predicate( x );
		};
		res.or = function( predicate ){
			return or( this, predicate );
		};
		res.and = function( predicate ){
			return and( this, predicate );
		};
		return res;
	}
	function or( predicate1, predicate2 ){
		return function( x ){
			return predicate1( x ) || predicate2( x );
		};
	}
	function and( predicate1, predicate2 ){
		return function( x ){
			return predicate1( x ) && predicate2( x );
		};
	}
	function log( value ){
		Logger.log( value );
	}
	function onlyUnique( value, index, self ){
		return self.indexOf( value ) === index;
	}
	function findLabel( labelName ){
		var labelSelector = AdWordsApp.labels()
			.withCondition('Name = "' + labelName + '"');
		
		var labelIterator = labelSelector.get();
		if( labelIterator.hasNext() ){
			return labelIterator.next();
		}
	}
	function createLabel( labelName ){
		var label = findLabel( labelName );
		if( ! label ){
			AdWordsApp.createLabel( labelName );
			return findLabel( labelName );
		}else{
			return label;
		}
	}
	function flatten( matrix ){
		return [].concat.apply([], matrix );
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
			'https://api.mailgun.net/v3/mg.peakace.de/messages',
			{
				"method": "post",
				"payload": {
					'from': "adwords_scripts@mg.peakace.de",
					'to': to,
					'subject': subject,
					'text': text,
					'html': html,
				},
				"headers": {
					"Authorization": "Basic YXBpOmtleS1hYWZmMmI2MGU4MmNkMWYwOTIwYWYxNDUzZWM0MDcyOA==",
				}
			}
		 );
	}

	// ####################################################
	// ####################################################

	
	
	return {
		dateToString 	: dateToString,
		duringLastDays 	: duringLastDays,
		addToMultiMap 	: addToMultiMap,
		iteratorToList	: iteratorToList,
		listToMap		: listToMap,
		property 		: property,
		properties		: properties,
		not				: not,
		and				: and,
		or				: or,
		log				: log,
		onlyUnique		: onlyUnique,
		iteratorToMap	: iteratorToMap,
		createLabel		: createLabel,
		flatten			: flatten,
		mailGunHtml		: mailGunHtml,
		mailGun			: mailGun
		
	};
})();

function excludeExactClosedVariantSearchQueriesFromBroadCampaigns( campaignTool ){
	var count = 0;
	
	var report = AdWordsApp.report(
		'SELECT CampaignName, Query' +
		' FROM SEARCH_QUERY_PERFORMANCE_REPORT' +
		' WHERE ' +
			' CampaignStatus = "ENABLED"' +
			' AND AdGroupStatus = "ENABLED"' +
			' AND CampaignName CONTAINS_IGNORE_CASE "' + EXACT_SUFFIX + '"' +
			' AND QueryMatchTypeWithVariant = NEAR_EXACT' +
			// this will be available in v201708
			//' AND QueryTargetingStatus IN [ADDED,NONE]' +
			' ' + _.duringLastDays( EXCLUDE_CLOSE_VARIANTS_TIME_SPAN ) );
	var rows = _.iteratorToList( report.rows() )
		// Ignore too long queries.
		// We can only create (negative) keywords with a length of at most 80 chars.
		.filter( _.property( 'Query','length' ).lt( MAX_QUERY_LENGTH ) )
		//.forEach( _.log )
	;
	
	Logger.log( 'count near variant search queries: : ' + rows.length );
	
	var negKeywords = {};
	
	rows.forEach( function( row ){
		var broadCampaign = campaignTool.broadCampaignByExactName[ row.CampaignName ];
		if( broadCampaign ){
			negKeywords[ broadCampaign.getName() ] = negKeywords[ broadCampaign.getName() ] 
				|| _.iteratorToList( broadCampaign.negativeKeywords().get() ).map( _.property( 'getText' ) );
			
			var negKeyword = '[' + row.Query + ']';
			if( negKeywords[ broadCampaign.getName() ].indexOf( negKeyword ) == -1 ){
				broadCampaign.createNegativeKeyword( negKeyword );
				count++;	
			}
		}else{
			Logger.log( 'WARNING: No broad campaign equivalent found for campaign ' + row.CampaignName + '.' );
		}
	});
	
	Logger.log( count + ' negative keywords added to bmm campaigns.' );
	return count;
}

function prepareCampaigns(){
	
	var campaignList = _.iteratorToList(
		AdWordsApp
		.campaigns()
		.get()
	);
	var exactCampaignList = campaignList.filter( _.property( 'getName' ).endsWith( EXACT_SUFFIX ) );
	var broadCampaignList = campaignList.filter( _.property( 'getName' ).endsWith( BROAD_SUFFIX ) );
	
	var exactCampaignByBroadName = _.listToMap(
		exactCampaignList,
		function( campaign ){
			return campaign.getName().substring( 0, campaign.getName().length - EXACT_SUFFIX .length ) + BROAD_SUFFIX;
		}
	);
	
	var broadCampaignByExactName = _.listToMap(
		broadCampaignList,
		function( campaign ){
			return campaign.getName().substring( 0, campaign.getName().length - BROAD_SUFFIX .length ) + EXACT_SUFFIX;
		}
	);
	
	var campaignsById = _.listToMap( campaignList, 'getId' );
	
	return {
		campaignList : campaignList,
		exactCampaignList : exactCampaignList,
		broadCampaignList : broadCampaignList,
		exactCampaignByBroadName : exactCampaignByBroadName,
		broadCampaignByExactName : broadCampaignByExactName,
		campaignsById : campaignsById
	}
}

function main(){
	Logger.log( 'Start' );
	
	var campaignTool = prepareCampaigns();
	
	var count = excludeExactClosedVariantSearchQueriesFromBroadCampaigns( campaignTool );
	var text = '';
  
	_.createLabel( LABEL_NAME );

	var reportString = 
		'SELECT CampaignId, AdGroupId, KeywordId, Query, QueryMatchTypeWithVariant' +
		' FROM SEARCH_QUERY_PERFORMANCE_REPORT' +
		' WHERE ' +
			METRICS.map( function( metric ){ return metric.metric + ' > ' + metric.isGreaterThan } ).join( ' AND ' ) + ' ' +
			( ONLY_ENABLED_CAMPAIGNS ? ' AND CampaignStatus = "ENABLED"' : '' ) +
			( ONLY_ENABLED_ADGROUPS ? ' AND AdGroupStatus = "ENABLED"' : '' ) +
			' AND CampaignName CONTAINS_IGNORE_CASE "' + BROAD_SUFFIX + '"' +
			' AND QueryMatchTypeWithVariant != NEAR_EXACT' +
			// this will be available in v201708
			//' AND QueryTargetingStatus IN [ADDED,NONE]' +
			' ' + _.duringLastDays( TIME_SPAN );
	
	Logger.log( reportString );
	
	var report = AdWordsApp.report( reportString );
	var rows = _.iteratorToList( report.rows() )
		// Ignore too long queries.
		// We can only create keywords with a length of at most 80 chars.
		.filter( _.property( 'Query', 'length' ).lt( MAX_QUERY_LENGTH ) )
		//.forEach( _.log )
	;
	
	var exactAdgroupsByName = _.listToMap( _.flatten(
		campaignTool.exactCampaignList.map( _.property( 'adGroups', 'get' ) ).map( _.iteratorToList )
	), 'getName' );
	
	var adGroupIdList = rows.map( _.property( 'AdGroupId' ) ).filter( _.onlyUnique );
	var adGroupsById = _.iteratorToMap( AdWordsApp.adGroups().withIds( adGroupIdList ).get(), 'getId' );
	
	var keywordIdList = rows.map( _.properties( 'AdGroupId', 'KeywordId' ) ); //.filter( _.onlyUnique )
	var keywordsById = _.iteratorToMap( AdWordsApp.keywords().withIds( keywordIdList ).get(),
		function( keyword ){
			return keyword.getAdGroup().getId() + '_' + keyword.getId();
		}
	);
	
	
	var countAlreadyExistingAdgroups = 0;
	rows.forEach( function( row ){
		var campaign = campaignTool.campaignsById[ row.CampaignId ];
		
		if( exactAdgroupsByName[ row.Query ] ){
			countAlreadyExistingAdgroups++;
			return;
		}
		
		var exactCampaign = campaignTool.exactCampaignByBroadName[ campaign.getName() ];
		
		if( exactCampaign ){
			campaign.createNegativeKeyword(	'[' + row.Query + ']' );
			
			var adgroup = adGroupsById[ row.AdGroupId ];
			var adGroupOperation = exactCampaign
				.newAdGroupBuilder()
				.withName( row.Query )
				.withCpc( adgroup.bidding().getCpc() )
				//.withStatus( 'PAUSED' ) //TODO: paused or enabled?
				.build();
			
			if( adGroupOperation.isSuccessful() ){
				var newAdGroup = adGroupOperation.getResult();
				newAdGroup.applyLabel( LABEL_NAME );
				text += exactCampaign.getName() + ' => ' + newAdGroup.getName() + NEW_LINE;
				
				_.iteratorToList( adgroup.ads().withCondition( 'Type = EXPANDED_TEXT_AD' ).get() )
					.forEach( function( ad ){
						
						var adOperation = newAdGroup.newAd().expandedTextAdBuilder()
							.withHeadlinePart1( ad.getHeadlinePart1() )
							.withHeadlinePart2( ad.getHeadlinePart2() )
							.withDescription( ad.getDescription() )
							;
						if( ad.getPath1() ){
							adOperation = adOperation.withPath1( ad.getPath1() );
						}
						if( ad.getPath2() ){
							adOperation = adOperation.withPath1( ad.getPath2() );
						}
						adOperation = adOperation
							.withFinalUrl( ad.urls().getFinalUrl() )
							.build();
						if( adOperation.isSuccessful() ){
							var ad = adOperation.getResult();
							ad.applyLabel( LABEL_NAME );
						}else{
							_.log( 'Create ad failed. ' + ad.getHeadlinePart1() + ' _ ' + ad.getHeadlinePart2() + ' _ ' + ad.getDescription() + ' _ ' + ad.getPath1() + ' _ ' + ad.getPath2() + ' _ ' + ad.urls().getFinalUrl() + '. Errors: ' + adOperation.getErrors());
						}
					});
				var keyword = keywordsById[ adgroup.getId() + '_' + row.KeywordId ];
				var keywordOperation = newAdGroup.newKeywordBuilder()
					.withText( '[' + row.Query + ']' )
					.withCpc( keyword.bidding().getCpc() )
					.withFinalUrl( keyword.urls().getFinalUrl() )
					.build();
				if( keywordOperation.isSuccessful() ){
					var keyword = keywordOperation.getResult();
					keyword.pause();
					keyword.applyLabel( LABEL_NAME );
				}else{
					_.log( 'Keyword creation failed due to ' + keywordOperation.getErrors() );
				}
				
				_.iteratorToList( adgroup.targeting().audiences().get() ).forEach( function( audience ){
					//_.log( 'audience_id: ' + audience.getId() + ', name: ' + audience.getName() );
					var audienceOperation = newAdGroup.targeting().newUserListBuilder()
					  .withAudienceId( audience.getAudienceId() )
					  .withBidModifier( audience.bidding().getBidModifier() )
					  .build();
					if( audienceOperation.isSuccessful() ){
						// var audience2 = audienceOperation.getResult();
					}else{
						_.log( 'errors during creation of audience: ' + audienceOperation.getErrors() );
					}
				});
				
				
			}else{
				_.log( 'Adgroup creation failed due to: ' + adGroupOperation.getErrors() );
			}
			
		}else{
			_.log( 'no exact campaign found for ' + campaign.getName() );
		}
		
	});


	if( countAlreadyExistingAdgroups > 0 ){
		_.log( countAlreadyExistingAdgroups + ' exact adgroups already exist. Don\' recreate them.' );
	}
	
	if( count > 0 || text.length > 0 ){
		text = count + ' negative keywords added.' + NEW_LINE + text;
		
		if( SEND_EMAILS ){
			Logger.log( 'send emails ' );
			EMAILS.forEach( function( email ){
				_.mailGunHtml( email, 'sq-based-adgroup-creator-script for ' + AdWordsApp.currentAccount().getName(), text );
			});
		}else{
			Logger.log( 'don\'t send emails due to settings.' );
		}
	}else{
		Logger.log( 'Nothing done. No need to send emails.' );
	}
	
}




