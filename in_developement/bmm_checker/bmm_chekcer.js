
/* TODOs:
	- fix Alert-History:
		If problems-tab is limited by
		ITEM_LIMIT_FOR_SPREAD_SHEET then wrong alerts are inserted into Alert-History
	✓ trigger-column ( contains the cause of the alert )
	✓ alert-history (when was reported what)
	✓ last check
	✓ setting: BMM-indicator + EXACT-indicator
	- Summary should include totals ( not only change )
	✓ Mailgun
	✓ Limit row per account in Spreadsheet
	✓ Labels
	✓ Spreadsheet
	✓ Email settings from Sheet
	✓ Metrics for last 7 days
	✓ only Keywords with cost this week > 0
		- it is important to select a date range which inclueds today
		- NO. This doesn't work so well. Reversed it.
	✓ support for non-MCC-Accounts
	✓ Change (or delta)
	✓ make actions account level settings
		- label
		- pause
	- Problems
		- Display
			- keywords look like phrase or exact, but are, in fact, broad???
	✓ exclude ended campaigns
	✓ AccountIds instead of AccountNames ( there is an empty Account Name )
	- Scaling
		- limit the number of keywords?
		- check what happens if there are more than 10k keywords
		- bulk upload to pause many keywords
		✓ MCC parallel execution ( up to 50 accounts )
		- Bigquery version
			- Uploader script for Labels and pausing of keywords
			- Spreadsheet for summary and examples
*/

var DATE_RANGE = 'LAST_7_DAYS';

var NUM_DAYS = 7;

var DO_PAUSE = false;
var DO_LABEL = false;

var ITEM_LIMIT_FOR_SPREAD_SHEET = 50000;

var ACCOUNT_LIMIT = 500;
var ACCOUNT_IDS = [];
var IMPRESSION_THRESHOLD = 100000;

// Create a new Google Sheet and insert URL here:
// Peak Ace Active Clients MCC:	
//var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/19SuQtoM_t4m4F0KlsstsLpTReLHtiOvyiFxipbUovko/edit#gid=0';

// Test-MCC
var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1tKMdFaam5pSz8g5rE8pj4VaZgalLTXWXFMx0z0ZC-0M/edit#gid=809744080';

// Airbnb-Demand-Mcc
//var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1tWWidJhh5ZKL2jdfY11MB4cUCl1W_ynbY21eDEYxlIk/edit#gid=0';


// possible values: UNKNOWN, BASE, DRAFT, TRIAL
var CAMPAIGN_TRIAL_TYPES = [ 'BASE' ];

var TRIGGER_LIMIT = 5;

var DISABLED_CHECKS_PEAK_ACE = [
	//'CAMPAIGN_WITHOUT_ENABLED_KEYWORDS',
	'BIDDING_STRATEGY_IS_NOT_TARGET_ROAS',
	'BUDGET_NOT_EXPLICITLY_SHARED',
	'RESTRICTED_TARGETING_FOR_WWW_CAMPAIGNS',
	'UNEXPECTED_LOCATION_TARGETING_FOR_NON_WWW_CAMPAIGNS',
	'UNRESTRICTED_TARGETING_FOR_NON_WWW_CAMPAIGNS',
	// 'AUDIENCE_TARGETING_ENABLED',
	// 'EXCLUDED_DEVICES',
	// 'AD_ROTATION_NOT_OPTIMIZED',
	'CAMPAIGN_DOESNT_TARGET_SEARCH_PARTNERS',
	'RECENTLY_PAUSED_DYNAMIC_ADS',
	'RECENTLY_PAUSED_DYNAMIC_AD_GROUPS',
	'RECENTLY_PAUSED_DYNAMIC_CAMPAIGNS',
	// 'KEYWORD_DISAPPROVED_IN_NON_BRAND_CAMPAIGN',
	// 'KEYWORD_DISAPPROVED_IN_BRAND_CAMPAIGN',
	// 'BROAD_OR_PHRASE_KEYWORDS_IN_EXACT_AD_GROUP',
	'KEYWORD_WITHOUT_FINAL_URL',
	// 'ACCOUNT_CAMPAIGN_LANGUAGE_MISMATCH',
	// 'CAMPAIGN_ENABLED_ON_FRIDAY',
	// 'CAMPAIGN_TARGETS_CONTENT_NETWORK',
	// 'UNMODIFIED_BROAD',
	// 'WRONGLY_MODIFIED_BROAD',
	// 'BROAD_KEYWORDS_IN_EXACT_CAMPAIGN',
	// 'BROAD_KEYWORDS_IN_PHRASE_CAMPAIGN',
];

var DISABLED_CHECKS = DISABLED_CHECKS_PEAK_ACE;//[];



// -------------------------------------------
// --- START OF CONSTANTS --------------------

var GEO_TARGETS_URL = 'https://developers.google.com/adwords/api/docs/appendix/geo/geotargets-2020-03-03.csv';
var GEO_TARGETS = fetchGeoTargets();
var GEO_TARGET_NAMES = Object.keys( GEO_TARGETS );

function fetchGeoTargets(){
	var csv = UrlFetchApp.fetch( GEO_TARGETS_URL ).getContentText()
	var arr = Utilities.parseCsv( csv );
	var headers = arr.shift();
	var nameIndex = headers.indexOf( 'Name' );
	var idIndex = headers.indexOf( 'Criteria ID' );

	var res = {};
	arr.forEach( function( row ){
	// return row.reduce( function( obj, cell, index ){ obj[ headers[ index ] ] = cell; return obj }, {} );
	res[ row[ nameIndex ] ] = row[ idIndex ];
	});
	return res;
}

var LEVEL_SPECIFICS = {
	getText       : function( entity ){
		if( entity.getEntityType() == 'Account' ){
			return entity.getName();
		}
		if( entity.getEntityType() == 'Ad' ){
			var ad = entity;
			if( ad.isType().expandedTextAd() ){
				var expandedTextAd = ad.asType().expandedTextAd();
				var h1 = expandedTextAd.getHeadlinePart1();
				var h2 = expandedTextAd.getHeadlinePart2();
				var h3 = expandedTextAd.getHeadlinePart3();
				return h1 + ' / ' + h2 + ' / ' + h3;
			}
			return ad.getType();
		}
		if( entity.getEntityType() == 'Keyword' ){
			return entity.getText();
		}
		if( entity.getEntityType() == 'Campaign' ){
			return entity.getName();
		}
		throw new Error( 'unexpexcted entity type: ' + entity.getEntityType() );
	},
	getCampaignName : function( entity ){
		if( entity.getEntityType() == 'Account' ){
			return '-';
		}
		if( entity.getEntityType() == 'Campaign' ){
			return entity.getName();
		}
		if( typeof entity.getCampaign == 'function' ){
			return entity.getCampaign().getName();
		}
		throw new Error( 'unexpexcted entity type: ' + entity.getEntityType() );
	},
	getAdGroupName : function( entity ){
		if( [ 'Account', 'Campaign' ].indexOf( entity.getEntityType() ) >= 0 ){
			return '-';
		}
		if( [ 'AdGroup' ].indexOf( entity.getEntityType() ) >= 0 ){
			return entity.getName();
		}
		if( typeof entity.getAdGroup == 'function' ){
			return entity.getAdGroup().getName();
		}
		throw new Error( 'unexpexcted entity type: ' + entity.getEntityType() );
	},
	getKeywordText : function( entity ){
		if( [ 'Account', 'Campaign', 'AdGroup' ].indexOf( entity.getEntityType() ) >= 0 ){
			return '-';
		}
		if( [ 'Keyword' ].indexOf( entity.getEntityType() ) >= 0 ){
			return entity.getText();
		}
		if( typeof entity.getKeyword == 'function' ){
			return entity.getKeyword().getText();
		}
		throw new Error( 'unexpexcted entity type: ' + entity.getEntityType() );
	},
};

function columnName( metric, dateRange ){
	return metric + ' ' + dateRange.replace( /_/g, ' ' ).toLowerCase();
}

function unexpected( settingName, attributeName ){
	return function( settings ){
		var condition = 'CampaignName = "HOPEFULLY THERE IS NO CAMPAIGN WITH THIS NAME"';
		if( settings[ settingName ] && settings[ settingName ] != '' ){
			var expectedValues = settings[ settingName ]
				.split( ',' )
				.map( function( str ){ return str.trim() } )
				.filter( onlyUnique )
			;
			condition = attributeName + ' NOT_IN [ "' + expectedValues.join( '","' ) + '" ]';
			//Logger.log( condition );
		}
		return condition;
	};
}


