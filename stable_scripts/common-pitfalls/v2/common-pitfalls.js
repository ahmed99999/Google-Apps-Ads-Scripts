
var config = {
	"DESCRIPTION" : "" ,
	"INSTRUCTIONS": "",
	"VERSION" : 2,
	"VERSION_TAG" : "stable",
	"settings" : {
		"BIGQUERY_PROJECT_ID" : "biddy-io",
		"BIGQUERY_DATASET_ID" : "peak_ace_active_clients_transfer",
		"BIDDY_DATASET_ID" : "biddy",
		"BIDDY_TABLE_NAME" : "pitfall_data2",
		"SEND_ERROR_MESSAGES_TO" : "a.tissen@pa.ag",
		"MAILGUN_URL" : "https://api.mailgun.net/v3/mg.peakace.de/messages",
		"MAILGUN_AUTH" : "Basic YXBpOmtleS1hYWZmMmI2MGU4MmNkMWYwOTIwYWYxNDUzZWM0MDcyOA==",
		"MAILGUN_FROM" : "adwords_scripts@mg.peakace.de",
		"UPDATE_VIEW_AND_PRECOMPUTING_AND_QUIT" : true,
		"TABLE_NAME_PREFIX" : "p_",
		"CREATE_GEOTARGETS" : true,
		"GEOTARGETS_URL" : "https://goo.gl/cZXkiJ",
		"GEOTARGETS_TABLE_NAME" : "p_Geotargets",
		"RECREATE_VIEWS" : false,
		"TIMEZONE" : "Europe/Berlin",
		"PRECOMPUTE_HOUR" : 3,
		"PARTITION_EXPIRATION_DAYS" : 8,
		"REQUIRE_PARTITION_FILTER" : true,
		"VIEW_PREFIX" : "biddy_",
		"DATA_STUDIO_PREFIX" : "ds_",
		"SCRIPT_NAME" : "BigQueryPusher",
		"TARGET_SETTING_CONSTANT" : "USER_INTEREST_AND_LIST"
	}
};

var ACCOUNT_ID = AdWordsApp.currentAccount().getCustomerId().split( '-' ).join( '' );

var settings = ( typeof this[ 'dataJSON' ] != 'undefined' ? JSON.parse( dataJSON.settings ) : config.settings );
for( key in settings ){
    this[ key ] = settings[ key ];
}

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
		f.startsWith = function( value ){
			return function( item ){
				var x = f( item );
				return x.indexOf( value ) == 0;
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
	function log( value ){
		value = JSON.stringify( value, null, '\t' );
		if( typeof Logger !== 'undefined' ){
			var now = new Date( Utilities.formatDate( new Date(), 'Europe/Berlin', 'MMM dd,yyyy HH:mm:ss' ) );
			var now = addLeadingZeros( now.getHours(), 2) + ':' + addLeadingZeros( now.getMinutes(), 2 );
			value = now + ' ' + value;
			Logger.log( value );
		}else{
			document.write( value + '<br>' );
		}
	}
	function not( func ){
		return function( item ){ return ! func( item ) };
	}
	function camelToSnake( str ){
		return str.replace( /\.?([A-Z])/g, function( x, y ){ return '_' + y.toLowerCase() } ).replace( /^_/, '' );
	}
	return {
		toString		: function(){ return 'my tools class'; },
		property 		: property,
		properties		: properties,
		log				: log,
		not				: not,
		camelToSnake	: camelToSnake,
	};
})();

var BIGQUERY = {
	PROJECT_ID : BIGQUERY_PROJECT_ID,
	DATASET_ID : BIGQUERY_DATASET_ID,
	PARTITION_EXPIRATION_MS : null, // null => don't set expiration. one year = 1000 * 60 * 60 * 24 * 365,
	// if "empty response" occurs, then BIGQUERY_CHUNK_SIZE should be reduced
	CHUNK_SIZE : 30000,
	PARTITION: 'DAY',
	// Truncate existing data, otherwise will append.
	TABLE_NAME_PREFIX : 'p_',
	FIELDS: {
		CampaignSettings: {
			'ExternalCustomerId'	: 'INTEGER',
			'CampaignId'			: 'INTEGER',
			'AdRotationType'		: 'STRING',
			'DeliveryMethod'		: 'STRING',
			'TargetingSetting'		: 'STRING',
			'Languages'				: 'STRING',
			'ExcludedContentLabels'	: 'STRING',
			'ExcludedLocations'		: 'STRING'
		},
		CampaignNegativeLists: {
			'ExternalCustomerId'	: 'INTEGER',
			'ListId'				: 'INTEGER',
			'ListName'				: 'STRING',
		},
		CampaignNegativeListMappings: {
			'ExternalCustomerId'	: 'INTEGER',
			'ListId'				: 'INTEGER',
			'CampaignId'			: 'INTEGER',
		},
		CampaignNegativeListKeywords: {
			'ExternalCustomerId'	: 'INTEGER',
			'ListId'				: 'INTEGER',
			'MatchType'				: 'STRING',
			'Text'					: 'STRING',
		},
		CampaignNegativeKeywords: {
			'ExternalCustomerId'	: 'INTEGER',
			'CampaignId'			: 'INTEGER',
			'MatchType'				: 'STRING',
			'Text'					: 'STRING',
		},
		ExtensionsSitelinks: {
			'ExternalCustomerId'	: 'INTEGER',
			'Id'					: 'INTEGER',
			'Status'				: 'STRING',
			'Description1'			: 'STRING',
			'Description2'			: 'STRING',
			'LinkText'				: 'STRING',
			'Schedules'				: 'STRING',
			'IsMobilePreferred'		: 'BOOLEAN',
			'CustomParameters'		: 'STRING',
			'FinalUrl'				: 'STRING',
			'MobileFinalUrl'		: 'STRING',
			'TrackingTemplate'		: 'STRING',
			'StartDate'				: 'DATE',
			'EndDate'				: 'DATE',
			'AccountLevel'			: 'BOOLEAN',
		},
		ExtensionsPhoneNumbers: {
			'ExternalCustomerId'	: 'INTEGER',
			'Id'					: 'INTEGER',
			'Status'				: 'STRING',
			'Country'				: 'STRING',
			'PhoneNumber'			: 'STRING',
			'Schedules'				: 'STRING',
			'IsMobilePreferred'		: 'STRING',
			'AccountLevel'			: 'BOOLEAN',
		},
		ExtensionsMobileApps: {
			'ExternalCustomerId'	: 'INTEGER',
			'Id'					: 'INTEGER',
			'Status'				: 'STRING',
			'AppId'					: 'STRING',
			'LinkText'				: 'STRING',
			'Store'					: 'STRING',
			'Schedules'				: 'STRING',
			'IsMobilePreferred'		: 'STRING',
			'CustomParameters'		: 'STRING',
			'FinalUrl'				: 'STRING',
			'MobileFinalUrl'		: 'STRING',
			'TrackingTemplate'		: 'STRING',
			'StartDate'				: 'DATE',
			'EndDate'				: 'DATE',
			'AccountLevel'			: 'BOOLEAN',
		},
		ExtensionsCallouts: {
			'ExternalCustomerId'	: 'INTEGER',
			'Id'					: 'INTEGER',
			'Status'				: 'STRING',
			'Text'					: 'STRING',
			'Schedules'				: 'STRING',
			'IsMobilePreferred'		: 'STRING',
			'StartDate'				: 'DATE',
			'EndDate'				: 'DATE',
			'AccountLevel'			: 'BOOLEAN',
		},
		ExtensionsSnippets: {
			'ExternalCustomerId'	: 'INTEGER',
			'Id'					: 'INTEGER',
			'Status'				: 'STRING',
			'Header'				: 'STRING',
			'Values'				: 'STRING',
			'Schedules'				: 'STRING',
			'IsMobilePreferred'		: 'STRING',
			'StartDate'				: 'DATE',
			'EndDate'				: 'DATE',
			'AccountLevel'			: 'BOOLEAN',
		},
		ExtensionsMessages: {
			'ExternalCustomerId'	: 'INTEGER',
			'Id'					: 'INTEGER',
			'Status'				: 'STRING',
			'BusinessName'			: 'STRING',
			'CountryCode'			: 'STRING',
			'ExtensionText'			: 'STRING',
			'PhoneNumber'			: 'STRING',
			'Schedules'				: 'STRING',
			'IsMobilePreferred'		: 'STRING',
			'StartDate'				: 'DATE',
			'EndDate'				: 'DATE',
			'AccountLevel'			: 'BOOLEAN',
		},
		ExtensionsCampaignMap: {
			'ExternalCustomerId'	: 'INTEGER',
			'Id'					: 'INTEGER',
			'CampaignId'			: 'INTEGER',
			'EntityType'			: 'STRING',
		},
		ExtensionsDisapproved : {
			'ExternalCustomerId'	: 'INTEGER',
			//'AttributeValues' 	: 'STRING',
			'DisapprovalShortNames' : 'STRING',
			'PlaceholderType' 		: 'STRING',
			'Status' 				: 'STRING',
			'ValidationDetails' 	: 'STRING',
			'FeedId' 				: 'INTEGER',
			'FeedItemId' 			: 'INTEGER',
			'IsSelfAction' 			: 'STRING'
			// , 'CampaignName', 'CampaignId'
		},
	}
};

