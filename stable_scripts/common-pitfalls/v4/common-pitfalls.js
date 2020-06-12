var config = {
	"DESCRIPTION" : "" ,
	"INSTRUCTIONS": "",
	"VERSION" : 1,
	"VERSION_TAG" : "stable",
	"settings" : {
		"BIGQUERY_PROJECT_ID" : "biddy-io",
		"BIGQUERY_DATASET_ID" : "peak_ace_active_clients_transfer",
		"BIDDY_DATASET_ID" : "biddy",
		"BIDDY_TABLE_NAME" : "pitfall_data",
		"SEND_ERROR_MESSAGES_TO" : "a.tissen@pa.ag",
		"MAILGUN_URL" : "https://api.mailgun.net/v3/mg.peakace.de/messages",
		"MAILGUN_AUTH" : "Basic YXBpOmtleS1hYWZmMmI2MGU4MmNkMWYwOTIwYWYxNDUzZWM0MDcyOA==",
		"MAILGUN_FROM" : "adwords_scripts@mg.peakace.de",
		"VIEW_PREFIX" : "biddy1_",
		"DATA_STUDIO_PREFIX" : "ds_",
		"UPDATE_VIEW_AND_PRECOMPUTING_AND_QUIT" : false,
		"TABLE_NAME_PREFIX" : "p_",
		"CREATE_GEOTARGETS" : true,
		"GEOTARGETS_URL" : "https://goo.gl/cZXkiJ",
		"GEOTARGETS_TABLE_NAME" : "p_Geotargets",
		"RECREATE_VIEWS" : false,
		"TIMEZONE" : "Europe/Berlin",
		"PRECOMPUTE_HOUR" : 3,
		"PARTITION_EXPIRATION_DAYS" : 8, 
		"REQUIRE_PARTItION_FILTER" : true,
		"SCRIPT_NAME" : "BigQueryPusher",
		"TARGET_SETTING_CONSTANT" : "USER_INTEREST_AND_LIST"
	}
};

var config = JSON.parse( dataJSON.settings );
for( key in config ){
	this[ key ] = config[ key ];
}