var CHECKS = {
	CAMPAIGN_WITHOUT_ENABLED_KEYWORDS : {
		PRIORITY : 'PRIORITY_2',
		LEVEL  : [ 'campaigns' ],
		DATE_RANGE : 'YESTERDAY',
		CONDITIONS : [
			'AdvertisingChannelType = SEARCH',
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
			'ServingStatus = SERVING',
			'Impressions = 0',
			'Clicks = 0',
		],
		STATUS_CONDITIONS : {
			ENABLED : [
				'CampaignStatus IN [ ENABLED ]',
			],
		},
		POST_FETCH_CHECK : function(){
			return function( items ){
				if( items.length == 0 ){
					return items;
				}
				var campaignIds = items.map( 'getId' );
				// Logger.log( '>> ' + campaignIds.length + ' - ' + campaignIds.slice( 0, 5 ) );
				var campaignIdsWithKeywords = toList(
					AdsApp.keywords()
						.withCondition(
							'CampaignTrialType IN [ '
							+ CAMPAIGN_TRIAL_TYPES.join( ',' )
							+ ' ]'
						)
						.withCondition( 'AdGroupStatus IN [ ENABLED ]' )
						.withCondition( 'Status IN [ ENABLED ]' )
						.withCondition( 'CampaignId IN [' + campaignIds.join( ',' ) + ']' )
						.get()
				).map( 'getCampaign', 'getId' );
				
				return items.filter( 'getId', function( campaignId ){
					return campaignIdsWithKeywords.indexOf( campaignId ) == -1;
				});
			};
		},
	},
	BIDDING_STRATEGY_IS_NOT_TARGET_ROAS : {
		PRIORITY   : 'PRIORITY_2',
		LEVEL      : [ 'campaigns' ],
		TRIGGER    : 'getBiddingStrategyType',
		CONDITIONS : [
			'BiddingStrategyType != TARGET_ROAS',
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
		],
		STATUS_CONDITIONS : {
			ENABLED : [
				'CampaignStatus IN [ ENABLED ]',
			],
		},
	},
	BUDGET_NOT_EXPLICITLY_SHARED : { // 3209
		PRIORITY : 'PRIORITY_2',
		LEVEL  : [ 'campaigns' ],
		CONDITIONS : [
			'IsBudgetExplicitlyShared = FALSE',
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
		],
		STATUS_CONDITIONS : {
			ENABLED : [
				'CampaignStatus IN [ ENABLED ]',
			],
		},
	},
	RESTRICTED_TARGETING_FOR_WWW_CAMPAIGNS : { // 0
		PRIORITY : 'PRIORITY_2',
		LEVEL  : [ 'targeting', 'targetedLocations' ],
		MAPPER : 'getCampaign',
		ID     : 'getId',
		TRIGGER    : 'getName',
		CONDITIONS : [
			'CampaignName CONTAINS "WWW"',
			//'EndDate > "' + todaysDate() + '"',
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
		],
		STATUS_CONDITIONS : {
			ENABLED : [
				'CampaignStatus IN [ ENABLED ]',
			],
		},
	},
	UNEXPECTED_LOCATION_TARGETING_FOR_NON_WWW_CAMPAIGNS : {
		PRIORITY   : 'PRIORITY_2',
		LEVEL      : [ 'targeting', 'targetedLocations' ],
		MAPPER     : 'getCampaign',
		ID         : 'getId',
		TRIGGER    : 'getName',
		CONDITIONS : [
			'CampaignName DOES_NOT_CONTAIN "WWW"',
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
			function( settings ){
				var condition = 'CampaignName = "HOPEFULLY THERE IS NO CAMPAIGNS WITH THIS NAME"';
				if( settings[ 'Locations' ] && settings[ 'Locations' ] != '' ){
					var expectedLocations = settings[ 'Locations' ]
						.split( ',' )
						.map( function( str ){ return str.trim() } )
						.filter( onlyUnique )
					;
					// Sadly, conditions containing
					// "LocationName" are ignored by Google Ads.
					// We will use Ids instead.
					
					// Ignore unrecognized locations.
					expectedLocations = expectedLocations.filter( function( location ){
						return GEO_TARGET_NAMES.indexOf( location ) >= 0;
					});
					var ids = expectedLocations.map( GEO_TARGETS );
					if( ids.length == 0 ){
						Logger.log( 'only unrecognized locations found' );
					}else{
						condition = 'Id NOT_IN [ "'
							+ ids.join( '","' )
							+ '" ]'
						;
						Logger.log( condition );
					}
				}
				return condition;
			},
		],
		STATUS_CONDITIONS : {
			ENABLED : [
				'CampaignStatus IN [ ENABLED ]',
			],
			PAUSED : [
				'CampaignStatus IN [ PAUSED ]',
			],
		},
	},
	UNRESTRICTED_TARGETING_FOR_NON_WWW_CAMPAIGNS : {
		PRIORITY   : 'PRIORITY_2',
		LEVEL      : [ 'targeting', 'targetedLocations' ],
		MAPPER     : 'getCampaign',
		ID         : 'getId',
		TRIGGER    : 'getName',
		CONDITIONS : [
			'CampaignName DOES_NOT_CONTAIN "WWW"',
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
		],
		STATUS_CONDITIONS : {
			ENABLED : [
				'CampaignStatus IN [ ENABLED ]',
			],
		},
		POST_FETCH_CHECK : function(){
			return function( items ){
				// items are campaigns which are OK here.
				var okCampaignIds = items.map( 'getId' );
				// Find all campaigns which are not in items.
				
				var selector = AdsApp.campaigns();
				
				var conditions = [
					'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
					'CampaignStatus IN [ ENABLED ]',
					'CampaignName DOES_NOT_CONTAIN "WWW"',
				];
				if( okCampaignIds.length > 0 ){
					conditions.push( 'Id NOT_IN [' + okCampaignIds.join( ',' ) + ']' );
				}
				
				selector = conditions.reduce(
					function( selector, cond ){ return selector.withCondition( cond ) },
					selector
				);
				
				return toList( selector.get() );
			};
		},
	},
	AUDIENCE_TARGETING_ENABLED : {
		PRIORITY : 'PRIORITY_2',
		LEVEL : [ 'campaigns' ],
		CONDITIONS : [
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
		],
		STATUS_CONDITIONS : {
			ENABLED : [
				'CampaignStatus IN [ ENABLED ]',
			],
		},
		POST_FETCH_CHECK : function(){
			return function( items ){
				return items.filter( function( item ){
					return item.targeting()
						.getTargetingSetting( 'USER_INTEREST_AND_LIST' )
						== 'TARGET_ALL_FALSE' // "Target & Bid";
				});
				// https://groups.google.com/forum/#!searchin/adwords-scripts/USER_INTEREST_AND_LIST|sort:date/adwords-scripts/CNUr7-hY1Qw/8Ff-QKYUAQAJ
			};
		},
	},
	EXCLUDED_DEVICES : {
		PRIORITY : 'PRIORITY_2',
		LEVEL : [ 'targeting', 'platforms' ],
		MAPPER : 'getCampaign',
		ID : 'getId',
		TRIGGER    : 'getName',
		CONDITIONS : [
			'BidModifier < .1',
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
		],
		STATUS_CONDITIONS : {
			ENABLED : [ 'CampaignStatus IN [ ENABLED ]', ],
		},
	},
	AD_ROTATION_NOT_OPTIMIZED : {
		PRIORITY    : 'PRIORITY_2',
		LEVEL       : [ 'campaigns' ],
		CONDITIONS  : [
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
		],
		TRIGGER     : 'getAdRotationType',
		STATUS_CONDITIONS : {
			ENABLED : [
				'CampaignStatus IN [ ENABLED ]',
			],
		},
		POST_FETCH_CHECK : function( settings ){
			return function( items ){
				return items.filter( function( item ){
					return item.getAdRotationType() != 'OPTIMIZE';	
				});
			};
		},
	},
	CAMPAIGN_DOESNT_TARGET_SEARCH_PARTNERS : {
		PRIORITY : 'PRIORITY_2',
		LEVEL : [ 'campaigns' ],
		CONDITIONS : [
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
			'AdvertisingChannelType = SEARCH',
			'TargetSearchNetwork = FALSE',
		],
		STATUS_CONDITIONS : {
			ENABLED : [
				'CampaignStatus IN [ ENABLED ]',
			],
			PAUSED : [
				'CampaignStatus IN [ PAUSED ]',
			],
		},
	},
	RECENTLY_PAUSED_DYNAMIC_ADS : {
		PRIORITY : 'PRIORITY_1',
		LEVEL      : [ 'ads' ],
		DATE_RANGE : 'YESTERDAY',
		CONDITIONS : [
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
			'AdType = DYNAMIC_SEARCH_AD',
			'Impressions > 0',
		],
		STATUS_CONDITIONS : {
			PAUSED : [
				'CampaignStatus IN [ ENABLED ]',
				'AdGroupStatus IN [ ENABLED ]',
				'Status IN [ PAUSED ]',
			],
		},
	},
	RECENTLY_PAUSED_DYNAMIC_AD_GROUPS : {
		PRIORITY : 'PRIORITY_1',
		LEVEL      : [ 'adGroups' ],
		DATE_RANGE : 'YESTERDAY',
		CONDITIONS : [
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
			'AdGroupType = SEARCH_DYNAMIC_ADS',
			'Impressions > 0',
		],
		STATUS_CONDITIONS : {
			PAUSED : [
				'CampaignStatus IN [ ENABLED ]',
				'AdGroupStatus IN [ PAUSED ]',
			],
		},
	},
	RECENTLY_PAUSED_DYNAMIC_CAMPAIGNS : {
		PRIORITY : 'PRIORITY_1',
		LEVEL      : [ 'campaigns' ],
		DATE_RANGE : 'YESTERDAY',
		CONDITIONS : [
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
			'Impressions > 0',
			function( settings ){
				var setting = settings[ 'DSA' ];
				if( typeof setting == 'string' && setting.length > 0 ){
					return 'CampaignName CONTAINS "' + setting + '"';
				}
				// if no setting for DSA Indicator is set then
				// return a (hopefully) impossible condition.
				return 'Budget < 0.0';
			},
		],
		STATUS_CONDITIONS : {
			PAUSED : [
				'CampaignStatus IN [ PAUSED ]',
			],
		},
	},
	KEYWORD_DISAPPROVED_IN_NON_BRAND_CAMPAIGN : {
		PRIORITY : 'PRIORITY_2',
		LEVEL : [ 'keywords' ],
		CONDITIONS : [
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
			'ApprovalStatus = "DISAPPROVED"',
			function( settings ){
				var setting = settings[ 'Brand' ];
				if( typeof setting == 'string' && setting.length > 0 ){
					return 'CampaignName DOES_NOT_CONTAIN "' + setting + '"';
				}
				// if no setting for Brand Indicator is set then
				// return a (hopefully) impossible condition.
				return 'MaxCpc < 0';
			},
		],
		STATUS_CONDITIONS : {
			ENABLED : [
				'CampaignStatus IN [ ENABLED ]',
				'AdGroupStatus IN [ ENABLED ]',
				'Status IN [ ENABLED ]'
			],
		},
	},
	KEYWORD_DISAPPROVED_IN_BRAND_CAMPAIGN : {
		PRIORITY : 'PRIORITY_1',
		LEVEL : [ 'keywords' ],
		CONDITIONS : [
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
			'ApprovalStatus = "DISAPPROVED"',
			function( settings ){
				var setting = settings[ 'Brand' ];
				if( typeof setting == 'string' && setting.length > 0 ){
					return 'CampaignName CONTAINS "' + setting + '"';
				}
				// if no setting for Brand Indicator is set then
				// return a (hopefully) impossible condition.
				return 'MaxCpc < 0';
			},
		],
		STATUS_CONDITIONS : {
			ENABLED : [
				'CampaignStatus IN [ ENABLED ]',
				'AdGroupStatus IN [ ENABLED ]',
				'Status IN [ ENABLED ]'
			],
		},
	},
	BROAD_OR_PHRASE_KEYWORDS_IN_EXACT_AD_GROUP : {
		PRIORITY : 'PRIORITY_1',
		LEVEL : [ 'keywords' ],
		CONDITIONS : [
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
			'KeywordMatchType IN [ PHRASE, BROAD ]',
			function( settings ){
				var setting = settings[ 'Exact' ];
				if( typeof setting == 'string' && setting.length > 0 ){
					return 'AdGroupName CONTAINS "' + setting + '"';
				}
				// if no setting for Exact Match Indicator is set then
				// return a (hopefully) impossible condition.
				return 'MaxCpc < 0';
			},
		],
		STATUS_CONDITIONS : {
			ENABLED : [
				'CampaignStatus IN [ ENABLED ]',
				'AdGroupStatus IN [ ENABLED ]',
				'Status IN [ ENABLED ]'
			],
		},
	},
	KEYWORD_WITHOUT_FINAL_URL : {
		PRIORITY : 'PRIORITY_1',
		LEVEL : [ 'keywords' ],
		CONDITIONS : [
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
			'FinalUrls = ""',
		],
		STATUS_CONDITIONS : {
			ENABLED : [
				'CampaignStatus IN [ ENABLED ]',
				'AdGroupStatus IN [ ENABLED ]',
				'Status IN [ ENABLED ]',
			],
			// PAUSED : [ 'CampaignStatus IN [ PAUSED ]', ],
		},
	},
	ACCOUNT_CAMPAIGN_LANGUAGE_MISMATCH : {
		PRIORITY   : 'PRIORITY_1',
		LEVEL      : [ 'targeting', 'languages' ],
		MAPPER     : 'getCampaign',
		ID         : 'getId',
		TRIGGER    : 'getName',
		CONDITIONS : [
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
			unexpected( 'Languages', 'LanguageName' ),
		],
		STATUS_CONDITIONS : {
			ENABLED : [ 'CampaignStatus IN [ ENABLED ]', ],
		},
	},
	CAMPAIGN_ENABLED_ON_FRIDAY : {
		PRIORITY : 'PRIORITY_1',
		LEVEL :[  'campaigns' ],
		CONDITIONS : [
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
			'StartDate = "' + todaysDate() + '"',
			( isFridayOrWeekend() ? '' : 'Budget < 0' ), // hopefully always false
		],
		STATUS_CONDITIONS : {
			ENABLED : [
				'CampaignStatus IN [ ENABLED ]',
			],
		},
	},
	CAMPAIGN_TARGETS_CONTENT_NETWORK : {
		PRIORITY : 'PRIORITY_1',
		LEVEL : [ 'campaigns' ],
		CONDITIONS : [
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
			'AdvertisingChannelType = SEARCH',
			'TargetContentNetwork = TRUE',
		],
		STATUS_CONDITIONS : {
			ENABLED : [
				'CampaignStatus IN [ ENABLED ]',
			],
			PAUSED : [
				'CampaignStatus IN [ PAUSED ]',
			],
		},
	},
	UNMODIFIED_BROAD                 : {
		PRIORITY : 'PRIORITY_1',
		LEVEL : [ 'keywords' ],
		CONDITIONS : [
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
			'KeywordMatchType = BROAD',
			'Text DOES_NOT_CONTAIN "+"',
		],
		STATUS_CONDITIONS : {
			ENABLED : [
				'CampaignStatus IN [ ENABLED ]',
				'AdGroupStatus IN [ ENABLED ]',
				'Status IN [ ENABLED ]'
			],
		},
	},
	WRONGLY_MODIFIED_BROAD           : {
		PRIORITY : 'PRIORITY_1',
		LEVEL : [ 'keywords' ],
		CONDITIONS : [
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
			'KeywordMatchType = BROAD',
			'Text CONTAINS "+ "',
		],
		STATUS_CONDITIONS : {
			ENABLED : [
				'CampaignStatus IN [ ENABLED ]',
				'AdGroupStatus IN [ ENABLED ]',
				'Status IN [ ENABLED ]'
			],
		},
		POST_FETCH_CHECK : function( settings ){
			return function( items ){
				return items.filter( function( item ){
					return item.getText().match( /^\w|[\s-\.]\w/g ) !== null;
				});
			};
		},
	},
	BROAD_KEYWORDS_IN_EXACT_CAMPAIGN : {
		PRIORITY : 'PRIORITY_1',
		LEVEL : [ 'keywords' ],
		CONDITIONS : [
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
			'KeywordMatchType = BROAD',
			function( settings ){
				var setting = settings[ 'Exact' ];
				if( typeof setting == 'string' && setting.length > 0 ){
					return 'CampaignName CONTAINS "' + setting + '"';
				}
				// if no setting for Exact Match Indicator is set then
				// return a (hopefully) impossible condition.
				return 'MaxCpc < 0';
			},
		],
		STATUS_CONDITIONS : {
			ENABLED : [
				'CampaignStatus IN [ ENABLED ]',
				'AdGroupStatus IN [ ENABLED ]',
				'Status IN [ ENABLED ]'
			],
		},
	},
	BROAD_KEYWORDS_IN_PHRASE_CAMPAIGN : {
		PRIORITY : 'PRIORITY_1',
		LEVEL : [ 'keywords' ],
		CONDITIONS : [
			'CampaignTrialType IN [ ' + CAMPAIGN_TRIAL_TYPES.join( ',' ) + ' ]',
			'KeywordMatchType = BROAD',
			function( settings ){
				var setting = settings[ 'Phrase' ];
				if( typeof setting == 'string' && setting.length > 0 ){
					return 'CampaignName CONTAINS "' + setting + '"';
				}
				// if no setting for Phrase Match Indicator is set then
				// return a (hopefully) impossible condition.
				return 'MaxCpc < 0';
			},
		],
		STATUS_CONDITIONS : {
			ENABLED : [
				'CampaignStatus IN [ ENABLED ]',
				'AdGroupStatus IN [ ENABLED ]',
				'Status IN [ ENABLED ]'
			],
		},
	},
};