var VIEWS = {
ADGROUP_NO_KEYWORDS : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( AdGroupId as STRING ) as AdGroupId,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	CampaignName,',
		'	AdGroupName',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND ( SELECT count(*) from `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword WHERE keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.AdGroupId = adgroup.AdGroupId AND NOT IsNegative AND keyword._LATEST_DATE = keyword._DATA_DATE ) = 0',
		'	AND AdGroupType = \'SEARCH_STANDARD\'',
		'	AND AdvertisingChannelType = \'SEARCH\'',
		'ORDER BY AccountName, CampaignName, AdGroupName',
	].join( '\n' ),
	ADGROUP_NO_ACTIVE_KEYWORDS : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( AdGroupId as STRING ) as AdGroupId,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	CampaignName,',
		'	AdGroupName',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND ( SELECT count(*) from `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword WHERE keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.AdGroupId = adgroup.AdGroupId AND NOT IsNegative AND Status = \'ENABLED\' AND keyword._LATEST_DATE = keyword._DATA_DATE ) = 0',
		'	AND ( SELECT count(*) from `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword WHERE keyword.AdGroupId = adgroup.AdGroupId AND NOT IsNegative AND keyword._LATEST_DATE = keyword._DATA_DATE ) > 0',
		'	AND AdGroupType = \'SEARCH_STANDARD\'',
		'	AND AdvertisingChannelType = \'SEARCH\'',
		'ORDER BY AccountName, CampaignName, AdGroupName',
	].join( '\n' ),
	ADGROUP_TOO_MANY_EXACT_KEYWORDS : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( AdGroupId as STRING ) as AdGroupId,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	CampaignName,',
		'	AdGroupName',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND ( SELECT count(*) from `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword WHERE keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.AdGroupId = adgroup.AdGroupId AND NOT IsNegative AND KeywordMatchType = \'EXACT\' AND keyword._LATEST_DATE = keyword._DATA_DATE ) > 10',
		'	AND AdvertisingChannelType = \'SEARCH\'',
		'ORDER BY AccountName, CampaignName, AdGroupName',
	].join( '\n' ),
	ADGROUP_NO_NEGATIVE_KEYWORDS_IN_BROAD_ADGROUP : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( AdGroupId as STRING ) as AdGroupId,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	CampaignName,',
		'	AdGroupName',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND ( SELECT count(*) from `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword WHERE keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.AdGroupId = adgroup.AdGroupId AND IsNegative AND keyword._LATEST_DATE = keyword._DATA_DATE ) = 0',
		'	AND REGEXP_CONTAINS( AdGroupName, \'Broad\' )',
		'ORDER BY AccountName, CampaignName, AdGroupName',
	].join( '\n' ),
	ADGROUP_TOO_MANY_BROAD_KEYWORDS : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( AdGroupId as STRING ) as AdGroupId,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	CampaignName,',
		'	AdGroupName',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND ( SELECT count(*) from `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword WHERE keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.AdGroupId = adgroup.AdGroupId AND NOT IsNegative AND KeywordMatchType = \'BROAD\' AND keyword._LATEST_DATE = keyword._DATA_DATE ) > 1',
		'	AND AdvertisingChannelType = \'SEARCH\'',
		'ORDER BY AccountName, CampaignName, AdGroupName',
	].join( '\n' ),
	ADGROUP_NO_ADS : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( AdGroupId as STRING ) as AdGroupId,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	CampaignName,',
		'	AdGroupName',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND ( SELECT count(*) from `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Ad_' + ACCOUNT_ID + '` as ad WHERE ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId AND AdType = \'EXPANDED_TEXT_AD\' AND ad._LATEST_DATE = ad._DATA_DATE ) = 0',
		'	AND AdGroupType IN ( \'SEARCH_STANDARD\', \'DISPLAY_STANDARD\' )',
		'ORDER BY AccountName, CampaignName, AdGroupName',
	].join( '\n' ),
	ADGROUP_TOO_FEW_ETAS : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( AdGroupId as STRING ) as AdGroupId,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	CampaignName,',
		'	AdGroupName',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND ( SELECT count(*) from `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Ad_' + ACCOUNT_ID + '` as ad WHERE ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId AND AdType = \'EXPANDED_TEXT_AD\' AND ad._LATEST_DATE = ad._DATA_DATE ) IN (1,2,3)',
		'	AND AdGroupType = \'SEARCH_STANDARD\'',
		'ORDER BY AccountName, CampaignName, AdGroupName',
	].join( '\n' ),
	ADGROUP_TOO_MANY_ACTIVE_ETAS : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( AdGroupId as STRING ) as AdGroupId,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	CampaignName,',
		'	AdGroupName',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND ( SELECT count(*) from `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Ad_' + ACCOUNT_ID + '` as ad WHERE ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId AND AdType = \'EXPANDED_TEXT_AD\' AND ad._LATEST_DATE = ad._DATA_DATE AND Status = \'ENABLED\' ) > 6',
		'	AND AdGroupType = \'SEARCH_STANDARD\'',
		'ORDER BY AccountName, CampaignName, AdGroupName',
	].join( '\n' ),
	ADGROUP_NO_DSA : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( AdGroupId as STRING ) as AdGroupId,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	CampaignName,',
		'	AdGroupName',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND ( SELECT count(*) from `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Ad_' + ACCOUNT_ID + '` as ad WHERE ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId AND AdType = \'DYNAMIC_SEARCH_AD\' AND ad._LATEST_DATE = ad._DATA_DATE AND Status = \'ENABLED\' ) = 0',
		'	AND AdGroupType = \'SEARCH_DYNAMIC_ADS\'',
		'ORDER BY AccountName, CampaignName, AdGroupName',
	].join( '\n' ),
	ADGROUP_TOO_FEW_DSA : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( AdGroupId as STRING ) as AdGroupId,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	CampaignName,',
		'	AdGroupName',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND ( SELECT count(*) from `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Ad_' + ACCOUNT_ID + '` as ad WHERE ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId AND AdType = \'DYNAMIC_SEARCH_AD\' AND ad._LATEST_DATE = ad._DATA_DATE AND Status = \'ENABLED\' ) IN (1,2)',
		'	AND AdGroupType = \'SEARCH_DYNAMIC_ADS\'',
		'ORDER BY AccountName, CampaignName, AdGroupName',
	].join( '\n' ),
	ADGROUP_TOO_MANY_DSA : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( AdGroupId as STRING ) as AdGroupId,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	CampaignName,',
		'	AdGroupName',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND ( SELECT count(*) from `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Ad_' + ACCOUNT_ID + '` as ad WHERE ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId AND AdType = \'DYNAMIC_SEARCH_AD\' AND ad._LATEST_DATE = ad._DATA_DATE AND Status = \'ENABLED\' ) > 6',
		'	AND AdGroupType = \'SEARCH_DYNAMIC_ADS\'',
		'ORDER BY AccountName, CampaignName, AdGroupName',
	].join( '\n' ),
	ADGROUP_NEGATIVE_KEYWORD_CONFLICTS : [
		'#StandardSQL',
		'SELECT',
		'	AccountName,',
		'	ExternalCustomerId,',
		'	CampaignId,',
		'	AdGroupId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	CampaignStatus,',
		'	AdGroupStatus,',
		'	keyword_ as keyword,',
		'	negative_keyword,',
		'	keyword_match_type as match_type,',
		'	neg_match_type as match_type_of_negative_keyword',
		'FROM (',
		'	SELECT',
		'		ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'		CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'		CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'		CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'		campaign.CampaignName,',
		'		adgroup.AdGroupName,',
		'		campaign.CampaignStatus,',
		'		adgroup.AdGroupStatus,',
		'		keyword.Criteria as keyword_,',
		'		neg.Criteria as negative_keyword,',
		'		keyword.KeywordMatchType as keyword_match_type,',
		'		neg.KeywordMatchType as neg_match_type,',
		'		( ',
		'			select ARRAY_TO_STRING(',
		'			(',
		'				array(',
		'					select x',
		'					from unnest( split( REGEXP_REPLACE( REGEXP_REPLACE( keyword.Criteria, \'\\\\s\\\\+\', \' \' ), \'^\\\\+\', \'\' ), \' \' ) ) as x',
		'					ORDER BY x',
		'				)',
		'			),',
		'			\' \'',
		'			)',
		'		) as keyword_sorted,',
		'		(',
		'			select ARRAY_TO_STRING(',
		'			(',
		'				array(',
		'					select x',
		'					from unnest( SPLIT( REGEXP_REPLACE( REGEXP_REPLACE( neg.Criteria, \'\\\\s\\\\+\', \' \' ), \'^\\\\+\', \'\' ), \' \' ) ) as x',
		'					ORDER BY x',
		'				)',
		'			),',
		'			\' \'',
		'			)',
		'		) as neg_sorted',
		'	FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as neg ON keyword.ExternalCustomerId = neg.ExternalCustomerId AND keyword.AdGroupId = neg.AdGroupId',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON keyword.ExternalCustomerId = campaign.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId AND keyword.ExternalCustomerId = campaign.ExternalCustomerId',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON keyword.ExternalCustomerId = customer.ExternalCustomerId',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.AdGroupId = adgroup.AdGroupId',
		'	WHERE TRUE',
		'		AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'		AND NOT keyword.IsNegative',
		'		AND neg.IsNegative',
		'		AND neg.Status = \'ENABLED\'',
		'		AND keyword.Status = \'ENABLED\'',
		'		AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'		AND customer._LATEST_DATE = customer._DATA_DATE',
		'		AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'		AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'		AND neg._LATEST_DATE = neg._DATA_DATE',
		'		--AND keyword.KeywordMatchType IN ( \'EXACT\', \'PHRASE\' )',
		'	GROUP BY',
		'		customer.ExternalCustomerId,',
		'		AccountName,',
		'		campaign.CampaignName,',
		'		CampaignId,',
		'		AdGroupId,',
		'		adgroup.AdGroupName,',
		'		campaign.CampaignStatus,',
		'		adgroup.AdGroupStatus,',
		'		keyword.Criteria,',
		'		keyword.KeywordMatchType,',
		'		neg.Criteria,',
		'		neg.KeywordMatchType',
		')',
		'WHERE TRUE',
		'	AND (',
		'		( neg_match_type = \'EXACT\'  AND negative_keyword = keyword_ AND keyword_match_type = \'EXACT\' )',
		'		OR ( neg_match_type = \'PHRASE\' AND REGEXP_CONTAINS( CONCAT( \' \', keyword_, \' \' ), CONCAT( \' \', negative_keyword, \' \' ) ) )',
		'		OR ( neg_match_type = \'BROAD\'  AND REGEXP_CONTAINS( CONCAT( \' \', keyword_sorted, \' \' ),',
		'			CONCAT( \' \', ARRAY_TO_STRING( SPLIT( neg_sorted, \' \' ), \'\\\\s(\\\\w*\\\\s)*\' ), \' \' ) ) )',
		'	)',
	].join( '\n' ),
	ADGROUP_WITHOUT_AUDIENCE : [
		'#StandardSQL',
		'SELECT',
		'	CustomerDescriptiveName as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	campaign.CampaignName,',
		'	adgroup.AdGroupName,	',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus',
		'	--,sum( cast( audience.ExternalCustomerId is not null as int64 ) ) as countAudiences',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` AS adgroup',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer',
		'	ON customer.ExternalCustomerId = adgroup.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'	ON campaign.CampaignId = adgroup.CampaignId',
		'	AND campaign.ExternalCustomerId = adgroup.ExternalCustomerId',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Audience_' + ACCOUNT_ID + '` AS audience',
		'	ON adgroup.ExternalCustomerId = audience.ExternalCustomerId',
		'	AND adgroup.AdGroupId = audience.AdGroupId',
		'	AND audience._DATA_DATE = audience._LATEST_DATE',
		'	AND CriterionAttachmentLevel = \'ADGROUP\'',
		'	AND Status IN ( \'ENABLED\', \'PAUSED\' )',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND customer._DATA_DATE = customer._LATEST_DATE',
		'	AND campaign._DATA_DATE = campaign._LATEST_DATE',
		'	AND adgroup._DATA_DATE = adgroup._LATEST_DATE',
		'	AND audience.ExternalCustomerId is null',
		'GROUP BY',
		'	customer.ExternalCustomerId,',
		'	CustomerDescriptiveName,',
		'	campaign.CampaignName,',
		'	adgroup.AdGroupName,',
		'	CampaignId,',
		'	AdGroupId,',
		'	adgroup.AdGroupStatus,',
		'	campaign.CampaignStatus',
		'HAVING TRUE',
		'ORDER BY CustomerDescriptiveName, campaign.CampaignName, adgroup.AdGroupName',
	].join( '\n' ),
	AD_POLICY_VIOLATION : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'  	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	CAST( ad.CreativeId as STRING ) as AdId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	Status,',
		'	HeadLinePart1,',
		'	HeadLinePart2,',
		'	Description,',
		'	PolicySummary,',
		'	Path1,',
		'	Path2',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Ad_' + ACCOUNT_ID + '` as ad',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON ad.ExternalCustomerId = campaign.ExternalCustomerId AND ad.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = ad.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND AdType = \'EXPANDED_TEXT_AD\'',
		'	AND Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND ad._LATEST_DATE = ad._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND PolicySummary is not null',
	].join( '\n' ),
	AD_PATH1_MISSING_IN_NON_BRAND_CAMPAIGN : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'  	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	CAST( ad.CreativeId as STRING ) as AdId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	Status,',
		'	HeadLinePart1,',
		'	HeadLinePart2,',
		'	Description,',
		'	PolicySummary,',
		'	Path1,',
		'	Path2',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Ad_' + ACCOUNT_ID + '` as ad',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON ad.ExternalCustomerId = campaign.ExternalCustomerId AND ad.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = ad.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND AdType = \'EXPANDED_TEXT_AD\'',
		'	AND Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND ad._LATEST_DATE = ad._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND Path1 is null',
		'	AND NOT REGEXP_CONTAINS( CampaignName, \'Brand\' )',
	].join( '\n' ),
	AD_PATH2_MISSING_IN_NON_BRAND_CAMPAIGN : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	CAST( ad.CreativeId as STRING ) as AdId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	campaign.CampaignStatus,',
		'	AdGroupStatus,',
		'	Status,',
		'	HeadLinePart1,',
		'	HeadLinePart2,',
		'	Description,',
		'	PolicySummary,',
		'	Path1,',
		'	Path2',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Ad_' + ACCOUNT_ID + '` as ad',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON ad.ExternalCustomerId = campaign.ExternalCustomerId AND ad.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = ad.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND AdType = \'EXPANDED_TEXT_AD\'',
		'	AND Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND ad._LATEST_DATE = ad._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND Path2 is null',
		'	AND NOT REGEXP_CONTAINS( CampaignName, \'Brand\' )',
	].join( '\n' ),
	AD_TOO_SHORT_HEADLINE : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	CAST( ad.CreativeId as STRING ) as AdId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	campaign.CampaignStatus,',
		'	AdGroupStatus,',
		'	Status,',
		'	HeadLinePart1,',
		'	HeadLinePart2,',
		'	Description,',
		'	PolicySummary,',
		'	Path1,',
		'	Path2',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Ad_' + ACCOUNT_ID + '` as ad',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON ad.ExternalCustomerId = campaign.ExternalCustomerId AND ad.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = ad.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND AdType = \'EXPANDED_TEXT_AD\'',
		'	AND Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND ad._LATEST_DATE = ad._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND ( LENGTH( HeadLinePart1 ) <= 15 OR LENGTH( HeadLinePart2 ) <= 15 )',
	].join( '\n' ),
	AD_TOO_SHORT_DESCRIPTION : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	CAST( ad.CreativeId as STRING ) as AdId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	campaign.CampaignStatus,',
		'	AdGroupStatus,',
		'	Status,',
		'	HeadLinePart1,',
		'	HeadLinePart2,',
		'	Description,',
		'	PolicySummary,',
		'	Path1,',
		'	Path2',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Ad_' + ACCOUNT_ID + '` as ad',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON ad.ExternalCustomerId = campaign.ExternalCustomerId AND ad.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = ad.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND AdType = \'EXPANDED_TEXT_AD\'',
		'	AND Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND ad._LATEST_DATE = ad._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND LENGTH( Description ) <= 60',
	].join( '\n' ),
	AD_DUPLICATE_SPECIAL_CHARS_IN_DESCRIPTION : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	campaign.CampaignStatus,',
		'	AdGroupStatus,',
		'	Status,',
		'	HeadLinePart1,',
		'	HeadLinePart2,',
		'	Description,',
		'	PolicySummary,',
		'	Path1,',
		'	Path2',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Ad_' + ACCOUNT_ID + '` as ad',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON ad.ExternalCustomerId = campaign.ExternalCustomerId AND ad.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = ad.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND AdType = \'EXPANDED_TEXT_AD\'',
		'	AND Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND ad._LATEST_DATE = ad._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND REGEXP_CONTAINS( Description, \'[\\\\?\\\\!].*[\\\\?\\\\!]\' )',
	].join( '\n' ),
	AD_LAST_CHAR_IS_NOT_SPECIAL : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	campaign.CampaignStatus,',
		'	AdGroupStatus,',
		'	Status,',
		'	HeadLinePart1,',
		'	HeadLinePart2,',
		'	Description,',
		'	PolicySummary,',
		'	Path1,',
		'	Path2',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Ad_' + ACCOUNT_ID + '` as ad',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON ad.ExternalCustomerId = campaign.ExternalCustomerId AND ad.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = ad.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND AdType = \'EXPANDED_TEXT_AD\'',
		'	AND Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND ad._LATEST_DATE = ad._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND NOT SUBSTR( Description, -1 ) IN unnest( [ \'?\', \'!\', \'.\' ] ) AND LENGTH( Description ) < 80',
	].join( '\n' ),
	CAMPAIGN_MISSING_MOBILE_BID_MODIFIER : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CampaignName,',
		'	campaign.CampaignStatus,',
		'	CampaignMobileBidModifier,',
		'	AdvertisingChannelType,',
		'	TargetingSetting,',
		'	DeliveryMethod,',
		'	AdRotationType',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignSettings_' + ACCOUNT_ID + '` as settings',
		'	ON  settings.ExternalCustomerId = campaign.ExternalCustomerId',
		'	AND settings.CampaignId = campaign.CampaignId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND CampaignMobileBidModifier IS NULL',
		'	AND ifnull( settings._LATEST_DATE = settings._DATA_DATE , true )',
	].join( '\n' ),
	CAMPAIGN_MULTI_CHANNEL : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CampaignName,',
		'	campaign.CampaignStatus,',
		'	CampaignMobileBidModifier,',
		'	AdvertisingChannelType,',
		'	TargetingSetting,',
		'	DeliveryMethod,',
		'	AdRotationType',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignSettings_' + ACCOUNT_ID + '` as settings',
		'	ON  settings.ExternalCustomerId = campaign.ExternalCustomerId',
		'	AND settings.CampaignId = campaign.CampaignId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND AdvertisingChannelType = \'MULTI_CHANNEL\'',
		'	AND ifnull( settings._LATEST_DATE = settings._DATA_DATE , true )',
	].join( '\n' ),
	CAMPAIGN_TARGET_AND_BID : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CampaignName,',
		'	campaign.CampaignStatus,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CampaignMobileBidModifier,',
		'	AdvertisingChannelType,',
		'	TargetingSetting,',
		'	DeliveryMethod,',
		'	AdRotationType',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignSettings_' + ACCOUNT_ID + '` as settings',
		'	ON  settings.ExternalCustomerId = campaign.ExternalCustomerId',
		'	AND settings.CampaignId = campaign.CampaignId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND TargetingSetting = \'TARGET_ALL_FALSE\'',
		'	AND ifnull( settings._LATEST_DATE = settings._DATA_DATE , true )',
	].join( '\n' ),
	CAMPAIGN_NON_STANDARD_DELIVERY_METHOD : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CampaignName,',
		'	campaign.CampaignStatus,',
		'	CampaignMobileBidModifier,',
		'	AdvertisingChannelType,',
		'	TargetingSetting,',
		'	DeliveryMethod,',
		'	AdRotationType',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignSettings_' + ACCOUNT_ID + '` as settings',
		'	ON  settings.ExternalCustomerId = campaign.ExternalCustomerId',
		'	AND settings.CampaignId = campaign.CampaignId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND DeliveryMethod != \'STANDARD\'',
		'	AND ifnull( settings._LATEST_DATE = settings._DATA_DATE , true )',
	].join( '\n' ),
	CAMPAIGN_ROTATION_TYPE_NOT_OPTIMIZED : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CampaignName,',
		'	campaign.CampaignStatus,',
		'	CampaignMobileBidModifier,',
		'	AdvertisingChannelType,',
		'	TargetingSetting,',
		'	DeliveryMethod,',
		'	AdRotationType',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignSettings_' + ACCOUNT_ID + '` as settings',
		'	ON  settings.ExternalCustomerId = campaign.ExternalCustomerId',
		'	AND settings.CampaignId = campaign.CampaignId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND AdRotationType != \'OPTIMIZE\'',
		'	AND AdRotationType != \'CONVERSION_OPTIMIZE\'',
		'	AND ifnull( settings._LATEST_DATE = settings._DATA_DATE , true )',
	].join( '\n' ),
	CAMPAIGN_NEGATIVE_KEYWORD_CONFLICT : [
		'#StandardSQL',
		'SELECT',
		'	AccountName,',
		'	ExternalCustomerId,',
		'	CampaignName,',
		'	CampaignId,',
		'	keyword_ as keyword,',
		'	CampaignStatus,',
		'	Status,',
		'	negative_keyword,',
		'	keyword_match_type as match_type,',
		'	neg_match_type as match_type_of_negative_keyword',
		'FROM (',
		'	SELECT',
		'		ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'		CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'		CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'		campaign.CampaignName,',
		'		keyword.Criteria as keyword_,',
		'		campaign.CampaignStatus,',
		'		keyword.Status,',
		'		REGEXP_REPLACE( REGEXP_REPLACE( neg.Text, \'^["\\\\[\\\\+]\', \'\' ), \'["\\\\]]$\', \'\' ) as negative_keyword,',
		'		keyword.KeywordMatchType as keyword_match_type,',
		'		neg.MatchType as neg_match_type,',
		'		(',
		'			select ARRAY_TO_STRING(',
		'				(',
		'					array(',
		'						select x',
		'						from unnest( split( REGEXP_REPLACE( REGEXP_REPLACE( keyword.Criteria, \'\\\\s\\\\+\', \' \' ), \'^\\\\+\', \'\' ), \' \' ) ) as x',
		'						ORDER BY x',
		'					)',
		'				),',
		'				\' \'',
		'			)',
		'		) as keyword_sorted,',
		'		(',
		'			select ARRAY_TO_STRING(',
		'				(',
		'					array(',
		'						select x',
		'						from unnest( SPLIT( REGEXP_REPLACE( REGEXP_REPLACE( REGEXP_REPLACE( neg.Text, \'\\\\s\\\\+\', \' \' ), \'^["\\\\[\\\\+]\', \'\' ), \'["\\\\]]$\', \'\' ), \' \' ) ) as x',
		'						ORDER BY x',
		'					)',
		'				),',
		'				\' \'',
		'			)',
		'		) as neg_sorted',
		'	FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignNegativeKeywords_' + ACCOUNT_ID + '` as neg ON keyword.ExternalCustomerId = neg.ExternalCustomerId AND keyword.CampaignId = neg.CampaignId',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON keyword.ExternalCustomerId = campaign.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON keyword.ExternalCustomerId = customer.ExternalCustomerId',
		'	WHERE TRUE',
		'		AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'		AND NOT keyword.IsNegative',
		'		AND keyword.Status IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'		AND customer._LATEST_DATE = customer._DATA_DATE',
		'		AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'		AND neg._LATEST_DATE = neg._DATA_DATE',
		'	GROUP BY',
		'		customer.ExternalCustomerId,',
		'		AccountName,',
		'		campaign.CampaignName,',
		'		CampaignId,',
		'		keyword.Criteria,',
		'		keyword.KeywordMatchType,',
		'		campaign.CampaignStatus,',
		'		keyword.Status,',
		'		neg.Text,',
		'		neg.MatchType',
		')',
		'WHERE TRUE',
		'	AND (',
		'		( neg_match_type = \'EXACT\'  AND negative_keyword = keyword_ AND keyword_match_type = \'EXACT\' )',
		'		OR ( neg_match_type = \'PHRASE\' AND REGEXP_CONTAINS( CONCAT( \' \', keyword_, \' \' ), CONCAT( \' \',  REGEXP_REPLACE( negative_keyword, \'[+]\', \'\\\\\\\\+\' ), \' \' ) ) )',
		'		OR ( neg_match_type = \'BROAD\'  AND REGEXP_CONTAINS( CONCAT( \' \', keyword_sorted, \' \' ),',
		'			CONCAT( \' \', ARRAY_TO_STRING( SPLIT(  REGEXP_REPLACE( neg_sorted, \'[+]\', \'\\\\\\\\+\' ), \' \' ), \'\\\\s(\\\\w*\\\\s)*\' ), \' \' ) ) )',
		'	)',
	].join( '\n' ),
	CLOSE_VARIANTS : [
		'#StandardSQL',
		'SELECT',
		'	AccountName,',
		'	ExternalCustomerId,',
		'	Campaign_ AS Campaign,',
		'	CampaignId,',
		'	AdGroupId,',
		'	AdGroup_ AS AdGroup,',
		'	CampaignStatus,',
		'	AdGroupStatus,',
		'	Status,',
		'	Keyword_ as exact_keyword,',
		'	Query',
		'FROM (',
		'	SELECT',
		'		ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'		CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'		CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'		CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'		CampaignName as Campaign_,',
		'		AdGroupName as AdGroup_,',
		'		keyword.Criteria as Keyword_,',
		'		sq.Query,',
		'		campaign.CampaignStatus,',
		'		adgroup.AdGroupStatus,',
		'		keyword.Status,',
		'		count(*) as count',
		'	FROM (',
		'		SELECT ExternalCustomerId, CampaignId, AdGroupId, CriterionId, Query',
		'		FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.SearchQueryStats_' + ACCOUNT_ID + '`',
		'		WHERE true',
		'			AND _LATEST_DATE = _DATA_DATE',
		'			--AND DATE_DIFF( CURRENT_DATE(), Date, DAY ) <= 30',
		'		GROUP BY ExternalCustomerId, CampaignId, AdGroupId, CriterionId, Query',
		'	) as sq',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = sq.ExternalCustomerId',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = sq.ExternalCustomerId AND sq.CampaignId = campaign.CampaignId',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = sq.ExternalCustomerId AND sq.AdGroupId = adgroup.AdGroupId',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword ON keyword.ExternalCustomerId = sq.ExternalCustomerId AND keyword.AdGroupId = sq.AdGroupId AND keyword.CriterionId = sq.CriterionId',
		'	JOIN (',
		'		SELECT sq2.ExternalCustomerId, sq2.CampaignId, sq2.AdGroupId, sq2.CriterionId, sq2.Query',
		'		FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.SearchQueryStats_' + ACCOUNT_ID + '` as sq2',
		'		JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as other_keyword',
		'			ON other_keyword.ExternalCustomerId = sq2.ExternalCustomerId',
		'			AND other_keyword.CampaignId = sq2.CampaignId',
		'			AND other_keyword.AdGroupId = sq2.AdGroupId',
		'			AND other_keyword.CriterionId = sq2.CriterionId',
		'		WHERE true',
		'			AND sq2._LATEST_DATE = sq2._DATA_DATE',
		'			--AND DATE_DIFF( CURRENT_DATE(), Date, DAY ) <= 30',
		'			AND other_keyword._LATEST_DATE = other_keyword._DATA_DATE',
		'			AND other_keyword.Status IN ( \'ENABLED\', \'PAUSED\' )',
		'			AND other_keyword.KeywordMatchType = \'EXACT\'',
		'		GROUP BY sq2.ExternalCustomerId, CampaignId, AdGroupId, CriterionId, Query',
		'	) as other_sq ON sq.ExternalCustomerId = other_sq.ExternalCustomerId AND sq.Query = other_sq.Query',
		'	WHERE TRUE',
		'		AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'		AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND keyword.Status IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND keyword.KeywordMatchType = \'EXACT\'',
		'		AND customer._LATEST_DATE = customer._DATA_DATE',
		'		AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'		AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'		AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	GROUP BY',
		'		customer.ExternalCustomerId,',
		'		AccountName,',
		'		CampaignName,',
		'		AdGroupId,',
		'		CampaignId,',
		'		AdGroupName,',
		'		keyword.Criteria,',
		'		campaign.CampaignStatus,',
		'		adgroup.AdGroupStatus,',
		'		keyword.Status,',
		'		Query',
		'	HAVING count > 1',
		')',
		'ORDER BY AccountName, query',
	].join( '\n' ),
	DUPLICATE_BMM_KEYWORDS_IN_CAMPAIGN : [
		'SELECT',
		'	AccountName,',
		'	CAST( keyword2.ExternalCustomerId as STRING ) AS ExternalCustomerId,',
		'	CAST( keyword2.CampaignId as STRING ) AS CampaignId,',
		'	CampaignName,',
		'	CampaignStatus,',
		'	keyword2.AdGroupId,',
		'	AdGroupName,',
		'	AdGroupStatus,',
		'	Rank,',
		'	Criteria,',
		'	keyword2.CriterionId,',
		'	QualityScore,',
		'	SUM( Impressions ) AS Impressions,',
		'	SUM( Clicks ) AS Clicks,',
		'	SUM( Cost ) / 1000000 AS Cost,',
		'	SUM( Conversions ) AS Conversions,',
		'	SUM( Cost ) / 1000000 / GREATEST( SUM( Conversions ), .01 ) AS Cpo,',
		'	SUM( Conversions ) / GREATEST( SUM( Clicks ), 1 ) AS Cvr',
		'FROM (',
		'	SELECT',
		'		AccountName,',
		'		ExternalCustomerId,',
		'		CampaignId,',
		'		CampaignName,',
		'		CampaignStatus,',
		'		AdGroupId,',
		'		AdGroupName,',
		'		AdGroupStatus,',
		'		DENSE_RANK() OVER ( PARTITION BY ExternalCustomerId ORDER BY FARM_FINGERPRINT( CONCAT( AccountName, CampaignName, keyword1 ) ) ) as Rank,',
		'		Criteria,',
		'		CriterionId,',
		'		QualityScore',
		'		--count1,',
		'		--DistinctDuplicates',
		'	FROM (',
		'		SELECT',
		'			*,',
		'			COUNT( * ) OVER ( PARTITION BY ExternalCustomerId, CampaignId, CampaignName, keyword1 ) AS count1,',
		'			COUNT( DISTINCT Criteria ) OVER ( PARTITION BY ExternalCustomerId, CampaignId, CampaignName, keyword1 ) AS DistinctDuplicates',
		'		FROM (',
		'			SELECT',
		'				ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'				customer.ExternalCustomerId AS ExternalCustomerId,',
		'				keyword.CampaignId AS CampaignId,',
		'				CampaignName,',
		'				campaign.CampaignStatus,',
		'				adgroup.AdGroupId,',
		'				adgroup.AdGroupName,',
		'				adgroup.AdGroupStatus,',
		'				( select ARRAY_TO_STRING(',
		'				  (',
		'				  array(',
		'					select x',
		'					from unnest( split( Criteria, \' \' ) ) as x',
		'					ORDER BY x',
		'				  )',
		'				  ),',
		'				  \' \'',
		'				  )',
		'				) as keyword1,',
		'				Criteria,',
		'				keyword.CriterionId,',
		'				keyword.QualityScore',
		'			FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'			JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON keyword.ExternalCustomerId = customer.ExternalCustomerId',
		'			JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON keyword.ExternalCustomerId = campaign.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId',
		'			JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId',
		'			WHERE TRUE',
		'				AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'				AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'				AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'				AND keyword.Status IN ( \'ENABLED\', \'PAUSED\' )',
		'				AND keyword.KeywordMatchType = \'BROAD\'',
		'				AND NOT keyword.isNegative',
		'				AND REGEXP_CONTAINS( keyword.Criteria, \'^(\\\\+\\\\w+)+\' )',
		'				AND customer._LATEST_DATE = customer._DATA_DATE',
		'				AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'				AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'				AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'		)',
		'	)',
		'	WHERE TRUE',
		'		AND count1 > 1',
		'		AND DistinctDuplicates > 1',
		') AS keyword2',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.KeywordBasicStats_' + ACCOUNT_ID + '` AS stat',
		'	ON TRUE',
		'	AND DATE_DIFF( CURRENT_DATE( \'Europe/Berlin\' ), stat._DATA_DATE, DAY ) < 90',
		'	AND stat.ExternalCustomerId = keyword2.ExternalCustomerId',
		'	AND stat.CampaignId = keyword2.CampaignId',
		'	AND stat.AdGroupId = keyword2.AdGroupId',
		'	AND stat.CriterionId = keyword2.CriterionId',
		'GROUP BY',
		'	AccountName,',
		'	ExternalCustomerId,',
		'	CampaignId,',
		'	CampaignName,',
		'	CampaignStatus,',
		'	AdGroupId,',
		'	AdGroupName,',
		'	AdGroupStatus,',
		'	Rank,',
		'	Criteria,',
		'	CriterionId,',
		'	QualityScore',
		'ORDER BY',
		'	ExternalCustomerId,',
		'	Rank',
	].join( '\n' ),
	DUPLICATE_CONVERSION_TRACKER : [
		'#StandardSQL',
		'SELECT',
		'	AccountName,',
		'	ExternalCustomerId,',
		'	STRING_AGG( CONCAT( ConversionTypeName, \'[ \', cast( ConversionTrackerId as STRING ), \' ]\' ) , \', \' ) as conversion_tracker_ids,',
		'	count(*) as count,',
		'	conversions,',
		'	value',
		'FROM (',
		'	SELECT',
		'		ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'		CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'		ConversionTrackerId,',
		'		ConversionTypeName,',
		'		sum( Conversions ) as conversions,',
		'		sum( ConversionValue ) as value',
		'	FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CriteriaConversionStats_' + ACCOUNT_ID + '` as k',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = k.ExternalCustomerId',
		'	WHERE TRUE',
		'		AND DATE_DIFF( CURRENT_DATE(), k.Date, DAY ) <= 30',
		'		AND customer._LATEST_DATE = customer._DATA_DATE',
		'		--AND k._LATEST_DATE = k._DATA_DATE',
		'	GROUP BY customer.ExternalCustomerId, AccountName, ConversionTrackerId, ConversionTypeName',
		'	ORDER BY AccountName, ConversionTrackerId, ConversionTypeName',
		')',
		'GROUP BY',
		'	ExternalCustomerId,',
		'	AccountName,',
		'	conversions,',
		'	value',
		'HAVING count > 1',
		'	AND conversions > 1',
	].join( '\n' ),
	DUPLICATE_KEYWORD_IN_CAMPAIGN : [
		'#StandardSQL',
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( keyword.CampaignId as STRING ) as CampaignId,',
		'	CampaignName,',
		'	campaign.CampaignStatus,',
		'	Criteria,',
		'	KeywordMatchType,',
		'	count(*) as count',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign',
		'	ON keyword.ExternalCustomerId = campaign.ExternalCustomerId',
		'	AND keyword.CampaignId = campaign.CampaignId',
		'	AND campaign.AdvertisingChannelType = \'SEARCH\'',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND NOT keyword.isNegative',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\' )',
		'	AND keyword.Status IN ( \'ENABLED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'GROUP BY',
		'	customer.ExternalCustomerId,',
		'	AccountName,',
		'	CampaignName,',
		'	campaign.CampaignStatus,',
		'	Criteria,',
		'	KeywordMatchType,',
		'	CampaignId',
		'HAVING count > 1',
		'ORDER BY count desc',
	].join( '\n' ),
	EXTENSION_NO_SITE_LINKS : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CampaignName,',
		'	campaign.CampaignStatus,',
		'	ifnull( sum( cast( EntityType = \'sitelinks\' as int64 ) ), 0 ) as count_site_links,',
		'	ifnull( sum( cast( EntityType = \'callouts\' as int64 ) ), 0 ) as count_callouts,',
		'	ifnull( sum( cast( EntityType = \'snippets\' as int64 ) ), 0 ) as count_snippets,',
		'	ifnull( sum( cast( EntityType = \'messages\' as int64 ) ), 0 ) as count_messages,',
		'	ifnull( sum( cast( EntityType = \'phoneNumbers\' as int64 ) ), 0 ) as count_phone_numbers,',
		'	ifnull( sum( cast( EntityType = \'mobileApps\' as int64 ) ), 0 ) as count_mobile_apps',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.ExtensionsCampaignMap_' + ACCOUNT_ID + '` AS map',
		'	ON campaign.ExternalCustomerId = map.ExternalCustomerId',
		'	AND campaign.CampaignId = map.CampaignId',
		'	AND map._DATA_DATE = map._LATEST_DATE',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._DATA_DATE = campaign._LATEST_DATE',
		'	AND customer._DATA_DATE = customer._LATEST_DATE',
		'	-- take into account only campaigns which are served by adwords-script',
		'	AND campaign.ExternalCustomerId IN (',
		'		SELECT ExternalCustomerId',
		'		FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignSettings_' + ACCOUNT_ID + '` as x ',
		'		WHERE x._DATA_DATE = x._LATEST_DATE',
		'		GROUP BY ExternalCustomerId',
		'	)',
		'GROUP BY',
		'	customer.ExternalCustomerId,',
		'	campaign.CampaignName,',
		'	campaign.CampaignStatus,',
		'	CustomerDescriptiveName,',
		'	AccountDescriptiveName,',
		'	CampaignId',
		'HAVING TRUE',
		'	AND count_site_links = 0',
	].join( '\n' ),
	EXTENSION_TOO_FEW_SITE_LINKS : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CampaignName,',
		'	campaign.CampaignStatus,',
		'	ifnull( sum( cast( EntityType = \'sitelinks\' as int64 ) ), 0 ) as count_site_links,',
		'	ifnull( sum( cast( EntityType = \'callouts\' as int64 ) ), 0 ) as count_callouts,',
		'	ifnull( sum( cast( EntityType = \'snippets\' as int64 ) ), 0 ) as count_snippets,',
		'	ifnull( sum( cast( EntityType = \'messages\' as int64 ) ), 0 ) as count_messages,',
		'	ifnull( sum( cast( EntityType = \'phoneNumbers\' as int64 ) ), 0 ) as count_phone_numbers,',
		'	ifnull( sum( cast( EntityType = \'mobileApps\' as int64 ) ), 0 ) as count_mobile_apps',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.ExtensionsCampaignMap_' + ACCOUNT_ID + '` AS map',
		'	ON campaign.ExternalCustomerId = map.ExternalCustomerId',
		'	AND campaign.CampaignId = map.CampaignId',
		'	AND map._DATA_DATE = map._LATEST_DATE',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._DATA_DATE = campaign._LATEST_DATE',
		'	AND customer._DATA_DATE = customer._LATEST_DATE',
		'	-- take into account only campaigns which are served by adwords-script',
		'	AND campaign.ExternalCustomerId IN (',
		'		SELECT ExternalCustomerId',
		'		FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignSettings_' + ACCOUNT_ID + '` as x ',
		'		WHERE x._DATA_DATE = x._LATEST_DATE',
		'		GROUP BY ExternalCustomerId',
		'	)',
		'GROUP BY',
		'	customer.ExternalCustomerId,',
		'	campaign.CampaignName,',
		'	campaign.CampaignStatus,',
		'	CustomerDescriptiveName,',
		'	AccountDescriptiveName,',
		'	CampaignId',
		'HAVING TRUE',
		'	AND count_site_links in ( 1, 2, 3 )',
	].join( '\n' ),
	EXTENSION_NO_CALLOUTS : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CampaignName,',
		'	campaign.CampaignStatus,',
		'	ifnull( sum( cast( EntityType = \'sitelinks\' as int64 ) ), 0 ) as count_site_links,',
		'	ifnull( sum( cast( EntityType = \'callouts\' as int64 ) ), 0 ) as count_callouts,',
		'	ifnull( sum( cast( EntityType = \'snippets\' as int64 ) ), 0 ) as count_snippets,',
		'	ifnull( sum( cast( EntityType = \'messages\' as int64 ) ), 0 ) as count_messages,',
		'	ifnull( sum( cast( EntityType = \'phoneNumbers\' as int64 ) ), 0 ) as count_phone_numbers,',
		'	ifnull( sum( cast( EntityType = \'mobileApps\' as int64 ) ), 0 ) as count_mobile_apps',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.ExtensionsCampaignMap_' + ACCOUNT_ID + '` AS map',
		'	ON campaign.ExternalCustomerId = map.ExternalCustomerId',
		'	AND campaign.CampaignId = map.CampaignId',
		'	AND map._DATA_DATE = map._LATEST_DATE',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._DATA_DATE = campaign._LATEST_DATE',
		'	AND customer._DATA_DATE = customer._LATEST_DATE',
		'	-- take into account only campaigns which are served by adwords-script',
		'	AND campaign.ExternalCustomerId IN (',
		'		SELECT ExternalCustomerId',
		'		FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignSettings_' + ACCOUNT_ID + '` as x ',
		'		WHERE x._DATA_DATE = x._LATEST_DATE',
		'		GROUP BY ExternalCustomerId',
		'	)',
		'GROUP BY',
		'	customer.ExternalCustomerId,',
		'	campaign.CampaignName,',
		'	campaign.CampaignStatus,',
		'	CustomerDescriptiveName,',
		'	AccountDescriptiveName,',
		'	CampaignId',
		'HAVING TRUE',
		'	AND count_callouts = 0',
	].join( '\n' ),
	EXTENSION_TOO_FEW_CALLOUTS : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CampaignName,',
		'	campaign.CampaignStatus,',
		'	ifnull( sum( cast( EntityType = \'sitelinks\' as int64 ) ), 0 ) as count_site_links,',
		'	ifnull( sum( cast( EntityType = \'callouts\' as int64 ) ), 0 ) as count_callouts,',
		'	ifnull( sum( cast( EntityType = \'snippets\' as int64 ) ), 0 ) as count_snippets,',
		'	ifnull( sum( cast( EntityType = \'messages\' as int64 ) ), 0 ) as count_messages,',
		'	ifnull( sum( cast( EntityType = \'phoneNumbers\' as int64 ) ), 0 ) as count_phone_numbers,',
		'	ifnull( sum( cast( EntityType = \'mobileApps\' as int64 ) ), 0 ) as count_mobile_apps',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.ExtensionsCampaignMap_' + ACCOUNT_ID + '` AS map',
		'	ON campaign.ExternalCustomerId = map.ExternalCustomerId',
		'	AND campaign.CampaignId = map.CampaignId',
		'	AND map._DATA_DATE = map._LATEST_DATE',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._DATA_DATE = campaign._LATEST_DATE',
		'	AND customer._DATA_DATE = customer._LATEST_DATE',
		'	-- take into account only campaigns which are served by adwords-script',
		'	AND campaign.ExternalCustomerId IN (',
		'		SELECT ExternalCustomerId',
		'		FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignSettings_' + ACCOUNT_ID + '` as x',
		'		WHERE x._DATA_DATE = x._LATEST_DATE',
		'		GROUP BY ExternalCustomerId',
		'	)',
		'GROUP BY',
		'	customer.ExternalCustomerId,',
		'	campaign.CampaignName,',
		'	campaign.CampaignStatus,',
		'	CustomerDescriptiveName,',
		'	AccountDescriptiveName,',
		'	CampaignId',
		'HAVING TRUE',
		'	AND count_callouts in ( 1, 2, 3 )',
	].join( '\n' ),
	EXTENSION_NO_SNIPPETS : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CampaignName,',
		'	campaign.CampaignStatus,',
		'	ifnull( sum( cast( EntityType = \'sitelinks\' as int64 ) ), 0 ) as count_site_links,',
		'	ifnull( sum( cast( EntityType = \'callouts\' as int64 ) ), 0 ) as count_callouts,',
		'	ifnull( sum( cast( EntityType = \'snippets\' as int64 ) ), 0 ) as count_snippets,',
		'	ifnull( sum( cast( EntityType = \'messages\' as int64 ) ), 0 ) as count_messages,',
		'	ifnull( sum( cast( EntityType = \'phoneNumbers\' as int64 ) ), 0 ) as count_phone_numbers,',
		'	ifnull( sum( cast( EntityType = \'mobileApps\' as int64 ) ), 0 ) as count_mobile_apps',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.ExtensionsCampaignMap_' + ACCOUNT_ID + '` AS map',
		'	ON campaign.ExternalCustomerId = map.ExternalCustomerId',
		'	AND campaign.CampaignId = map.CampaignId',
		'	AND map._DATA_DATE = map._LATEST_DATE',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._DATA_DATE = campaign._LATEST_DATE',
		'	AND customer._DATA_DATE = customer._LATEST_DATE',
		'	-- take into account only campaigns which are served by adwords-script',
		'	AND campaign.ExternalCustomerId IN (',
		'		SELECT ExternalCustomerId',
		'		FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignSettings_' + ACCOUNT_ID + '` as x ',
		'		WHERE x._DATA_DATE = x._LATEST_DATE',
		'		GROUP BY ExternalCustomerId',
		'	)',
		'GROUP BY',
		'	customer.ExternalCustomerId,',
		'	campaign.CampaignName,',
		'	campaign.CampaignStatus,',
		'	CustomerDescriptiveName,',
		'	AccountDescriptiveName,',
		'	CampaignId',
		'HAVING TRUE',
		'	AND count_snippets = 0',
	].join( '\n' ),
	EXTENSION_TOO_FEW_SNIPPETS : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CampaignName,',
		'	campaign.CampaignStatus,',
		'	ifnull( sum( cast( EntityType = \'sitelinks\' as int64 ) ), 0 ) as count_site_links,',
		'	ifnull( sum( cast( EntityType = \'callouts\' as int64 ) ), 0 ) as count_callouts,',
		'	ifnull( sum( cast( EntityType = \'snippets\' as int64 ) ), 0 ) as count_snippets,',
		'	ifnull( sum( cast( EntityType = \'messages\' as int64 ) ), 0 ) as count_messages,',
		'	ifnull( sum( cast( EntityType = \'phoneNumbers\' as int64 ) ), 0 ) as count_phone_numbers,',
		'	ifnull( sum( cast( EntityType = \'mobileApps\' as int64 ) ), 0 ) as count_mobile_apps',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.ExtensionsCampaignMap_' + ACCOUNT_ID + '` AS map',
		'	ON campaign.ExternalCustomerId = map.ExternalCustomerId',
		'	AND campaign.CampaignId = map.CampaignId',
		'	AND map._DATA_DATE = map._LATEST_DATE',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._DATA_DATE = campaign._LATEST_DATE',
		'	AND customer._DATA_DATE = customer._LATEST_DATE',
		'	-- take into account only campaigns which are served by adwords-script',
		'	AND campaign.ExternalCustomerId IN (',
		'		SELECT ExternalCustomerId',
		'		FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignSettings_' + ACCOUNT_ID + '` as x ',
		'		WHERE x._DATA_DATE = x._LATEST_DATE',
		'		GROUP BY ExternalCustomerId',
		'	)',
		'GROUP BY',
		'	customer.ExternalCustomerId,',
		'	campaign.CampaignName,',
		'	campaign.CampaignStatus,',
		'	CustomerDescriptiveName,',
		'	AccountDescriptiveName,',
		'	CampaignId',
		'HAVING TRUE',
		'	AND count_snippets in ( 1, 2, 3 )',
	].join( '\n' ),
	EXTENSION_NO_MESSAGES : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CampaignName,',
		'	campaign.CampaignStatus,',
		'	ifnull( sum( cast( EntityType = \'sitelinks\' as int64 ) ), 0 ) as count_site_links,',
		'	ifnull( sum( cast( EntityType = \'callouts\' as int64 ) ), 0 ) as count_callouts,',
		'	ifnull( sum( cast( EntityType = \'snippets\' as int64 ) ), 0 ) as count_snippets,',
		'	ifnull( sum( cast( EntityType = \'messages\' as int64 ) ), 0 ) as count_messages,',
		'	ifnull( sum( cast( EntityType = \'phoneNumbers\' as int64 ) ), 0 ) as count_phone_numbers,',
		'	ifnull( sum( cast( EntityType = \'mobileApps\' as int64 ) ), 0 ) as count_mobile_apps',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.ExtensionsCampaignMap_' + ACCOUNT_ID + '` AS map',
		'	ON campaign.ExternalCustomerId = map.ExternalCustomerId',
		'	AND campaign.CampaignId = map.CampaignId',
		'	AND map._DATA_DATE = map._LATEST_DATE',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._DATA_DATE = campaign._LATEST_DATE',
		'	AND customer._DATA_DATE = customer._LATEST_DATE',
		'	-- take into account only campaigns which are served by adwords-script',
		'	AND campaign.ExternalCustomerId IN (',
		'		SELECT ExternalCustomerId',
		'		FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignSettings_' + ACCOUNT_ID + '` as x ',
		'		WHERE x._DATA_DATE = x._LATEST_DATE',
		'		GROUP BY ExternalCustomerId',
		'	)',
		'GROUP BY',
		'	customer.ExternalCustomerId,',
		'	campaign.CampaignName,',
		'	campaign.CampaignStatus,',
		'	CustomerDescriptiveName,',
		'	AccountDescriptiveName,',
		'	CampaignId',
		'HAVING TRUE',
		'	AND count_messages = 0',
	].join( '\n' ),
	EXTENSION_NO_PHONE_NUMBERS : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CampaignName,',
		'	campaign.CampaignStatus,',
		'	ifnull( sum( cast( EntityType = \'sitelinks\' as int64 ) ), 0 ) as count_site_links,',
		'	ifnull( sum( cast( EntityType = \'callouts\' as int64 ) ), 0 ) as count_callouts,',
		'	ifnull( sum( cast( EntityType = \'snippets\' as int64 ) ), 0 ) as count_snippets,',
		'	ifnull( sum( cast( EntityType = \'messages\' as int64 ) ), 0 ) as count_messages,',
		'	ifnull( sum( cast( EntityType = \'phoneNumbers\' as int64 ) ), 0 ) as count_phone_numbers,',
		'	ifnull( sum( cast( EntityType = \'mobileApps\' as int64 ) ), 0 ) as count_mobile_apps',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.ExtensionsCampaignMap_' + ACCOUNT_ID + '` AS map',
		'	ON campaign.ExternalCustomerId = map.ExternalCustomerId',
		'	AND campaign.CampaignId = map.CampaignId',
		'	AND map._DATA_DATE = map._LATEST_DATE',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._DATA_DATE = campaign._LATEST_DATE',
		'	AND customer._DATA_DATE = customer._LATEST_DATE',
		'	-- take into account only campaigns which are served by adwords-script',
		'	AND campaign.ExternalCustomerId IN (',
		'		SELECT ExternalCustomerId',
		'		FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignSettings_' + ACCOUNT_ID + '` as x ',
		'		WHERE x._DATA_DATE = x._LATEST_DATE',
		'		GROUP BY ExternalCustomerId',
		'	)',
		'GROUP BY',
		'	customer.ExternalCustomerId,',
		'	campaign.CampaignName,',
		'	campaign.CampaignStatus,',
		'	CustomerDescriptiveName,',
		'	AccountDescriptiveName,',
		'	CampaignId',
		'HAVING TRUE',
		'	AND count_phone_numbers = 0',
	].join( '\n' ),
	EXTENSION_NO_MOBILE_APPS : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CampaignName,',
		'	campaign.CampaignStatus,',
		'	ifnull( sum( cast( EntityType = \'sitelinks\' as int64 ) ), 0 ) as count_site_links,',
		'	ifnull( sum( cast( EntityType = \'callouts\' as int64 ) ), 0 ) as count_callouts,',
		'	ifnull( sum( cast( EntityType = \'snippets\' as int64 ) ), 0 ) as count_snippets,',
		'	ifnull( sum( cast( EntityType = \'messages\' as int64 ) ), 0 ) as count_messages,',
		'	ifnull( sum( cast( EntityType = \'phoneNumbers\' as int64 ) ), 0 ) as count_phone_numbers,',
		'	ifnull( sum( cast( EntityType = \'mobileApps\' as int64 ) ), 0 ) as count_mobile_apps',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.ExtensionsCampaignMap_' + ACCOUNT_ID + '` AS map',
		'	ON campaign.ExternalCustomerId = map.ExternalCustomerId',
		'	AND campaign.CampaignId = map.CampaignId',
		'	AND map._DATA_DATE = map._LATEST_DATE',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._DATA_DATE = campaign._LATEST_DATE',
		'	AND customer._DATA_DATE = customer._LATEST_DATE',
		'	-- take into account only campaigns which are served by adwords-script',
		'	AND campaign.ExternalCustomerId IN (',
		'		SELECT ExternalCustomerId',
		'		FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignSettings_' + ACCOUNT_ID + '` as x ',
		'		WHERE x._DATA_DATE = x._LATEST_DATE',
		'		GROUP BY ExternalCustomerId',
		'	)',
		'GROUP BY',
		'	customer.ExternalCustomerId,',
		'	campaign.CampaignName,',
		'	campaign.CampaignStatus,',
		'	CustomerDescriptiveName,',
		'	AccountDescriptiveName,',
		'	CampaignId',
		'HAVING TRUE',
		'	AND count_mobile_apps = 0',
	].join( '\n' ),
	INFORMATIONAL_SEARCH_QUERY : [
		'#StandardSQL',
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Criteria,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	keyword.Status,',
		'	Query',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.SearchQueryStats_' + ACCOUNT_ID + '` as sq',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON sq.ExternalCustomerId = campaign.ExternalCustomerId AND sq.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON sq.ExternalCustomerId = adgroup.ExternalCustomerId AND sq.AdGroupId = adgroup.AdGroupId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword ON sq.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.AdGroupId = sq.AdGroupId AND keyword.CriterionId = sq.CriterionId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	AND sq._LATEST_DATE = sq._DATA_DATE',
		'	--AND DATE_DIFF( CURRENT_DATE(), sq.Date, DAY ) <= 30',
		'	AND REGEXP_CONTAINS( sq.Query, \'^was\\\\s|^wo\\\\s|^wie\\\\s|^wann\\\\s|^warum\\\\s|^wieso\\\\s|^weshalb\\\\s|^wer\\\\s|^wen\\\\s\' )',
		'GROUP BY',
		'	customer.ExternalCustomerId,',
		'	AccountName,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Criteria,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	keyword.Status,',
		'	Query,',
		'	AdGroupId,',
		'	CampaignId',
	].join( '\n' ),
	KEYWORD_TARGET_URL_MULTIPLE_QUESTION_MARKS : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Criteria,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	keyword.Status,',
		'	KeywordMatchType,',
		'	FinalUrls',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND NOT IsNegative',
		'	AND REGEXP_CONTAINS( FinalUrls, \'\\\\?.*\\\\?\' )',
		'	AND NOT REGEXP_CONTAINS( FinalUrls, \',\' ) -- consider only lists with one url',
	].join( '\n' ),
	KEYWORD_TARGET_URL_MISSING : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Criteria,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	keyword.Status,',
		'	KeywordMatchType,',
		'	FinalUrls',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND NOT IsNegative',
		'	AND FinalUrls is NULL',
	].join( '\n' ),
	KEYWORD_CAMPAIGN_MATCH_TYPE_MISMATCH : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Criteria,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	keyword.Status,',
		'	KeywordMatchType,',
		'	FinalUrls',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND NOT IsNegative ',
		'	AND (',
		'		( KeywordMatchType != \'BROAD\' AND REGEXP_CONTAINS( UPPER( CampaignName ), \'BROAD\' ) )',
		'		OR',
		'		( KeywordMatchType != \'EXACT\' AND REGEXP_CONTAINS( UPPER( CampaignName ), \'EXACT\' ) )',
		'		OR',
		'		( KeywordMatchType != \'BROAD\' AND REGEXP_CONTAINS( UPPER( CampaignName ), \'BMM\' ) )',
		'	)',
	].join( '\n' ),
	KEYWORD_ADGROUP_MATCH_TYPE_MISMATCH : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Criteria,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	keyword.Status,',
		'	KeywordMatchType,',
		'	FinalUrls',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND NOT IsNegative ',
		'	AND (',
		'		( KeywordMatchType != \'BROAD\' AND REGEXP_CONTAINS( UPPER( AdGroupName ), \'BROAD\' ) )',
		'		OR',
		'		( KeywordMatchType != \'EXACT\' AND REGEXP_CONTAINS( UPPER( AdGroupName ), \'EXACT\' ) )',
		'		OR',
		'		( KeywordMatchType != \'BROAD\' AND REGEXP_CONTAINS( UPPER( AdGroupName ), \'BMM\' ) )',
		'	)',
	].join( '\n' ),
	KEYWORD_CONTAINS_DOT : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Criteria,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	keyword.Status,',
		'	KeywordMatchType,',
		'	FinalUrls',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND NOT IsNegative',
		'	AND REGEXP_CONTAINS( Criteria, \'\\\\.\' )',
	].join( '\n' ),
	KEYWORD_CONTAINS_CAPITAL : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Criteria,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	keyword.Status,',
		'	KeywordMatchType,',
		'	FinalUrls',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND NOT IsNegative',
		'	AND REGEXP_CONTAINS( Criteria, \'[A-Z]\' )',
	].join( '\n' ),
	KEYWORD_CONTAINS_DASH : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Criteria,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	keyword.Status,',
		'	KeywordMatchType,',
		'	FinalUrls',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND NOT IsNegative',
		'	AND REGEXP_CONTAINS( Criteria, \'-\' )',
	].join( '\n' ),
	KEYWORD_WRONGLY_MODIFIED_BROAD : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Criteria,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	keyword.Status,',
		'	KeywordMatchType,',
		'	FinalUrls',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND NOT IsNegative',
		'	AND KeywordMatchType = \'BROAD\' ',
		'	AND REGEXP_CONTAINS( Criteria, \'(\\\\S\\\\+)|(\\\\+(\\\\s+|$))\' )',
	].join( '\n' ),
	KEYWORD_DUPLICATE_BMM_FRAGMENTS : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Criteria,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	keyword.Status,',
		'	KeywordMatchType,',
		'	FinalUrls',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND NOT IsNegative',
		'	AND KeywordMatchType = \'BROAD\'',
		'	AND (',
		'		SELECT count(*) > 0 as contains_duplicate_words',
		'		FROM (',
		'			SELECT x, count(*) as count',
		'			FROM unnest( split( REGEXP_REPLACE( REGEXP_REPLACE( Criteria, \'\\\\s\\\\+\', \' \' ), \'^\\\\+\', \'\' ), \' \' ) ) as x',
		'			WHERE LENGTH( x ) > 1',
		'			GROUP BY x',
		'			HAVING count > 1',
		'		)',
		'	)',
	].join( '\n' ),
	KEYWORD_PLUS_IN_NON_BROAD : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Criteria,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	keyword.Status,',
		'	KeywordMatchType,',
		'	FinalUrls',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND NOT IsNegative',
		'	AND KeywordMatchType != \'BROAD\'',
		'	AND REGEXP_CONTAINS( Criteria, \'\\\\+\' )',
	].join( '\n' ),
	KEYWORD_PARTLY_MODIFIED_BROAD : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Criteria,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	keyword.Status,',
		'	KeywordMatchType,',
		'	FinalUrls',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND NOT IsNegative',
		'	AND KeywordMatchType = \'BROAD\'',
		'	AND REGEXP_CONTAINS( Criteria, \'((^|\\\\s)\\\\+\\\\S.*\\\\s[^\\\\+])|((^|\\\\s)[^\\\\+].*(\\\\s)\\\\+\\\\S)\' )',
	].join( '\n' ),
	KEYWORD_UNMODIFIED_BROAD : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Criteria,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	keyword.Status,',
		'	KeywordMatchType,',
		'	FinalUrls',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND NOT IsNegative',
		'	AND KeywordMatchType = \'BROAD\'',
		'	AND NOT REGEXP_CONTAINS( Criteria, \'\\\\+\' )',
	].join( '\n' ),
	KEYWORD_SESSION_ID_IN_URL : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Criteria,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	keyword.Status,',
		'	KeywordMatchType,',
		'	FinalUrls',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND keyword.Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND NOT IsNegative',
		'	AND REGEXP_CONTAINS( ifnull( FinalUrls, \'\' ), \'session[-_]?[Ii]d\' )',
	].join( '\n' ),
	KEYWORD_MODIFIED_NEGATIVE : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Criteria,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	keyword.Status, -- negative keywords are always enabled, but we need this column for ds_ views',
		'	KeywordMatchType,',
		'	FinalUrls',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND keyword.Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND keyword.IsNegative',
		'	AND REGEXP_CONTAINS( CONCAT( \' \', Criteria ), \'\\\\s\\\\+\' )',
	].join( '\n' ),
	LOCATION_BID_MODIFIER_MISSING : [
		'#StandardSQL',
		'SELECT',
		'	AccountName,',
		'	ExternalCustomerId,',
		'	CampaignName,',
		'	CampaignStatus,',
		'	CampaignId,',
		'	round( count_missing_location_bid_modifier / count_locations, 2 ) as missing_bid_modifier_share',
		'FROM (',
		'	SELECT',
		'		ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'		CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'		CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'		campaign.CampaignName,',
		'		campaign.CampaignStatus,',
		'		count(*) as count_locations,',
		'		sum( cast( ( location.BidModifier is null ) as int64 ) ) as count_missing_location_bid_modifier',
		'	FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer',
		'		ON customer.ExternalCustomerId = campaign.ExternalCustomerId',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.LocationBasedCampaignCriterion_' + ACCOUNT_ID + '` as location',
		'		ON campaign.ExternalCustomerId = location.ExternalCustomerId',
		'		AND campaign.campaignId = location.CampaignId',
		'	WHERE TRUE',
		'		AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'		AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'		AND customer._LATEST_DATE = customer._DATA_DATE',
		'		AND location._LATEST_DATE = location._DATA_DATE',
		'		AND NOT isNegative',
		'	GROUP BY customer.ExternalCustomerId, AccountName, CampaignName, CampaignId, campaign.CampaignStatus',
		'	HAVING TRUE',
		'		AND count_locations > 1',
		'		AND count_missing_location_bid_modifier > 0',
		'	ORDER BY AccountName, CampaignName',
		')',
	].join( '\n' ),
	MULTIPLE_DOMAINS_IN_ADGROUP : [
		'#StandardSQL',
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	CampaignName,',
		'	AdGroupName,',
		'	STRING_AGG( DISTINCT REGEXP_Extract( keyword.FinalUrls, \'[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\\\\.[a-zA-Z]{2,}\\\\/\' ) , \', \' ) as domains,',
		'	count(*) as countKeywords,',
		'	count( DISTINCT REGEXP_Extract( keyword.FinalUrls, \'[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\\\\.[a-zA-Z]{2,}\\\\/\' ) ) as countDomains',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND campaign.CampaignId = keyword.CampaignId',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND adgroup.AdGroupId = keyword.AdGroupId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND NOT keyword.IsNegative',
		'	AND keyword.ApprovalStatus = \'APPROVED\'',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND keyword.Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'group by customer.ExternalCustomerId, AccountName, CampaignName, AdGroupName, AdGroupId, CampaignId, campaign.CampaignStatus, adgroup.AdGroupStatus',
		'having countDomains > 1',
	].join( '\n' ),
	REPLACEABLE_NEGATIVE_KEYWORDS : [
		'#StandardSQL',
		'SELECT',
		'	AccountName,',
		'	ExternalCustomerId,',
		'	campaigns.CampaignId,',
		'	campaigns.CampaignStatus,',
		'	negKeywords.CampaignName,',
		'	Criteria as negative_keyword,',
		'	KeywordMatchType as match_type,',
		'	countAdgroups as count',
		'FROM (',
		'	SELECT',
		'		ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'		CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'		CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'		CampaignName,',
		'		Criteria,',
		'		keyword.KeywordMatchType',
		'		,count( DISTINCT AdGroupName ) as countAdgroups',
		'	FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND campaign.CampaignId = keyword.CampaignId',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND adgroup.AdGroupId = keyword.AdGroupId',
		'	WHERE TRUE',
		'		AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'		AND keyword.IsNegative',
		'		AND keyword.Status IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'		AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'		AND customer._LATEST_DATE = customer._DATA_DATE',
		'		AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	GROUP BY customer.ExternalCustomerId, AccountName, campaign.CampaignId, CampaignName, Criteria, KeywordMatchType',
		') AS negKeywords',
		'JOIN (',
		'	SELECT',
		'		CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'		CampaignStatus,',
		'		count( AdGroupName ) as countAdgroupsInCampaign',
		'	FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = campaign.ExternalCustomerId AND campaign.CampaignId = adgroup.CampaignId',
		'	WHERE TRUE',
		'		AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'		AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'		AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	GROUP BY CampaignId, CampaignName, CampaignStatus',
		') as campaigns',
		'ON negKeywords.CampaignId = campaigns.CampaignId',
		'WHERE countAdgroups = countAdgroupsInCampaign',
		'	AND countAdgroups > 1',
	].join( '\n' ),
	SEARCH_QUERIES_TRIGGERED_BY_MORE_THAN_ONE_KEYWORD : [
		'#StandardSQL',
		'SELECT *',
		'FROM (',
		'	SELECT',
		'		*',
		'		,',
		'		COUNT(*) OVER (',
		'			PARTITION BY',
		'			ExternalCustomerId,',
		'			AccountName,',
		'			Query',
		'		) AS criteriaCount',
		'	FROM (',
		'		SELECT',
		'			ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'			CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'			Query,',
		'			campaign.CampaignName,',
		'			campaign.CampaignId,',
		'			adgroup.AdGroupName,',
		'			adgroup.AdGroupId,',
		'			campaign.CampaignStatus,',
		'			adgroup.AdGroupStatus,',
		'			keyword.Status,',
		'			keyword.Criteria,',
		'			keyword.CriterionId,',
		'			keyword.KeywordMatchType',
		'			--,STRING_AGG( DISTINCT CONCAT( campaign.CampaignName, \'>\', adgroup.AdGroupName, \'>\', keyword.Criteria, \'[\', keyword.KeywordMatchType, \']\' ) , \',\\n\' ) as keywords',
		'			--,COUNT( DISTINCT CONCAT( campaign.CampaignName, \'>\', adgroup.AdGroupName, \'>\', keyword.Criteria ) ) as countKeywords',
		'		FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.SearchQueryStats_' + ACCOUNT_ID + '` as sq',
		'		JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = sq.ExternalCustomerId AND sq.CampaignId = campaign.CampaignId',
		'		JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = sq.ExternalCustomerId',
		'		JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = sq.ExternalCustomerId AND sq.CampaignId = adgroup.CampaignId AND sq.AdGroupId = adgroup.AdGroupId',
		'		JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword ON keyword.ExternalCustomerId = sq.ExternalCustomerId AND keyword.CampaignId = sq.CampaignId AND keyword.AdGroupId = sq.AdGroupId AND keyword.CriterionId = sq.CriterionId',
		'		WHERE TRUE',
		'			AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'			AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'			AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'			AND keyword.Status IN ( \'ENABLED\', \'PAUSED\' )',
		'			AND NOT keyword.IsNegative',
		'			--AND sq._LATEST_DATE = sq._DATA_DATE',
		'			AND customer._LATEST_DATE = customer._DATA_DATE',
		'			AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'			AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'			AND keyword._LATEST_DATE = keyword._DATA_DATE',
		//'			AND sq._LATEST_DATE = sq._DATA_DATE',
		'			AND DATE_DIFF( sq._LATEST_DATE, sq.Date, DAY ) <= 30',
		'		GROUP BY',
		'			customer.ExternalCustomerId,',
		'			AccountName,',
		'			Query,',
		'			campaign.CampaignName,',
		'			campaign.CampaignId,',
		'			adgroup.AdGroupName,',
		'			adgroup.AdGroupId,',
		'			keyword.Criteria,',
		'			keyword.CriterionId,',
		'			campaign.CampaignStatus,',
		'			adgroup.AdGroupStatus,',
		'			keyword.Status,',
		'			keyword.KeywordMatchType',
		'	)',
		')',
		'WHERE TRUE',
		'	AND criteriaCount > 1',
		'ORDER BY criteriaCount DESC,',
		'	ExternalCustomerId,',
		'	AccountName,',
		'	Query,',
		'	CampaignName,',
		'	CampaignId,',
		'	AdGroupName,',
		'	AdGroupId,',
		'	Criteria,',
		'	CriterionId,',
		'	KeywordMatchType',
	].join( '\n' ),
	WORLDWIDE_TARGETING : [
		'#StandardSQL',
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	campaign.CampaignName,',
		'	campaign.CampaignStatus',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.LocationBasedCampaignCriterion_' + ACCOUNT_ID + '` as location',
		'	ON campaign.ExternalCustomerId = location.ExternalCustomerId',
		'	AND campaign.campaignId = location.CampaignId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND location.CriterionId is null',
		'ORDER BY AccountName, CampaignName',
	].join( '\n' ),
	DISAPPROVED_EXTENSIONS : [
		'#StandardSQL',
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	disapproved.DisapprovalShortNames as disapprovalReasons,',
		'	disapproved.PlaceholderType,',
		'	UPPER( disapproved.Status ) AS Status,',
		'	ifnull( ifnull( site_link.LinkText, ifnull( callout.Text, ifnull( messages.ExtensionText, ifnull( apps.LinkText, ifnull( cast( phones.Id as string), snippets.Values ) ) ) ) ), \'\' ) as text',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.ExtensionsDisapproved_' + ACCOUNT_ID + '` as disapproved',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer',
		'	ON customer.ExternalCustomerId = disapproved.ExternalCustomerId',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.ExtensionsSitelinks_' + ACCOUNT_ID + '` as site_link',
		'	ON site_link.ExternalCustomerId = disapproved.ExternalCustomerId',
		'	AND site_link.id = disapproved.FeedItemId',
		'	AND site_link._LATEST_DATE = site_link._DATA_DATE',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.ExtensionsCallouts_' + ACCOUNT_ID + '` as callout',
		'	ON callout.ExternalCustomerId = disapproved.ExternalCustomerId',
		'	AND callout.id = disapproved.FeedItemId',
		'	AND callout._LATEST_DATE = callout._DATA_DATE',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.ExtensionsMessages_' + ACCOUNT_ID + '` as messages',
		'	ON messages.ExternalCustomerId = disapproved.ExternalCustomerId',
		'	AND messages.id = disapproved.FeedItemId',
		'	AND messages._LATEST_DATE = messages._DATA_DATE',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.ExtensionsMobileApps_' + ACCOUNT_ID + '` as apps',
		'	ON apps.ExternalCustomerId = disapproved.ExternalCustomerId',
		'	AND apps.id = disapproved.FeedItemId',
		'	AND apps._LATEST_DATE = apps._DATA_DATE',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.ExtensionsPhoneNumbers_' + ACCOUNT_ID + '` as phones',
		'	ON phones.ExternalCustomerId = disapproved.ExternalCustomerId',
		'	AND phones.id = disapproved.FeedItemId',
		'	AND phones._LATEST_DATE = phones._DATA_DATE',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.ExtensionsSnippets_' + ACCOUNT_ID + '` as snippets',
		'	ON snippets.ExternalCustomerId = disapproved.ExternalCustomerId',
		'	AND snippets.id = disapproved.FeedItemId',
		'	AND snippets._LATEST_DATE = snippets._DATA_DATE',
		'WHERE TRUE',
		'	AND disapproved._LATEST_DATE = disapproved._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND disapproved.Status = disapproved.Status',
		'GROUP BY',
		'	customer.ExternalCustomerId,',
		'	CustomerDescriptiveName,',
		'	AccountDescriptiveName,',
		'	disapproved.DisapprovalShortNames,',
		'	disapproved.PlaceholderType,',
		'	disapproved.Status,',
		'	text',
	].join( '\n' ),
	DUPLICATE_KEYWORDS_BY_CASE : [
		'#StandardSQL',
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	CampaignName,',
		'	AdGroupName,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	keyword.Status,',
		'	KeywordMatchType,',
		'	LOWER( keyword.Criteria ) as keyword,',
		'	count( * ) as count,',
		'	STRING_AGG( keyword.Criteria, \', \' ) as keywords',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON keyword.ExternalCustomerId = campaign.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer',
		'	ON customer.ExternalCustomerId = keyword.ExternalCustomerId',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND keyword.Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND NOT IsNegative',
		'GROUP BY',
		'	customer.ExternalCustomerId,',
		'	CustomerDescriptiveName,',
		'	AccountDescriptiveName,',
		'	CampaignName,',
		'	AdGroupName,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	Status,',
		'	KeywordMatchType,',
		'	AdGroupId,',
		'	CampaignId,',
		'	keyword',
		'HAVING count > 1',
	].join( '\n' ),
	DOMINATED_NEGATIVE_KEYWORDS_IN_ADGROUPS : [
		'#StandardSQL',
		'SELECT',
		'	ifnull( CustomerDescriptiveName,',
		'    AccountDescriptiveName ) AS AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST(keyword2.AdGroupId as STRING ) as AdGroupId,',
		'	CAST(keyword1.CampaignId as STRING ) as CampaignId,',
		'	keyword1.CampaignName,',
		'	AdGroupName,',
		'	keyword1.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	keyword1.KeywordMatchType AS kw1_match_type,',
		'	keyword2.KeywordMatchType AS kw2_match_type,',
		'	keyword1.Criteria AS kw1,',
		'	keyword2.Criteria AS kw2',
		'FROM ( 	SELECT',
		'			k.ExternalCustomerId,',
		'			k.CampaignId,',
		'			CampaignName,',
		'			AdGroupId,',
		'			CriterionId,',
		'			Criteria,',
		'			KeywordMatchType,',
		'			campaign.CampaignStatus',
		'		FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as k',
		'		JOIN',
		'		  `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'		ON',
		'			k.ExternalCustomerId = campaign.ExternalCustomerId',
		'			AND k.CampaignId = campaign.CampaignId',
		'			AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'			AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		WHERE TRUE',
		'			AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'			AND k._LATEST_DATE = k._DATA_DATE',
		'			AND k.Status = \'ENABLED\'',
		'			AND k.IsNegative',
		'	) AS keyword1',
		'JOIN (	SELECT',
		'			k.ExternalCustomerId,',
		'			k.CampaignId,',
		'			CampaignName,',
		'			AdGroupId,',
		'			CriterionId,',
		'			Criteria,',
		'			KeywordMatchType',
		'		FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as k',
		'		JOIN',
		'		  `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'		ON',
		'			k.ExternalCustomerId = campaign.ExternalCustomerId',
		'			AND k.CampaignId = campaign.CampaignId',
		'			AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'			AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		WHERE TRUE',
		'			AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'			AND k._LATEST_DATE = k._DATA_DATE',
		'			AND k.Status = \'ENABLED\'',
		'			AND k.IsNegative',
		'			AND k.KeywordMatchType != \'EXACT\'',
		'	) AS keyword2',
		'ON',
		'	REGEXP_EXTRACT( CONCAT( \' \', keyword1.Criteria, \' \' ), CONCAT( \' \', REGEXP_REPLACE( keyword2.Criteria, \'\\\\+\', \'\\\\\\\\+\' ), \' \' ) ) IS NOT NULL',
		'	AND keyword1.CampaignId = keyword2.CampaignId',
		'	AND keyword1.AdGroupId = keyword2.AdGroupId',
		'	AND keyword1.CriterionId != keyword2.CriterionId',
		'	AND keyword1.ExternalCustomerId = keyword2.ExternalCustomerId',
		'JOIN',
		'	`' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` AS adgroup',
		'ON',
		'	keyword1.ExternalCustomerId = adgroup.ExternalCustomerId',
		'	AND keyword1.CampaignId = adgroup.CampaignId',
		'	AND keyword1.AdGroupId = adgroup.AdGroupId',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'JOIN',
		'	`' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer',
		'ON TRUE',
		'	AND customer.ExternalCustomerId = keyword1.ExternalCustomerId',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'WHERE',
		'	TRUE',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
	].join( '\n' ),
	DOMINATED_NEGATIVE_KEYWORDS_IN_CAMPAIGNS : [
		'#StandardSQL',
		'SELECT',
		'	ifnull( CustomerDescriptiveName,',
		'	AccountDescriptiveName ) AS AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( keyword1.CampaignId as STRING ) as CampaignId,',
		'	keyword1.CampaignName,',
		'	keyword1.MatchType AS kw1_match_type,',
		'	keyword2.MatchType AS kw2_match_type,',
		'	keyword1.Text AS kw1,',
		'	keyword2.Text AS kw2,',
		'	keyword1.CampaignStatus',
		'FROM (	SELECT',
		'			k.ExternalCustomerId,',
		'			k.CampaignId,',
		'			CampaignName,',
		'			Text,',
		'			MatchType,',
		'			campaign.CampaignStatus',
		'		FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignNegativeKeywords_' + ACCOUNT_ID + '` as k',
		'		JOIN',
		'			`' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'		ON',
		'			k.ExternalCustomerId = campaign.ExternalCustomerId',
		'			AND k.CampaignId = campaign.CampaignId',
		'			AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'			AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		WHERE TRUE',
		'			AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'			AND k._LATEST_DATE = k._DATA_DATE',
		'	) AS keyword1',
		'JOIN (	SELECT',
		'			k.ExternalCustomerId,',
		'			k.CampaignId,',
		'			CampaignName,',
		'			Text,',
		'			MatchType',
		'		FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignNegativeKeywords_' + ACCOUNT_ID + '` as k',
		'		JOIN',
		'		  `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'		ON',
		'			k.ExternalCustomerId = campaign.ExternalCustomerId',
		'			AND k.CampaignId = campaign.CampaignId',
		'			AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'			AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		WHERE TRUE',
		'			AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'			AND k._LATEST_DATE = k._DATA_DATE',
		'			AND k.MatchType != \'EXACT\'',
		'	) AS keyword2',
		'ON TRUE',
		'  AND keyword1.ExternalCustomerId = keyword2.ExternalCustomerId',
		'  AND keyword1.CampaignId = keyword2.CampaignId',
		'  AND keyword1.Text != keyword2.Text',
		'  AND REGEXP_EXTRACT( CONCAT( \' \', keyword1.Text, \' \' ), CONCAT( \' \', REGEXP_REPLACE( keyword2.Text, \'\\\\+\', \'\\\\\\\\+\' ), \' \' ) ) IS NOT NULL',
		'JOIN',
		'  `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer',
		'ON',
		'  customer.ExternalCustomerId = keyword1.ExternalCustomerId',
		'  AND customer._LATEST_DATE = customer._DATA_DATE',
	].join( '\n' ),
	EXCLUDED_GEO_LOCATIONS : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,',
		'	AccountDescriptiveName ) AS AccountName,',
		'	CAST( criterion.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	campaign.CampaignName,',
		'	campaign.CampaignStatus,',
		'	CAST( criterion.CampaignId as STRING ) as CampaignId,',
		'	CAST( criterion.CriterionId as STRING ) as CriterionId,',
		'	--geo.Name,',
		'	geo.TargetType,',
		'	geo.CountryCode,',
		'	geo.CanonicalName',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.LocationBasedCampaignCriterion_' + ACCOUNT_ID + '` as criterion',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.p_Geotargets_' + ACCOUNT_ID + '` as geo',
		'	ON TRUE',
		'	AND criterion.CriterionId = geo.CriteriaId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign',
		'	ON TRUE',
		'	AND criterion.ExternalCustomerId = campaign.ExternalCustomerId',
		'	AND criterion.CampaignId = campaign.CampaignId',
		'	AND campaign._DATA_DATE = campaign._LATEST_DATE',
		'JOIN',
		'	`' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer',
		'ON TRUE',
		'	AND customer.ExternalCustomerId = criterion.ExternalCustomerId',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND criterion._DATA_DATE = criterion._LATEST_DATE',
		'	AND criterion.isNegative',
	].join( '\n' ),
	EXCLUDED_CONTENT_LABELS : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	campaign.CampaignName,',
		'	CAST( settings.CampaignId as STRING ) as CampaignId,',
		'	campaign.CampaignStatus,',
		'	settings.ExcludedContentLabels',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignSettings_' + ACCOUNT_ID + '` as settings',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign',
		'	ON TRUE',
		'	AND settings.ExternalCustomerId = campaign.ExternalCustomerId',
		'	AND settings.CampaignId = campaign.CampaignId',
		'	AND campaign._DATA_DATE = campaign._LATEST_DATE',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'JOIN',
		'	`' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer',
		'	ON TRUE',
		'	AND customer.ExternalCustomerId = settings.ExternalCustomerId',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND settings._DATA_DATE = settings._LATEST_DATE',
		'	AND ExcludedContentLabels is not null',
	].join( '\n' ),
	BRACKETS_IN_NON_EXACT : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	campaign.CampaignName,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	adgroup.AdGroupName,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	keyword.Status,',
		'	keyword.Criteria,',
		'	keyword.KeywordMatchType',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE ',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND keyword.Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND KeywordMatchType != \'EXACT\'',
		'	AND ( REGEXP_CONTAINS( Criteria, \'^\\\\[\' ) OR REGEXP_CONTAINS( Criteria, \'\\\\]$\' ) )',
	].join( '\n' ),
	QUOTES_IN_NON_PHRASE : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	campaign.CampaignName,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	adgroup.AdGroupName,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	keyword.Status,',
		'	keyword.Criteria,',
		'	keyword.KeywordMatchType',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND keyword.Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND KeywordMatchType != \'PHRASE\'',
		'	AND ( REGEXP_CONTAINS( Criteria, \'^"\' ) OR REGEXP_CONTAINS( Criteria, \'"$\' ) )',
	].join( '\n' ),
	NEGATIVE_KEYWORD_IN_AD : [
		'SELECT',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	ifnull( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,',
		'	CampaignName,',
		'	AdGroupName,',
		'	CampaignStatus,',
		'	AdGroupStatus,',
		'	Status,',
		'	neg.Text as negative_keyword,',
		'	neg.MatchType as negative_match_type,',
		'	ad.HeadLinePart1,',
		'	ad.HeadLinePart2,',
		'	ad.description,',
		'	CAST( ad.CampaignId as STRING ) as CampaignId,',
		'	CAST( ad.AdGroupId as STRING ) as AdGroupId',
		'FROM (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		CampaignId,',
		'		Text,',
		'		MatchType',
		'	FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignNegativeKeywords_' + ACCOUNT_ID + '`',
		'	WHERE TRUE',
		'		AND _LATEST_DATE = _DATA_DATE',
		'		AND MatchType != \'EXACT\'',
		') as neg',
		'JOIN (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		CampaignId,',
		'		AdGroupId,',
		'		HeadLinePart1,',
		'		HeadLinePart2,',
		'		description,',
		'		Status',
		'	FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Ad_' + ACCOUNT_ID + '`',
		'	WHERE TRUE',
		'		AND _DATA_DATE = _LATEST_DATE',
		'		AND Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	) as ad',
		'	ON ad.ExternalCustomerId = neg.ExternalCustomerId AND ad.CampaignId = neg.CampaignId',
		'JOIN (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		CampaignId,',
		'		AdGroupName,',
		'		AdGroupId,',
		'		AdGroupStatus',
		'	FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '`',
		'	WHERE TRUE',
		'		AND _DATA_DATE = _LATEST_DATE',
		'		AND AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	) as adgroup',
		'	ON ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.CampaignId = adgroup.CampaignId AND ad.AdGroupId = adgroup.AdGroupId',
		'JOIN (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		CampaignName,',
		'		CampaignId,',
		'		CampaignStatus',
		'	FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '`',
		'	WHERE TRUE',
		'		AND ( EndDate IS NULL OR EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'		AND _DATA_DATE = _LATEST_DATE',
		'		AND CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	) as campaign',
		'	ON ad.ExternalCustomerId = campaign.ExternalCustomerId AND ad.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ',
		'	ON neg.ExternalCustomerId = customer.ExternalCustomerId',
		'    AND customer._LATEST_DATE = customer._DATA_DATE',
		'WHERE TRUE',
		'  AND (',
		'    FALSE',
		'    OR REGEXP_CONTAINS( CONCAT( \' \', ad.HeadLinePart1, \' \' ), CONCAT( \' \', REGEXP_REPLACE( neg.Text, \'["\\\\+\\\\-\\\\[\\\\]]\', \'\' ), \' \' ) )',
		'    OR REGEXP_CONTAINS( CONCAT( \' \', ad.HeadLinePart2, \' \' ), CONCAT( \' \', REGEXP_REPLACE( neg.Text, \'["\\\\+\\\\-\\\\[\\\\]]\', \'\' ), \' \' ) )',
		'    OR REGEXP_CONTAINS( CONCAT( \' \', ad.Description, \' \' ), CONCAT( \' \', REGEXP_REPLACE( neg.Text, \'["\\\\+\\\\-\\\\[\\\\]]\', \'\' ), \' \' ) )',
		')',
	].join( '\n' ),
	SHARED_NEGATIVE_KEYWORD_IN_AD : [
		'SELECT',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	ifnull( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,',
		'	CampaignName,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	neg.Text as negative_keyword,',
		'	neg.MatchType as negative_match_type,',
		'	ListName as list_name,',
		'	ad.HeadLinePart1,',
		'	ad.HeadLinePart2,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( ad.AdGroupId as STRING ) as AdGroupId,',
		'	ad.description',
		'FROM (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		ListId,',
		'		Text,',
		'		MatchType',
		'	FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignNegativeListKeywords_' + ACCOUNT_ID + '`',
		'	WHERE TRUE',
		'		AND _LATEST_DATE = _DATA_DATE',
		') as neg',
		'JOIN (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		ListId,',
		'		CampaignId',
		'	FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignNegativeListMappings_' + ACCOUNT_ID + '`',
		'	WHERE TRUE',
		'		AND _LATEST_DATE = _DATA_DATE',
		') as list_mapping',
		'	ON list_mapping.ExternalCustomerId = neg.ExternalCustomerId AND list_mapping.ListId = neg.ListId',
		'JOIN (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		ListId,',
		'		ListName',
		'	FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignNegativeLists_' + ACCOUNT_ID + '`',
		'	WHERE TRUE',
		'		AND _LATEST_DATE = _DATA_DATE',
		') as neg_list',
		'	ON neg_list.ExternalCustomerId = list_mapping.ExternalCustomerId AND neg_list.ListId = list_mapping.ListId',
		'JOIN (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		CampaignName,',
		'		CampaignId,',
		'		CampaignStatus',
		'	FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '`',
		'	WHERE TRUE',
		'		AND ( EndDate IS NULL OR EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'		AND _DATA_DATE = _LATEST_DATE',
		'		AND CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	) as campaign',
		'	ON list_mapping.ExternalCustomerId = campaign.ExternalCustomerId AND list_mapping.CampaignId = campaign.CampaignId',
		'JOIN (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		CampaignId,',
		'		AdGroupId,',
		'		HeadLinePart1,',
		'		HeadLinePart2,',
		'		description',
		'	FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Ad_' + ACCOUNT_ID + '`',
		'	WHERE TRUE',
		'		AND _DATA_DATE = _LATEST_DATE',
		'		AND Status = \'ENABLED\'',
		'	) as ad',
		'	ON ad.ExternalCustomerId = list_mapping.ExternalCustomerId AND ad.CampaignId = list_mapping.CampaignId',
		'JOIN (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		CampaignId,',
		'		AdGroupId,',
		'		AdGroupStatus',
		'	FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '`',
		'	WHERE TRUE',
		'		AND _DATA_DATE = _LATEST_DATE',
		'		AND AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	) as adgroup',
		'	ON ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.CampaignId = adgroup.CampaignId AND ad.AdGroupId = adgroup.AdGroupId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer',
		'	ON neg.ExternalCustomerId = customer.ExternalCustomerId',
		'    AND customer._LATEST_DATE = customer._DATA_DATE',
		'WHERE TRUE',
		'  AND (',
		'    FALSE',
		'    OR REGEXP_CONTAINS( CONCAT( \' \', ad.HeadLinePart1, \' \' ), CONCAT( \' \', REGEXP_REPLACE( neg.Text, \'["\\\\+\\\\-\\\\[\\\\]]\', \'\' ), \' \' ) )',
		'    OR REGEXP_CONTAINS( CONCAT( \' \', ad.HeadLinePart2, \' \' ), CONCAT( \' \', REGEXP_REPLACE( neg.Text, \'["\\\\+\\\\-\\\\[\\\\]]\', \'\' ), \' \' ) )',
		'    OR REGEXP_CONTAINS( CONCAT( \' \', ad.Description, \' \' ), CONCAT( \' \', REGEXP_REPLACE( neg.Text, \'["\\\\+\\\\-\\\\[\\\\]]\', \'\' ), \' \' ) )',
		')',
	].join( '\n' ),
	DKI_ERRORS : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,',
		'	CAST( ad.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	campaign.CampaignName,',
		'	CAST( ad.CampaignId as STRING ) as CampaignId,',
		'	adgroup.AdGroupName,',
		'	CAST( ad.AdGroupId as STRING ) as AdGroupId,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	ad.Status,',
		'	ad.HeadlinePart1,',
		'	ad.HeadlinePart2,',
		'	ad.Description',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Ad_' + ACCOUNT_ID + '` as ad',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = ad.ExternalCustomerId AND ad.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = ad.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = ad.ExternalCustomerId AND ad.CampaignId = adgroup.CampaignId AND ad.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND (',
		'		FALSE',
		'		OR ( TRUE',
		'			AND REGEXP_CONTAINS( ad.HeadlinePart1, \'{\\\\w+\' )',
		'			AND NOT REGEXP_CONTAINS( ad.HeadlinePart1, \'{[kK]ey[wW]ord:.+}\' )',
		'		)OR ( TRUE',
		'			AND REGEXP_CONTAINS( ad.HeadlinePart2, \'{\\\\w+\' )',
		'			AND NOT REGEXP_CONTAINS( ad.HeadlinePart2, \'{[kK]ey[wW]ord:.+}\' )',
		'		)OR ( TRUE',
		'			AND REGEXP_CONTAINS( ad.Description, \'{\\\\w+\' )',
		'			AND NOT REGEXP_CONTAINS( ad.Description, \'{[kK]ey[wW]ord:.+}\' )',
		'		)',
		'	)',
		'	AND ad._LATEST_DATE = ad._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND ad.Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
	].join( '\n' ),
	WRONG_DKI : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	campaign.CampaignName,',
		'	CAST( ad.CampaignId as STRING ) as CampaignId,',
		'	adgroup.AdGroupName,',
		'	CAST( ad.AdGroupId as STRING ) as AdGroupId,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	ad.Status,',
		'	ad.HeadlinePart1,',
		'	ad.HeadlinePart2,',
		'	ad.Description',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Ad_' + ACCOUNT_ID + '` as ad',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = ad.ExternalCustomerId AND ad.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = ad.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = ad.ExternalCustomerId AND ad.CampaignId = adgroup.CampaignId AND ad.AdGroupId = adgroup.AdGroupId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND (',
		'		FALSE',
		'		OR ( REGEXP_CONTAINS( ad.HeadlinePart1, \'{keyWord:.+}\' )  )',
		'		OR ( REGEXP_CONTAINS( ad.HeadlinePart1, \'{Keyword:.+}\' )  )',
		'		OR ( REGEXP_CONTAINS( ad.HeadlinePart1, \'{keyword:.+}\' )  )',
		'		OR ( REGEXP_CONTAINS( ad.HeadlinePart2, \'{keyWord:.+}\' )  )',
		'		OR ( REGEXP_CONTAINS( ad.HeadlinePart2, \'{Keyword:.+}\' )  )',
		'		OR ( REGEXP_CONTAINS( ad.HeadlinePart2, \'{keyword:.+}\' )  )',
		'		OR ( REGEXP_CONTAINS( ad.Description, \'{keyWord:.+}\' )  )',
		'		OR ( REGEXP_CONTAINS( ad.Description, \'{Keyword:.+}\' )  )',
		'		OR ( REGEXP_CONTAINS( ad.Description, \'{keyword:.+}\' )  )',
		'	)',
		'	AND ad._LATEST_DATE = ad._DATA_DATE',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND ad.Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
	].join( '\n' ),
	LOW_VOLUME_EXACT_EXCLUDED_ADGROUP_LEVEL : [
		'SELECT',
		'	Customer.AccountDescriptiveName,',
		'	Customer.ExternalCustomerId,',
		'	Campaign.CampaignName as CampaignName,',
		'	Campaign.CampaignId as CampaignId,',
		'	BroadAdGroup.AdGroupName as broadAdGroupName,',
		'	BroadAdGroup.AdGroupId as broadAdGroupId,',
		'	ExactNegativeKeywordInBroad.Criteria as exactNegativeKeyword',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as Customer',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as Campaign',
		'	ON TRUE',
		'	AND Campaign.ExternalCustomerId = Customer.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as BroadAdGroup',
		'	ON TRUE',
		'	AND Campaign.ExternalCustomerId = BroadAdGroup.ExternalCustomerId',
		'	AND Campaign.CampaignId = BroadAdGroup.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as ExactAdGroup',
		'	ON TRUE',
		'	AND Campaign.ExternalCustomerId = ExactAdGroup.ExternalCustomerId',
		'	AND Campaign.CampaignId = ExactAdGroup.CampaignId',
		'	AND REGEXP_EXTRACT( LOWER( ExactAdGroup.AdGroupName ), \'(.*)(?:exact|exm)\' ) = REGEXP_EXTRACT( LOWER( BroadAdGroup.AdGroupName ), \'(.*)(?:broad|bmm)\' )',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as ExactKeyword',
		'	ON TRUE',
		'	AND Campaign.ExternalCustomerId = ExactKeyword.ExternalCustomerId',
		'	AND Campaign.CampaignId = ExactKeyword.CampaignId',
		'	AND ExactAdGroup.AdGroupId = ExactKeyword.AdGroupId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as ExactNegativeKeywordInBroad',
		'	ON TRUE',
		'	AND ( Campaign.EndDate IS NULL OR Campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND Campaign.ExternalCustomerId = ExactNegativeKeywordInBroad.ExternalCustomerId',
		'	AND Campaign.CampaignId = ExactNegativeKeywordInBroad.CampaignId',
		'	AND BroadAdGroup.AdGroupId = ExactNegativeKeywordInBroad.AdGroupId',
		'	AND LOWER( ExactNegativeKeywordInBroad.Criteria ) = LOWER( ExactKeyword.Criteria )',
		'WHERE TRUE',
		'	-- AND customer.ExternalCustomerId = 1371763172 --7056468392',
		'	AND Customer._LATEST_DATE = Customer._DATA_DATE',
		'	AND Campaign.CampaignStatus = \'ENABLED\'',
		'	AND Campaign._LATEST_DATE = Campaign._DATA_DATE',
		'	AND ExactAdGroup.AdGroupStatus = \'ENABLED\'',
		'	AND BroadAdGroup.AdGroupStatus = \'ENABLED\'',
		'	AND ExactAdGroup._LATEST_DATE = ExactAdGroup._DATA_DATE',
		'	AND BroadAdGroup._LATEST_DATE = BroadAdGroup._DATA_DATE',
		'	AND ExactKeyword.Status = \'ENABLED\'',
		'	AND ExactNegativeKeywordInBroad.Status = \'ENABLED\'',
		'	AND ExactKeyword._LATEST_DATE = ExactKeyword._DATA_DATE',
		'	AND ExactNegativeKeywordInBroad._LATEST_DATE = ExactNegativeKeywordInBroad._DATA_DATE',
		'	AND ExactKeyword.SystemServingStatus = \'RARELY_SERVED\'',
		'	AND ExactKeyword.KeywordMatchType = \'EXACT\'',
		'	AND ExactNegativeKeywordInBroad.KeywordMatchType = \'EXACT\'',
		'	AND ExactKeyword.IsNegative = false',
		'	AND ExactNegativeKeywordInBroad.IsNegative = true',
	].join( '\n' ),
	LOW_VOLUME_EXACT_EXCLUDED_CAMPAIGN_LEVEL : [
		'SELECT',
		'	Customer.AccountDescriptiveName,',
		'	Customer.ExternalCustomerId,',
		'	BroadCampaign.CampaignName as broadCampaignName,',
		'	BroadCampaign.CampaignId as broadCampaignId,',
		'	BroadAdGroup.AdGroupName as broadAdGroupName,',
		'	BroadAdGroup.AdGroupId as broadAdGroupId,',
		'	ExactNegativeKeywordInBroad.Criteria as exactNegativeKeyword',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as Customer',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as ExactCampaign',
		'	ON TRUE',
		'	AND ExactCampaign.ExternalCustomerId = Customer.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as BroadCampaign',
		'	ON TRUE',
		'	AND ExactCampaign.ExternalCustomerId = BroadCampaign.ExternalCustomerId',
		'	AND REGEXP_EXTRACT( LOWER( ExactCampaign.CampaignName ), \'(.*)(?:exact|exm)\' ) = REGEXP_EXTRACT( LOWER( BroadCampaign.CampaignName ), \'(.*)(?:broad|bmm)\' )',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as BroadAdGroup',
		'	ON TRUE',
		'	AND BroadCampaign.ExternalCustomerId = BroadAdGroup.ExternalCustomerId',
		'	AND BroadCampaign.CampaignId = BroadAdGroup.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as ExactAdGroup',
		'	ON TRUE',
		'	AND ExactCampaign.ExternalCustomerId = ExactAdGroup.ExternalCustomerId',
		'	AND ExactCampaign.CampaignId = ExactAdGroup.CampaignId',
		'	AND BroadAdGroup.AdGroupName = ExactAdGroup.AdGroupName',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as ExactKeyword',
		'	ON TRUE',
		'	AND ExactCampaign.ExternalCustomerId = ExactKeyword.ExternalCustomerId',
		'	AND ExactCampaign.CampaignId = ExactKeyword.CampaignId',
		'	AND ExactAdGroup.AdGroupId = ExactKeyword.AdGroupId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as ExactNegativeKeywordInBroad',
		'	ON TRUE',
		'	AND BroadCampaign.ExternalCustomerId = ExactNegativeKeywordInBroad.ExternalCustomerId',
		'	AND BroadCampaign.CampaignId = ExactNegativeKeywordInBroad.CampaignId',
		'	AND BroadAdGroup.AdGroupId = ExactNegativeKeywordInBroad.AdGroupId',
		'	AND LOWER( ExactNegativeKeywordInBroad.Criteria ) = LOWER( ExactKeyword.Criteria )',
		'WHERE TRUE',
		'	AND ( BroadCampaign.EndDate IS NULL OR BroadCampaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND ( ExactCampaign.EndDate IS NULL OR ExactCampaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	-- AND customer.ExternalCustomerId = 1371763172 --7056468392',
		'	AND Customer._LATEST_DATE = Customer._DATA_DATE',
		'	AND ExactCampaign.CampaignStatus = \'ENABLED\'',
		'	AND BroadCampaign.CampaignStatus = \'ENABLED\'',
		'	AND ExactCampaign._LATEST_DATE = ExactCampaign._DATA_DATE',
		'	AND BroadCampaign._LATEST_DATE = BroadCampaign._DATA_DATE',
		'	AND ExactAdGroup.AdGroupStatus = \'ENABLED\'',
		'	AND BroadAdGroup.AdGroupStatus = \'ENABLED\'',
		'	AND ExactAdGroup._LATEST_DATE = ExactAdGroup._DATA_DATE',
		'	AND BroadAdGroup._LATEST_DATE = BroadAdGroup._DATA_DATE',
		'	AND ExactKeyword.Status = \'ENABLED\'',
		'	AND ExactNegativeKeywordInBroad.Status = \'ENABLED\'',
		'	AND ExactKeyword._LATEST_DATE = ExactKeyword._DATA_DATE',
		'	AND ExactNegativeKeywordInBroad._LATEST_DATE = ExactNegativeKeywordInBroad._DATA_DATE',
		'	AND ExactKeyword.SystemServingStatus = \'RARELY_SERVED\'',
		'	AND ExactKeyword.KeywordMatchType = \'EXACT\'',
		'	AND ExactNegativeKeywordInBroad.KeywordMatchType = \'EXACT\'',
		'	AND ExactKeyword.IsNegative = false',
		'	AND ExactNegativeKeywordInBroad.IsNegative = true',
	].join( '\n' ),
};

var EXTENSION_TYPES = {
	1 : 'sitelinks',
	2 : 'phoneNumbers',
	3 : 'mobileApps',
	7 : 'locations',
	30 : 'acciliateLocations',
	8 : 'reviews',
	17 : 'callouts',
	24 : 'snippets', // structured snippet
	31 : 'messages',
	35 : 'price',
	38 : 'promotion',
	10 : 'adCustomizers',
	61 : 'dynamicSearchAdFeeds',
	77 : 'locationTargets',
	12 : 'education',
	13 : 'flights',
	14 : 'custom',
	15 : 'hotels',
	16 : 'realEsatate',
	18 : 'travel',
	19 : 'local',
	20 : 'jobs',
};

var EXTENSIONS = [ 'sitelinks', 'phoneNumbers', 'mobileApps', 'callouts', 'snippets', 'messages' ];

var EXTENSION_LOGIC = {
	sitelinks : function( item1, item ){
		item1.Description1 		= item.getDescription1();
		item1.Description2 		= item.getDescription2();
		item1.LinkText 			= item.getLinkText();
		item1.CustomParameters	= item.urls().getCustomParameters() + '';
		item1.FinalUrl 			= item.urls().getFinalUrl();
		item1.MobileFinalUrl 	= item.urls().getMobileFinalUrl();
		item1.TrackingTemplate 	= item.urls().getTrackingTemplate();
	},
	phoneNumbers : function( item1, item ){
		item1.Description1 		= item.getCountry();
		item1.Description2 		= item.getPhoneNumber();
	},
	mobileApps : function( item1, item ){
		item1.AppId 		= item.getAppId();
		item1.LinkText 		= item.getLinkText();
		item1.Store 		= item.getStore();
	},
	callouts : function( item1, item ){
		item1.Text	 		= item.getText();
	},
	snippets : function( item1, item ){
		item1.Header = item.getHeader();
		item1.Values = item.getValues() + '';
	},
	messages : function( item1, item ){
		item1.BusinessName = item.getBusinessName();
		item1.CountryCode = item.getCountryCode();
		item1.ExtensionText = item.getExtensionText();
		item1.PhoneNumber = item.getPhoneNumber();
	}
};

function optional( value, message ){
	var error = message ? new Error( message ) : new Error( 'No such value!' );
	var isNull = ( value === undefined || value === null );
	var optional_ = optional;
	return {
		get : 			function()						{ if( isNull ){ throw error; } return value; },
		ifPresent : 	function( consumer )			{ if( !isNull ){ consumer( value ) } },
		peek : 			function( consumer )			{ if( !isNull ){ consumer( value ) } return this },
		map : 			function(){
			var args = Array.prototype.slice.call( arguments );
			// first argument is the method to call
			var method = args.splice( 0, 1 );
			// all other arguments are arguments of the method
			if( isNull ){
				return this;
			}
			if( typeof method == 'function' ){
				return optional_( method.apply( value, args ) );
			}else if( typeof value[ method ] == 'function' ){
				return optional_( value[ method ].apply( value, args ) );
			}else{
				return optional_( value[ method ] );
			}
		},
		call : function(){ 
			var args = Array.prototype.slice.call( arguments );
			// first argument is the method to call
			var method = args.splice( 0, 1 );
			// all other arguments are arguments of the method
			if( !isNull ){
				value[ method ].apply( value, args );
			}
			return this;
		},
		filter : 		function( predicate )			{ return isNull || predicate( value ) ? this : optional_() },
		onlyIf : 		function( method )				{ return isNull || value[ method ]() ? this : optional_() },
		isPresent : 	function()						{ return !isNull },
		hasFailed :		function()						{ return isNull },
		isEmpty :		function()						{ return isNull },
		orElse : 		function( other )				{ return isNull ? other : value },
		orElseGet : 	function( supplier )			{ return isNull ? supplier.get() : value },
		orElseThrow : 	function( exceptionSupplier )	{ if( isNull ) throw exceptionSupplier(); return value; },
		equals : 		function( otherValue )			{ return !isNull && value == otherValue },
		forEach :	 	function( consumer )			{
			if( this.isPresent() ){
				var iterator = this.get();
				while( iterator.hasNext() ){
					consumer( iterator.next() );
				}
			}
		},
		toString : 		function()						{ return isNull ? 'Empty' : 'Optional< ' + value + ' >' },
	};
};

function apply( item, selector ){
	if( typeof selector == 'undefined' ){
		throw new Error( 'undefined function selector' );
	}
	if( typeof selector == 'function' ){
		return selector( item );
	}
	if( typeof item == 'object' && typeof item[ selector ] == 'function' ){
		return item[ selector ]();
	}
	if( typeof item == 'object' ){
		return item[ selector ];
	}
}

function currentItems( items, currentPart, outOf, orderBy ){
	if( typeof orderBy != 'undefined' ){
		items.sort( function( a, b ){
			return apply( a, orderBy ) - apply( b, orderBy );
		});
	}
	
	var countItems = items.length;
	
	var result = items.filter( function( item, index ){
		return index >= Math.ceil( currentPart / outOf * countItems ) && index < ( currentPart + 1 ) / outOf * countItems;
	});
	
	return result;
}

function iteratorToList( iter ){
  var list = [];
  while( iter.hasNext() ){
    list.push( iter.next() );
  }
  return list;
}

function toCsvChunks( matrix ){
	var rows = matrix.map( function( row ){
		return row.map( prepareForBigQuery ).join( ',' );
	});
	return splitArray( rows, BIGQUERY.CHUNK_SIZE ).map( function( rows ){ return rows.join( '\n' ) } );
}

function loadIntoBigquery( csvChunks, tableName ){
	// dropTable( tableName );
	// createTable( tableName, BIGQUERY.FIELDS, BIGQUERY.PARTITION );
	var uploader = loadIntoBigqueryTable( tableName );
	var bigQueryJobIds = csvChunks.map( uploader ).filter( _.property( 'isPresent' ) ).map( _.property( 'get' ) );
	return bigQueryJobIds;
}

function toCSV( data, fields ){
	var columns = Object.keys( fields );
	return data.map( function( obj ){
		return columns.map( function( column ){
			var res = obj[ column ];
			if( res === undefined ){
				//Logger.log( 'no column ' + column + ' found in ' + JSON.stringify( obj, null, '\t' ) );
			}
			return res;
		});
	});
}

function addLeadingZeros( number, digits ){
	var res = '' + number;
	while ( res.length < digits ){
		res = '0' + res;
	}
	return res;
}

function dateToString( date, delimiter, withHours ){
	delimiter = delimiter || '-';
	return addLeadingZeros( date.getFullYear(), 4 ) + delimiter +
		addLeadingZeros( date.getMonth() + 1, 2 ) + delimiter +
		addLeadingZeros( date.getDate(), 2 ) +
		( withHours ? ' ' + addLeadingZeros( date.getHours(), 2 ) + ':' + addLeadingZeros( date.getMinutes(), 2 ) : '' )
	;
}

function convertToTimeZone( date, timeZone ){
	return new Date( Utilities.formatDate( date, timeZone, 'MMM dd,yyyy HH:mm:ss' ) );
}

function computeNow( timeZone ){
	var now = convertToTimeZone( new Date(), timeZone );
	now.setTime( now.getTime() );
	return now;
}

function parseValue( value ){
	if ( value === undefined ){
		return undefined;
	}
	if ( value === null || value.trim() == '--' ){
		return null;
	}
	if ( value.substring( value.length - 1 ) == '%' ){
		var x = value.substring( 0, value.length - 1 );
		if( x.charAt( 0 ) == '<' || x.charAt( 0 ) == '>' ){
			x = x.substring( 1 );
		}
		x = x / 100;
		return x;
	}
	if ( !isNumeric( value.toString().replace( /,/g, '' ) ) ){
		return value;
	}
	return value.toString().replace( /,/g, '' ) / 1;
}

function parse( report, fields ){
	var myRows = [];
	var iter = report.rows();
	while ( iter.hasNext() ){
		var row = iter.next();
		var myRow = {};

		for ( index in fields ){
			var field = fields[ index ];

			myRow[ field ] = parseValue( row[ field ] );
		}
		myRows.push( myRow );
	}
	return myRows;
}

function retrieveReport( fields, report, where, during ){
	var query = ''
		+ ' SELECT ' + fields.join( ', ' ) // + ', Clicks'
		+ ' FROM ' + report
        + ( where ? ' WHERE ' + where : '' )
		+ ( during ? ' DURING ' + during : '' )
        ;
	// Logger.log( query );

	return parse( AdWordsApp.report( query ), fields );
}

function getTableSchema( tableName ){
	return BigQuery.Tables.get(
		BIGQUERY.PROJECT_ID,
		BIGQUERY.DATASET_ID,
		tableName
	).schema.fields;
}

function counter(){
	var map = {};
	
	function check( item ){
		map[ item ] = map[ item ] || 0;
		map[ item ]++;
	}
	
	function toList(){
		var res = Object.keys( map ).map( function( key ){
			return { item : key, count : map[ key ] };
		});
		res.sort( function( a, b ){
			return b.count - a.count; // desc
		});
		return res;
	}
	
	function toString(){
		return '' + toList().map( function( x ){ return x.item + ': ' + x.count });
	}
	
	return {
		check : check,
		toList : toList,
		toString : toString,
	};
}

function truncateTodaysPartition( projectId, datasetId, tableId, clusteringFields ){
	var now = new Date( Utilities.formatDate( new Date(), 'Europe/Berlin', 'MMM dd,yyyy HH:mm:ss' ) );
	var year = now.getFullYear();
	var month = now.getMonth() + 1;
	var day = now.getDate();
	
	
	month = ( month < 10 ? '0' : '' ) + month;
	day = ( day < 10 ? '0' : '' ) + day;
	
	var today = year + '-' + month + '-' + day;
	var dateStr = '$' + year + month + day;
	
	queryBigqueryAsync(
		projectId,
		'SELECT * FROM `' + projectId + '.' + datasetId + '.' + tableId + '` WHERE _PARTITIONDATE = \'' + today + '\' LIMIT 0',
		'WRITE_TRUNCATE',
		datasetId,
		tableId + dateStr,
		clusteringFields
	);
}

function queryBigqueryAsync( projectId, query, writeDisposition, datasetId, tableId, clusteringFields ){
	var job = {
		configuration: {
			query: {
				query : query,
				useLegacySql : false,
			}
		}
	}
	if( datasetId && tableId ){
		job.configuration.query.destinationTable = {
			projectId: projectId,
			datasetId: datasetId,
			tableId: tableId,
		};
		job.configuration.query.createDisposition = 'CREATE_IF_NEEDED';
		job.configuration.query.writeDisposition = writeDisposition; // 'WRITE_APPEND'; // WRITE_TRUNCATE
		job.configuration.query.timePartitioning = {
			type : 'DAY',
			expirationMs : 1000 * 60 * 60 * 24 * PARTITION_EXPIRATION_DAYS,
			requirePartitionFilter : REQUIRE_PARTITION_FILTER,
		};
	}
	if( clusteringFields ){
		job.configuration.query.clustering = {
			fields : clusteringFields,
		};
	}
	//log( 'job: ' + JSON.stringify( job, null, 2 ) );
	return BigQuery.Jobs.insert( job, projectId );
}

function precomputeResults(){
	var clusteringFields = [ 'pitfall', 'account_id', 'campaign_id', 'adgroup_id' ];
	truncateTodaysPartition( BIGQUERY.PROJECT_ID, BIDDY_DATASET_ID, BIDDY_TABLE_NAME, clusteringFields );
	
	var views = Object.keys( VIEWS )
		.filter( _.not( _.property( 'toLowerCase' ).startsWith( 'ds_' ) ) )
		.map( function( view ){
			return view.toLowerCase();
	});
	Logger.log( 'found ' + views.length + ' views.' );
	
	//var uniqueColumns = counter();
	var jobIds = [];
	
	//var writeDisposition = 'WRITE_TRUNCATE'; // first query truncates table
	
	views.forEach( function( viewName ){
		var columnNames = getTableSchema( VIEW_PREFIX + viewName ).map( _.property( 'name' ) );
		
		var realColumns = {
			'ExternalCustomerId' 	: 'account_id',
			'CampaignId' 			: 'campaign_id',
			'AdGroupId' 			: 'adgroup_id',
			//'AccountName' 			: 'account_name',
			//'CampaignName' 			: 'campaign_name',
			//'AdGroupName' 			: 'ad_group_name',
			'CampaignStatus' 		: 'campaign_status',
			'AdGroupStatus' 		: 'ad_group_status',
			'Status' 				: 'status',
		};
		
		var hasCampaignId = columnNames.indexOf( 'CampaignId' ) >= 0;
		var hasAdgroupId = columnNames.indexOf( 'AdGroupId' ) >= 0;
		
		var query = 'SELECT\n' + '\t\'' + viewName + '\' AS pitfall,\n';
		
		Object.keys( realColumns ).forEach( function( realColumnName ){
			var column = ( columnNames.indexOf( realColumnName ) >= 0 ? realColumnName : 'NULL' );
			query += '\tCAST( ' + column + ' AS STRING ) AS ' + realColumns[ realColumnName ] + ',\n';
		});
		
		query += 'TO_JSON_STRING( STRUCT(';
		
		query += columnNames
			.filter( function( columnName ){
				return Object.keys( realColumns ).indexOf( columnName ) == -1;
			})
			.join( ',\n' );
		
		query += ')) AS data\n';
		
		query += 'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.' + VIEW_PREFIX + viewName + '`\n';
		
		/*
		//Logger.log( schema );
		//schema.forEach( function( column ){
		//	uniqueColumns.check( column.name + '_' + column.type );
		//});
*/		
		Logger.log( query );
		var job = queryBigqueryAsync( BIGQUERY.PROJECT_ID, query, 'WRITE_APPEND', BIDDY_DATASET_ID, BIDDY_TABLE_NAME, clusteringFields );
		//writeDisposition = 'WRITE_APPEND'; // all except the first query do append instead of truncate
		jobIds.push( job.id );
		
		while( jobIds.length > 10 ){
			var seconds = 10;
			Logger.log( jobIds.length + ' jobs are being processed. '
				+ 'Slow down submission. Sleep ' + seconds + ' seconds.' );
			Utilities.sleep( seconds * 1000 );
			jobIds = jobIds.filter( _.property( jobIdToStatus ).eq( 'RUNNING' ) );
		}
	});
	
	while( jobIds.length > 0 ){
		var seconds = 10;
		Logger.log( jobIds.length + ' jobs are being processed. '
			+ 'Wait for them to finish. Sleep ' + seconds + ' seconds.' );
		Utilities.sleep( seconds * 1000 );
		jobIds = jobIds.filter( _.property( jobIdToStatus ).eq( 'RUNNING' ) );
	}
	//Logger.log( uniqueColumns.toString() );
}