var ACCOUNT_ID = AdWordsApp.currentAccount().getCustomerId().split( '-' ).join( '' );

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
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	CampaignName,',
		'	AdGroupName,',
		'	count(*) as countExactKeywords',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword ON keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId AND NOT IsNegative AND KeywordMatchType = \'EXACT\'',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	AND AdvertisingChannelType = \'SEARCH\'',
		'GROUP BY AccountName, CampaignName, AdGroupName, customer.ExternalCustomerId, CampaignId, AdGroupId, AdGroupStatus, CampaignStatus',
		'HAVING TRUE',
		'  AND countExactKeywords > 10',
		'ORDER BY AccountName, CampaignName, AdGroupName',
	].join( '\n' ),
	ADGROUP_NO_NEGATIVE_KEYWORDS_IN_BROAD_ADGROUP : [
		'SELECT',
		'    adgroup.AccountName,',
		'    CAST( adgroup.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'    CAST( adgroup.CampaignId as STRING ) as CampaignId,',
		'    CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'    adgroup.CampaignStatus,',
		'    adgroup.AdGroupStatus,',
		'    adgroup.CampaignName,',
		'    adgroup.AdGroupName',
		'    --,adgroup.CountBroadKeywords',
		'    --,SystemServingStatus',
		'    --,SUM( Impressions ) AS ImpressionisLast30Days',
		'FROM (',
		'  SELECT',
		'    IFNULL( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'    customer.ExternalCustomerId,',
		'    campaign.CampaignId,',
		'    adgroup.AdGroupId,',
		'    campaign.CampaignStatus,',
		'    adgroup.AdGroupStatus,',
		'    CampaignName,',
		'    AdGroupName,',
		'    SUM( CAST( IsNegative AS INT64 ) ) AS CountNegativeKeywords,',
		'    SUM( CAST( NOT IsNegative AND KeywordMatchType != \'BROAD\' AS INT64 ) ) AS CountNonBroadKeywords,',
		'    SUM( CAST( NOT IsNegative AND KeywordMatchType = \'BROAD\' AS INT64 ) ) AS CountBroadKeywords,',
		'    STRING_AGG( SystemServingStatus, \', \' ) as SystemServingStatus',
		'  FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup',
		'  JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId',
		'  JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId',
		'  JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword ON keyword.ExternalCustomerId = customer.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId',
		'  WHERE TRUE',
		'    AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'    AND campaign.AdvertisingChannelType = \'SEARCH\'',
		'    AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'    AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'    AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'    AND customer._LATEST_DATE = customer._DATA_DATE',
		'    AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'    AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'  GROUP BY AccountName, ExternalCustomerId, CampaignName, campaign.CampaignId, AdGroupId, CampaignStatus, AdGroupStatus, CampaignName, AdGroupName',
		'  HAVING CountNegativeKeywords = 0 AND CountNonBroadKeywords = 0 AND CountBroadKeywords > 0',
		') AS adgroup',
		'-- the join excludes adgroups without impressions in the last 30 days',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.KeywordBasicStats_' + ACCOUNT_ID + '` AS stat ON stat.ExternalCustomerId = adgroup.ExternalCustomerId AND stat.CampaignId = adgroup.CampaignId AND stat.AdGroupId = adgroup.AdGroupId AND DATE_DIFF( CURRENT_DATE( \'Europe/Berlin\' ), _DATA_DATE, DAY ) <= 30',
		'WHERE TRUE',
		'	AND REGEXP_CONTAINS( SystemServingStatus, \'ELIGIBLE\' )',
		'GROUP BY AccountName, ExternalCustomerId, CampaignName, adgroup.CampaignId, AdGroupId, CampaignStatus, AdGroupStatus, CampaignName, AdGroupName, CountBroadKeywords, SystemServingStatus',
		'ORDER BY AccountName, ExternalCustomerId, CampaignName, adgroup.CampaignId, AdGroupId, CampaignStatus, AdGroupStatus, CampaignName, AdGroupName, CountBroadKeywords, SystemServingStatus',
		'--ImpressionisLast30Days DESC',
	].join( '\n' ),
	ADGROUP_TOO_MANY_BROAD_KEYWORDS : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	CampaignName,',
		'	AdGroupName,',
		'	count(*) as countBroadKeywords',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword ON keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId AND NOT IsNegative AND KeywordMatchType = \'BROAD\'',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	AND AdvertisingChannelType = \'SEARCH\'',
		'GROUP BY AccountName, CampaignName, AdGroupName, customer.ExternalCustomerId, CampaignId, AdGroupId, AdGroupStatus, CampaignStatus',
		'HAVING TRUE',
		'  AND countBroadKeywords > 1',
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
		'	AND (',
		'		SELECT',
		'			count(*) ',
		'		FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Ad_' + ACCOUNT_ID + '` AS ad',
		'		WHERE TRUE',
		'			AND ad.ExternalCustomerId = adgroup.ExternalCustomerId',
		'			AND ad.AdGroupId = adgroup.AdGroupId',
		'			AND AdType IN (',
		'				\'GMAIL_AD\',',
		'				\'MULTI_ASSET_RESPONSIVE_DISPLAY_AD\',',
		'				\'TEMPLATE_AD\',',
		'				\'CALL_ONLY_AD\',',
		'				\'EXPANDED_TEXT_AD\',',
		'				\'RESPONSIVE_SEARCH_AD\',',
		'				\'TEXT_AD\',',
		'				\'RESPONSIVE_DISPLAY_AD\',',
		'				\'IMAGE_AD\',',
		'				\'DYNAMIC_SEARCH_AD\',',
		'				\'EXPANDED_DYNAMIC_SEARCH_AD\'',
		'			)',
		'			AND ad._LATEST_DATE = ad._DATA_DATE',
		'	) = 0',
		'	AND AdGroupType IN ( \'SEARCH_STANDARD\', \'DISPLAY_STANDARD\' )',
		'ORDER BY AccountName, CampaignName, AdGroupName',
	].join( '\n' ),
	ADGROUP_TOO_FEW_ADS : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	CampaignName,',
		'	AdGroupName,',
		'	count(*) AS countAds',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Ad_' + ACCOUNT_ID + '` AS ad',
		'	ON ad.ExternalCustomerId = adgroup.ExternalCustomerId',
		'	AND ad.CampaignId = campaign.CampaignId',
		'	AND ad.AdGroupId = adgroup.AdGroupId',
		'	AND AdType IN (',
		'		\'GMAIL_AD\',',
		'		\'MULTI_ASSET_RESPONSIVE_DISPLAY_AD\',',
		'		\'TEMPLATE_AD\',',
		'		\'CALL_ONLY_AD\',',
		'		\'EXPANDED_TEXT_AD\',',
		'		\'RESPONSIVE_SEARCH_AD\',',
		'		\'TEXT_AD\',',
		'		\'RESPONSIVE_DISPLAY_AD\',',
		'		\'IMAGE_AD\',',
		'		\'DYNAMIC_SEARCH_AD\',',
		'		\'EXPANDED_DYNAMIC_SEARCH_AD\'',
		'	)',
		'	AND ad._LATEST_DATE = ad._DATA_DATE',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND ad.Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND AdGroupType IN ( \'SEARCH_STANDARD\', \'DISPLAY_STANDARD\' )',
		'GROUP BY AccountName, CampaignName, AdGroupName, CustomerDescriptiveName, AccountDescriptiveName, customer.ExternalCustomerId, AdGroupId, campaign.CampaignStatus, adgroup.AdGroupStatus, campaign.CampaignId',
		'HAVING TRUE',
		'	AND countAds = 2 --IN ( 1, 2, 3 )',
		'ORDER BY AccountName, CampaignName, AdGroupName',
	].join( '\n' ),
	ADGROUP_TOO_MANY_ENABLED_ADS : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus,',
		'	CampaignName,',
		'	AdGroupName,',
		'	count(*) AS countAds',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Ad_' + ACCOUNT_ID + '` AS ad',
		'	ON ad.ExternalCustomerId = adgroup.ExternalCustomerId',
		'	AND ad.CampaignId = campaign.CampaignId',
		'	AND ad.AdGroupId = adgroup.AdGroupId',
		'	AND AdType IN (',
		'		\'GMAIL_AD\',',
		'		\'MULTI_ASSET_RESPONSIVE_DISPLAY_AD\',',
		'		\'TEMPLATE_AD\',',
		'		\'CALL_ONLY_AD\',',
		'		\'EXPANDED_TEXT_AD\',',
		'		\'RESPONSIVE_SEARCH_AD\',',
		'		\'TEXT_AD\',',
		'		\'RESPONSIVE_DISPLAY_AD\',',
		'		\'IMAGE_AD\',',
		'		\'DYNAMIC_SEARCH_AD\',',
		'		\'EXPANDED_DYNAMIC_SEARCH_AD\'',
		'	)',
		'	AND ad._LATEST_DATE = ad._DATA_DATE',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND ad.Status IN ( \'ENABLED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'	AND AdGroupType IN ( \'SEARCH_STANDARD\', \'DISPLAY_STANDARD\' )',
		'GROUP BY AccountName, CampaignName, AdGroupName, CustomerDescriptiveName, AccountDescriptiveName, customer.ExternalCustomerId, AdGroupId, campaign.CampaignStatus, adgroup.AdGroupStatus, campaign.CampaignId',
		'HAVING TRUE',
		'	AND countAds > 6',
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
		'	AND (',
		'		SELECT',
		'			count(*)',
		'		FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Ad_' + ACCOUNT_ID + '` AS ad',
		'		WHERE TRUE',
		'			AND ad.ExternalCustomerId = adgroup.ExternalCustomerId',
		'			AND ad.AdGroupId = adgroup.AdGroupId',
		'			AND AdType IN (',
		'				\'EXPANDED_DYNAMIC_SEARCH_AD\',',
		'				\'DYNAMIC_SEARCH_AD\'',
		'			)',
		'			AND ad._LATEST_DATE = ad._DATA_DATE',
		'			AND Status = \'ENABLED\'',
		'	) = 0',
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
		'	AND (',
		'		SELECT',
		'			count(*)',
		'		FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Ad_' + ACCOUNT_ID + '` AS ad',
		'		WHERE TRUE',
		'			AND ad.ExternalCustomerId = adgroup.ExternalCustomerId',
		'			AND ad.AdGroupId = adgroup.AdGroupId',
		'			AND AdType IN (',
		'				\'EXPANDED_DYNAMIC_SEARCH_AD\',',
		'				\'DYNAMIC_SEARCH_AD\'',
		'			)',
		'			AND ad._LATEST_DATE = ad._DATA_DATE',
		'			AND Status = \'ENABLED\'',
		'	) IN ( 1, 2 )',
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
		'	AND (',
		'		SELECT',
		'			count(*)',
		'		FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Ad_' + ACCOUNT_ID + '` AS ad',
		'		WHERE TRUE',
		'			AND ad.ExternalCustomerId = adgroup.ExternalCustomerId',
		'			AND ad.AdGroupId = adgroup.AdGroupId',
		'			AND AdType IN (',
		'				\'EXPANDED_DYNAMIC_SEARCH_AD\',',
		'				\'DYNAMIC_SEARCH_AD\'',
		'			)',
		'			AND ad._LATEST_DATE = ad._DATA_DATE',
		'			AND Status = \'ENABLED\'',
		'	) > 6',
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
		'		(',
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
		'	adgroup.AdGroupName,',
		'	campaign.CampaignStatus,',
		'	adgroup.AdGroupStatus',
		'	--,sum( cast( audience.ExternalCustomerId is not null as int64 ) ) as countAudiences',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` AS adgroup',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer',
		'	ON customer.ExternalCustomerId = adgroup.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'	ON campaign.CampaignId = adgroup.CampaignId',
		'	AND campaign.ExternalCustomerId = adgroup.ExternalCustomerId',
		'	AND campaign. AdvertisingChannelType IN ( \'SEARCH\', \'SHOPPING\' )',
		'	AND REGEXP_CONTAINS( campaign.CampaignName , \'RLSA\' )',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Criteria_' + ACCOUNT_ID + '` AS audience',
		'	ON  adgroup.ExternalCustomerId = audience.ExternalCustomerId',
		'	AND campaign.CampaignId = audience.CampaignId',
		'	AND adgroup.AdGroupId = audience.AdGroupId',
		'	AND audience._DATA_DATE = audience._LATEST_DATE',
		'	AND CriteriaType = \'USER_LIST\'',
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
		'  --AND customer.ExternalCustomerId = 5974641331',
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
		'	AdvertisingChannelType,',
		'  sum( Clicks ) AS Clicks',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignBasicStats_' + ACCOUNT_ID + '` AS stat',
		'  ON stat.ExternalCustomerId = campaign.ExternalCustomerId',
		'  AND stat.CampaignId = campaign.CampaignId',
		'  AND DATE_DIFF( CURRENT_DATE( \'Europe/Berlin\' ), stat._DATA_DATE, DAY ) <= 30',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND CampaignMobileBidModifier IS NULL',
		'GROUP BY CustomerDescriptiveName, AccountDescriptiveName, campaign.CampaignId, customer.ExternalCustomerId, CampaignName, CampaignStatus, AdvertisingChannelType',
		'HAVING Clicks > 0',
		'ORDER BY Clicks DESC',
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
		'	AdvertisingChannelType,',
		'	TargetingSetting',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignSettings_' + ACCOUNT_ID + '` as settings',
		'	ON  settings.ExternalCustomerId = campaign.ExternalCustomerId',
		'	AND settings.CampaignId = campaign.CampaignId',
		'	AND settings._LATEST_DATE = settings._DATA_DATE',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	-- targeting is narrowed',
		'	AND TargetingSetting = \'TARGET_ALL_FALSE\'',
		'	AND AdvertisingChannelType = \'SEARCH\'',
		'  AND ( FALSE',
		'	-- but ',
		'    OR REGEXP_CONTAINS( UPPER( CampaignName ), \'SUCH\' )',
		'    OR REGEXP_CONTAINS( UPPER( CampaignName ), \'SEARCH\' )',
		'    OR REGEXP_CONTAINS( UPPER( CampaignName ), \'SE-\' )',
		'    OR REGEXP_CONTAINS( UPPER( CampaignName ), \'GSN\' )',
		'    --OR REGEXP_CONTAINS( UPPER( CampaignName ), \'GDN\' )',
		'    --OR REGEXP_CONTAINS( UPPER( CampaignName ), \'DISPLAY\' )',
		'  )',
		'	--AND NOT ( FALSE',
		'	--	OR REGEXP_CONTAINS( UPPER( CampaignName ), \'RLSA\' )',
		'	--	OR REGEXP_CONTAINS( UPPER( CampaignName ), \'REMARKETING\' )',
		'	--	OR REGEXP_CONTAINS( UPPER( CampaignName ), \'RMK\' )',
		'	--	OR REGEXP_CONTAINS( UPPER( CampaignName ), \'WETTBEWERBER\' )',
		'	--	OR REGEXP_CONTAINS( UPPER( CampaignName ), \'NEUKUNDEN\' )',
		'	--)',
	].join( '\n' ),
	CAMPAIGN_NON_STANDARD_DELIVERY_METHOD : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CampaignName,',
		'	campaign.CampaignStatus,',
		'	AdvertisingChannelType,',
		'	DeliveryMethod,',
		'	STRING_AGG( SearchBudgetLostImpressionShare, \', \' ) AS SearchBudgetLostImpressionShares',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignSettings_' + ACCOUNT_ID + '` as settings',
		'	ON  settings.ExternalCustomerId = campaign.ExternalCustomerId',
		'	AND settings.CampaignId = campaign.CampaignId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignCrossDeviceStats_' + ACCOUNT_ID + '` as stat',
		'	ON  stat.ExternalCustomerId = campaign.ExternalCustomerId',
		'	AND stat.CampaignId = campaign.CampaignId',
		'	AND DATE_DIFF( CURRENT_DATE( \'Europe/Berlin\' ), stat._DATA_DATE, DAY ) <= 5',
		'	AND SearchBudgetLostImpressionShare != \'0.00%\'',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND settings._LATEST_DATE = settings._DATA_DATE',
		'	AND DeliveryMethod != \'STANDARD\'',
		'GROUP BY',
		'	CustomerDescriptiveName,',
		'	AccountDescriptiveName,',
		'	customer.ExternalCustomerId,',
		'	campaign.CampaignId,',
		'	CampaignName,',
		'	campaign.CampaignStatus,',
		'	AdvertisingChannelType,',
		'	DeliveryMethod',
	].join( '\n' ),
	CAMPAIGN_ROTATION_TYPE_NOT_OPTIMIZED : [
		'SELECT',
		'	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	CAST( campaign.CampaignId as STRING ) as CampaignId,',
		'	CampaignName,',
		'	campaign.CampaignStatus,',
		'	AdvertisingChannelType,',
		'	AdRotationType',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignSettings_' + ACCOUNT_ID + '` as settings',
		'	ON  settings.ExternalCustomerId = campaign.ExternalCustomerId',
		'	AND settings.CampaignId = campaign.CampaignId',
		'	AND settings._LATEST_DATE = settings._DATA_DATE',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND AdRotationType NOT IN ( \'OPTIMIZE\', \'CONVERSION_OPTIMIZE\' )',
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
		'		AND DATE_DIFF( CURRENT_DATE(), k._DATA_DATE, DAY ) <= 30',
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
		'	--AND DATE_DIFF( CURRENT_DATE(), sq._DATA_DATE, DAY ) <= 30',
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
		'	AND AdvertisingChannelType = \'SEARCH\'',
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
		'	IFNULL( CustomerDescriptiveName,  AccountDescriptiveName ) AS AccountName,',
		'	CAST( customer.ExternalCustomerId AS STRING ) AS ExternalCustomerId,',
		'	CAST( campaign.CampaignId AS STRING ) AS CampaignId,',
		'	campaign.CampaignName,',
		'	campaign.CampaignStatus,',
		'	COUNT(*) AS GeoLocationCount,',
		'	SUM( CAST( ( location.BidModifier IS NULL ) AS int64 ) ) AS GeoLocationWithoutBidModifierCount',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` AS campaign',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer',
		'	ON customer.ExternalCustomerId = campaign.ExternalCustomerId',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.LocationBasedCampaignCriterion_' + ACCOUNT_ID + '` AS location',
		'	ON campaign.ExternalCustomerId = location.ExternalCustomerId',
		'	AND campaign.campaignId = location.CampaignId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'	AND location._LATEST_DATE = location._DATA_DATE',
		'	AND NOT isNegative',
		'GROUP BY customer.ExternalCustomerId, AccountName, CampaignName, CampaignId, campaign.CampaignStatus',
		'HAVING TRUE',
		'	AND GeoLocationCount > 1',
		'	AND GeoLocationWithoutBidModifierCount > 0',
		'ORDER BY AccountName, CampaignName',
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
		'SELECT',
		'	AccountName,',
		'	CAST( ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'	Query,',
		'	CampaignName,',
		'	CampaignId,',
		'	AdGroupName,',
		'	AdGroupId,',
		'	CampaignStatus,',
		'	AdGroupStatus,',
		'	Status,',
		'	Criteria,',
		'	CriterionId,',
		'	KeywordMatchType,',
		'	Impressions,',
		'	Clicks,',
		'	Cost,',
		'	Conversions,',
		'	Cpo,',
		'	Cvr,',
		'	DENSE_RANK() OVER ( PARTITION BY ExternalCustomerId ORDER BY FARM_FINGERPRINT( CONCAT( AccountName, CampaignName, Query ) ) ) as Rank',
		'FROM (',
		'	SELECT',
		'		*',
		'		,',
		'		COUNT(*) OVER (',
		'			PARTITION BY',
		'			ExternalCustomerId,',
		'			AccountName,',
		'			CampaignId,',
		'			Query',
		'		) AS CriteriaCount',
		'	FROM (',
		'		SELECT',
		'			ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'			customer.ExternalCustomerId,',
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
		'			keyword.KeywordMatchType,',
		'			SUM( Impressions ) AS Impressions,',
		'			SUM( Clicks ) AS Clicks,',
		'			SUM( Cost ) / 1000000 AS Cost,',
		'			SUM( Conversions ) AS Conversions,',
		'			ROUND( SUM( Cost ) / 1000000 / GREATEST( SUM( Conversions ), .01 ), 2 ) AS Cpo,',
		'			ROUND( SUM( Conversions ) / GREATEST( SUM( Clicks ), 1 ), 4 ) AS Cvr',
		'		FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.SearchQueryStats_' + ACCOUNT_ID + '` as sq',
		'		JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON campaign.ExternalCustomerId = sq.ExternalCustomerId AND sq.CampaignId = campaign.CampaignId',
		'		JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON customer.ExternalCustomerId = sq.ExternalCustomerId',
		'		JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON adgroup.ExternalCustomerId = sq.ExternalCustomerId AND sq.CampaignId = adgroup.CampaignId AND sq.AdGroupId = adgroup.AdGroupId',
		'		JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword ON keyword.ExternalCustomerId = sq.ExternalCustomerId AND sq.CampaignId = keyword.CampaignId AND sq.AdGroupId = keyword.AdGroupId AND keyword.CriterionId = sq.CriterionId',
		'		WHERE TRUE',
		'			AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'			AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'			AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'			AND keyword.Status IN ( \'ENABLED\', \'PAUSED\' )',
		'			AND NOT keyword.IsNegative',
		'			AND customer._LATEST_DATE = customer._DATA_DATE',
		'			AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'			AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'			AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'			AND sq._LATEST_DATE = sq._DATA_DATE',
		'			--AND DATE_DIFF( sq._LATEST_DATE, sq._DATA_DATE, DAY ) <= 30',
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
		'	AND CriteriaCount > 1',
		'ORDER BY',
		'	--CriteriaCount DESC,',
		'	ExternalCustomerId,',
		'	AccountName,',
		'	Rank',
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
		'	AND NOT REGEXP_CONTAINS( LOWER( CampaignName ), \'welt|world|glo|alle\\\\sstädte\' )',
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
	MISSING_EXCLUDED_CONTENT_LABELS : [
		'SELECT *',
		'FROM (',
		'  SELECT',
		'    ifnull( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,',
		'    CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,',
		'    campaign.CampaignName,',
		'    CAST( settings.CampaignId as STRING ) as CampaignId,',
		'    campaign.CampaignStatus,',
		'    ( SELECT ARRAY_TO_STRING(',
		'      ARRAY(',
		'        SELECT x',
		'        FROM UNNEST( SPLIT( "ADULTISH, BELOW_THE_FOLD, DP, EMBEDDED_VIDEO, GAMES, JUVENILE, PROFANITY, TRAGEDY, VIDEO, SOCIAL_ISSUES", ", " ) ) as x',
		'        LEFT JOIN UNNEST( SPLIT( ExcludedContentLabels, ", " ) ) as y',
		'          ON x = y',
		'        WHERE y is null',
		'        ORDER BY x',
		'      ),',
		'      \', \'',
		'    ) ) AS MissingExcludedContentLabels,',
		'    settings.ExcludedContentLabels',
		'  FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.CampaignSettings_' + ACCOUNT_ID + '` as settings',
		'  JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign',
		'    ON TRUE',
		'    AND settings.ExternalCustomerId = campaign.ExternalCustomerId',
		'    AND settings.CampaignId = campaign.CampaignId',
		'    AND campaign._DATA_DATE = campaign._LATEST_DATE',
		'    AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'  JOIN',
		'    `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer',
		'    ON TRUE',
		'    AND customer.ExternalCustomerId = settings.ExternalCustomerId',
		'    AND customer._LATEST_DATE = customer._DATA_DATE',
		'  WHERE TRUE',
		'    AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'    AND settings._DATA_DATE = settings._LATEST_DATE',
		'    AND ExcludedContentLabels is not null',
		')',
		'WHERE TRUE',
		'  AND MissingExcludedContentLabels != \'\'',
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
		'		OR ( REGEXP_CONTAINS( ad.HeadlinePart1, \'{Keyword:.+\\\\s.+}\' )  )',
		'		OR ( REGEXP_CONTAINS( ad.HeadlinePart1, \'{keyword:.+}\' )  )',
		'		OR ( REGEXP_CONTAINS( ad.HeadlinePart2, \'{keyWord:.+}\' )  )',
		'		OR ( REGEXP_CONTAINS( ad.HeadlinePart2, \'{Keyword:.+\\\\s.+}\' )  )',
		'		OR ( REGEXP_CONTAINS( ad.HeadlinePart2, \'{keyword:.+}\' )  )',
		'		OR ( REGEXP_CONTAINS( ad.Description, \'{keyWord:.+}\' )  )',
		'		OR ( REGEXP_CONTAINS( ad.Description, \'{Keyword:.+\\\\s.+}\' )  )',
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
	NO_TRAFFIC_KEYWORDS : [
		'SELECT',
		'	CustomerDescriptiveName,',
		'	AccountDescriptiveName,',
		'	customer.ExternalCustomerId,',
		'	CampaignName,',
		'	campaign.CampaignStatus,',
		'	campaign.CampaignId,',
		'	AdGroupName,',
		'	adgroup.AdGroupStatus,',
		'	adgroup.AdGroupId,',
		'	keyword.Criteria,',
		'	keyword.Status,',
		'  keyword.CriterionId,',
		'	KeywordMatchType,',
		'  SystemServingStatus,',
		'  SUM( Impressions ) as Impressions',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign',
		'  ON keyword.ExternalCustomerId = campaign.ExternalCustomerId',
		'  AND keyword.CampaignId = campaign.CampaignId',
		'  AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup',
		'  ON keyword.ExternalCustomerId = adgroup.ExternalCustomerId',
		'  AND keyword.CampaignId = adgroup.CampaignId',
		'  AND keyword.AdGroupId = adgroup.AdGroupId',
		'  AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer',
		'	ON customer.ExternalCustomerId = keyword.ExternalCustomerId',
		'	AND customer._LATEST_DATE = customer._DATA_DATE',
		'LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.KeywordBasicStats_' + ACCOUNT_ID + '` AS stat',
		'	ON TRUE',
		'	AND DATE_DIFF( CURRENT_DATE( \'Europe/Berlin\' ), stat._DATA_DATE, DAY ) < 180',
		'	AND stat.ExternalCustomerId = customer.ExternalCustomerId',
		'	AND stat.CampaignId = campaign.CampaignId',
		'	AND stat.AdGroupId = adgroup.AdGroupId',
		'	AND stat.CriterionId = keyword.CriterionId',
		'WHERE TRUE',
		'	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'	AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	AND campaign.CampaignStatus IN ( \'ENABLED\' )',
		'	AND adgroup.AdGroupStatus IN ( \'ENABLED\' )',
		'	AND keyword.Status IN ( \'ENABLED\' )',
		'	AND NOT IsNegative',
		'GROUP BY',
		'	CustomerDescriptiveName,',
		'	AccountDescriptiveName,',
		'	customer.ExternalCustomerId,',
		'	CampaignName,',
		'	campaign.CampaignStatus,',
		'	campaign.CampaignId,',
		'	AdGroupName,',
		'	adgroup.AdGroupStatus,',
		'	adgroup.AdGroupId,',
		'	keyword.Criteria,',
		'	keyword.Status,',
		'  keyword.CriterionId,',
		'	KeywordMatchType,',
		'  SystemServingStatus',
		'HAVING TRUE',
		'  AND Impressions IS NULL',
		'  AND SystemServingStatus = \'ELIGIBLE\'',
	].join( '\n' ),
	KEYWORD_PROBLEMS : [
		'WITH step1 AS',
		'(',
		'	SELECT',
		'		ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,',
		'		customer.ExternalCustomerId AS ExternalCustomerId,',
		'		keyword.CampaignId AS CampaignId,',
		'		CampaignName,',
		'		adgroup.AdGroupId,',
		'		adgroup.AdGroupName,',
		'		CASE',
		'			WHEN KeywordMatchType = \'BROAD\' THEN',
		'				CONCAT( \'+\', REGEXP_REPLACE( LOWER( TRIM( REGEXP_REPLACE( Criteria, \'[\\\\+\\\'"\\\\-\\\\.\\\\[\\\\]\\\\s]+\', \' \' ) ) ), \'\\\\s\\\\b\', \' +\' ) )',
		'			ELSE',
		'				LOWER( TRIM( REGEXP_REPLACE( Criteria, \'[\\\\+\\\'"\\\\-\\\\.\\\\[\\\\]\\\\s]+\', \' \' ) ) )',
		'		END AS NormalizedKeyword1,',
		'		REGEXP_CONTAINS( Criteria, \'\\\\.\' ) AS ContainsDot,',
		'		Criteria != LOWER( Criteria ) AS ContainsCapital,',
		'		REGEXP_CONTAINS( Criteria, \'\\\\-\' ) AS ContainsDash,',
		'		KeywordMatchType = \'BROAD\' AND REGEXP_CONTAINS( Criteria, \'(\\\\S\\\\+)|(\\\\+(\\\\s+|$))\' ) AS WronglyModifiedBroad,',
		'		KeywordMatchType = \'BROAD\' AND REGEXP_CONTAINS( Criteria, \'((^|\\\\s)\\\\+\\\\S.*\\\\s[^\\\\+])|((^|\\\\s)[^\\\\+].*(\\\\s)\\\\+\\\\S)\' ) AS PartlyModifiedBroad,',
		'		AND KeywordMatchType = \'BROAD\' AND NOT REGEXP_CONTAINS( Criteria, \'\\\\+\' ) AS UnmodifiedBroad,',
		'		KeywordMatchType != \'BROAD\' AND REGEXP_CONTAINS( Criteria, \'\\\\+\' ) AS PlusInNonBroad,',
		'		REGEXP_CONTAINS( Criteria, \'"\' ) AS ContainsQuotes,',
		'		REGEXP_CONTAINS( Criteria, \'[\\\\[\\\\]]\' ) AS ContainsBrackets,',
		'		Criteria,',
		'		keyword.CriterionId,',
		'		keyword.QualityScore,',
		'		keyword.KeywordMatchType',
		'	FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Keyword_' + ACCOUNT_ID + '` as keyword',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Customer_' + ACCOUNT_ID + '` as customer ON keyword.ExternalCustomerId = customer.ExternalCustomerId',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.Campaign_' + ACCOUNT_ID + '` as campaign ON keyword.ExternalCustomerId = campaign.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId',
		'	JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.AdGroup_' + ACCOUNT_ID + '` as adgroup ON keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId',
		'	WHERE TRUE',
		'		AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'		AND AdvertisingChannelType = \'SEARCH\'',
		'		AND campaign.CampaignStatus IN ( \'ENABLED\' )',
		'		AND adgroup.AdGroupStatus IN ( \'ENABLED\' )',
		'		AND keyword.Status IN ( \'ENABLED\' )',
		'		AND NOT keyword.isNegative',
		'		AND customer._LATEST_DATE = customer._DATA_DATE',
		'		AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'		AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'		AND keyword._LATEST_DATE = keyword._DATA_DATE',
		'	--AND keyword.ExternalCustomerId = 7056468392--2143422790',
		'	--AND keyword.CampaignId = 1066487659',
		')',
		',step2 AS',
		'(	-- remove duplicate/multiple parts from broad keywords',
		'	SELECT',
		'		*',
		'	FROM (',
		'		SELECT',
		'			*,',
		'			CASE WHEN KeywordMatchType = \'BROAD\' THEN',
		'				(',
		'				SELECT',
		'					STRING_AGG ( x, \' \' )',
		'				FROM (',
		'						SELECT',
		'							x',
		'						FROM unnest( split( NormalizedKeyword1, \' \' ) ) as x',
		'						GROUP BY x',
		'				)',
		'			) ELSE NormalizedKeyword1 END AS NormalizedKeyword2',
		'		FROM step1',
		'	)',
		')',
		', step3 AS',
		'( -- order broad fragments alphabetically in order to find duplicates',
		'	SELECT',
		'		*,',
		'		NormalizedKeyword1 != NormalizedKeyword2 AS DuplicateBmmFragments,',
		'		CASE WHEN KeywordMatchType = \'BROAD\' THEN',
		'			(',
		'				SELECT ARRAY_TO_STRING(',
		'					ARRAY(',
		'						SELECT x',
		'						FROM UNNEST(',
		'							SPLIT(',
		'								NormalizedKeyword2,',
		'								\' \'',
		'							)',
		'						) AS x',
		'						ORDER BY x',
		'					),',
		'					\' \'',
		'				)',
		'			)',
		'			ELSE NormalizedKeyword2',
		'		END AS NormalizedKeyword3',
		'	FROM step2',
		')',
		', step4 AS',
		'(',
		'	SELECT',
		'		*,',
		'		COUNT( * ) OVER ( PARTITION BY ExternalCustomerId, CampaignId, KeywordMatchType, NormalizedKeyword3 ) AS count1',
		'	FROM step3',
		')',
		', keyword2 AS (',
		'	SELECT',
		'		step4.AccountName,',
		'		step4.ExternalCustomerId,',
		'		step4.CampaignId,',
		'		step4.CampaignName,',
		'		NormalizedKeyword2,',
		'		NormalizedKeyword3,',
		'		KeywordMatchType,',
		'		Criteria AS Criteria,',
		'		step4.CriterionId,',
		'		QualityScore,',
		'		step4.AdGroupId,',
		'		AdGroupName,',
		'		ContainsDot,',
		'		ContainsCapital,',
		'		ContainsDash,',
		'		WronglyModifiedBroad,',
		'		PartlyModifiedBroad,',
		'		UnmodifiedBroad,',
		'		PlusInNonBroad,',
		'		ContainsQuotes,',
		'		ContainsBrackets,',
		'		DuplicateBmmFragments,',
		'		COUNT(*) OVER ( PARTITION BY step4.ExternalCustomerId, step4.CampaignId, KeywordMatchType, NormalizedKeyword3 ) as Count,',
		'		SUM( Impressions ) AS Impressions,',
		'		SUM( Clicks ) AS Clicks,',
		'		SUM( Cost ) / 1000000 AS Cost,',
		'		ROUND( SUM( Conversions ), 2 ) AS Conversions,',
		'		ROUND( SUM( Cost ) / 1000000 / GREATEST( SUM( Clicks ), 1 ), 2 ) AS Cpc,',
		'		ROUND( SUM( Cost ) / 1000000 / GREATEST( SUM( Conversions ), .01 ), 2 ) AS Cpo,',
		'		ROUND( SUM( Conversions ) / GREATEST( SUM( Clicks ), 1 ), 4 ) AS Cvr',
		'	FROM step4',
		'	LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.KeywordBasicStats_' + ACCOUNT_ID + '` AS stat',
		'		ON TRUE',
		'		AND DATE_DIFF( CURRENT_DATE( \'Europe/Berlin\' ), stat._DATA_DATE, DAY ) < 180',
		'		AND stat.ExternalCustomerId = step4.ExternalCustomerId',
		'		AND stat.CampaignId = step4.CampaignId',
		'		AND stat.AdGroupId = step4.AdGroupId',
		'		AND stat.CriterionId = step4.CriterionId',
		'	WHERE count1 > 1',
		'		OR ContainsDot',
		'		--OR ContainsCapital',
		'		--OR ContainsDash',
		'		OR WronglyModifiedBroad',
		'		OR PartlyModifiedBroad',
		'		OR UnmodifiedBroad',
		'		OR PlusInNonBroad',
		'		OR ContainsQuotes',
		'		OR ContainsBrackets',
		'		OR DuplicateBmmFragments',
		'	GROUP BY ',
		'		step4.AccountName,',
		'		step4.ExternalCustomerId,',
		'		step4.CampaignId,',
		'		step4.CampaignName,',
		'		NormalizedKeyword2,',
		'		NormalizedKeyword3,',
		'		KeywordMatchType,',
		'		Criteria,',
		'		step4.CriterionId,',
		'		QualityScore,',
		'		step4.AdGroupId,',
		'		AdGroupName,',
		'		ContainsDot,',
		'		ContainsCapital,',
		'		ContainsDash,',
		'		WronglyModifiedBroad,',
		'		PartlyModifiedBroad,',
		'		UnmodifiedBroad,',
		'		PlusInNonBroad,',
		'		ContainsQuotes,',
		'		ContainsBrackets,',
		'		DuplicateBmmFragments',
		'),',
		'keyword3 AS',
		'(',
		'	SELECT',
		'		keyword2.AccountName,',
		'		keyword2.ExternalCustomerId,',
		'		keyword2.CampaignId,',
		'		keyword2.CampaignName,',
		'		KeywordMatchType,',
		'		Criteria AS Criteria,',
		'		NormalizedKeyword2 AS NormalizedKeyword,',
		'		keyword2.CriterionId AS CriterionId,',
		'		QualityScore AS QualityScore,',
		'		keyword2.AdGroupId AS AdGroupId,',
		'		AdGroupName AS AdGroupName,',
		'		Impressions AS Impressions,',
		'		Clicks AS Clicks,',
		'		Cost AS Cost,',
		'		Conversions AS Conversions,',
		'		Cpo AS Cpo,',
		'		Cpc AS Cpc,',
		'		Cvr AS Cvr,',
		'		DuplicateBmmFragments,',
		'		ContainsDot,',
		'		ContainsCapital,',
		'		ContainsDash,',
		'		ContainsQuotes,',
		'		ContainsBrackets,',
		'		WronglyModifiedBroad,',
		'		PartlyModifiedBroad,',
		'		UnmodifiedBroad,',
		'		PlusInNonBroad,',
		'		ARRAY_TO_STRING(',
		'			ARRAY(',
		'				SELECT CASE WHEN DuplicateBmmFragments THEN \'DUPLICATE_BMM_FRAGMENTS\' ELSE NULL END',
		'				UNION ALL',
		'				SELECT CASE WHEN ContainsDot THEN \'CONTAINS_DOT\' ELSE NULL END',
		'				UNION ALL',
		'				SELECT CASE WHEN ContainsCapital THEN \'CONTAINS_CAPITAL\' ELSE NULL END',
		'				UNION ALL',
		'				SELECT CASE WHEN ContainsDash THEN \'CONTAINS_DASH\' ELSE NULL END',
		'				UNION ALL',
		'				SELECT CASE WHEN ContainsQuotes THEN \'CONTIANS_QUOTES\' ELSE NULL END',
		'				UNION ALL',
		'				SELECT CASE WHEN ContainsBrackets THEN \'CONTIANS_BRACKETS\' ELSE NULL END',
		'				UNION ALL',
		'				SELECT CASE WHEN WronglyModifiedBroad THEN \'WRONGLY_MODIFIED_BROAD\' ELSE NULL END',
		'				UNION ALL',
		'				SELECT CASE WHEN PartlyModifiedBroad THEN \'PARTLY_MODIFIED_BROAD\' ELSE NULL END',
		'				UNION ALL',
		'				SELECT CASE WHEN UnmodifiedBroad THEN \'UNMODIFIED_BROAD\' ELSE NULL END',
		'				UNION ALL',
		'				SELECT CASE WHEN PlusInNonBroad THEN \'PLUS_IN_NON_BROAD\' ELSE NULL END',
		'				UNION ALL',
		'				SELECT CASE WHEN Count > 1 THEN \'DUPLICATE\' ELSE NULL END',
		'			)',
		'		, \', \' ) AS Problems,',
		'		Count,',
		'		DENSE_RANK() OVER ( PARTITION BY keyword2.ExternalCustomerId ORDER BY FARM_FINGERPRINT( CONCAT( AccountName, CampaignName, KeywordMatchType, NormalizedKeyword3 ) ) ) as Rank,',
		'		ROW_NUMBER() OVER (',
		'			PARTITION BY',
		'				keyword2.ExternalCustomerId,',
		'				keyword2.CampaignId,',
		'				NormalizedKeyword3',
		'			ORDER BY',
		'				ROUND(',
		'					IFNULL( QualityScore, 0 ) ',
		'					+ IFNULL( Conversions, 0 ) * 1000',
		'					+ IFNULL( Cost / 1000, 0 )',
		'					+ IFNULL( Clicks / 100, 0 )',
		'					+ IFNULL( Impressions / 10000, 0 )',
		'					- CASE WHEN DuplicateBmmFragments THEN .1 ELSE 0 END',
		'					- CASE WHEN ContainsDot THEN .1 ELSE 0 END',
		'					- CASE WHEN ContainsCapital THEN .1 ELSE 0 END',
		'					- CASE WHEN ContainsDash THEN .1 ELSE 0 END',
		'					- CASE WHEN ContainsQuotes THEN 1 ELSE 0 END',
		'					- CASE WHEN ContainsBrackets THEN 1 ELSE 0 END',
		'					- CASE WHEN WronglyModifiedBroad THEN 2 ELSE 0 END',
		'					- CASE WHEN PartlyModifiedBroad THEN 1 ELSE 0 END',
		'					- CASE WHEN UnmodifiedBroad THEN 3 ELSE 0 END',
		'					- CASE WHEN PlusInNonBroad THEN .1 ELSE 0 END',
		'					,1',
		'				) DESC',
		'		) as RowNumber',
		'	FROM keyword2',
		')',
		'SELECT',
		'	AccountName,',
		'	ExternalCustomerId,',
		'	CampaignId,',
		'	CampaignName,',
		'	KeywordMatchType,',
		'	--NormalizedKeyword,',
		'	CriterionId,',
		'	AdGroupId,',
		'	AdGroupName,',
		'	QualityScore,',
		'	Impressions,',
		'	Clicks,',
		'	Cost,',
		'	Conversions,',
		'	Cpo,',
		'	Cpc,',
		'	Cvr,',
		'	Criteria,',
		'	Problems,',
		'	--Count,',
		'	Rank,',
		'	--RowNumber,',
		'	CASE',
		'		WHEN RowNumber > 1 THEN \'PAUSE\'',
		'		WHEN RowNumber = 1 AND Conversions > 0.02 THEN \'KEEP\'',
		'		WHEN FALSE',
		'			OR DuplicateBmmFragments',
		'			OR ContainsDot',
		'			OR ContainsCapital',
		'			OR ContainsDash',
		'			OR ContainsQuotes',
		'			OR ContainsBrackets',
		'			OR WronglyModifiedBroad',
		'			OR PartlyModifiedBroad',
		'			OR UnmodifiedBroad',
		'			OR PlusInNonBroad',
		'			THEN CONCAT( \'REPLACE WITH \', NormalizedKeyword )',
		'		ELSE \'KEEP\'',
		'	END AS Recomendation',
		'FROM keyword3',
		'ORDER BY',
		'	ExternalCustomerId,',
		'	Rank,',
		'	RowNumber',
	].join( '\n' ),
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

function iteratorToList( iter ){
  var list = [];
  while( iter.hasNext() ){
    list.push( iter.next() );
  }
  return list;
}

function addLeadingZeros( number, digits ){
	var res = '' + number;
	while ( res.length < digits ){
		res = '0' + res;
	}
	return res;
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
		
		//Logger.log( schema );
		//schema.forEach( function( column ){
		//	uniqueColumns.check( column.name + '_' + column.type );
		
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
/*
	try{
		deleteViewWithPrefix( '1' );
	} catch ( error ){
		//sendEmail( SEND_ERROR_MESSAGES_TO, 'Error in ' + SCRIPT_NAME + ' ' + mccName, error + '\n' + error.stack );
		Logger.log( 'Error in ' + SCRIPT_NAME + ' ' + ' -> ' + error + '\n' + error.stack );
		throw error;
	}
	return;
	*/
		
	try{
		if( ! BIGQUERY.PROJECT_ID || BIGQUERY.PROJECT_ID == '' ){
			throw new Error( 'Unfinished configuration: please enter your project_id' );
		}
		if( ! BIGQUERY.DATASET_ID || BIGQUERY.DATASET_ID == '' ){
			throw new Error( 'Unfinished configuration: please enter your dataset_id' );
		}
		
		// 1Views
		if( ENSURE_VIEWS_ARE_CREATED ){
			Object.keys( VIEWS ).forEach( function( view ){
				var viewName = view.toLowerCase();
				viewName = VIEW_PREFIX + viewName;
				var query = VIEWS[ view ];
				//Logger.log( query );
				createView( viewName, query );
			});
		}
		
		if( PRECOMPUTING_AND_QUIT ){
			precomputeResults();
			return;
		}

		var isPreview = AdWordsApp.getExecutionInfo().isPreview();
		var mccName = AdWordsApp.currentAccount().getName();
		var mccId = AdWordsApp.currentAccount().getCustomerId().split( '-' ).join( '' );
		
		if( BIGQUERY.PARTITION_EXPIRATION_MS ){
			adjustPartitionExpiration( BIGQUERY.PARTITION_EXPIRATION_MS );
			
			// show time partitioned tables
			getTables()
				.filter( _.property( 'type' ).eq( 'TABLE' ) )
				.filter( _.property( 'timePartitioning' ).isDefined() )
				.forEach( _.log )
			;
		}
		
		// precompute
		var now = new Date( Utilities.formatDate( new Date(), TIMEZONE, 'MMM dd,yyyy HH:mm:ss' ) );
		if( now.getHours() == PRECOMPUTE_HOUR ){
			precomputeResults();
		}
		
	}catch( error ){
		Logger.log( 'Error in ' + SCRIPT_NAME + ' ' + AdWordsApp.currentAccount().getName() + ' -> ' + error + '\n' + error.stack );
		 // 'throw' replaces the stack trace. To preserve the stack we add it to the message
		error.message += ' <-> ' + error.stack;
		throw error;
	}
}

function createView( viewName, query ){
	if ( tableExists( viewName ) ){
		if( RECREATE_VIEWS || PRECOMPUTING_AND_QUIT ){
			dropView( viewName );
		}else{
			Logger.log( 'View %s already exists. Don\'t recreate it.', viewName );
			return;	
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

// one year = 1000 * 60 * 60 * 24 * 365
function adjustPartitionExpiration( ms ){
	var tables = getTables();
	
	tables = tables
		.filter( _.property( 'type' ).eq( 'TABLE' ) )
		//.filter( _.property( 'timePartitioning' ).isDefined() )
		.filter( function( x ){ return typeof x.timePartitioning != 'undefined' } )
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