var CONDITIONAL_FORMATS = [];

var COLORS = {
	PRIORITY_1 : '#FFAAAA', // red
	PRIORITY_2 : '#FFFFAA', // yellow
	PRIORITY_3 : '#AAFFAA', // green
};

for( name in CHECKS ){
	var prio = CHECKS[ name ].PRIORITY;
	CONDITIONAL_FORMATS.push({
		whenTextEqualTo : name,
		setBackground : COLORS[ prio ],
	});
}




var TABS = [
	{	tabName    : '1. SUMMARY',
		type       : 'output',
		sortColumn : columnName( 'Cost', DATE_RANGE ),
		columns    : [
			{
				name  : 'Account Id',
				isKey : true,
			},
			{
				name  : 'Account Name',
				// isKey : true,
			},
			{
				name  : 'Status',
				isKey : true,
			},
			{
				name  : 'Problem',
				isKey : true,
				conditionalFormats : CONDITIONAL_FORMATS,
			},
			{
				name : 'Count',
			},
			{
				name : 'Change',
				deltaOf : 'Count',
				numberFormat : '+##0;-##0;-;@',
				conditionalFormats : [
					{
						whenNumberGreaterThan : 0,
						setBackground : '#FFAAAA',
					},
					{
						whenNumberLessThan : 0,
						setBackground : '#AAFFAA',
					}
				],
			},
			{
				name : 'Trigger',
			},
			{
				name : columnName( 'Cost', DATE_RANGE ),
			},
			{
				name : columnName( 'Conversions', DATE_RANGE ),
			},
		],
	},
	{	tabName    : '2. PROBLEMS',
		sortColumn : columnName( 'Cost', DATE_RANGE ),
		type       : 'output',
		columns    : [
			{
				name  : 'Account Id',
				isKey : true,
			},
			{
				name : 'Account Name',
				// isKey : true,
			},
			{
				name : 'Campaign',
				isKey : true,
			},
			{
				name : 'AdGroup',
				isKey : true,
			},
			{
				name : 'Keyword',
				isKey : true,
			},
			{
				name : 'Campaign/Ad-Group/Keyword-Status',
				isKey : true,
			},
			{
				name : 'Problem',
				isKey : true,
				conditionalFormats : CONDITIONAL_FORMATS,
			},
			{
				name : 'Action',
				conditionalFormats : [
					{
						whenTextEqualTo : 'PAUSED',
						setBackground : '#FFAAAA',
					},
				],
			},
			{
				name : 'Trigger',
			},
			{
				name : columnName( 'Cost', DATE_RANGE ),
			},
			{
				name : columnName( 'Conversions', DATE_RANGE ),
			},
			
		],
	},
	{	tabName    : '3. SETTINGS',
		type       : 'input',
		columns    : [
			{
				name  : 'Account Id',
				isKey : true,
			},
			{
				name : 'Account Name',
				// isKey : true,
			},
			{
				name : 'Emails',
			},
			{
				name : 'Pause',
			},
			{
				name : 'Label',
			},
			{
				name : 'Exact',
			},
			{
				name : 'Phrase',
			},
			{
				name : 'Brand',
			},
			{
				name : 'DSA',
			},
			{
				name : 'Languages',
			},
			{
				name : 'Locations',
			},
		],
	},
	{	tabName    : '4. ALERT HISTORY',
		sortColumn : 'Time',
		type       : 'output',
		columns    : [
			{
				name  : 'Account Id',
				isKey : true,
			},
			{
				name : 'Account Name',
			},
			{
				name : 'Campaign',
				isKey : true,
			},
			{
				name : 'AdGroup',
				isKey : true,
			},
			{
				name : 'Keyword',
				isKey : true,
			},
			{
				name : 'Campaign/Ad-Group/Keyword-Status',
				isKey : true,
			},
			{
				name : 'Problem',
				isKey : true,
				conditionalFormats : CONDITIONAL_FORMATS,
			},
			{
				name : 'Action',
				conditionalFormats : [
					{
						whenTextEqualTo : 'PAUSED',
						setBackground : '#FFAAAA',
					},
				],
			},
			{
				name : 'Trigger',
			},
			{
				name : columnName( 'Cost', DATE_RANGE ),
			},
			{
				name : columnName( 'Conversions', DATE_RANGE ),
			},
			{
				name : 'Time',
			},
		],
	},
];