function main(){
	Logger.log( 'start' );
	  
  //precomputeResults();
  //return;
  
	try{
		
		if( UPDATE_VIEW_AND_PRECOMPUTING_AND_QUIT ){
			// biddy-Views
			
			/*
			Object.keys( VIEWS ).forEach( function( view ){
				var viewName = view.toLowerCase();
				if( viewName.indexOf( DATA_STUDIO_PREFIX ) != 0 ){
					viewName = VIEW_PREFIX + viewName;
				}
				var query = VIEWS[ view ];
				//Logger.log( query );
				createView( viewName, query );
			});
			*/
			
			// precompute
			
          //precomputeResults();
          
			var now = new Date( Utilities.formatDate( new Date(), TIMEZONE, 'MMM dd,yyyy HH:mm:ss' ) );
			if( now.getHours() == PRECOMPUTE_HOUR ){
				Logger.log( 'precompute' );
				
				precomputeResults();
				
			}else{
				Logger.log( 'wait for the precomputing hour' );
			}
			
			return;
		}
		
		if( CREATE_GEOTARGETS ){
			var tableName = GEOTARGETS_TABLE_NAME + '_' + AdWordsApp.currentAccount().getCustomerId().split( '-' ).join( '' );
			if( !tableExists( tableName ) ){ // prevents duplicate entries in Geotargets
				Logger.log( 'Create Geo Targets' );
				var geo = UrlFetchApp.fetch( GEOTARGETS_URL, { method: 'get' } ).getContentText();
				createTable( tableName, {
					CriteriaId : 'INTEGER',
					Name : 'STRING',
					CanonicalName: 'STRING',
					ParentID : 'INTEGER',
					CountryCode : 'STRING',
					TargetType : 'STRING',
					Status : 'STRING'},
					null // no partitionPeriod for Geo
				);
				var blobData = Utilities.newBlob( geo, 'application/octet-stream' );
				var jobId = loadDataToBigquery( tableName, blobData, 1 );
			}
		}
		/*
		try{
			deleteViewWithPrefix( 'biddy_' );
		} catch ( error ){
			//sendEmail( SEND_ERROR_MESSAGES_TO, 'Error in ' + SCRIPT_NAME + ' ' + mccName, error + '\n' + error.stack );
			Logger.log( 'Error in ' + SCRIPT_NAME + ' ' + ' -> ' + error + '\n' + error.stack );
			throw error;
		}
		return;
			*/
		
		var now = computeNow( AdWordsApp.currentAccount().getTimeZone() );
		Logger.log( dateToString( now ) );
		
		var mccName = AdWordsApp.currentAccount().getName();
		var allAccounts = ( typeof MccApp == 'undefined' ) ? [ AdWordsApp.currentAccount() ] : iteratorToList(
			MccApp.accounts()
			.withCondition( 'Impressions > 0' )
			.forDateRange( 'LAST_14_DAYS' )
			.orderBy( 'Clicks DESC' )
			.get()
		);
		
		const HOURS_PER_DAY = 24;
		var currentPart = now.getHours();
		var accounts = currentItems(
			allAccounts,
			currentPart,
			HOURS_PER_DAY,
			'getCustomerId'
		);

		/*
		if( ONLY_THIS_ACCOUNT && ONLY_THIS_ACCOUNT.length > 0 ){
			accounts = allAccounts.filter( _.property( 'getName' ).equals( ONLY_THIS_ACCOUNT ) );	
		}
		*/
	  
		var mccId = AdWordsApp.currentAccount().getCustomerId().split( '-' ).join( '' );
		Logger.log( 'Current accounts: ' + accounts.map( _.property( 'getName' ) ) );
	 
		var accountIds = accounts.map( _.property( 'getCustomerId' ) );
	 
		try {
			if( typeof MccApp == 'undefined' ){
				processAccount( mccId );
				finalProcessing( undefined );
			}else{
				var app = MccApp
					.accounts()
					.withIds( accountIds );
				app
				//.withLimit( 1 )
				//.withIds( account )
					.executeInParallel( 'processAccount', 'finalProcessing', '' + mccId );
			}
		} catch ( error ){
			sendEmail( SEND_ERROR_MESSAGES_TO, 'Error in ' + SCRIPT_NAME + ' ' + mccName, error + '\n' + error.stack );
			Logger.log( 'Error in ' + SCRIPT_NAME + ' ' + mccName + ' -> ' + error + '\n' + error.stack );
			throw error;
		}
	}catch( error ){
		Logger.log( 'Error in ' + SCRIPT_NAME + ' ' + AdWordsApp.currentAccount().getName() + ' -> ' + error + '\n' + error.stack );
		 // 'throw' replaces the stack trace. To preserve the stack we add it to the message
		error.message += ' <-> ' + error.stack;
		throw error;
	}
}