var SCRIPT_NAME = 'best_practice_checker';
//var COLUMN_SEPARATOR = ';';
//var LINE_SEPARATOR = '\n';

// --- END OF CONSTANTS ----------------------
// -------------------------------------------

function getAccountSelector(){
	if( typeof MccApp == 'undefined' ){
		return null;
	}
	var selector = MccApp.accounts();
	if( ACCOUNT_IDS.length > 0 ){
		selector = selector.withIds( ACCOUNT_IDS );
	}
	if( ACCOUNT_LIMIT ){
		selector = selector.withLimit( ACCOUNT_LIMIT );
	}
	if( IMPRESSION_THRESHOLD ){
		selector = selector
			.withCondition( 'Impressions > ' + IMPRESSION_THRESHOLD )
			.forDateRange( 'LAST_7_DAYS' )
		;
	}
	return selector;
}

function getAccounts(){
	if( typeof MccApp == 'undefined' ){
		return [ AdsApp.currentAccount ];
	}
	var selector = getAccountSelector();
	var accounts = toList( selector.get() )
		.filter( 'getName', function( name ){ return name && name != '' } )
	;
	return accounts;
}

function forAllAccounts( action ){
	var accounts = getAccounts();
	Logger.log( accounts.length + ' account' + ( accounts.length > 1 ? 's' : '' ) );
	accounts.forEach( function( account ){
		Logger.log( account.getName() + ' [ ' + account.getCustomerId() + ' ] ' );
	});
	
	var mainAccount = AdsApp.currentAccount();
	var allResults = accounts.map( function( account ){
		if( typeof MccApp != 'undefined' ){
			MccApp.select( account );
		}
		return action( account );
	});
	if( typeof MccApp != 'undefined' ){
		MccApp.select( mainAccount );
	}
	return allResults;
}

function getItemsFromReport( reportDefinition, statusConditions, settings ){
	var query = '';
	query += 'SELECT ' + reportDefinition.SELECT.join( ', ' ) + ' ';
	query += 'FROM ' + reportDefinition.FROM + ' ';
	
	var where = reportDefinition.WHERE
		.concat( statusConditions )
		.map( computeCondition( settings ) )
	;
	
	if( where.length > 0 ){
		query += 'WHERE ' + where.join( ' AND ' ) + ' ';
	}
	if( reportDefinition.DURING && reportDefinition.DURING.length > 0 ){
		query += 'DURING ' + reportDefinition.DURING + ' ';
	}
	return toList( AdsApp.report( query, REPORT_SETTINGS ).rows() );
}

function computeCondition( settings ){
	return function( condition ){
		if( typeof condition == 'string' ){
			return condition;
		}
		if( typeof condition == 'function' ){
			return condition( settings );
		}
		throw new Error( 'Unexpected condition type: ' + ( typeof condition ) );
	}
}

function getItemsBySelector( check, statusConditions, settings ){
	
	function apply2( obj, method ){
		return obj[ method ]();
	}
	
	var selector = check.LEVEL.reduce( apply2, AdsApp );
	
	if( check.DATE_RANGE ){
		selector = selector.forDateRange( check.DATE_RANGE );
	}
	
	selector = check.CONDITIONS
		.concat( statusConditions )
		.map( computeCondition( settings ) )
		.reduce( function( selector, condition ){
			// Logger.log( selector + '.witchCondition( ' + condition + ' )' );
			return selector.withCondition( condition );
	}, selector );
	
	var iter = selector.get();
	if( iter.totalNumEntities() == 0 ){
		// Logger.log( 'nothing found' );
	}else{
		// Logger.log( 'Found ' + iter.totalNumEntities() );
	}
	
	var items = toList( iter );
	return items;
}

function executeCheck(
		account,
		name,
		check,
		statusConditionsName,
		statusConditions,
		settings
	){
	
	if( typeof settings == 'undefined' ){
		throw new Error(
			'no settings available for account "'
			+ account.getName() + '"'
			+ ' [' + account.getCustomerId() + '['
		);
	}
	// Logger.log( 'check ' + statusConditionsName + ' : ' + name );
	
	var brokenItems = getItemsBySelector( check, statusConditions, settings );
	
	
	//Logger.log( 'items: ' + brokenItems.length );
	
	if( check.MAPPER ){
		brokenItems = brokenItems
			// TODO: get shoppingCampaigns instead of filtering them out
			.filter(
				check.MAPPER,
				function( item ){ return item != null }
			)
		;
		
		var trigger = {};
		if( check.TRIGGER ){
			trigger = group( brokenItems )
				.by(
					check.MAPPER,
					check.ID
				).all(
					check.TRIGGER
				)
			;
		}
		
		brokenItems = brokenItems.map( check.MAPPER );
		
		// keep only unique items
		var map = {};
		brokenItems.forEach( function( item ){
			var key = item[ check.ID ]();
			map[ key ] = item;
		});
		brokenItems = Object.values( map );
		
		// add trigger
		brokenItems.forEach( function( item ){
			if( check.TRIGGER ){
				var key = item[ check.ID ]();
				item.trigger = trigger[ key ].slice( 0, TRIGGER_LIMIT );
			}else{
				item.trigger = [];
			}
		});
	}else{
		if( check.TRIGGER ){
			brokenItems.forEach( function( item ){
				item.trigger = [ item[ check.TRIGGER ]() ];
			});
		}else{
			brokenItems.forEach( function( item ){
				item.trigger = [];
			});
		}
	}
	//Logger.log( 'items2: ' + brokenItems.length );
	
	if( typeof check.POST_FETCH_CHECK == 'function' ){
		brokenItems = check.POST_FETCH_CHECK( settings )( brokenItems );
	}
	
	// exclude ended campaigns
	brokenItems = brokenItems
		.filter( function( item ){
			if( typeof item.getCampaign == 'function' ){
				item = item.getCampaign();
			}
			if( item.getEntityType() == 'Campaign' ){
				var date = item.getEndDate();
				var now = new Date();
				var campaignEnded = date !== null
					&& new Date( date.year, date.month - 1, date.day ) <= now
				;
				return ! campaignEnded;
			}
			// Not possible to tell whether this
			// item belongs to an ended campaign.
			// Keep it.
			return true;
		})
	;
	
	if( brokenItems.length == 0 ){
		//Logger.log( 'nothing found2' );
		// nothing to do
		return [];
	}
	
	Logger.log(
		'Found '
		+ brokenItems.length
		+ ' '
		+ name
		+ ' with status '
		+ statusConditionsName
		+ ' in '
		+ AdsApp.currentAccount().getName()
	);
	
	var actions = [];
	
	if(
		DO_LABEL
		&& settings[ 'Label' ] == 'yes'
		){
		brokenItems.forEach( function( item ){
			Logger.log( 'label ' + LEVEL_SPECIFICS.getText( item ) );
			var applied = label( item, name );
			if( applied ){
				actions.push( 'labeled' );	
			}
		});
	}
	
	if(
		DO_PAUSE
		&& settings[ 'Pause' ] == 'yes'
		&& statusConditionsName == 'ENABLED'
		){
			brokenItems.forEach( function( item ){
				Logger.log( 'pause ' +  LEVEL_SPECIFICS.getText( item ) );
				actions.push( 'paused' );
				item.pause();
			});
	}
	
	return brokenItems.map( function( item ){
		var stats = item.getStatsFor( DATE_RANGE );
		var res2 = {
			'Account Id'       : account.getCustomerId(),
			'Account Name'     : account.getName(),
			'Campaign'         : LEVEL_SPECIFICS.getCampaignName( item ),
			//'CampaignStatus' : getStatus( item.getCampaign() ),
			'AdGroup'          : LEVEL_SPECIFICS.getAdGroupName( item ),
			//'AdGroupStatus'  : getStatus( item.getAdGroup() ),
			'Keyword'          : LEVEL_SPECIFICS.getKeywordText( item ),
			//'Status'         : getStatus( item ),
			'Campaign/Ad-Group/Keyword-Status'       : statusConditionsName,
			'Problem'          : name,
			'Action'           : actions.join( ', ' ),
			'Trigger'          : item.trigger || [],
		};
		res2[ columnName( 'Cost', DATE_RANGE ) ] = Math.round( stats.getCost() * 100 ) / 100;
		res2[ columnName( 'Conversions', DATE_RANGE ) ] = Math.round( stats.getConversions() * 100 ) / 100;
		return res2;
	});
}

function limitPerKey( items, keys, limit ){
	if( items.length < limit ){
		return items;
	}
	var listsPerKey = Object.values(
		group( items ).by( function( item ){
			return keys.map( item ).join( ',' );
		}).all()
	);
	
	var res = [];
	var index = 0;
	while( res.length < limit ){
		listsPerKey.forEach( function( list ){
			if( index < list.length ){
				res.push( list[ index ] );
			}
		});
		index++;
	}
	return res;
}

function processAccount( json ){
	try{
		var account = AdsApp.currentAccount();
		
		Logger.log( 'Account: ' + account.getName() + '[' + account.getCustomerId() + ']' );
		
		var settings = JSON.parse( json );
		var settings = settings[ account.getCustomerId() ];
		
		//Logger.log( JSON.stringify( settings, null, 2 ) );
		
		if( DO_LABEL ){
			Object.keys( CHECKS ).forEach( function( labelName ){
				if( ! getLabel( labelName ) ){
					AdsApp.createLabel( labelName );
				}
			});
		}
		var duration = {};
		
		var res = JSON.stringify( Object.entries( CHECKS )
			.filter( function( [ name, check ] ){
				return DISABLED_CHECKS.indexOf( name ) == -1;
			})
			.map(
				function( [ name, check ] ){
					return Object.entries( check.STATUS_CONDITIONS )
						.map(
							function( [ statusConditionsName, statusConditions ] ){
								var start = new Date().getTime();
								
								var res = executeCheck(
									account,
									name,
									check,
									statusConditionsName,
									statusConditions,
									settings
								);
								
								duration[ statusConditionsName + ' - ' + name ] 
									= Math.round( ( new Date().getTime() - start ) / 10 ) / 100;
								
								return res;
							}
					).reduce( concat, [] );
				}
		).reduce( concat, [] ), null, 2 );
		
		if( Object.values( duration ).filter( function( x ){ return x > 120 } ).length > 0 ){
			Logger.log( account.getName() + ': ' + JSON.stringify( duration, null, 2 ) );
		}
		return res;
	} catch ( error ){
		handleError( error );
	}
}

function getSettings(){
	var accountsData = getAccounts()
		.map(
		{
			'Account Id'             : 'getCustomerId',
			'Account Name'           : 'getName',
			'Emails'                 : constant( '' ),
			'Pause'                  : constant( 'no' ),
			'Label'                  : constant( 'no' ),
			'Exact'                  : constant( '' ),
			'Phrase'                 : constant( '' ),
			'Brand'                  : constant( '' ),
			'DSA'                    : constant( '' ),
			'Languages'              : constant( '' ),
			'Locations'              : constant( '' ),
		}
	);
	var settings = mySpreadSheetApp( TABS[ 2 ], accountsData ).data;
	
	// --- check duplicate account settings -------
	var duplicateAccountSettings =
		Object.entries(
			group( settings ).by( 'Account Id' ).count()
		).filter( function( [ accountId, count ] ){ return count > 1 } )
	;
	
	if( duplicateAccountSettings.length > 0	){
			throw new Error(
				'duplicate Account Settings found for '
				+ duplicateAccountSettings.map( 0 ).join( ', ' )
			);
	}
	// --------------------------------------------
	
	return settings;
}

function main(){
	Logger.log( 'start' );
	try{
		var settings = getSettings();
		var groupedSettings = group( settings ).by( 'Account Id' ).any();
		
		Logger.log( 'execute in parallel' );
		
		getAccountSelector()
			//.withIds( [ '1679569967' ] )
			//.withLimit( 1 )
			.executeInParallel( 'processAccount', 'finalProcessing', JSON.stringify( groupedSettings ) )
		;
		
		// Logger.log( 'groupedSettings: ' + JSON.stringify( groupedSettings, null, 2 ) );
		
	} catch ( error ){
		handleError( error );
	}
	//Logger.log( 'end' );
}

function finalProcessing( results ){
	try{
		Logger.log( 'final processing' );
		
		var settings = getSettings();
		
		var allBrokenKeywords = results
			.filter( 'getReturnValue', unequalTo( 'undefined' ) ) // ignore empty results
			.filter( 'getReturnValue', isDefined ) // ignore threads with errors ( return value is null )
			.map( 'getReturnValue' )
			.map( JSON.parse )
			.reduce( concat, [] )
		;
		
		var allBrokenKeywords2 = limitPerKey(
			allBrokenKeywords,
			[ 'Account Id', 'Problem' ],
			ITEM_LIMIT_FOR_SPREAD_SHEET
		);
		
		var resultsSummary = mySpreadSheetApp(
			TABS[ 0 ],
			getSummary( allBrokenKeywords )
			,false
		);
		var resultsProblems = mySpreadSheetApp(
			TABS[ 1 ],
			allBrokenKeywords2
			,false
		);
		
		var newBrokenKeywords = resultsProblems
			.matched
			.newOnly
			.filter( 'Campaign/Ad-Group/Keyword-Status', equals( 'ENABLED' ) )
		;
		
		newBrokenKeywords.forEach( function( item ){
			item.Time = todaysDateTime();
		});
		
		var resultsProblems = mySpreadSheetApp(
			TABS[ 3 ],
			newBrokenKeywords
			,true // true == keep old
		);
		
		var emailSettings = getEmailsFrom( settings );
		
		Object.entries( emailSettings ).forEach( function( pair ){
			var email = pair[ 0 ];
			var accountIds = pair[ 1 ];
			
			var brokenKeywords = newBrokenKeywords.filter( function( keyword ){
				return accountIds.indexOf( keyword[ 'Account Id' ] ) >= 0;
			});
			
			report( email, brokenKeywords );
		});
		Logger.log( 'end' );
	} catch ( error ){
		handleError( error );
	}
}

function getEmailsFrom( settings ){
	var emailSettings = {};
	settings.forEach( function( row ){
		row
			[ 'Emails' ]
			.split( ',' )
			.map( function( str ){ return str.trim() } )
			.filter( function( str ){ return str != '' } )
			.forEach( function( email ){
				emailSettings[ email ] = emailSettings[ email ] || [];
				emailSettings[ email ].push( row[ 'Account Id' ] );
			})
		;
	});
	return emailSettings;
}