function pad( value, digits ){
	value = value + '';
	while( value.length < digits ){
		value = '0' + value;
	}
	return value;
}

function adWordsDateToString( obj ){
	if( ! obj ){
		return obj;
	}
	return pad( obj.year, 4 ) + '-' + pad( obj.month, 2 ) + '-' + pad( obj.day, 2 );
}

function extensions1( extensionType, accountIdForBigquery ){
	var list = [];
	//Extensions​PhoneNumbers
	var siteLinksMap = {};
	
	var go = function( status1 ){
		var selector = AdWordsApp
			.extensions()
			[ extensionType ]();
		if( status1 ){
			selector = selector.withCondition( 'Status IN [\'' + status1 + '\']' );
		}
			
		iteratorToList( selector.get() ).forEach( function( item ){
			var item1 = {
				ExternalCustomerId : accountIdForBigquery,
				Id : item.getId(),
				Status : status1,
				Schedules : item.getSchedules() + '',
				IsMobilePreferred : item.isMobilePreferred(),
				StartDate : adWordsDateToString( item.getStartDate() ),
				EndDate : adWordsDateToString( item.getEndDate() ),
				AccountLevel : false,
			};
			EXTENSION_LOGIC[ extensionType ]( item1, item );
			siteLinksMap[ item.getId() ] = item1;
			list.push( item1 );
		});
	};
	
	// no other way to get status from extensions :/
	[ 'REMOVED', 'ENABLED' ].forEach( go );

	iteratorToList(
		AdWordsApp
		.currentAccount()
		.extensions()
		[ extensionType ]()
		.get()
	).forEach( function( item ){
		siteLinksMap[ item.getId() ].AccountLevel = true;
	});
	
	// Logger.log( list.length + ' ' + extensionType + ' found' );
	return list;
}

function processAccount( mccId ){
	mccId = mccId / 1;
	var account = AdWordsApp.currentAccount();
	var accountId = account.getCustomerId();
	var accountIdForBigquery = accountId.split( '-' ).join( '' ) / 1;
	var accountName = account.getName();
	Logger.log( 'process ' + accountName );
	
	try{
		var isFirst = true;
		
		var result = {};
		Object.keys( BIGQUERY.FIELDS ).forEach( function( key ){ result[ key ] = [] } );
		
		result[ 'ExtensionsDisapproved' ] = retrieveReport(
			Object.keys( BIGQUERY.FIELDS.ExtensionsDisapproved ),
			'PLACEHOLDER_FEED_ITEM_REPORT',
			'DisapprovalShortNames != "" AND Status = "ENABLED"'
		).map( function( x ){
			x.PlaceholderType = EXTENSION_TYPES[ x.PlaceholderType ] || x.PlaceholderType;
			x.ExternalCustomerId = accountIdForBigquery;
			return x;
		})
		//.filter( function( x ){ return ! ( x.PlaceholderType > 0 ) } )
		;
		
		EXTENSIONS.forEach( function( extensionType ){
			var bigLetter = extensionType.substring( 0, 1 ).toUpperCase() + extensionType.substring( 1 );
			
			result[ 'Extensions' + bigLetter ] = extensions1( extensionType, accountIdForBigquery );
		});
		
		// campaign negative lists
		iteratorToList( AdWordsApp.negativeKeywordLists().withLimit( 50000 ).get() )
		.forEach( function( list ){
			result.CampaignNegativeLists.push( { ExternalCustomerId : accountIdForBigquery, ListId : list.getId(), ListName : list.getName() } );

			iteratorToList( list.campaigns().get() )
			.forEach( function( campaign ){
				result.CampaignNegativeListMappings.push( { ExternalCustomerId : accountIdForBigquery, ListId : list.getId(), CampaignId : campaign.getId() } );
			});

			iteratorToList( list.negativeKeywords().get() ).forEach( function( negKeyword ){
				result.CampaignNegativeListKeywords.push( {
					ExternalCustomerId : accountIdForBigquery,
					ListId : list.getId(),
					MatchType : negKeyword.getMatchType(),
					Text : negKeyword.getText()
				});
			});
		});
	  
		var campaigns = AdWordsApp.campaigns().withCondition( 'Status = "ENABLED"' ).get();
		var i = 0;
		while( campaigns.hasNext() ){
			//if( CAMPAIGN_LIMIT && i++ > CAMPAIGN_LIMIT ){ break; }
			var campaign = campaigns.next();
			var campaignId = campaign.getId();
			var campaignName = campaign.getName();
			
			iteratorToList( campaign.negativeKeywords().get() )
			.forEach( function( negKeyword ){
				result.CampaignNegativeKeywords.push(
					{
						ExternalCustomerId : accountIdForBigquery,
						CampaignId : campaignId,
						MatchType : negKeyword.getMatchType(),
						Text : negKeyword.getText()
					}
				);
			});

			var targeting = campaign.targeting();
			
			var languages = targeting.languages().get();
			var languages1 = [];
			while( languages.hasNext() ){
			  var language = languages.next();
			  languages1.push( language.getName() );
			}
			
			var excludedContentLabels = targeting.excludedContentLabels().get();
			var excludedContentLabels1 = [];
			while( excludedContentLabels.hasNext() ){
			  var label = excludedContentLabels.next();
			  excludedContentLabels1.push( label.getContentLabelType() );
			}
			
			var excludedLocations = targeting.excludedLocations().get();
			var excludedLocations1 = [];
			while( excludedLocations.hasNext() ){
			  var x = excludedLocations.next();
			  excludedLocations1.push( x.getName() );
			}
			
			var lang = languages1.join( ', ' );
			if( lang == '' ){
				lang = null;
			}
			var ecl = excludedContentLabels1.join( ', ' );
			if( ecl == '' ){
				ecl = null;
			}
			var exLoc = excludedLocations1.join( ', ' );
			if( exLoc == '' ){
				exLoc = null;
			}
			
			var extensions = campaign.extensions();
			
			EXTENSIONS.forEach( function( extensionType ){
				iteratorToList(
					extensions
					[ extensionType ]()
					.get()
				).forEach( function( item ){
					result.ExtensionsCampaignMap.push({
						ExternalCustomerId : accountIdForBigquery,
						Id : item.getId(),
						CampaignId : campaignId,
						EntityType : extensionType,
					});
				});	
			});
			
			var row = {
				ExternalCustomerId : accountIdForBigquery,
				CampaignId : campaignId,
				AdRotationType : campaign.getAdRotationType(),
				DeliveryMethod : campaign.getBudget().getDeliveryMethod(),
				TargetingSetting : campaign.targeting().getTargetingSetting( TARGET_SETTING_CONSTANT ),
				Languages : lang,
				ExcludedContentLabels : ecl,
				ExcludedLocations : exLoc,
			};
			if( isFirst ){
				Logger.log( JSON.stringify( row, null, '\t' ) );
				isFirst = false;
			}
			result.CampaignSettings.push( row );
		}
		Logger.log( accountName + ' done. ' + result.CampaignSettings.length + ' campaigns.' );
		// Logger.log( JSON.stringify( res, null, '\t' ) );
		
		upload( result, mccId );
		
		//return JSON.stringify( result );
	} catch ( error ){
		sendEmail( SEND_ERROR_MESSAGES_TO, 'Error in ' + SCRIPT_NAME + ' ' + accountName, error + '\n' + error.stack );
		Logger.log( 'Error in ' + SCRIPT_NAME + ' ' + accountName + ' -> ' + error + '\n' + error.stack );
		throw error;
	}
}