function handleError( error ){
	var accountName = AdWordsApp.currentAccount().getName();
	var subject = 'Error in ' + SCRIPT_NAME + ' ' + accountName;
	var message = error + '\n' + error.stack;
	Logger.log( subject + ' -> ' + message );
	if ( ! AdWordsApp.getExecutionInfo().isPreview() ){
		if( typeof ERROR_REPORTING_EMAILS != 'undefined' ){
			ERROR_REPORTING_EMAILS.forEach( function( email ){
				MailApp.sendEmail( email, subject, message );
			});
		}
	} else {
		Logger.log( 'don\'t send error-emails in preview-mode' );
	}
	throw error;
}

function getStatus( item ){
	return item.isEnabled() ? 'ENABLED' : item.isPaused() ? 'PAUSED' : 'REMOVED';
}

function summary( brokenEntities ){
	var res = {};
	brokenEntities.forEach( function( entity ){
		var key = 'In '
			+ entity[ 'Account Name' ]
			+ ' found new '
			+ ( entity[ 'Action' ] == 'paused' ? '<b>' : '' )
			+ entity[ 'Problem' ].replace( /_/g, ' ' ).toLowerCase()
			+ ( entity[ 'Action' ] == 'paused' ? '</b>' : '' )
		;
		if( [
			'PAUSED_CAMPAIGN',
			'PAUSED_AD_GROUP',
			].indexOf( entity[ 'Campaign/Ad-Group/Keyword-Status' ] ) >= 0 ){
			key = key
				+ ' keyword(s) in '
				+ entity[ 'Campaign/Ad-Group/Keyword-Status' ].replace( /_/g, ' ' ).toLowerCase()
				//+ '(s)'
				+ ( entity[ 'Action' ] == 'paused' ? ' and paused them/it' : '' )
			;
		}else{
			key = key
				+ ' '
				+ entity[ 'Campaign/Ad-Group/Keyword-Status' ].replace( /_/g, ' ' ).toLowerCase()
				//+ '(s)'
				+ ( entity[ 'Action' ] == 'paused' ? ' and <b>paused</b> them/it' : '' )
			;
		}
		res[ key ] = ( res[ key ] || 0 ) + 1;
	});
	var res2 = Object.entries( res )
		.map( function( [ key, count ] ){ return key + ' : ' + count } )
		.join( '<br>' )
	;
	return res2 + '<br><br>See <a href="' + SPREADSHEET_URL + '">Google Spreadsheet</a> for more information: ';
}

function report( email, brokenEntities ){
	if( brokenEntities.length == 0 ){
		Logger.log( 'nothing to report to ' + email );
		return;
	}
	
	Logger.log( 'Headers: ' + Object.keys( brokenEntities[ 0 ] ) );
	Logger.log( 'Count: ' + brokenEntities.length );
	Logger.log( 'First: ' + JSON.stringify( brokenEntities[ 0 ], null, 2 ) );
	
	// var attachment = [ Object.keys( brokenEntities[ 0 ] ) ]
	// 	.concat( brokenEntities.map( Object.values ) )
	// 	.map( join( COLUMN_SEPARATOR ) )
	// 	.join( LINE_SEPARATOR )
	// ;
	Logger.log( 'send emails to : ' + email );
	
	var method = 'sendEmail'; //sendEmailInPreview
	
	MailApp[ method ]({
		to       : email,
		subject  : 'Best Practice violations found in ' + AdsApp.currentAccount().getName(),
		htmlBody : summary( brokenEntities ),
		// attachments: [
		// 	Utilities.newBlob(
		// 		attachment,
		// 		'text/csv',
		// 		'broken_keywords_.csv'
		// 	),
		// ],
	});
}

var printOnce = (function(){
	var printedOnce = {};
	return function( str ){
		if( ! printedOnce[ str ] ){
			printedOnce[ str ] = true;
			Logger.log( str );
		}
	};
})();

function getLabel( name ){
	var iter = AdsApp.labels().withCondition( 'Name = ' + name ).get();
	if( iter.hasNext() ){
		return iter.next();
	}
}

function label( entity, labelName ){
	var label = getLabel( labelName );
	if( !label ){
		if( AdWordsApp.getExecutionInfo().isPreview() ){
			printOnce( 'labeling doesn\'t work in preview mode. Skip it.' );
			return false;
		}else{
			Logger.log( 'create label: ' + labelName );
			AdsApp.createLabel( labelName );
		}
	}
	
	if( toList( entity.labels().get() ).map( 'getName' ).indexOf( labelName ) >= 0 ){
		printOnce( 'already labeled' );
		return false;
	}else{
		entity.applyLabel( labelName );
		return true;
	}
}

function getSummary( items ){
	var separator = ' <<>> ';
	var res = _.group( items )
		.by( function( item ){
			var key = ''
				+ item[	'Account Id' ]
				+ separator
				+ item[	'Account Name' ]
				+ separator
				+ item[ 'Campaign/Ad-Group/Keyword-Status' ]
				+ separator
				+ item[ 'Problem' ]
			;
			return key;
		})
		.all()
	;
	return Object.entries( res ).map( function( entry ){
		var keys = entry[ 0 ].split( separator );
		var items = entry[ 1 ];
		var res2 = {
			'Account Id'   : keys[ 0 ],
			'Account Name' : keys[ 1 ],
			'Status'       : keys[ 2 ],
			'Problem'      : keys[ 3 ],
			'Count'        : items.length,
			'Change'       : 0,
			'Trigger'      : items
				.map( 'Trigger' )
				.reduce( concat, [] )
				.filter( onlyUnique )
				.slice( 0, TRIGGER_LIMIT )
				.join( ', ' )
				.substring( 0, 70 ),
		};
		
		res2[ columnName( 'Cost', DATE_RANGE ) ] = Math.round(
			items
				.map( columnName( 'Cost', DATE_RANGE ) )
				.reduce( sum, 0 )
				* 100
		) / 100;
		res2[ columnName( 'Conversions', DATE_RANGE ) ] = Math.round(
			items
				.map( columnName( 'Conversions', DATE_RANGE ) )
				.reduce( sum, 0 )
				* 100
		) / 100;
		return res2;
	});
}

//--------- Tools --------------------------
var _ = {
	merge : function( oldData, newData, keys ){
		var matched = matchData( oldData, newData, keys );
		return [].concat(
			matched.oldOnly,
			matched.updated.map( 'newItem' ),
			matched.newOnly
		);
	},
	matchData : function( oldData, newData, keys ){
		var res = {
			oldOnly : [],
			updated : [],
			newOnly : [],
		};
		
		var groupedNew = group( newData ).byAll( keys );
		oldData.forEach( function( oldItem ){
			var newItem = keys.reduce(
				function( prev, key ){
					return prev ? prev[ oldItem[ key ] ] : prev;
				},
				groupedNew
			);
			if( !newItem ){
				res.oldOnly.push( oldItem );
			}else{
				res.updated.push(
					{
						oldItem : oldItem,
						newItem : newItem,
					}
				);
			}
		});
		var groupedOld = group( oldData ).byAll( keys );
		newData.forEach( function( newItem ){
			var oldItem = keys.reduce(
				function( prev, key ){
					return prev ? prev[ newItem[ key ] ] : prev;
				},
				groupedOld
			);
			if( !oldItem ){
				res.newOnly.push( newItem );
			}
		});
		
		return res;
	},
	property : function(){
		function apply( item, arg, index, array ){
			if( typeof arg == 'function' ){
				return arg( item, index, array );
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
			throw new Error( 'apply() can\'t determine what to do with ' + JSON.stringify( item, null, 2 ) + ' and ' + arg );
		}
		var args = Array.prototype.slice.call( arguments );
		return function( item, index, array ){
			// do NOT use reduce here, because apply will interpret the third argument :(
			var res = item;
			args.forEach( function( arg ){ res = apply( res, arg, index, array ) } );
			return res;
		};
	},
	group : function( rows ){
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
			throw new Error( 'apply() can\'t determine what to do with ' + JSON.stringify( item, null, 2 ) + ' and ' + arg );
		}
		if( ! rows ){
			throw new Error( 'rows is undefined' );
		}
		if( ! Array.isArray( rows ) ){
			throw new Error( 'rows must be an array' );	
		}
		return {
			byAll : function( keys, finalKey ){
				function recursive( keys, res, row ){
					var key = keys[ 0 ];
					var value = row[ key ];
					
					var otherKeys = keys.slice( 1 );
					if( otherKeys.length > 0 ){
						res[ value ] = res[ value ] || {};
						recursive( otherKeys, res[ value ], row );
					}else{
						if( finalKey ){
							res[ value ] = row[ finalKey ];
						}else{
							res[ value ] = row;	
						}
					}
				}
				var res = {};
				rows.forEach( function( row ){ recursive( keys, res, row ) } );
				return res;
			},
			by : function(){
				var keyMapper = _.property.apply( null, arguments );
				return {
					sum : function( value ){
						var res = {};
						rows.forEach( function( row ){
							var key = keyMapper( row );
							res[ key ] = ( res[ key ] || 0 ) + row[ value ];
						});
						return res;
					},
					count : function(){
						var res = {};
						rows.forEach( function( row ){
							var key = keyMapper( row );
							res[ key ] = ( res[ key ] || 0 ) + 1;
						});
						return res;
					},
					any : function(){
						var res = {};
						rows.forEach( function( row ){
							var key = keyMapper( row );
							res[ key ] = row;
						});
						return res;
					},
					all : function( valueMapper ){
						var res = {};
						valueMapper = ( typeof valueMapper != 'undefined' )
							? valueMapper
							: function( x ){ return x }
						;
						rows.forEach( function( row ){
							var key = keyMapper( row );
							res[ key ] = res[ key ] || [];
							var value = apply( row, valueMapper );
							res[ key ].push( value );
						});
						return res;
					},
				};
			}
		};
	},
	equals : function( value ){
		return function( item ){
			return value == item;
		}
	},
	unequalTo : function( value ){
		return function( item ){
			return value != item;
		}
	},
	flatten : function( acc, value ){
		return acc.concat( value );
	},
	isNumber : function( value ){
		return !isNaN( parseFloat( value ) ) && isFinite( value );
	},
	isDefined : function( value ){
		return value != null;
	},
	onlyUnique : function ( value, index, self ){
		return self.indexOf( value ) === index;
	},
};