function finalProcessing( results ){
	var isPreview = AdWordsApp.getExecutionInfo().isPreview();
	var mccName = AdWordsApp.currentAccount().getName();
	var mccId = AdWordsApp.currentAccount().getCustomerId().split( '-' ).join( '' );
	
	recreateViews( mccId );
	
	if( BIGQUERY.PROJECT_ID == 'enter you project id here' || BIGQUERY.PROJECT_ID == '' ){
		Logger.log( 'Unfinished configuration: pls enter your project_id' );
	}
	if( BIGQUERY.DATASET_ID == 'enter you dataset id here' || BIGQUERY.DATASET_ID == '' ){
		Logger.log( 'Unfinished configuration: pls enter your dataset_id' );
	}
	
	if( BIGQUERY.PARTITION_EXPIRATION_MS ){
		adjustPartitionExpiration( BIGQUERY.PARTITION_EXPIRATION_MS );
		
		// show time partitioned tables
		getTables()
			.filter( _.property( 'type' ).eq( 'TABLE' ) )
			.filter( _.property( 'timePartitioning' ).isDefined() )
			.forEach( _.log )
		;
	}
	
	// 1Views
	Object.keys( VIEWS ).forEach( function( view ){
		var viewName = view.toLowerCase();
		if( viewName.indexOf( DATA_STUDIO_PREFIX ) != 0 ){
			viewName = VIEW_PREFIX + viewName;
		}
		var query = VIEWS[ view ];
		//Logger.log( query );
		createView( viewName, query );
	});
	
	// precompute
	var now = new Date( Utilities.formatDate( new Date(), TIMEZONE, 'MMM dd,yyyy HH:mm:ss' ) );
	if( now.getHours() == PRECOMPUTE_HOUR ){
		precomputeResults();
	}
}