for( key in _ ){
	if( typeof this[ key ] == 'undefined' ){
		this[ key ] = _[ key ];
	}
}

function apply( item, mapper, index, array ){
	if( typeof mapper == 'function' ){
		return mapper( item, index, array );
	}
	if(
		typeof mapper == 'string'
		&& typeof item[ mapper ] == 'function'
	){
		return item[ mapper ]();
	}
	if( 
		( typeof mapper == 'string' || typeof mapper == 'number' )
		&& typeof item[ mapper ] != 'undefined'
	){
		return item[ mapper ];
	}
	
	if( typeof mapper[ item ] != 'undefined' ){
		return mapper[ item ];
	}
	
	if(
		typeof mapper == 'object'
		&& Object.prototype.toString.call( mapper ) == '[object Object]'
	){
		//console.log( 'obj' );
		var res = {};
		Object.keys( mapper ).forEach( function( key ){
			res[ key ] = apply( item, mapper[ key ] );
		});
		return res;
	}
	
	if(
		typeof mapper == 'object'
		&& Object.prototype.toString.call( mapper ) == '[object Array]'
	){
		//console.log( 'arr' );
		return mapper.map( function( mapperX ){
			return apply( item, mapperX, index, array );
		});
	}
	
	throw new Error(
		'apply() can\'t determine what to do with '
		+ JSON.stringify( item, null, 2 )
		+ ' and '
		+ mapper
	);
}

var mySpreadSheetApp = ( function(){
	
	// --------- Polyfills ---------------------
	Object.values = Object.values || ( function( obj ){
		return Object.keys( obj ).map( function( key ){
			return obj[ key ];
		});
	});

	// --------- Enchance Functionals ----------
	Array.prototype.map    = enhanceFunctional( Array.prototype.map );
	Array.prototype.filter = enhanceFunctional( Array.prototype.filter );

	function enhanceFunctional( originalFunctional ){
		return function(){
			var mapperList = [].slice.call( arguments );
			var finalMapper = function( item, index, array ){
				var res = item;
				mapperList.forEach( function( mapper ){
					res = apply( res, mapper, index, array );
				} );
				return res;
			};
			return originalFunctional.call( this, finalMapper );
		};
	}
	
	function initSheet( sheetIdOrUrl, sheetName ){
		var book;
		book = SpreadsheetApp.openByUrl( sheetIdOrUrl );
		
		var sheet = book.getSheetByName( sheetName );

		if ( !sheet ){
			sheet = book.insertSheet( sheetName );

			if ( sheet.getMaxColumns() > 1 ){
				// delete unused columns to stay below
				// the 2 mio cells limit of google sheets
				sheet.deleteColumns( 2, sheet.getMaxColumns() - 1 );
			}

			if ( sheet.getMaxRows() > 1 ){
				// delete unused rows to stay below
				// the 2 mio cells limit of google sheets
				sheet.deleteRows( 2, sheet.getMaxRows() - 1 );
			}
		}
		return sheet;
	}

	function readTableFromSheet( sheetIdOrUrl, sheetName ){
		var sheet = initSheet( sheetIdOrUrl, sheetName );
		
		//book = SpreadsheetApp.openById( sheetIdOrUrl ).getSheetByName( sheetName ).getFilter();
		
		var f = sheet.getFilter();
		
		if( ! f ){
			Logger.log( 'no filter found' );
			return [];
		}
		var table = f.getRange().getValues();
		var headers = table.shift().map( function( str ){ return str.trim() } );
		
		return table.map( function( row ){
			var res = {};
			headers.forEach( function( header, index ){ res[ header ] = row[ index ] } );
			return res;
		});
	}

	function writeTableIntoSheet( sheetIdOrUrl, data, tab ){
		var sheet = initSheet( sheetIdOrUrl, tab.tabName );
		sheet.setFrozenRows( 0 );
		
		if ( sheet.getMaxColumns() > 1 ){
			// delete unused columns to stay below
			// the 2 mio cells limit of google sheets
			sheet.deleteColumns( 2, sheet.getMaxColumns() - 1 );
		}
		
		if ( sheet.getMaxRows() > 1 ){
			// delete unused rows to stay below
			// the 2 mio cells limit of google sheets
			sheet.deleteRows( 2, sheet.getMaxRows() - 1 );
		}
		var a1 = sheet.getRange( 'A1' );
		a1.setValue( tab.tabName );
		a1.setFontSize( 18 );
		
		if( data.length == 0 ){
			return;
		}
		var rowOffset = 3;
		
		// prepare data, make a table
		var headers = tab.columns.map( 'name' );
		
		data = data.map( function( item ){
			return headers.map( function( header ){
				return item[ header ] || '';
			});
		});
		headers = headers.map( function( header ){
			// fix auto-resize
			return header + '   ';
		});
		data.unshift( headers );
		
		var rowStart = rowOffset;
		var rowEnd = rowOffset + data.length - 1;
		var colStart = 1;
		var colEnd = headers.length;
		
		var rc = 'R' + rowStart + 'C' + colStart + ':R' + rowEnd + 'C' + colEnd;
		
		// Logger.log( rowStart + ' : ' + colStart + ' | ' + rowEnd + ' : ' + colEnd );
		// Logger.log( 'height: ' + data.length );
		// Logger.log( 'width: '  + data[ 0 ].length );
		
		var range = sheet.getRange( rc );
		range.setFontSize( 10 );
		range.setValues( data );
		var filter = range.createFilter();
		if( tab.sortColumn ){
			var sortColumnPosition = tab
				.columns
				.map( 'name' )
				.indexOf( tab.sortColumn )
				+ 1
			;
			filter.sort( sortColumnPosition, false ); // false means descending
		}
		
		// ----- print last change ----------
		if( headers.length >= 3 ){
			var rc = 'R' + 1 + 'C' + headers.length + ':R' + 1 + 'C' + headers.length;
			var range = sheet.getRange( rc );
			range.setFontSize( 12 );
			range.setFontWeight( 'bold' );
			range.setValue(
				'Last Update ('
				+ AdWordsApp.currentAccount().getTimeZone()
				+ '):\n'
				+ todaysDateTime()
			);
			range.protect();
		}
		// ----------------------------------
		
		// ----- make headers bold ----------
		var headerRc = 'R' + rowStart + 'C' + colStart + ':R' + rowStart + 'C' + colEnd;
		var headerRange = sheet.getRange( headerRc );
		headerRange.setFontSize( 12 );
		headerRange.setFontWeight( 'bold' );
		headerRange.protect();
		// ----------------------------------
		
		
		sheet.setFrozenRows( rowOffset );
		
		tab.columns.forEach( function( column, index ){
			var rowStart = rowOffset + 1;
			var rowEnd = rowOffset + data.length - 1;
			var colStart = index + 1;
			var colEnd = index + 1;
			var rc = 'R' + rowStart + 'C' + colStart + ':R' + rowEnd + 'C' + colEnd;
			var range = sheet.getRange( rc );
			if( column.numberFormat ){
				range.setNumberFormat( column.numberFormat );
			}
			column.conditionalFormats.forEach( function( format ){
				//Logger.log( 'format: ' + JSON.stringify( format, null, 2 ) );
				var rule = SpreadsheetApp.newConditionalFormatRule()
					.setRanges( [ range ] )
				;
				var keys = [
					'whenCellEmpty',
					'whenCellNotEmpty',
					'whenFormulaSatisfied',
					'whenNumberBetween', // two params -> doesn't work
					'whenNumberNotBetween', // two params -> doesn't work
					'whenNumberEqualTo',
					'whenNumberGreaterThan',
					'whenNumberGreaterThanOrEqualTo',
					'whenNumberLessThan',
					'whenNumberLessThanOrEqualTo',
					'whenNumberNotEqualTo',
					'whenTextContains',
					'whenTextDoesNotContain',
					'whenTextEndsWith',
					'whenTextEqualTo',
					'whenTextStartsWith',
					
					'setBackground',
					'setBold',
					'setFontColor',
					'setItalic',
					'setStrikethrough',
					'setUnderline',
				];
				
				keys.forEach( function( key ){
					if( typeof format[ key ] != 'undefined' ){
						//Logger.log( key + '( ' + format[ key ] + ' )' );
						rule = rule[ key ]( format[ key ] );
					}
				});
				
				if( format.min ){
					//Logger.log( 'min' );
					rule = rule.setGradientMinpointWithValue(
							format.min.color,
							SpreadsheetApp.InterpolationType.NUMBER,
							format.min.value
						)
					;
				}
				if( format.mid ){
					//Logger.log( 'mid' );
					rule = rule.setGradientMidpointWithValue(
							format.mid.color,
							SpreadsheetApp.InterpolationType.NUMBER,
							format.mid.value
						)
					;
				}
				if( format.max ){
					//Logger.log( 'max' );
					rule = rule.setGradientMaxpointWithValue(
							format.max.color,
							SpreadsheetApp.InterpolationType.NUMBER,
							format.max.value
						)
					;
				}
				var rules = sheet.getConditionalFormatRules();
				rules.push( rule.build() );
				sheet.setConditionalFormatRules( rules );
			});
		});
		
		sheet.autoResizeColumns( 1, sheet.getMaxColumns() );
	}

	function addOldColumns( updated ){
		// I think this is used only in input-tabs to update new columns
		// If new columns are introduced to an input-tab then this function
		// should be called
		updated.forEach( function( pair ){
			var newColumns = Object.keys( pair.newItem );
			Object.keys( pair.oldItem ).forEach( function( oldColumn ){
				if( newColumns.indexOf( oldColumn ) == -1 ){
					pair.newItem[ oldColumn ] = pair.oldItem[ oldColumn ];
				}
			});
		});
	}

	function updateDeltaColumns( allColumns, matched ){
		allColumns
			.filter( 'deltaOf', isDefined )
			.forEach( function( column ){
				matched.oldOnly.forEach( function( oldColumn ){
					oldColumn[ column.name ] = 0;
				});
				matched.updated.forEach( function( pair ){
					pair.newItem[ column.name ] =
						  pair.newItem[ column.deltaOf ]
						- pair.oldItem[ column.deltaOf ]
					;
				});
				matched.newOnly.forEach( function( newColumn ){
					newColumn[ column.name ] = newColumn[ column.deltaOf ];
				});
			})
		;
	}

	function validateColumns( row, tab ){
		var columns = Object.keys( row );
		var expectedColumns = tab.columns.map( 'name' );
		expectedColumns.forEach( function( expectedColumn ){
			if( columns.indexOf( expectedColumn ) == -1 ){
				throw new Error(
					'Expected column '
					+ expectedColumn
					+ ' but found only: '
					+ columns.join( ', ' )
				);
			}
		});
		columns.forEach( function( column ){
			if( expectedColumns.indexOf( column ) == -1 ){
				throw new Error(
					'Found unexpected column: '
					+ column
					+ '. Expected to find only: '
					+ expectedColumns.join( ', ' )
				);
			}
		});
	}
	
	function truncateString( str, maxLength ){
		if( str.length <= maxLength ){
			return str;
		}
		var firstHalf  = Math.floor( ( maxLength - 3 ) / 2 );
		var secondHalf = Math.ceil( ( maxLength - 3 ) / 2 );
		return str.substring( 0, firstHalf )
			+ '...'
			+ str.substring( str.length - secondHalf, str.length )
		;
	}
	
	function addDefaults( tab ){
		// set defaults for all columns
		var COLUMN_DEFAULTS = {
			isKey              : false,
			conditionalFormats : [],
			deltaOf            : null,
		}
		tab.columns.forEach( function( column ){
			Object.keys( COLUMN_DEFAULTS ).forEach( function( property1 ){
				if( typeof column[ property1 ] == 'undefined' ){
					column[ property1 ] = COLUMN_DEFAULTS[ property1 ];
				}
			});
		});
	}
	
	return function( tab, data, keepOld ){
		addDefaults( tab );
		
		var oldData = readTableFromSheet( SPREADSHEET_URL, tab.tabName );
		
		var keys = tab.columns.filter( 'isKey' ).map( 'name' );
		
		if( tab.type == 'input' ){
			// For input tabs switch data and oldData
			var dummy = data;
			data      = oldData;
			oldData   = dummy;
		}
		
		var matched = matchData( oldData, data, keys );
		
		updateDeltaColumns( tab.columns, matched );
		
		addOldColumns( matched.updated );
		
		// Logger.log( 'keys: ' + JSON.stringify( keys, null, 2 ) );
		// Logger.log( 'oldData: ' + JSON.stringify( oldData, null, 2 ) );
		// Logger.log( 'data: ' + JSON.stringify( data, null, 2 ) );
		// Logger.log( 'matched: ' + JSON.stringify( matched.newOnly, null, 2 ) );
		
		var newData = [].concat(
			( ( typeof keepOld != 'boolean' || keepOld ) ? matched.oldOnly : [] ),
			matched.updated.map( 'newItem' ),
			matched.newOnly
		);
		
		writeTableIntoSheet(
			SPREADSHEET_URL,
			newData,
			tab
		);
		
		return {
			tab     : tab,
			data    : newData,
			matched : matched,
			keys    : keys,
		};
	};
})();

function todaysDate(){
	return Utilities.formatDate(
		new Date(),
		AdWordsApp.currentAccount().getTimeZone(),
		'yyyy-MM-dd'
	);
}

function todaysDateTime(){
	return Utilities.formatDate(
		new Date(),
		AdWordsApp.currentAccount().getTimeZone(),
		'yyyy-MM-dd HH:mm'
	);
}

function isFridayOrWeekend(){
	var dayOfWeek = new Date(
		Utilities.formatDate(
			new Date(),
			AdWordsApp.currentAccount().getTimeZone(),
			'yyyy-MM-dd hh:mm'
		)
	).getDay();
	var res = dayOfWeek == 0 // sunday
		|| dayOfWeek == 5 // friday
		|| dayOfWeek == 6 // saturday
	;
	return res;
}

function constant( value ){ return function( item ){ return value } }

function concat( a, b ){ return a.concat( b ) }

function toList( iter, max ){
	var list = [];
	while( iter.hasNext() && ( typeof max == 'undefined' || max-- > 0 ) ){
		list.push( iter.next() );
	}
	return list;
}

function sum( a, b ){ return a + b }

function join( separator ){
	return function( arr ){
		return arr.join( separator );
	}
}

function duringDays( numDays ){
	var now = new Date();
	return getDateInThePast( now, numDays ) + ', ' + getDateInThePast( now, 0 );
}

function addLeadingZeros( number, digits ){
	var res = '' + number;
	while ( res.length < digits ){
		res = '0' + res;
	}
	return res;
}

// Returns yyyyMMdd-formatted date.
function getDateInThePast( dateReference, numDays ){
	var date1 = new Date( dateReference.getTime() );
	date1.setDate( date1.getDate() - numDays );
	return addLeadingZeros( date1.getFullYear(), 4 ) +
		addLeadingZeros( date1.getMonth() + 1, 2 ) +
		addLeadingZeros( date1.getDate(), 2 );
}

// --------- Polyfills ---------------------
Object.values = Object.values || ( function( obj ){
	return Object.keys( obj ).map( function( key ){
		return obj[ key ];
	});
});

Object.entries = Object.entries || ( function( obj ){
	return Object.keys( obj ).map( function( key ){
		return [ key, obj[ key ] ];
	});
});

// Logging into Bigquery + Email-support

// BigQuery.Jobs.insert(
var nonce = new Date().getTime(); // circumvent cache
var url = 'https://storage.googleapis.com/adwords-scripts-144712.appspot.com/email.js' + '?v=' + nonce;
eval( UrlFetchApp.fetch( url ).getContentText() );




function main2(){
  var accountId = '167-956-9967';
  
  var account = MccApp.accounts().withIds( [ accountId ] ).get().next();
  MccApp.select( account );
  Logger.log( AdsApp.currentAccount().getName() );
  
  var iterator = AdsApp
	.targeting()
	.languages()
	.withCondition( 'LanguageName NOT_IN [ Danish1 ]' )
    .withCondition( 'CampaignStatus = ENABLED' )
    .get()
  ;

  Logger.log( iterator.totalNumEntities() );
  
  
  return;
  
  var adGroup = iterator.next();
  
  
  Logger.log( adGroup.getName() );
  Logger.log( adGroup.isEnabled() );
  Logger.log( adGroup.getCampaign().getName() );
  Logger.log( adGroup.getCampaign().isEnabled() );
  Logger.log( 'draft: ' + adGroup.getCampaign().isDraftCampaign() );
  Logger.log( 'experiment: ' + adGroup.getCampaign().isExperimentCampaign() );
  Logger.log( 'end: ' + adGroup.getCampaign().getEndDate() );
  
  var clicks = adGroup.getStatsFor( 'LAST_30_DAYS' ).getClicks();
  
  Logger.log( 'Clicks: ' + clicks );
  
  
  
  
}