function upload( res, mccId ){
	Logger.log('load into BigQuery');
	
	var jobIds = [];
	
	Object.keys( res ).forEach( function( tableName ){
		var fields = BIGQUERY.FIELDS[ tableName ];
		if( !fields ){
			Logger.log( 'no fields found for tableName: ' + tableName + ' Possible tableNames are: ' + Object.keys( BIGQUERY.FIELDS ) );
			return;
		}
		var csvData = toCsvChunks( toCSV( res[ tableName ], fields ) );
		var fullTableName = BIGQUERY.TABLE_NAME_PREFIX + tableName + '_' + mccId;

		createTable( fullTableName, fields, BIGQUERY.PARTITION );
		jobIds = jobIds.concat( loadIntoBigquery( csvData, fullTableName ) );
		
	});
	Logger.log( 'done' );
	checkJobs( jobIds );
}

function recreateViews( mccId ){
	var now = computeNow( AdWordsApp.currentAccount().getTimeZone() );
	Logger.log( dateToString( now ) );
	//var yesterday = new Date( now.getTime() - 1000 * 60 * 60 * 24 );
	var date = now.yyyymmdd( '-' );

	Object.keys( BIGQUERY.FIELDS ).forEach( function( tableName ){
		var fullTableName = BIGQUERY.TABLE_NAME_PREFIX + tableName + '_' + mccId;
		
		var viewName = tableName + '_' + mccId;
		createViewForTable( fullTableName, viewName, date );
	});
}

function createView( viewName, query ){
	if ( tableExists( viewName ) ){
		if( ! RECREATE_VIEWS && ! UPDATE_VIEW_AND_PRECOMPUTING_AND_QUIT ){
			Logger.log( 'View %s already exists. Don\'t recreate it.', viewName );
			return;	
		}else{
			dropView( viewName );
		}
	}

	var table = BigQuery.newTable();
	
	table.friendlyName = viewName;

	table.tableReference = BigQuery.newTableReference();
	table.tableReference.datasetId = BIGQUERY.DATASET_ID;
	table.tableReference.projectId = BIGQUERY.PROJECT_ID;
	table.tableReference.tableId = viewName;
	
	table.view = {
		query : query,
		useLegacySql : false
	};
	
	try{
		BigQuery.Tables.insert(
			table,
			BIGQUERY.PROJECT_ID,
			BIGQUERY.DATASET_ID
		);
		Logger.log( 'View ' + viewName + ' created.' );
	}catch( error ){
		Logger.log( '----------------------> ' + error + ' - ' + viewName );
		throw error;
	}
}

Date.prototype.yyyymmdd = function( delimiter ) {
  var mm = this.getMonth() + 1; // getMonth() is zero-based
  var dd = this.getDate();

  return [this.getFullYear(),
          (mm>9 ? '' : '0') + mm,
          (dd>9 ? '' : '0') + dd
         ].join( delimiter );
};

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
			obj['isActiveClone'] = null;
			temp[key] = clone( obj[key] );
			delete obj['isActiveClone'];
		}
	}
	return temp;
}

function partition( arr ){
	return partition1( arr, false );
}

function partitionToLists( arr ){
	return partition1( arr, true );
}

function partition1( arr, toLists ){
	return {
		by: function( keyName ){
			var res = {};

			for ( var i = 0; i < arr.length; i++ ){
				var obj = clone( arr[i] );
				var key;
				if( Array.isArray( keyName ) ){
					key = [];
					keyName.forEach( function( keyName2 ){
						if ( typeof keyName2 == 'function' ){
							key.push( keyName2( obj ) );
						} else {
							key.push( obj[ keyName2 ] );
							delete obj[ keyName2 ];
						}
					});
					key = key.join( ID_SEPARATOR );
				}else{
					if ( typeof keyName == 'function' ){
						key = keyName( obj );
					} else {
						key =  obj[ keyName ];
						delete obj[ keyName ];
					}
				}
				// init
				if( toLists ){
					res[ key ] = ( res[ key ] || [] );
					res[ key ].push( obj );
				}else{
					res[ key ] = obj;
				}
			}
			return res;
		}
	};
}


// ++++++++++++++++++++++++++++++++++++++++++

function loadDataToBigquery( tableName, data, skipLeadingRows ){
	// Create the data upload job.
	var job = {
		configuration: {
			load: {
				destinationTable: {
					projectId: BIGQUERY.PROJECT_ID,
					datasetId: BIGQUERY.DATASET_ID,
					tableId: tableName
				},
				skipLeadingRows : skipLeadingRows ? skipLeadingRows : 0,
				//nullMarker : '--'
			}
		}
	};

	var insertJob = BigQuery.Jobs.insert( job, BIGQUERY.PROJECT_ID, data );
	return insertJob.jobReference.jobId;
}


// one year = 1000 * 60 * 60 * 24 * 365
function adjustPartitionExpiration( ms ){
	var tables = getTables();
	
	tables = tables
		.filter( _.property( 'type' ).eq( 'TABLE' ) )
		.filter( _.property( 'timePartitioning' ).isDefined() )
		.forEach( function( table ){
			var ref = table.tableReference;
			// table = _.clone( table );
			table.timePartitioning.expirationMs = ms;
			BigQuery.Tables.patch( table, ref.projectId, ref.datasetId, ref.tableId );
		})
	;
}

function getTables(){
	var pageToken = null; // start with empty pageToken
	var resultsPerPage = 150;
	var res = [];
	do{
		// Get a list of a part of all tables in the dataset.
		var tables = BigQuery.Tables.list(
			BIGQUERY.PROJECT_ID,
			BIGQUERY.DATASET_ID,
			{
				pageToken  : pageToken || '',
				maxResults : resultsPerPage
			}
		);
		pageToken = tables.nextPageToken;
		
		//Logger.log( tables );
		
		res = res.concat( tables.tables || [] );
	}while( pageToken );
	
	return res;
}


/**
 * Creates a new dataset.
 *
 * If a dataset with the same id already exists and the truncate flag
 * is set, will truncate the old dataset. If the truncate flag is not
 * set, then will not create a new dataset.
 */
function createDataset() {
	if( datasetExists() ){
		Logger.log( 'Data set already exists: ' + BIGQUERY.DATASET_ID );
		return;
	}
	
	// Create new dataset.
	var dataSet = BigQuery.newDataset();
	dataSet.friendlyName = BIGQUERY.DATASET_ID;
	dataSet.datasetReference = BigQuery.newDatasetReference();
	dataSet.datasetReference.projectId = BIGQUERY.PROJECT_ID;
	dataSet.datasetReference.datasetId = BIGQUERY.DATASET_ID;

	dataSet = BigQuery.Datasets.insert( dataSet, BIGQUERY.PROJECT_ID );
	Logger.log( 'Created dataset with id %s.', dataSet.id );
}

/**
 * Checks if dataset already exists in project.
 *
 * @return {boolean} Returns true if dataset already exists.
 */
function datasetExists() {
	// Get a list of all datasets in project.
	var datasets = BigQuery.Datasets.list( BIGQUERY.PROJECT_ID );
	var datasetExists = false;
	// Iterate through each dataset and check for an id match.
	if( datasets.datasets != null ){
		for( var i = 0; i < datasets.datasets.length; i++ ){
			var dataset = datasets.datasets[ i ];
			if( dataset.datasetReference.datasetId == BIGQUERY.DATASET_ID ){
				datasetExists = true;
				break;
			}
		}
	}
	return datasetExists;
}

function dropTable( tableName ){
	if ( tableExists( tableName ) ){
		BigQuery.Tables.remove( BIGQUERY.PROJECT_ID, BIGQUERY.DATASET_ID, tableName );
		Logger.log('Table %s dropped.', tableName );
	}
}

function dropView( viewName ){
	if ( tableExists( viewName ) ){
		BigQuery.Tables.remove( BIGQUERY.PROJECT_ID, BIGQUERY.DATASET_ID, viewName );
		Logger.log('View %s dropped.', viewName );
	}
}

function createViewForTable( tableName, viewName, date ){
	var query = '#StandardSQL \n' +
		'SELECT \n' +
			'*, \n' +
			'DATE ( \'' + date + '\' ) AS _LATEST_DATE, \n' +
			'DATE ( _PARTITIONTIME ) AS _DATA_DATE \n' +
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.' + tableName + '` \n';
	dropView( viewName );
	createView( viewName, query );
}

/**
 * Creates a new table.
 *
 * If a table with the same id already exists and the truncate flag
 * is set, will truncate the old table. If the truncate flag is not
 * set, then will not create a new table.
 *
 * @param {String} name of table
 * @param {String->String} map from field-names to field-types
 */
function createTable( tableName, fields, partitionPeriod ) {
	if( tableExists( tableName ) ){
		Logger.log( 'table ' + tableName + ' already exists. Don\'t recreate it.' );
		return;
	}

	// Create new table.
	var table = BigQuery.newTable();
	var schema = BigQuery.newTableSchema();
	var bigQueryFields = [];

	// Add each field to table schema.
	var fieldNames = Object.keys( fields );
	for( var i = 0; i < fieldNames.length; i++ ){
		var fieldName = fieldNames[i];
		var bigQueryFieldSchema = BigQuery.newTableFieldSchema();
		bigQueryFieldSchema.description = fieldName;
		bigQueryFieldSchema.name = fieldName;
		bigQueryFieldSchema.type = fields[ fieldName ];
	
		bigQueryFields.push( bigQueryFieldSchema );
	}

	schema.fields = bigQueryFields;
	table.schema = schema;
	table.friendlyName = tableName;

	table.tableReference = BigQuery.newTableReference();
	table.tableReference.datasetId = BIGQUERY.DATASET_ID;
	table.tableReference.projectId = BIGQUERY.PROJECT_ID;
	table.tableReference.tableId = tableName;
	if( partitionPeriod ){
		table.timePartitioning = { type : partitionPeriod };
	}

	table = BigQuery.Tables.insert(
		table,
		BIGQUERY.PROJECT_ID,
		BIGQUERY.DATASET_ID
	);
	Logger.log('Table %s created.', tableName);
}

/**
 * Checks if table already exists in dataset.
 *
 * @param {string} tableId The table id to check existence.
 *
 * @return {boolean}  Returns true if table already exists.
 */
function tableExists( tableId ){
	var pageToken = ''; // start with empty pageToken
	var resultsPerPage = 150;
	var finished = false;
	
	while( ! finished ){
		// Get a list of a part of all tables in the dataset.
		var tables = BigQuery.Tables.list(
			BIGQUERY.PROJECT_ID,
			BIGQUERY.DATASET_ID,
			{
				pageToken  : pageToken,
				maxResults : resultsPerPage
			}
		);
		pageToken = tables.nextPageToken;
      
		if( ! pageToken ){
			finished = true;
		}
		// Iterate through each table and check for an id match.
		if ( tables.tables != null ){
			for( var i = 0; i < tables.tables.length; i++ ){
				var table = tables.tables[ i ];
				if( table.tableReference.tableId == tableId ){
					return true;
				}
			}
		}
	}
	return false;
}

function deleteViewWithPrefix( prefix ){
	var pageToken = ''; // start with empty pageToken
	var resultsPerPage = 1511;
	var finished = false;
	
	while( ! finished ){
		// Get a list of a part of all tables in the dataset.
		
		var tables = BigQuery.Tables.list(
			BIGQUERY.PROJECT_ID,
			BIGQUERY.DATASET_ID,
			{
				pageToken  : pageToken,
				maxResults : resultsPerPage
			}
		);
		pageToken = tables.nextPageToken;
		Logger.log( 'page-token: ' + tables.nextPageToken );
		if( ! pageToken ){
			finished = true;
		}
		// Iterate through each table and check for an id match.
		if ( tables.tables != null ){
			for( var i = 0; i < tables.tables.length; i++ ){
				var table = tables.tables[ i ];
				if( table.tableReference.tableId.indexOf( prefix ) == 0 ){
					dropTable( table.tableReference.tableId );
				}
			}
		}
	}
	return false;
}

function copyTable( srcTableId, destTableId ){
	var job = {
		configuration: {
			copy: {
				destinationTable: {
					projectId	: BIGQUERY.PROJECT_ID,
					datasetId	: BIGQUERY.DATASET_ID,
					tableId  	: destTableId
				},
				sourceTable : {
					projectId	: BIGQUERY.PROJECT_ID,
					datasetId	: BIGQUERY.DATASET_ID,
					tableId		: srcTableId
				},
				createDisposition	: 'CREATE_IF_NEEDED',
				writeDisposition	: 'WRITE_TRUNCATE',
			}
		}
	};
	BigQuery.Jobs.insert( job, BIGQUERY.PROJECT_ID );
}

function splitArray( arr, chunkSize ){
	var i, res = [];
	for( i = 0; i < arr.length; i += chunkSize ){
		res.push( arr.slice( i, i + chunkSize ) );
	}
	return res;
}

function isNumeric(n) {
  return ! isNaN( parseFloat( n ) ) && isFinite( n );
}

function prepareForBigQuery( value ){
	if( value === null ){
		return undefined;
	}
	if( typeof value == 'string' ){
		// remove thousand separator
		var num = value.split( ',' ).join( '' );
		if( isNumeric( num ) ){
			return num;
		}
		// bug found: value.indexOf( '%' ) == value.length - 1 is true for empty strings
		// to fix it, we check whether the string actually contains '%'
		if( value.indexOf( '%' ) > 0 && value.indexOf( '%' ) == value.length - 1 ){
			return value.substring( 0, value.length - 1 ) / 100;
		}
		if( value.indexOf( '"' ) >= 0 ){
			value = value.replace( new RegExp( '"', 'g' ), '""' );
		}
		value = '"' + value + '"';
		return value;
	}
	value = value + '';
	
	if( value.indexOf(',') >= 0 ){
		value = value.replace( new RegExp( ',', 'g' ), '' );
	}
	return value;
}

/**
 * Creates a BigQuery insertJob to load csv data.
 *
 */
function loadIntoBigqueryTable( tableName ){
	return function( data ){
		// Convert to Blob format.
		var blobData = Utilities.newBlob( data, 'application/octet-stream' );
		// Create the data upload job.
		var job = {
			configuration: {
				load: {
					destinationTable: {
						projectId: BIGQUERY.PROJECT_ID,
						datasetId: BIGQUERY.DATASET_ID,
						tableId: tableName
					},
					skipLeadingRows: 0, // We have no a header row, so nothing to skip.
					writeDisposition	: 'WRITE_APPEND', // Since we load chunks it must be append! Do not use 'WRITE_TRUNCATE' here!
				}
			}
		};
		try{
			var insertJob = BigQuery.Jobs.insert( job, BIGQUERY.PROJECT_ID, blobData );
			//Logger.log('Load job started for %s. Check on the status of it here: ' +
			//   'https://bigquery.cloud.google.com/jobs/%s', tableName,
			//   BIGQUERY.PROJECT_ID);
			return optional( insertJob.jobReference.jobId );
		}catch( error ){
			// sometimes we get "No schema specified on job or table." here
			Logger.log( error + ' - ' + tableName );
			return optional( error );
		}
	};
}

function jobIdToStatus( jobId ){
	if( jobId.lastIndexOf( '.' ) >= 0 ){
		// Invalid job ID "biddy-io:US.job_nLbcaw3YDYShaqKhy-QYbVbYDyQs"
		// Need to remove "biddy-io:US." part
		jobId = jobId.substring( jobId.lastIndexOf( '.' ) + 1 );
	}
	var job = BigQuery.Jobs.get( BIGQUERY.PROJECT_ID, jobId );
	if( ! job.status ){
		return 'BigqueryStatusBug';
	}
	return job.status.state;
}

function checkJobs( jobIds ){
	var states = {};
	for( var i in jobIds ){
		var jobId = jobIds[ i ];
		var job = BigQuery.Jobs.get( BIGQUERY.PROJECT_ID, jobId );
		if( ! job.status ){
			// strange bug from bigquery?
			continue;
		}
		var state = job.status.state;
		states[ state ] = ( states[ state ] || 0 ) + 1;
		
		if( job.status.errorResult ){
			Logger.log( 'message : ' + job.status.errorResult.message );
			Logger.log( 'location : ' + job.status.errorResult.location );
			Logger.log( 'Debug-info: ' + job.status.errorResult.debugInfo );	
		}
	}
	Logger.log( JSON.stringify( states, null, '\t' ) );
	
	if( states[ 'RUNNING' ] ){
		Utilities.sleep( 5000 );
		checkJobs( jobIds );
	}
}

// +++++++++++++++++++++++++++++++++++++

// ####################################################
// ####################################################

function sendEmail( to, subject, text ){
	if( !text ){
		throw new Error( ' no text supplied for Email ' );
	}
	if( MAILGUN_AUTH && MAILGUN_AUTH.length > 0 ){
		return mailGunSender( to, subject, text );	
	}else{
		return MailApp.sendEmail( to, subject, text );
	}
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
		MAILGUN_URL,
		{
			"method": "post",
			"payload": {
				'from': MAILGUN_FROM,
				'to': to,
				'subject': subject,
				'text': text,
				'html': html,
			},
			"headers": {
				"Authorization": MAILGUN_AUTH,
			}
		}
	 );
}

// ####################################################
// ####################################################
