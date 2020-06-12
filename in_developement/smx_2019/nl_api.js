
// Account id used for transfer service ( Can be either an MCC-account or not )
var TRANSFER_SERVICE_ACCOUNT_ID = 1036246249;

var TRANSFER_SERVICE_DATASET_ID = 'peak_ace_active_clients_transfer';

// A non-MCC account id for which to set up Datastudio and do regression.
// Can be set to the same value as TRANSFER_SERVICE_ACCOUNT_ID
// if transfer service is set up for a non-mcc account. Otherwise it must be 
// an non-MCC-account, which is inside the hierarchy of the MCC account
// used for transfer service.
var ACCOUNT_ID = 7056468392;

// Target CPO for performance computation of regression
var CPO = 50;

// Determines which date range to use for regression
var DATE_RANGE_IN_DAYS = 365;

// Ignore too long queries. can be set to arbitary large values.
var MAX_QUERY_LENGTH = 80;

// Take only search queries with at least 100 clicks for training.
// Don't use too small values here.
var MIN_SQ_CLICKS_FOR_TRAINING = 100;

// Dictionary ( contains columns Brand, Location, Property )
var DICTIONARY_TABLE_NAME = 'dictionary';

// Sheet containing Brand, Location and Property columns
var DICTIONARY_SHEETS_URL = 'https://docs.google.com/spreadsheets/d/1TIDQVSu9grRZWnxq9WppBvGy_lg357eYQT2uN_8AJSE/edit#gid=0';

// The names of dictionary sheet.
var DICTIONARY_COLUMNS = [ 'Brand', 'Location', 'Property' ];

// Bigquery settings
var PROJECT_LOCATION = 'US';
var PROJECT_ID = 'biddy-io';
var DATASET_ID = 'smx_alex_test';
var PREPROCESSED_DATA_TABLE_NAME = 'preprocessed_data';
var NL_ENTITIES_TABLE_NAME = 'nl_entities';
var PREPROCESSED_DATA2 = 'preprocessed_data2';
var RAW_DATA_2 = 'RAW_DATA_2';

// Cloud NL API settings
var NL_API_KEY = 'AIzaSyAeCZUQE-9i5ZyAI0WYNqvFWJmF-BeyAwI';
var LANGUAGE = 'de-de'; //var LANGUAGE = 'en-us';
var SERVICE_TYPE = 'analyzeEntities';
var FIELDS = [ 'metadata', 'name', 'type', 'salience' ];

// Cloud NL Entities ( like LOCATION:Berlin or NUMBER:7 )
// are used as columns for linear regression.
// To keep the number of columns small
// consider only entities which occour in at least 10 search queries
var MIN_QUERIES_FOR_SEGMENT = 10;

// Ignore other types of Cloud NL Entities because they are not reliable.
var ENTITY_TYPE_WHITELIST = [
	'LOCATION',
	'NUMBER',
	'ADDRESS',
	'PRICE',
	'EVENT',
];

var MODEL_NAME = 'regression_model';

// shall we drop and re-create views?
var RECREATE_VIEWS = true;

// --------- CONSTANTS ---------------------
var NL_API_ENDPOINT = 'https://language.googleapis.com/v1/';
var CHUNK_SIZE = 30000;
var REQUIRE_PARTITION_FILTER = false;
var WIKI_URL_PREFIX = 'https://en.wikipedia.org/wiki/';
var MILLIS = 1000;
var SCRIPT_NAME = 'Colud NL API Script';

// --------- QUERIES -----------------------

var PREPARE_DATA_QUERY = [
		'WITH',
		'sq AS (',
		'	SELECT',
		'		ExternalCustomerId, Query,',
		'		',
		'		SUM( Impressions ) AS SqImpressions,',
		'		SUM( Clicks ) AS SqClicks,',
		'		SUM( Cost ) / 1000000 AS SqCost,',
		'		ROUND( SUM( Conversions ) ) AS SqConversions,',
		'		ROUND( SUM( ConversionValue ) ) AS SqConversionValue',
		'		',
		'	FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.SearchQueryStats_' + TRANSFER_SERVICE_ACCOUNT_ID + '` AS sq',
		'	WHERE',
		'		TRUE',
		'		AND LENGTH( Query ) < ' + MAX_QUERY_LENGTH,
		'		AND sq.ExternalCustomerId = ' + ACCOUNT_ID + '',
		'		AND DATE_DIFF( sq._LATEST_DATE, sq.Date, DAY ) <= ' + DATE_RANGE_IN_DAYS + '',
		'	GROUP BY',
		'		ExternalCustomerId,',
		'		Query',
		'	HAVING TRUE',
		'		AND SqClicks >= ' + MIN_SQ_CLICKS_FOR_TRAINING,
		'),',
		'SearchQueriesGrouped AS (',
		'	SELECT',
		'		ExternalCustomerId, CampaignId, AdGroupId, CriterionId, Query,',
		'		',
		'		SUM( Impressions ) AS SqImpressions,',
		'		SUM( Clicks ) AS SqClicks,',
		'		ROUND( SUM( Cost ) / 1000000, 2 ) AS SqCost,',
		'		ROUND( SUM( Conversions ) ) AS SqConversions,',
		'		ROUND( SUM( ConversionValue ) ) AS SqConversionValue',
		'',
		'	FROM sq',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.SearchQueryStats_' + TRANSFER_SERVICE_ACCOUNT_ID + '`',
		'		USING ( ExternalCustomerId, Query )',
		'	WHERE TRUE',
		'		AND ExternalCustomerId = ' + ACCOUNT_ID + '',
		'		AND DATE_DIFF( _LATEST_DATE, Date, DAY ) <= ' + DATE_RANGE_IN_DAYS + '',
		'	GROUP BY',
		'		ExternalCustomerId, CampaignId, AdGroupId, CriterionId, Query',
		'),',
		'KeywordStatsGrouped AS (',
		'	SELECT',
		'		ExternalCustomerId, CampaignId, AdGroupId, CriterionId,',
		'		',
		'		SUM( Impressions ) AS Impressions,',
		'		SUM( Clicks ) AS Clicks,',
		'		SUM( Cost ) AS Cost,',
		'		SUM( Conversions ) AS Conversions,',
		'		SUM( ConversionValue ) AS ConversionValue',
		'		',
		'	FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.KeywordBasicStats_' + TRANSFER_SERVICE_ACCOUNT_ID + '`',
		'	WHERE TRUE',
		'		AND ExternalCustomerId = ' + ACCOUNT_ID + '',
		'		AND DATE_DIFF( _LATEST_DATE, Date, DAY ) <= ' + DATE_RANGE_IN_DAYS + '',
		'	GROUP BY',
		'		ExternalCustomerId, CampaignId, AdGroupId, CriterionId',
		'),',
		'KeywordStats AS (',
		'	SELECT',
		'		ExternalCustomerId, Query,',
		'		',
		'		SUM( Impressions ) - SUM( SqImpressions ) AS KeywordImpressions,',
		'		SUM( Clicks ) - SUM( SqClicks ) AS KeywordClicks,',
		'		ROUND( ( SUM( Cost ) - SUM( SqCost ) ) / 1000000, 2 ) AS KeywordCost,',
		'		ROUND( SUM( Conversions ) - SUM( SqConversions ) ) AS KeywordConversions,',
		'		ROUND( SUM( ConversionValue ) - SUM( SqConversionValue ) ) AS KeywordConversionValue',
		'		',
		'	FROM KeywordStatsGrouped',
		'	JOIN SearchQueriesGrouped',
		'		USING( ExternalCustomerId, CampaignId, AdGroupId, CriterionId )',
		'	GROUP BY',
		'		ExternalCustomerId, Query',
		'),',
		'CrossDeviceGrouped AS (',
		'	SELECT',
		'		ExternalCustomerId, CampaignId, AdGroupId, CriterionId,',
		'		',
		'		AVG( AveragePageViews ) AS AveragePageViews,',
		'		AVG( AverageTimeOnSite ) AS AverageTimeOnSite,',
		'		AVG( BounceRate ) AS BounceRate',
		'		',
		'	FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.KeywordCrossDeviceStats_' + TRANSFER_SERVICE_ACCOUNT_ID + '`',
		'	WHERE TRUE',
		'		AND ExternalCustomerId = ' + ACCOUNT_ID + '',
		'		AND DATE_DIFF( _LATEST_DATE, Date, DAY ) <= ' + DATE_RANGE_IN_DAYS + '',
		'	GROUP BY',
		'		ExternalCustomerId, CampaignId, AdGroupId, CriterionId',
		'),',
		'CrossDevice AS (',
		'	SELECT',
		'		ExternalCustomerId, Query,',
		'		',
		'		ROUND( AVG( AveragePageViews ) ) AS AveragePageViews,',
		'		ROUND( AVG( AverageTimeOnSite ) ) AS AverageTimeOnSite,',
		'		ROUND( AVG( BounceRate ) * 100 ) / 100 AS BounceRate',
		'		',
		'	FROM CrossDeviceGrouped',
		'	JOIN SearchQueriesGrouped',
		'		USING( ExternalCustomerId, CampaignId, AdGroupId, CriterionId )',
		'	GROUP BY',
		'		ExternalCustomerId, Query',
		'),',
		'NgramGrouped AS (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		Word,',
		'		',
		'		SUM( SqImpressions ) AS WordImpressions,',
		'		SUM( SqClicks ) AS WordClicks,',
		'		SUM( SqCost ) AS WordCost,',
		'		SUM( SqConversions ) AS WordConversions,',
		'		SUM( SqConversionValue ) AS WordConversionValue',
		'		',
		'	FROM sq,',
		'	UNNEST( SPLIT( QUERY, \' \' ) ) as Word',
		'	GROUP BY',
		'		ExternalCustomerId,',
		'		Word',
		'	HAVING TRUE',
		'),',
		'Ngram AS (',
		'	SELECT',
		'		sq.ExternalCustomerId, sq.Query,',
		'		',
		'		SUM( WordImpressions ) - SUM( SqImpressions ) AS NgramImpressions,',
		'		SUM( WordClicks ) - SUM( SqClicks ) AS NgramClicks,',
		'		ROUND( ( SUM( WordCost ) - SUM( SqCost ) ) / 1000000, 2 ) AS NgramCost,',
		'		ROUND( SUM( WordConversions ) - SUM( SqConversions ) ) AS NgramConversions,',
		'		ROUND( SUM( WordConversionValue ) - SUM( SqConversionValue ) ) AS NgramConversionValue',
		'		',
		'	FROM sq',
		'	JOIN NgramGrouped',
		'		ON sq.ExternalCustomerId = NgramGrouped.ExternalCustomerId',
		'		AND REGEXP_CONTAINS(',
		'			CONCAT( \' \', Query, \' \' ),',
		'			CONCAT( \' \', REGEXP_REPLACE( Word, \'["\\\\\\\\$\\\\\\\\*\\\\\\\\+\\\\\\\\?]\', \'\' ), \' \' )',
		'		)',
		'	GROUP BY',
		'		ExternalCustomerId, Query',
		'),',
		'CampaignNegativeGrouped AS (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		Text',
		'	FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.CampaignNegativeKeywords_' + TRANSFER_SERVICE_ACCOUNT_ID + '`',
		'		AS campaign_negative',
		'	WHERE TRUE',
		'		AND campaign_negative._LATEST_DATE = campaign_negative._DATA_DATE',
		'		AND campaign_negative.ExternalCustomerId = ' + ACCOUNT_ID + '',
		'	GROUP BY',
		'		ExternalCustomerId,',
		'		Text',
		'),',
		'CampaignNegative AS (',
		'	SELECT',
		'		sq.ExternalCustomerId, sq.Query,',
		'		',
		'		COUNT( Text ) AS CountCampaignNegative',
		'		',
		'	FROM sq',
		'	LEFT JOIN CampaignNegativeGrouped',
		'		ON sq.ExternalCustomerId = CampaignNegativeGrouped.ExternalCustomerId',
		'		AND REGEXP_CONTAINS(',
		'			CONCAT( \' \', Query, \' \' ),',
		'			CONCAT( \' \', REGEXP_REPLACE( Text, \'["\\\\\\\\$\\\\\\\\*\\\\\\\\+\\\\\\\\?]\', \'\' ), \' \' )',
		'		)',
		'	GROUP BY',
		'		sq.ExternalCustomerId, Query',
		'),',
		'BrandGrouped AS (',
		'	SELECT',
		'		' + ACCOUNT_ID + ' AS ExternalCustomerId,',
		'		' + DICTIONARY_COLUMNS[ 0 ] + '',
		'	FROM `' + PROJECT_ID + '.' + DATASET_ID + '.' + DICTIONARY_TABLE_NAME + '`',
		'	WHERE ' + DICTIONARY_COLUMNS[ 0 ] + ' IS NOT NULL',
		'	GROUP BY',
		'		ExternalCustomerId,',
		'		' + DICTIONARY_COLUMNS[ 0 ] + '',
		'),',
		'Brand AS (',
		'	SELECT',
		'		sq.ExternalCustomerId, sq.Query,',
		'		',
		'		COUNT( ' + DICTIONARY_COLUMNS[ 0 ] + ' ) AS Count' + DICTIONARY_COLUMNS[ 0 ] + '',
		'		',
		'	FROM sq',
		'	LEFT JOIN BrandGrouped',
		'		ON sq.ExternalCustomerId = BrandGrouped.ExternalCustomerId',
		'		AND REGEXP_CONTAINS(',
		'			CONCAT( \' \', Query, \' \' ),',
		'			CONCAT( \' \', REGEXP_REPLACE( ' + DICTIONARY_COLUMNS[ 0 ] + ', \'["\\\\\\\\$\\\\\\\\*\\\\\\\\+\\\\\\\\?]\', \'\' ), \' \' )',
		'		)',
		'	GROUP BY',
		'		ExternalCustomerId, Query',
		'),',
		'LocationGrouped AS (',
		'	SELECT',
		'		' + ACCOUNT_ID + ' AS ExternalCustomerId,',
		'		' + DICTIONARY_COLUMNS[ 1 ] + '',
		'	FROM `' + PROJECT_ID + '.' + DATASET_ID + '.' + DICTIONARY_TABLE_NAME + '`',
		'	WHERE ' + DICTIONARY_COLUMNS[ 1 ] + ' IS NOT NULL',
		'	GROUP BY',
		'		ExternalCustomerId,',
		'		' + DICTIONARY_COLUMNS[ 1 ] + '',
		'),',
		'Location AS (',
		'	SELECT',
		'		sq.ExternalCustomerId, sq.Query,',
		'		',
		'		COUNT( ' + DICTIONARY_COLUMNS[ 1 ] + ' ) AS Count' + DICTIONARY_COLUMNS[ 1 ] + '',
		'		',
		'	FROM sq',
		'	LEFT JOIN LocationGrouped',
		'		ON sq.ExternalCustomerId = LocationGrouped.ExternalCustomerId',
		'		AND REGEXP_CONTAINS(',
		'			CONCAT( \' \', Query, \' \' ),',
		'			CONCAT( \' \', REGEXP_REPLACE( ' + DICTIONARY_COLUMNS[ 1 ] + ', \'["\\\\\\\\$\\\\\\\\*\\\\\\\\+\\\\\\\\?]\', \'\' ), \' \' )',
		'		)',
		'	GROUP BY',
		'		ExternalCustomerId, Query',
		'),',
		'PropertyGrouped AS (',
		'	SELECT',
		'		' + ACCOUNT_ID + ' AS ExternalCustomerId,',
		'		' + DICTIONARY_COLUMNS[ 2 ] + '',
		'	FROM `' + PROJECT_ID + '.' + DATASET_ID + '.' + DICTIONARY_TABLE_NAME + '`',
		'	WHERE ' + DICTIONARY_COLUMNS[ 2 ] + ' IS NOT NULL',
		'	GROUP BY',
		'		ExternalCustomerId,',
		'		' + DICTIONARY_COLUMNS[ 2 ] + '',
		'),',
		'Property AS (',
		'	SELECT',
		'		sq.ExternalCustomerId, sq.Query,',
		'		',
		'		COUNT( ' + DICTIONARY_COLUMNS[ 2 ] + ' ) AS Count' + DICTIONARY_COLUMNS[ 2 ] + '',
		'		',
		'	FROM sq',
		'	LEFT JOIN PropertyGrouped',
		'		ON sq.ExternalCustomerId = PropertyGrouped.ExternalCustomerId',
		'		AND REGEXP_CONTAINS(',
		'			CONCAT( \' \', Query, \' \' ),',
		'			CONCAT( \' \', REGEXP_REPLACE( ' + DICTIONARY_COLUMNS[ 2 ] + ', \'["\\\\\\\\$\\\\\\\\*\\\\\\\\+\\\\\\\\?]\', \'\' ), \' \' )',
		'		)',
		'	GROUP BY',
		'		ExternalCustomerId, Query',
		'),',
		'adgroupNegativeGrouped AS (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		Criteria',
		'	FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Criteria_' + TRANSFER_SERVICE_ACCOUNT_ID + '`',
		'		AS negative',
		'	WHERE TRUE',
		'		AND negative.isNegative',
		'		AND negative._LATEST_DATE = negative._DATA_DATE',
		'		AND negative.ExternalCustomerId = ' + ACCOUNT_ID + '',
		'	GROUP BY',
		'		ExternalCustomerId,',
		'		Criteria',
		'),',
		'adgroupNegative AS (',
		'	SELECT',
		'		sq.ExternalCustomerId, sq.Query,',
		'		',
		'		COUNT( Criteria ) AS CountAdGroupNegative',
		'		',
		'	FROM sq',
		'	LEFT JOIN adgroupNegativeGrouped',
		'		ON sq.ExternalCustomerId = adgroupNegativeGrouped.ExternalCustomerId',
		'		AND REGEXP_CONTAINS(',
		'			CONCAT( \' \', Query, \' \' ),',
		'			CONCAT( \' \', REGEXP_REPLACE( Criteria, \'["\\\\\\\\$\\\\\\\\*\\\\\\\\+\\\\\\\\?]\', \'\' ), \' \' )',
		'		)',
		'	GROUP BY',
		'		ExternalCustomerId, Query',
		'),',
		'keyword AS (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		Query,',
		'		',
		'		ROUND( AVG( QualityScore ) * 10 ) / 10 AS QualityScore',
		'		',
		'	FROM SearchQueriesGrouped',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Keyword_' + TRANSFER_SERVICE_ACCOUNT_ID + '`',
		'		USING( ExternalCustomerId, CampaignId, AdGroupId, CriterionId )',
		'	WHERE TRUE',
		'		AND ExternalCustomerId = ' + ACCOUNT_ID + '',
		'		AND _LATEST_DATE = _DATA_DATE',
		'		AND Status IN ( \'ENABLED\', \'PAUSED\' )',
		'	GROUP BY',
		'		ExternalCustomerId,',
		'		Query',
		'),',
		'adGroup AS (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		Query',
		'		',
		'	FROM SearchQueriesGrouped',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.AdGroup_' + TRANSFER_SERVICE_ACCOUNT_ID + '`',
		'		USING( ExternalCustomerId, CampaignId, AdGroupId )',
		'	WHERE TRUE',
		'		AND ExternalCustomerId = ' + ACCOUNT_ID + '',
		'		AND _LATEST_DATE = _DATA_DATE',
		'		AND AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	GROUP BY',
		'		ExternalCustomerId,',
		'		Query',
		'),',
		'campaign AS (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		Query',
		'	FROM SearchQueriesGrouped',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Campaign_' + TRANSFER_SERVICE_ACCOUNT_ID + '`',
		'		USING( ExternalCustomerId, CampaignId )',
		'	--,UNNEST( SPLIT( REGEXP_REPLACE( Labels, \'["\\\\\\\\[\\\\\\\\]]\', \'\' ), \',\' ) ) as Label',
		'	WHERE TRUE',
		'		AND ExternalCustomerId = ' + ACCOUNT_ID + '',
		'		AND _LATEST_DATE = _DATA_DATE',
		'		AND CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'	GROUP BY',
		'		ExternalCustomerId,',
		'		Query',
		')',
		'SELECT',
		'	*,',
		'	ROUND( ( SqConversions * ' + CPO + ' - SqCost ) / GREATEST( SqClicks, 1 ) * 100 )',
		'		/ 100 AS QueryProfitPerClick,',
		'	ROUND( ( NgramConversions * ' + CPO + ' - NgramCost ) / GREATEST( NgramClicks, 1 ) * 100 )',
		'		/ 100 AS NgramProfitPerClick,',
		'	ROUND( ( KeywordConversions * ' + CPO + ' - KeywordCost ) / GREATEST( KeywordClicks, 1 ) * 100 )',
		'		/ 100 AS KeywordProfitPerClick,',
		'	ROUND( KeywordCost / KeywordClicks * 100 ) / 100 AS KeywordAvgCpc',
		'FROM sq',
		'JOIN campaign',
		'	USING( ExternalCustomerId, Query )',
		'JOIN adGroup',
		'	USING( ExternalCustomerId, Query )',
		'JOIN keyword',
		'	USING( ExternalCustomerId, Query )',
		'LEFT JOIN CampaignNegative',
		'	USING( ExternalCustomerId, Query )',
		'LEFT JOIN adgroupNegative',
		'	USING( ExternalCustomerId, Query )',
		'LEFT JOIN Ngram',
		'	USING( ExternalCustomerId, Query )',
		'LEFT JOIN CrossDevice',
		'	USING( ExternalCustomerId, Query )',
		'LEFT JOIN KeywordStats',
		'	USING( ExternalCustomerId, Query )',
		'LEFT JOIN Brand',
		'	USING( ExternalCustomerId, Query )',
		'LEFT JOIN Location',
		'	USING( ExternalCustomerId, Query )',
		'LEFT JOIN Property',
		'	USING( ExternalCustomerId, Query )',
		'WHERE TRUE',
		'ORDER BY',
		'	ExternalCustomerId,',
		'	Query',
	].join( '\n' )
;

// ++++++++++++++++++++++++++
// ++++++++++++++++++++++++++
// ++++++++++++++++++++++++++
// ++++++++++++++++++++++++++
// ++++++++++++++++++++++++++
// ++++++++++++++++++++++++++
// ++++++++++++++++++++++++++

var dataStudioQueries = {
	
	MISROUTING_QUERIES : [
		'WITH',
		'sq AS (',
		'	SELECT',
		'		IFNULL( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,',
		'		Campaign.CampaignName,',
		'		AdGroup.AdGroupName,',
		'		sq.Query,',
		'		sq.QueryMatchTypeWithVariant,',
		'		sq.Date,',
		'		SUM( Impressions ) AS Impressions,',
		'		SUM( Clicks ) AS Clicks,',
		'		SUM( Cost ) / 1000000 AS Cost,',
		'		ROUND( SUM( Conversions ) ) AS Conversions,',
		'		ROUND( SUM( ConversionValue ) ) AS ConversionValue',
		'	FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.SearchQueryStats_' + TRANSFER_SERVICE_ACCOUNT_ID + '` sq',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Customer_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Customer',
		'		USING ( ExternalCustomerId )',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Campaign_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Campaign',
		'		USING ( ExternalCustomerId, CampaignId )',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.AdGroup_' + TRANSFER_SERVICE_ACCOUNT_ID + '` AdGroup',
		'		USING ( ExternalCustomerId, CampaignId, AdGroupId )',
		'	WHERE TRUE',
		'		AND sq.ExternalCustomerId = ' + ACCOUNT_ID + '',
		'		AND Customer._DATA_DATE = Customer._LATEST_DATE',
		'		AND Campaign._DATA_DATE = Campaign._LATEST_DATE',
		'		AND AdGroup._DATA_DATE = AdGroup._LATEST_DATE',
		'		AND DATE_DIFF( sq._LATEST_DATE, sq.Date, DAY ) <= 30',
		'		AND Campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND AdGroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND sq.QueryMatchTypeWithVariant IN ( \'PHRASE\', \'NEAR_PHRASE\', \'EXPANDED\', \'BROAD\', \'AUTO\') --\'EXACT\', \'NEAR_EXACT\' )',
		'	GROUP BY',
		'		AccountName,',
		'		CampaignName,',
		'		AdGroupName,',
		'		Query,',
		'		QueryMatchTypeWithVariant,',
		'		Date',
		'),',
		'',
		'',
		'',
		'AdgroupStats AS (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		CampaignId,',
		'		AdGroupId,',
		'		SUM( Impressions ) AS Impressions,',
		'		SUM( Clicks ) AS Clicks,',
		'		SUM( Cost ) / 1000000 AS Cost,',
		'		ROUND( SUM( Conversions ) ) AS Conversions,',
		'		ROUND( SUM( ConversionValue ) ) AS ConversionValue',
		'	FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.AdGroupStats_' + TRANSFER_SERVICE_ACCOUNT_ID + '`',
		'	WHERE TRUE',
		'		AND ExternalCustomerId = ' + ACCOUNT_ID + '',
		'		AND DATE_DIFF( _LATEST_DATE, Date, DAY ) <= 30',
		'	GROUP BY',
		'		ExternalCustomerId,',
		'		CampaignId,',
		'		AdGroupId',
		'),',
		'',
		'',
		'',
		'keyword AS (',
		'	SELECT',
		'		Keyword.ExternalCustomerId,',
		'		Keyword.Campaignid,',
		'		Keyword.AdGroupid,',
		'		IFNULL( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,',
		'		Campaign.CampaignName,',
		'		AdGroup.AdGroupName,',
		'		Keyword.Criteria',
		'	FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Keyword_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Keyword',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Customer_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Customer',
		'		USING ( ExternalCustomerId )',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Campaign_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Campaign',
		'		USING ( ExternalCustomerId, CampaignId )',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.AdGroup_' + TRANSFER_SERVICE_ACCOUNT_ID + '` AdGroup',
		'		USING ( ExternalCustomerId, CampaignId, AdGroupId )',
		'	WHERE TRUE',
		'		AND Customer._DATA_DATE = Customer._LATEST_DATE',
		'		AND Campaign._DATA_DATE = Campaign._LATEST_DATE',
		'		AND AdGroup._DATA_DATE = AdGroup._LATEST_DATE',
		'		AND Keyword._DATA_DATE = Keyword._LATEST_DATE',
		'		AND Campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND AdGroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND Keyword.Status IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND Keyword.ExternalCustomerId = ' + ACCOUNT_ID + '',
		'		AND Keyword.KeywordMatchType = \'EXACT\'',
		'		AND NOT Keyword.IsNegative',
		'	GROUP BY',
		'		Keyword.ExternalCustomerId,',
		'		Keyword.Campaignid,',
		'		Keyword.AdGroupid,',
		'		AccountName,',
		'		Campaign.CampaignName,',
		'		AdGroup.AdGroupName,',
		'		Keyword.Criteria',
		'),',
		'',
		'sqAndKeyword AS (',
		'	SELECT',
		'		keyword.ExternalCustomerId,',
		'		keyword.Campaignid,',
		'		keyword.AdGroupid,',
		'		sq.AccountName,',
		'		sq.CampaignName,',
		'		sq.AdGroupName,',
		'		sq.Query,',
		'		sq.QueryMatchTypeWithVariant,',
		'		sq.Date,',
		'		keyword.CampaignName AS KeywordCampaignName,',
		'		keyword.AdGroupName AS KeywordAdGroupName,',
		'		',
		'		sq.Impressions AS Impressions,',
		'		sq.Clicks AS Clicks,',
		'		sq.Cost AS Cost,',
		'		ROUND( sq.Conversions ) AS Conversions,',
		'		ROUND( sq.ConversionValue ) AS ConversionValue,',
		'		RANK() OVER (',
		'			PARTITION BY',
		'				sq.AccountName,',
		'				sq.CampaignName,',
		'				sq.AdGroupName,',
		'				sq.Query,',
		'				sq.QueryMatchTypeWithVariant,',
		'				sq.Date',
		'			ORDER BY',
		'				AdGroupStats.Impressions ',
		'				+ AdGroupStats.Clicks * 1000 ',
		'				+ CAST ( sq.CampaignName = keyword.CampaignName AS INT64 ) * 10000',
		'				+ CAST ( sq.CampaignName = keyword.CampaignName AND sq.AdGroupName = keyword.AdGroupName AS INT64 ) * 1000000',
		'				DESC',
		'		) AS rank',
		'	FROM sq',
		'	JOIN keyword',
		'		ON sq.AccountName = keyword.AccountName',
		'		AND Query = LOWER( Criteria )',
		'	JOIN AdgroupStats',
		'		USING( ExternalCustomerId, CampaignId, AdGroupId )',
		'),',
		'',
		'proposed AS (',
		'	SELECT',
		'		AccountName,',
		'		CampaignName,',
		'		AdGroupName,',
		'		Query,',
		'		QueryMatchTypeWithVariant,',
		'		Date,',
		'		KeywordCampaignName AS ProposedKeywordCampaignName,',
		'		KeywordAdGroupName AS ProposedKeywordAdGroupName,',
		'		',
		'		Impressions AS Impressions,',
		'		Clicks AS Clicks,',
		'		Cost AS Cost,',
		'		ROUND( Conversions ) AS Conversions,',
		'		ROUND( ConversionValue ) AS ConversionValue',
		'	FROM',
		'		sqAndKeyword',
		'	WHERE TRUE',
		'		AND rank = 1',
		'),',
		'',
		'sqKeywordAggr AS (',
		'	SELECT',
		'		AccountName,',
		'		CampaignName,',
		'		AdGroupName,',
		'		Query,',
		'		QueryMatchTypeWithVariant,',
		'		Date,',
		'		STRING_AGG( CONCAT( KeywordCampaignName, \' > \', KeywordAdGroupName ), \', \' ) AS KeywordAdGroups,',
		'		Count(*) AS CountExactKeywords',
		'	FROM',
		'		sqAndKeyword',
		'	WHERE TRUE',
		'	GROUP BY',
		'		AccountName,',
		'		CampaignName,',
		'		AdGroupName,',
		'		Query,',
		'		QueryMatchTypeWithVariant,',
		'		Date',
		')',
		'',
		'',
		'SELECT',
		'	AccountName,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Query,',
		'	QueryMatchTypeWithVariant,',
		'	Date,',
		'	KeywordAdGroups,',
		'	CountExactKeywords,',
		'	ProposedKeywordCampaignName,',
		'	ProposedKeywordAdGroupName,',
		'',
		'	Impressions,',
		'	Clicks,',
		'	Cost,',
		'	Conversions,',
		'	ConversionValue',
		'FROM',
		'	proposed',
		'JOIN sqKeywordAggr',
		'	USING( ',
		'		AccountName,',
		'		CampaignName,',
		'		AdGroupName,',
		'		Query,',
		'		QueryMatchTypeWithVariant,',
		'		Date',
		'	)',
		'WHERE TRUE',
	].join( '\n' )
	,

	MISSING_DSA_KEYWORDS : [
		'SELECT',
		'	AccountName,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Query,',
		'	QueryMatchTypeWithVariant,',
		'  sq.Criteria,',
		'	Date,',
		'	SUM( Impressions ) AS Impressions,',
		'	SUM( Clicks ) AS Clicks,',
		'	SUM( Cost ) / 1000000 AS Cost,',
		'	ROUND( SUM( Conversions ) ) AS Conversions,',
		'	ROUND( SUM( ConversionValue ) ) AS ConversionValue',
		'FROM (',
		'	SELECT',
		'		IFNULL( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,',
		'		Campaign.CampaignName,',
		'		AdGroup.AdGroupName,',
		'		sq.Query,',
		'		sq.QueryMatchTypeWithVariant,',
		'		keyword.Criteria,',
		'		sq.Date,',
		'		SUM( Impressions ) AS Impressions,',
		'		SUM( Clicks ) AS Clicks,',
		'		SUM( Cost ) AS Cost,',
		'		ROUND( SUM( Conversions ) ) AS Conversions,',
		'		ROUND( SUM( ConversionValue ) ) AS ConversionValue',
		'	FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.SearchQueryStats_' + TRANSFER_SERVICE_ACCOUNT_ID + '` sq',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Customer_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Customer',
		'		USING ( ExternalCustomerId )',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Campaign_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Campaign',
		'		USING ( ExternalCustomerId, CampaignId )',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.AdGroup_' + TRANSFER_SERVICE_ACCOUNT_ID + '` AdGroup',
		'		USING ( ExternalCustomerId, CampaignId, AdGroupId )',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Keyword_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Keyword',
		'		USING ( ExternalCustomerId, CampaignId, AdGroupId, CriterionId )',
		'	WHERE true',
		'		AND sq.ExternalCustomerId = ' + ACCOUNT_ID + '',
		'		AND Customer._DATA_DATE = Customer._LATEST_DATE',
		'		AND Campaign._DATA_DATE = Campaign._LATEST_DATE',
		'		AND AdGroup._DATA_DATE = AdGroup._LATEST_DATE',
		'		AND Keyword._DATA_DATE = Keyword._LATEST_DATE',
		'		AND DATE_DIFF( sq._LATEST_DATE, sq.Date, DAY ) <= 30',
		'		AND Campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND AdGroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND sq.QueryMatchTypeWithVariant NOT IN ( \'EXACT\', \'NEAR_EXACT\' )',
		'		AND AdGroup.AdGroupType = \'SEARCH_DYNAMIC_ADS\'',
		'	GROUP BY',
		'		AccountName,',
		'		CampaignName,',
		'		AdGroupName,',
		'		Query,',
		'		QueryMatchTypeWithVariant,',
		'    Criteria,',
		'		Date',
		') AS sq',
		'LEFT JOIN (',
		'	SELECT',
		'		Keyword.Criteria',
		'	FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Keyword_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Keyword',
		'	WHERE true',
		'		AND Keyword.ExternalCustomerId = ' + ACCOUNT_ID + '',
		'		AND Keyword._DATA_DATE = Keyword._LATEST_DATE',
		'		AND Keyword.Status IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND Keyword.KeywordMatchType = \'EXACT\'',
		'		AND NOT Keyword.IsNegative',
		'	GROUP BY',
		'		Criteria',
		') AS keyword',
		'	ON sq.Query = LOWER( keyword.Criteria )',
		'WHERE TRUE',
		'	AND keyword.Criteria IS NULL',
		'GROUP BY',
		'	AccountName,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Query,',
		'	QueryMatchTypeWithVariant,',
		'  sq.Criteria,',
		'	Date',
		'ORDER BY',
		'	Clicks DESC',
	].join( '\n' )
	,

	SHOPPING_MISSING_KEYWORDS : [
		'SELECT',
		'	AccountName,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Query,',
		'	QueryMatchTypeWithVariant,',
		'  sq.Criteria,',
		'	Date,',
		'	SUM( Impressions ) AS Impressions,',
		'	SUM( Clicks ) AS Clicks,',
		'	SUM( Cost ) / 1000000 AS Cost,',
		'	ROUND( SUM( Conversions ) ) AS Conversions,',
		'	ROUND( SUM( ConversionValue ) ) AS ConversionValue',
		'FROM (',
		'	SELECT',
		'		IFNULL( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,',
		'		Campaign.CampaignName,',
		'		AdGroup.AdGroupName,',
		'		sq.Query,',
		'		sq.QueryMatchTypeWithVariant,',
		'		keyword.Criteria,',
		'		sq.Date,',
		'		SUM( Impressions ) AS Impressions,',
		'		SUM( Clicks ) AS Clicks,',
		'		SUM( Cost ) AS Cost,',
		'		ROUND( SUM( Conversions ) ) AS Conversions,',
		'		ROUND( SUM( ConversionValue ) ) AS ConversionValue',
		'	FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.SearchQueryStats_' + TRANSFER_SERVICE_ACCOUNT_ID + '` sq',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Customer_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Customer',
		'		USING ( ExternalCustomerId )',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Campaign_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Campaign',
		'		USING ( ExternalCustomerId, CampaignId )',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.AdGroup_' + TRANSFER_SERVICE_ACCOUNT_ID + '` AdGroup',
		'		USING ( ExternalCustomerId, CampaignId, AdGroupId )',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Keyword_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Keyword',
		'		USING ( ExternalCustomerId, CampaignId, AdGroupId, CriterionId )',
		'	WHERE true',
		'		AND sq.ExternalCustomerId = ' + ACCOUNT_ID + '',
		'		AND Customer._DATA_DATE = Customer._LATEST_DATE',
		'		AND Campaign._DATA_DATE = Campaign._LATEST_DATE',
		'		AND AdGroup._DATA_DATE = AdGroup._LATEST_DATE',
		'		AND Keyword._DATA_DATE = Keyword._LATEST_DATE',
		'		AND DATE_DIFF( sq._LATEST_DATE, sq.Date, DAY ) <= 30',
		'		AND Campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND AdGroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND sq.QueryMatchTypeWithVariant NOT IN ( \'EXACT\', \'NEAR_EXACT\' )',
		'		AND Campaign.AdvertisingChannelType = \'SHOPPING\'',
		'	GROUP BY',
		'		AccountName,',
		'		CampaignName,',
		'		AdGroupName,',
		'		Query,',
		'		QueryMatchTypeWithVariant,',
		'    Criteria,',
		'		Date',
		') AS sq',
		'LEFT JOIN (',
		'	SELECT',
		'		Keyword.Criteria',
		'	FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Keyword_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Keyword',
		'	WHERE true',
		'		AND Keyword.ExternalCustomerId = ' + ACCOUNT_ID + '',
		'		AND Keyword._DATA_DATE = Keyword._LATEST_DATE',
		'		AND Keyword.Status IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND Keyword.KeywordMatchType = \'EXACT\'',
		'		AND NOT Keyword.IsNegative',
		'	GROUP BY',
		'		Criteria',
		') AS keyword',
		'	ON sq.Query = LOWER( keyword.Criteria )',
		'WHERE TRUE',
		'	AND keyword.Criteria IS NULL',
		'GROUP BY',
		'	AccountName,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Query,',
		'	QueryMatchTypeWithVariant,',
		'  sq.Criteria,',
		'	Date',
		'ORDER BY',
		'	Clicks DESC',
	].join( '\n' )
	,

	MISSING_KEYWORDS : [
		'SELECT',
		'	AccountName,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Query,',
		'	QueryMatchTypeWithVariant,',
		'	sq.Criteria,',
		'	Date,',
		'	SUM( Impressions ) AS Impressions,',
		'	SUM( Clicks ) AS Clicks,',
		'	SUM( Cost ) / 1000000 AS Cost,',
		'	ROUND( SUM( Conversions ) ) AS Conversions,',
		'	ROUND( SUM( ConversionValue ) ) AS ConversionValue',
		'FROM (',
		'	SELECT',
		'		IFNULL( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,',
		'		Campaign.CampaignName,',
		'		AdGroup.AdGroupName,',
		'		sq.Query,',
		'		sq.QueryMatchTypeWithVariant,',
		'		Keyword.Criteria,',
		'		sq.Date,',
		'		SUM( Impressions ) AS Impressions,',
		'		SUM( Clicks ) AS Clicks,',
		'		SUM( Cost ) AS Cost,',
		'		ROUND( SUM( Conversions ) ) AS Conversions,',
		'		ROUND( SUM( ConversionValue ) ) AS ConversionValue',
		'	FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.SearchQueryStats_' + TRANSFER_SERVICE_ACCOUNT_ID + '` sq',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Customer_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Customer',
		'		USING ( ExternalCustomerId )',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Campaign_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Campaign',
		'		USING ( ExternalCustomerId, CampaignId )',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.AdGroup_' + TRANSFER_SERVICE_ACCOUNT_ID + '` AdGroup',
		'		USING ( ExternalCustomerId, CampaignId, AdGroupId )',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Keyword_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Keyword',
		'		USING ( ExternalCustomerId, CampaignId, AdGroupId, CriterionId )',
		'	WHERE true',
		'		AND sq.ExternalCustomerId = ' + ACCOUNT_ID + '',
		'		AND Customer._DATA_DATE = Customer._LATEST_DATE',
		'		AND Campaign._DATA_DATE = Campaign._LATEST_DATE',
		'		AND AdGroup._DATA_DATE = AdGroup._LATEST_DATE',
		'		AND Keyword._DATA_DATE = Keyword._LATEST_DATE',
		'		AND DATE_DIFF( sq._LATEST_DATE, sq.Date, DAY ) <= 30',
		'		AND Campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND AdGroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND sq.QueryMatchTypeWithVariant NOT IN ( \'EXACT\', \'NEAR_EXACT\' )',
		'	GROUP BY',
		'		AccountName,',
		'		CampaignName,',
		'		AdGroupName,',
		'		Query,',
		'		QueryMatchTypeWithVariant,',
		'		Criteria,',
		'		Date',
		') AS sq',
		'LEFT JOIN (',
		'	SELECT',
		'		Keyword.Criteria',
		'	FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Keyword_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Keyword',
		'	WHERE true',
		'		AND Keyword.ExternalCustomerId = ' + ACCOUNT_ID + '',
		'		AND Keyword._DATA_DATE = Keyword._LATEST_DATE',
		'		AND Keyword.Status IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND Keyword.KeywordMatchType = \'EXACT\'',
		'		AND NOT Keyword.IsNegative',
		'	GROUP BY',
		'		Criteria',
		') AS keyword',
		'	ON sq.Query = LOWER( keyword.Criteria )',
		'WHERE TRUE',
		'	AND keyword.Criteria IS NULL',
		'GROUP BY',
		'	AccountName,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Query,',
		'	QueryMatchTypeWithVariant,',
		'	sq.Criteria,',
		'	Date',
		'ORDER BY',
		'	Clicks DESC',
	].join( '\n' )
	,

	PAUSED_KEYWORDS : [
		'SELECT',
		'	sq.AccountName,',
		'	sq.CampaignName,',
		'	sq.AdGroupName,',
		'	sq.Query,',
		'	sq.QueryMatchTypeWithVariant,',
		'	sq.Date,',
		'	keyword.CampaignName AS KeywordCampaignName,',
		'	keyword.AdGroupName AS KeywordAdGroupname,',
		'	SUM( Impressions ) AS Impressions,',
		'	SUM( Clicks ) AS Clicks,',
		'	SUM( Cost ) / 1000000 AS Cost,',
		'	ROUND( SUM( Conversions ) ) AS Conversions,',
		'	ROUND( SUM( ConversionValue ) ) AS ConversionValue',
		'FROM (',
		'	SELECT',
		'		IFNULL( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,',
		'		Campaign.CampaignName,',
		'		AdGroup.AdGroupName,',
		'		sq.Query,',
		'		sq.QueryMatchTypeWithVariant,',
		'		sq.Date,',
		'		SUM( Impressions ) AS Impressions,',
		'		SUM( Clicks ) AS Clicks,',
		'		SUM( Cost ) AS Cost,',
		'		ROUND( SUM( Conversions ) ) AS Conversions,',
		'		ROUND( SUM( ConversionValue ) ) AS ConversionValue',
		'	FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.SearchQueryStats_' + TRANSFER_SERVICE_ACCOUNT_ID + '` sq',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Customer_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Customer',
		'		USING ( ExternalCustomerId )',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Campaign_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Campaign',
		'		USING ( ExternalCustomerId, CampaignId )',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.AdGroup_' + TRANSFER_SERVICE_ACCOUNT_ID + '` AdGroup',
		'		USING ( ExternalCustomerId, CampaignId, AdGroupId )',
		'	WHERE TRUE',
		'		AND sq.ExternalCustomerId = ' + ACCOUNT_ID + '',
		'		AND Customer._DATA_DATE = Customer._LATEST_DATE',
		'		AND Campaign._DATA_DATE = Campaign._LATEST_DATE',
		'		AND AdGroup._DATA_DATE = AdGroup._LATEST_DATE',
		'		AND DATE_DIFF( sq._LATEST_DATE, sq.Date, DAY ) <= 30',
		'		AND Campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND AdGroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND sq.QueryMatchTypeWithVariant IN ( \'PHRASE\', \'NEAR_PHRASE\', \'EXPANDED\', \'BROAD\', \'AUTO\') --\'EXACT\', \'NEAR_EXACT\' )',
		'	GROUP BY',
		'		AccountName,',
		'		CampaignName,',
		'		AdGroupName,',
		'		Query,',
		'		QueryMatchTypeWithVariant,',
		'		Date',
		') AS sq',
		'JOIN ( -- keyword',
		'	SELECT',
		'		IFNULL( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,',
		'		Campaign.CampaignName,',
		'		AdGroup.AdGroupName,',
		'		Keyword.Criteria',
		'	FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Keyword_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Keyword',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Customer_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Customer',
		'		USING ( ExternalCustomerId )',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Campaign_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Campaign',
		'		USING ( ExternalCustomerId, CampaignId )',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.AdGroup_' + TRANSFER_SERVICE_ACCOUNT_ID + '` AdGroup',
		'		USING ( ExternalCustomerId, CampaignId, AdGroupId )',
		'	WHERE TRUE',
		'		AND Customer._DATA_DATE = Customer._LATEST_DATE',
		'		AND Campaign._DATA_DATE = Campaign._LATEST_DATE',
		'		AND AdGroup._DATA_DATE = AdGroup._LATEST_DATE',
		'		AND Keyword._DATA_DATE = Keyword._LATEST_DATE',
		'		AND',
		'			(',
		'				Campaign.CampaignStatus IN ( \'PAUSED\' )',
		'				OR AdGroup.AdGroupStatus IN ( \'PAUSED\' )',
		'				OR Keyword.Status IN ( \'PAUSED\' )',
		'			)',
		'		AND Campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND AdGroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND Keyword.Status IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND Keyword.ExternalCustomerId = ' + ACCOUNT_ID + '',
		'		AND Keyword.KeywordMatchType = \'EXACT\'',
		'		AND NOT Keyword.IsNegative',
		'	GROUP BY',
		'		AccountName,',
		'		Campaign.CampaignName,',
		'		AdGroup.AdGroupName,',
		'		Criteria',
		') AS keyword',
		'	ON sq.AccountName = keyword.AccountName',
		'	AND Query = LOWER( Criteria )',
		'LEFT JOIN ( -- keyword2',
		'	SELECT',
		'		IFNULL( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,',
		'		Campaign.CampaignName,',
		'		AdGroup.AdGroupName,',
		'		Keyword.Criteria',
		'	FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Keyword_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Keyword',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Customer_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Customer',
		'		USING ( ExternalCustomerId )',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Campaign_' + TRANSFER_SERVICE_ACCOUNT_ID + '` Campaign',
		'		USING ( ExternalCustomerId, CampaignId )',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.AdGroup_' + TRANSFER_SERVICE_ACCOUNT_ID + '` AdGroup',
		'		USING ( ExternalCustomerId, CampaignId, AdGroupId )',
		'	WHERE TRUE',
		'		AND Customer._DATA_DATE = Customer._LATEST_DATE',
		'		AND Campaign._DATA_DATE = Campaign._LATEST_DATE',
		'		AND AdGroup._DATA_DATE = AdGroup._LATEST_DATE',
		'		AND Keyword._DATA_DATE = Keyword._LATEST_DATE',
		'		AND Campaign.CampaignStatus IN ( \'ENABLED\' )',
		'		AND AdGroup.AdGroupStatus IN ( \'ENABLED\' )',
		'		AND Keyword.Status IN ( \'ENABLED\' )',
		'		AND Keyword.ExternalCustomerId = ' + ACCOUNT_ID + '',
		'		AND Keyword.KeywordMatchType = \'EXACT\'',
		'		AND NOT Keyword.IsNegative',
		'	GROUP BY',
		'		AccountName,',
		'		Campaign.CampaignName,',
		'		AdGroup.AdGroupName,',
		'		Criteria',
		') AS keyword2',
		'	ON sq.AccountName = keyword2.AccountName',
		'	AND sq.Query = LOWER( keyword2.Criteria )',
		'WHERE TRUE',
		'	AND keyword2.Criteria IS NULL',
		'GROUP BY',
		'	AccountName,',
		'	CampaignName,',
		'	AdGroupName,',
		'	Query,',
		'	QueryMatchTypeWithVariant,',
		'	Date,',
		'	KeywordCampaignName,',
		'	KeywordAdGroupName',
		'ORDER BY',
		'	Clicks DESC',
	].join( '\n' )
	,

	NGRAM : [
		'WITH ngram AS (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		1 AS arity,',
		'		Word1 AS Word,',
		'		ROUND( SUM( Conversions ) ) AS Conversions,',
		'		SUM( Clicks ) AS Clicks,',
		'		SUM( Cost ) / 1000000 AS Cost,',
		'		ROUND( SUM( ConversionValue ) ) AS ConversionValue,',
		'		COUNT(*) as Count,',
		'		Date,',
		'		ROUND( AVG( QueryLength ) * 10 ) / 10 AS AvgQueryLength,',
		'		ROUND( AVG( CountWords ) * 10 ) / 10 AS AvgCountWords',
		'	FROM (',
		'		SELECT',
		'			ExternalCustomerId,',
		'			Query,',
		'			SUM( Conversions ) AS Conversions,',
		'			SUM( Clicks ) AS Clicks,',
		'			SUM( Cost ) AS Cost,',
		'			SUM( ConversionValue) AS ConversionValue,',
		'			SPLIT( Query, \' \' ) as Word,',
		'			Date,',
		'			LENGTH( Query ) AS QueryLength,',
		'			ARRAY_LENGTH( SPLIT( Query, \' \' ) ) AS CountWords',
		'		FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.SearchQueryStats_' + TRANSFER_SERVICE_ACCOUNT_ID + '` AS sq',
		'		WHERE TRUE',
		'			AND sq.ExternalCustomerId = ' + ACCOUNT_ID + '',
		'			AND DATE_DIFF( sq._LATEST_DATE, sq._DATA_DATE, DAY ) <= ' + DATE_RANGE_IN_DAYS,
		'		GROUP BY',
		'			ExternalCustomerId,',
		'			Query,',
		'			Date',
		'		ORDER BY',
		'			ExternalCustomerId,',
		'			Query,',
		'			Date',
		'		--LIMIT 100',
		'	) as x,',
		'	UNNEST( Word ) as Word1',
		'	GROUP BY',
		'		ExternalCustomerId,',
		'		Word1,',
		'		Date',
		'	HAVING TRUE',
		'		AND LENGTH( Word1 ) > 2',
		'		AND Count > 1',
		')',
		'',
		'SELECT * FROM ngram',
	].join( '\n' )
	,

	RAW_DATA : [
		'WITH',
		'analytics AS (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		CampaignId,',
		'		AdGroupId,',
		'		CriterionId,',
		'		ROUND( AVG( AveragePageViews ) ) AS AveragePageViews,',
		'		ROUND( AVG( AverageTimeOnSite ) ) AS AverageTimeOnSite,',
		'		ROUND( AVG( BounceRate ) * 100 ) / 100 AS BounceRate,',
		'		Date',
		'	FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.KeywordCrossDeviceStats_' + TRANSFER_SERVICE_ACCOUNT_ID + '`',
		'	WHERE TRUE',
		'		AND ExternalCustomerId = ' + ACCOUNT_ID + '',
		'		AND DATE_DIFF( _LATEST_DATE, Date, DAY ) <= ' + DATE_RANGE_IN_DAYS,
		'	GROUP BY',
		'		ExternalCustomerId,',
		'		CampaignId,',
		'		AdGroupId,',
		'		CriterionId,',
		'		Date',
		'),',
		'',
		'',
		'',
		'keyword AS (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		CampaignId,',
		'		AdGroupId,',
		'		CriterionId,',
		'		ROUND( SUM( Conversions ) ) AS Conversions,',
		'		SUM( Clicks ) AS Clicks,',
		'		SUM( Cost ) / 1000000 AS Cost,',
		'		ROUND( SUM( ConversionValue ) ) AS ConversionValue,',
		'		Date,',
		'		AdNetworkType1,',
		'		Device',
		'	FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.KeywordBasicStats_' + TRANSFER_SERVICE_ACCOUNT_ID + '`',
		'	WHERE TRUE',
		'		AND ExternalCustomerId = ' + ACCOUNT_ID + '',
		'		AND DATE_DIFF( _LATEST_DATE, Date, DAY ) <= '+ DATE_RANGE_IN_DAYS,
		'	GROUP BY',
		'		ExternalCustomerId,',
		'		CampaignId,',
		'		AdGroupId,',
		'		CriterionId,',
		'		Date,',
		'		AdNetworkType1,',
		'		Device',
		'),',
		'',
		'ngram AS (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		Word1 AS Word,',
		'		ROUND( SUM( Conversions ) ) AS Conversions,',
		'		SUM( Clicks ) AS Clicks,',
		'		SUM( Cost ) / 1000000 AS Cost,',
		'		ROUND( SUM( ConversionValue ) ) AS ConversionValue,',
		'		COUNT(*) as Count,',
		'		Date',
		'	FROM (',
		'		SELECT',
		'			ExternalCustomerId,',
		'			Query,',
		'			SUM( Conversions ) AS Conversions,',
		'			SUM( Clicks ) AS Clicks,',
		'			SUM( Cost ) AS Cost,',
		'			SUM( ConversionValue) AS ConversionValue,',
		'			SPLIT( Query, \' \' ) as Word,',
		'			Date',
		'		FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.SearchQueryStats_' + TRANSFER_SERVICE_ACCOUNT_ID + '` AS sq',
		'		WHERE TRUE',
		'			AND sq.ExternalCustomerId = ' + ACCOUNT_ID + '',
		'			AND DATE_DIFF( sq._LATEST_DATE, sq._DATA_DATE, DAY ) <= ' + DATE_RANGE_IN_DAYS,
		'		GROUP BY',
		'			ExternalCustomerId,',
		'			Query,',
		'			Date',
		'	) as x,',
		'	UNNEST( Word ) as Word1',
		'	GROUP BY',
		'		ExternalCustomerId,',
		'		Word1,',
		'		Date',
		'	HAVING',
		'		Count >= 10',
		'		AND LENGTH( Word ) > 2',
		'),',
		'',
		'sq AS (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		CampaignId,',
		'		AdGroupId,',
		'		CriterionId,',
		'		Query,',
		'		AdNetworkType1, -- attribute ( SEARCH / CONTENT / YOUTUBE_SEARCH / .. )',
		'		--AdFormat, -- segment ( text / image / ... )',
		'		Device, -- segment ( desktop / tablet / connected_tv / .. )',
		'		QueryMatchTypeWithVariant,',
		'			-- segment ( auto / broad / exact / expanded / phrase / near_exact / near_phrase',
		'		QueryTargetingStatus, -- attribute ( added / excluded / both / none )',
		'		ROUND( SUM( sq.Conversions ) ) AS Conversions,',
		'		SUM( sq.Clicks ) AS Clicks,',
		'		SUM( sq.Cost ) / 1000000 AS Cost,',
		'		ROUND( SUM( sq.ConversionValue ) ) AS ConversionValue,',
		'		Date',
		'	FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.SearchQueryStats_' + TRANSFER_SERVICE_ACCOUNT_ID + '` AS sq',
		'	WHERE',
		'		TRUE',
		'		--AND LENGTH( Query ) < 80',
		'		AND sq.ExternalCustomerId = ' + ACCOUNT_ID + '',
		'		AND DATE_DIFF( sq._LATEST_DATE, sq.Date, DAY ) <= ' + DATE_RANGE_IN_DAYS,
		'	GROUP BY',
		'		ExternalCustomerId,',
		'		CampaignId,',
		'		AdGroupId,',
		'		CriterionId,',
		'		Query,',
		'		AdNetworkType1,',
		'		--AdFormat,',
		'		Device,',
		'		QueryMatchTypeWithVariant,',
		'		QueryTargetingStatus,',
		'		Date',
		'	--HAVING TRUE',
		'		--AND Clicks > 10',
		'),',
		'',
		'',
		'query1 AS (',
		'	SELECT',
		'		customer.ExternalCustomerId,',
		'		sq.CampaignId,',
		'		sq.AdGroupId,',
		'		--sq.CriterionId,',
		'		ifnull( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,',
		'		Query,',
		'		campaign.CampaignName,',
		'		adgroup.AdGroupName,',
		'		keyword1.Criteria,',
		'		sq.Conversions AS Conversions,',
		'		sq.Clicks AS Clicks,',
		'		sq.Cost AS Cost,',
		'		sq.ConversionValue AS ConversionValue,',
		'		keyword.Conversions AS KeywordConversions,',
		'		keyword.Clicks AS KeywordClicks,',
		'		keyword.Cost AS KeywordCost,',
		'		keyword.ConversionValue AS KeywordConversionValue,',
		'		AveragePageViews AS AveragePageViews,',
		'		AverageTimeOnSite AS AverageTimeOnSite,',
		'		BounceRate AS BounceRate,',
		'		keyword1.QualityScore AS QualityScore,',
		'		sq.AdNetworkType1,',
		'		--AdFormat,',
		'		sq.Device,',
		'		sq.QueryMatchTypeWithVariant,',
		'		sq.QueryTargetingStatus,',
		'		sq.Date AS Date',
		'	FROM sq',
		'	JOIN`' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Customer_' + TRANSFER_SERVICE_ACCOUNT_ID + '` AS customer',
		'		ON customer.ExternalCustomerId = sq.ExternalCustomerId',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Campaign_' + TRANSFER_SERVICE_ACCOUNT_ID + '` AS campaign',
		'		ON campaign.ExternalCustomerId = sq.ExternalCustomerId',
		'		AND sq.CampaignId = campaign.CampaignId',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.AdGroup_' + TRANSFER_SERVICE_ACCOUNT_ID + '` AS adgroup',
		'		ON adgroup.ExternalCustomerId = sq.ExternalCustomerId',
		'		AND sq.CampaignId = adgroup.CampaignId',
		'		AND sq.AdGroupId = adgroup.AdGroupId',
		'	JOIN `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Keyword_' + TRANSFER_SERVICE_ACCOUNT_ID + '` AS keyword1',
		'		ON keyword1.ExternalCustomerId = sq.ExternalCustomerId',
		'		AND keyword1.CampaignId = sq.CampaignId',
		'		AND keyword1.AdGroupId = sq.AdGroupId',
		'		AND keyword1.CriterionId = sq.CriterionId',
		'	JOIN analytics',
		'		ON analytics.ExternalCustomerId = sq.ExternalCustomerId',
		'		AND analytics.CampaignId = sq.CampaignId',
		'		AND analytics.AdGroupId = sq.AdGroupId',
		'		AND analytics.CriterionId = sq.CriterionId',
		'		AND analytics.Date = sq.Date',
		'	LEFT JOIN keyword',
		'		ON keyword.ExternalCustomerId = sq.ExternalCustomerId',
		'		AND keyword.CampaignId = sq.CampaignId',
		'		AND keyword.AdGroupId = sq.AdGroupId',
		'		AND keyword.CriterionId = sq.CriterionId',
		'		AND keyword.Date = sq.Date',
		'		AND keyword.AdNetworkType1 = sq.AdNetworkType1',
		'		AND keyword.Device = sq.Device',
		'		AND keyword1.KeywordMatchType = sq.QueryMatchTypeWithVariant',
		'	WHERE',
		'		TRUE',
		'		AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( \'Europe/Berlin\' ) )',
		'		AND campaign.CampaignStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND adgroup.AdGroupStatus IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND keyword1.Status IN ( \'ENABLED\', \'PAUSED\' )',
		'		AND NOT keyword1.IsNegative',
		'		AND customer._LATEST_DATE = customer._DATA_DATE',
		'		AND campaign._LATEST_DATE = campaign._DATA_DATE',
		'		AND adgroup._LATEST_DATE = adgroup._DATA_DATE',
		'		AND keyword1._LATEST_DATE = keyword1._DATA_DATE',
		'),',
		'',
		'',
		'',
		'',
		'',
		'query2 AS (',
		'	SELECT',
		'		query1.ExternalCustomerId,',
		'		query1.CampaignId,',
		'		query1.AdGroupId,',
		'		query1.AccountName,',
		'		query1.CampaignName,',
		'		query1.AdGroupName,',
		'		query1.Criteria,',
		'		query1.Query,',
		'		ROUND( ANY_VALUE( query1.Conversions ) ) AS QueryConversions,',
		'		ANY_VALUE( query1.Clicks ) AS QueryClicks,',
		'		ROUND( ANY_VALUE( query1.Cost ) * 100 ) / 100 AS QueryCost,',
		'		ROUND( ANY_VALUE( query1.ConversionValue ) ) AS QueryConversionValue,',
		'		ROUND( ',
		'			( ANY_VALUE( query1.Conversions ) * 50 - ANY_VALUE( query1.Cost ) )',
		'			/ GREATEST( ANY_VALUE( query1.Clicks ), 1 ) * 100 ) / 100 AS QueryProfit_per_click,',
		'			',
		'		ROUND( SUM( ngram.Conversions ) ) AS NgramConversions,',
		'		SUM( ngram.Clicks ) AS NgramClicks,',
		'		ROUND( SUM( ngram.Cost ) * 100 ) / 100 AS NgramCost,',
		'		ROUND( SUM( ngram.ConversionValue ) ) AS NgramConversionValue,',
		'		ROUND( ( SUM( ngram.Conversions ) * 50 - SUM( ngram.Cost ) ) ',
		'			/ GREATEST( SUM( ngram.Clicks ), 1 ) * 100 ) / 100 AS NgramProfit_per_click,',
		'		',
		'		ROUND( ANY_VALUE( KeywordConversions ) ) AS KeywordConversions,',
		'		ANY_VALUE( KeywordClicks ) AS KeywordClicks,',
		'		ROUND( ANY_VALUE( KeywordCost ) * 100 ) / 100 AS KeywordCost,',
		'		ROUND( ANY_VALUE( KeywordConversionValue ) ) AS KeywordConversionValue,',
		'		ROUND( ( ANY_VALUE( KeywordConversions ) * 50 - ANY_VALUE( KeywordCost ) ) ',
		'			/ GREATEST( ANY_VALUE( KeywordClicks ), 1 ) * 100 ) / 100 AS KeywordProfit_per_click,',
		'		',
		'		ROUND( ANY_VALUE( AveragePageViews ) ) AS AveragePageViews,',
		'		ROUND( ANY_VALUE( AverageTimeOnSite ) ) AS AverageTimeOnSite,',
		'		ROUND( ANY_VALUE( BounceRate ) * 100 ) / 100 AS BounceRate,',
		'		',
		'		ANY_VALUE( query1.QualityScore ) AS QualityScore,',
		'		LENGTH( query1.Query ) AS QueryLength,',
		'		ARRAY_LENGTH( SPLIT( query1.Query, \' \' ) ) AS CountWords,',
		'		',
		'		AdNetworkType1 AS AdNetworkType1,',
		'		--AdFormat AS AdFormat,',
		'		Device AS Device,',
		'		QueryMatchTypeWithVariant AS QueryMatchTypeWithVariant,',
		'		QueryTargetingStatus AS QueryTargetingStatus,',
		'		query1.Date',
		'	FROM query1',
		'	LEFT JOIN ngram',
		'		ON TRUE',
		'		AND ngram.ExternalCustomerId = query1.ExternalCustomerId',
		'		AND REGEXP_CONTAINS(',
		'			CONCAT( \' \', Query, \' \' ),',
		'			CONCAT( \' \', REGEXP_REPLACE( Word, \'["\\\\\\\\$\\\\\\\\*\\\\\\\\+\\\\\\\\?]\', \'\' ), \' \' )',
		'		)',
		'		AND query1.Date = ngram.Date',
		'	GROUP BY',
		'		query1.ExternalCustomerId,',
		'		query1.CampaignId,',
		'		query1.AdGroupId,',
		'		AccountName,',
		'		CampaignName,',
		'		AdGroupName,',
		'		Criteria,',
		'		Query,',
		'		AdNetworkType1,',
		'		Device,',
		'		QueryMatchTypeWithVariant,',
		'		QueryTargetingStatus,',
		'		Date',
		'),',
		'',
		'',
		'campaign_negative AS (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		CampaignId,',
		'		Text',
		'	FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.CampaignNegativeKeywords_' + TRANSFER_SERVICE_ACCOUNT_ID + '`',
		'		AS campaign_negative',
		'	WHERE TRUE',
		'		AND campaign_negative._LATEST_DATE = campaign_negative._DATA_DATE',
		'		AND campaign_negative.ExternalCustomerId = ' + ACCOUNT_ID + '',
		'),',
		'',
		'adgroup_negative AS (',
		'	SELECT',
		'		ExternalCustomerId,',
		'		CampaignId,',
		'		AdGroupId,',
		'		Criteria',
		'	FROM `' + PROJECT_ID + '.' + TRANSFER_SERVICE_DATASET_ID + '.Criteria_' + TRANSFER_SERVICE_ACCOUNT_ID + '`',
		'		AS negative',
		'	WHERE TRUE',
		'		AND negative.isNegative',
		'		AND negative._LATEST_DATE = negative._DATA_DATE',
		'		AND negative.ExternalCustomerId = ' + ACCOUNT_ID + '',
		'),',
		'',
		'',
		'query3 AS (',
		'	SELECT',
		'		query2.ExternalCustomerId,',
		'		query2.CampaignId,',
		'		query2.AdGroupId,',
		'		query2.AccountName,',
		'		query2.CampaignName,',
		'		query2.AdGroupName,',
		'		query2.Criteria,',
		'		query2.Query,',
		'		query2.AdNetworkType1,',
		'		query2.Device,',
		'		query2.QueryMatchTypeWithVariant,',
		'		query2.QueryTargetingStatus,',
		'		query2.Date,',
		'		',
		'		query2.QueryConversions,',
		'		query2.QueryClicks,',
		'		query2.QueryCost,',
		'		query2.QueryConversionValue,',
		'		query2.QueryProfit_per_click,',
		'		',
		'		query2.NgramConversions,',
		'		query2.NgramClicks,',
		'		query2.NgramCost,',
		'		query2.NgramConversionValue,',
		'		query2.NgramProfit_per_click,',
		'			',
		'		query2.KeywordConversions,',
		'		query2.KeywordClicks,',
		'		query2.KeywordCost,',
		'		query2.KeywordConversionValue,',
		'		query2.KeywordProfit_per_click,',
		'		',
		'		query2.AveragePageViews,',
		'		query2.AverageTimeOnSite,',
		'		query2.BounceRate,',
		'		',
		'		query2.QualityScore,',
		'		query2.QueryLength,',
		'		query2.CountWords,',
		'		',
		'		COUNT( campaign_negative.Text ) AS CountCampaignNegatives',
		'	FROM',
		'		query2',
		'	LEFT JOIN campaign_negative',
		'		ON  campaign_negative.ExternalCustomerId = query2.ExternalCustomerId',
		'			AND campaign_negative.CampaignId = query2.CampaignId',
		'		AND REGEXP_CONTAINS(',
		'			CONCAT( \' \', LOWER( Query ), \' \' ),',
		'			CONCAT(',
		'				\' \',',
		'				REGEXP_REPLACE(',
		'					LOWER( campaign_negative.Text ),',
		'					\'["\\\\\\\\$\\\\\\\\*\\\\\\\\+\\\\\\\\?]\',',
		'					\'\'',
		'				),',
		'				\' \'',
		'			)',
		'		)',
		'	GROUP BY',
		'		query2.ExternalCustomerId,',
		'		query2.CampaignId,',
		'		query2.AdGroupId,',
		'		query2.AccountName,',
		'		query2.CampaignName,',
		'		query2.AdGroupName,',
		'		query2.Criteria,',
		'		query2.Query,',
		'		query2.AdNetworkType1,',
		'		query2.Device,',
		'		query2.QueryMatchTypeWithVariant,',
		'		query2.QueryTargetingStatus,',
		'		query2.Date,',
		'		',
		'		query2.QueryConversions,',
		'		query2.QueryClicks,',
		'		query2.QueryCost,',
		'		query2.QueryConversionValue,',
		'		query2.QueryProfit_per_click,',
		'		',
		'		query2.NgramConversions,',
		'		query2.NgramClicks,',
		'		query2.NgramCost,',
		'		query2.NgramConversionValue,',
		'		query2.NgramProfit_per_click,',
		'			',
		'		query2.KeywordConversions,',
		'		query2.KeywordClicks,',
		'		query2.KeywordCost,',
		'		query2.KeywordConversionValue,',
		'		query2.KeywordProfit_per_click,',
		'		',
		'		query2.AveragePageViews,',
		'		query2.AverageTimeOnSite,',
		'		query2.BounceRate,',
		'		',
		'		query2.QualityScore,',
		'		query2.QueryLength,',
		'		query2.CountWords',
		'),',
		'',
		'',
		'',
		'',
		'',
		'query4 AS (',
		'	SELECT',
		'		query3.ExternalCustomerId,',
		'		query3.CampaignId,',
		'		query3.AdGroupId,',
		'		query3.AccountName,',
		'		query3.CampaignName,',
		'		query3.AdGroupName,',
		'		query3.Criteria,',
		'		query3.Query,',
		'		query3.AdNetworkType1,',
		'		query3.Device,',
		'		query3.QueryMatchTypeWithVariant,',
		'		query3.QueryTargetingStatus,',
		'		query3.Date,',
		'		',
		'		query3.QueryConversions,',
		'		query3.QueryClicks,',
		'		query3.QueryCost,',
		'		query3.QueryConversionValue,',
		'		query3.QueryProfit_per_click,',
		'		',
		'		query3.NgramConversions,',
		'		query3.NgramClicks,',
		'		query3.NgramCost,',
		'		query3.NgramConversionValue,',
		'		query3.NgramProfit_per_click,',
		'		',
		'		query3.KeywordConversions,',
		'		query3.KeywordClicks,',
		'		query3.KeywordCost,',
		'		query3.KeywordConversionValue,',
		'		query3.KeywordProfit_per_click,',
		'		',
		'		query3.AveragePageViews,',
		'		query3.AverageTimeOnSite,',
		'		query3.BounceRate,',
		'		',
		'		query3.QualityScore,',
		'		query3.QueryLength,',
		'		query3.CountWords,',
		'		',
		'		query3.CountCampaignNegatives,',
		'		',
		'		COUNT( adgroup_negative.Criteria ) AS CountAdGroupNegatives',
		'	FROM',
		'		query3',
		'	LEFT JOIN adgroup_negative',
		'		ON  adgroup_negative.ExternalCustomerId = query3.ExternalCustomerId',
		'		AND adgroup_negative.CampaignId = query3.CampaignId',
		'		AND adgroup_negative.AdGroupId = query3.AdGroupId',
		'		AND REGEXP_CONTAINS(',
		'			CONCAT( \' \', LOWER( Query ), \' \' ),',
		'			CONCAT(',
		'				\' \',',
		'				REGEXP_REPLACE(',
		'					LOWER( adgroup_negative.Criteria ),',
		'					\'["\\\\\\\\$\\\\\\\\*\\\\\\\\+\\\\\\\\?]\',',
		'					\'\'',
		'				),',
		'				\' \'',
		'			)',
		'		)',
		'	GROUP BY',
		'		query3.ExternalCustomerId,',
		'		query3.CampaignId,',
		'		query3.AdGroupId,',
		'		query3.AccountName,',
		'		query3.CampaignName,',
		'		query3.AdGroupName,',
		'		query3.Criteria,',
		'		query3.Query,',
		'		query3.AdNetworkType1,',
		'		query3.Device,',
		'		query3.QueryMatchTypeWithVariant,',
		'		query3.QueryTargetingStatus,',
		'		query3.Date,',
		'		',
		'		query3.QueryConversions,',
		'		query3.QueryClicks,',
		'		query3.QueryCost,',
		'		query3.QueryConversionValue,',
		'		query3.QueryProfit_per_click,',
		'		',
		'		query3.NgramConversions,',
		'		query3.NgramClicks,',
		'		query3.NgramCost,',
		'		query3.NgramConversionValue,',
		'		query3.NgramProfit_per_click,',
		'			',
		'		query3.KeywordConversions,',
		'		query3.KeywordClicks,',
		'		query3.KeywordCost,',
		'		query3.KeywordConversionValue,',
		'		query3.KeywordProfit_per_click,',
		'		',
		'		query3.AveragePageViews,',
		'		query3.AverageTimeOnSite,',
		'		query3.BounceRate,',
		'		',
		'		query3.QualityScore,',
		'		query3.QueryLength,',
		'		query3.CountWords,',
		'		',
		'		query3.CountCampaignNegatives ',
		')',
		'',
		'',
		'SELECT *',
		'FROM query4',
	].join( '\n' )
	,

	PREDICTION : [
		'SELECT',
		'  *,',
		'  QueryProfitPerClick AS target,',
		'	ROUND( predicted_QueryProfitPerClick * 100 ) / 100 AS prediction',
		'FROM',
		'	ML.PREDICT(',
		'		MODEL `' + PROJECT_ID + '.' + DATASET_ID + '.' + MODEL_NAME + '`,',
		'		( SELECT *',
		'			FROM `' + PROJECT_ID + '.' + DATASET_ID + '.' + PREPROCESSED_DATA2 + '`',
		'		)',
		'	)',
	].join( '\n' )
	,

	WEIGHTS : [
		'SELECT',
		'	processed_input as Column,',
		'  CASE',
		'    WHEN processed_input = \'BounceRate\' THEN ROUND( weight * 10 ) / 1000',
		'    ELSE ROUND( weight * 1000 ) / 1000',
		'  END AS Weight',
		'FROM',
		'	ML.WEIGHTS( MODEL `' + PROJECT_ID + '.' + DATASET_ID + '.' + MODEL_NAME + '` )',
	].join( '\n' )
	,

	COUNTS : [
		'WITH',
		'missingKeywords AS (',
		'  SELECT',
		'    AccountName,',
		'    Date,',
		'    COUNT(*) AS CountUniqueMissingKeywords',
		'  FROM (',
		'    SELECT',
		'      AccountName,',
		'      Query,',
		'      Date',
		'    FROM',
		'      `' + PROJECT_ID + '.' + DATASET_ID + '.missing_keywords`',
		'    GROUP BY',
		'      AccountName,',
		'      Query,',
		'      Date',
		'  )',
		'  GROUP BY',
		'    AccountName,',
		'    Date',
		'),',
		'',
		'',
		'misroutingQueries AS (',
		'  SELECT',
		'    AccountName,',
		'    Date,',
		'    COUNT(*) AS CountUniqueMisroutingQueries',
		'  FROM (',
		'    SELECT',
		'      AccountName,',
		'      Query,',
		'      Date',
		'    FROM',
		'      `' + PROJECT_ID + '.' + DATASET_ID + '.misrouting_queries`',
		'    GROUP BY',
		'      AccountName,',
		'      Query,',
		'      Date',
		'  )',
		'  GROUP BY',
		'    AccountName,',
		'    Date',
		'),',
		'',
		'',
		'pausedKeywords AS (',
		'  SELECT',
		'    AccountName,',
		'    Date,',
		'    COUNT(*) AS CountUniquePausedKeywords',
		'  FROM (',
		'    SELECT',
		'      AccountName,',
		'      Query,',
		'      Date',
		'    FROM',
		'      `' + PROJECT_ID + '.' + DATASET_ID + '.paused_keywords` ',
		'    GROUP BY',
		'      AccountName,',
		'      Query,',
		'      Date',
		'  )',
		'  GROUP BY',
		'    AccountName,',
		'    Date',
		')',
		',',
		'',
		'',
		'shoppingMissingKeywords AS (',
		'  SELECT',
		'    AccountName,',
		'    Date,',
		'    COUNT(*) AS CountUniqueShoppingMissingKeywords',
		'  FROM (',
		'    SELECT',
		'      AccountName,',
		'      Query,',
		'      Date',
		'    FROM',
		'      `' + PROJECT_ID + '.' + DATASET_ID + '.shopping_missing_keywords` ',
		'    GROUP BY',
		'      AccountName,',
		'      Query,',
		'      Date',
		'  )',
		'  GROUP BY',
		'    AccountName,',
		'    Date',
		')',
		',',
		'',
		'',
		'dsaMissingKeywords AS (',
		'  SELECT',
		'    AccountName,',
		'    Date,',
		'    COUNT(*) AS CountUniqueDsaMissingKeywords',
		'  FROM (',
		'    SELECT',
		'      AccountName,',
		'      Query,',
		'      Date',
		'    FROM',
		'      `' + PROJECT_ID + '.' + DATASET_ID + '.missing_dsa_keywords`',
		'    GROUP BY',
		'      AccountName,',
		'      Query,',
		'      Date',
		'  )',
		'  GROUP BY',
		'    AccountName,',
		'    Date',
		')',
		'',
		'SELECT',
		'  AccountName,',
		'  Date,',
		'  CountUniqueMissingKeywords,',
		'  CountUniqueMisroutingQueries,',
		'  CountUniquePausedKeywords,',
		'  CountUniqueShoppingMissingKeywords,',
		'  CountUniqueDsaMissingKeywords',
		'FROM',
		'  missingKeywords',
		'LEFT JOIN misroutingQueries',
		'  USING( AccountName, Date )',
		'LEFT JOIN pausedKeywords',
		'  USING( AccountName, Date )',
		'LEFT JOIN shoppingMissingKeywords',
		'  USING( AccountName, Date )',
		'LEFT JOIN dsaMissingKeywords',
		'  USING( AccountName, Date )',
		'ORDER BY',
		'  AccountName,',
		'  Date',
	].join( '\n' )
	,
};

// ++++++++++++++++++++++++++
// ++++++++++++++++++++++++++
// ++++++++++++++++++++++++++
// ++++++++++++++++++++++++++
// ++++++++++++++++++++++++++
// ++++++++++++++++++++++++++
// ++++++++++++++++++++++++++

var PREPARE_TARGET_TABLE_QUERY = [ '',
	'SELECT ',
	'\'\' AS Query, ',
	'\'\' AS Entity, ',
	'\'\' AS Type, ',
	'0.0 AS Salience, ',
	'\'\' AS Title ',
	// we don't really want to write something into this table at this moment
	'LIMIT 0 \n',
	].join( '\n' )
;

var GET_SEARCH_QUERIES_QUERY = [
	'SELECT',
		' Query',
	' FROM `'	+ PROJECT_ID + '.' + DATASET_ID + '.' + PREPROCESSED_DATA_TABLE_NAME + '` ',
	' WHERE TRUE',
	'   AND Query NOT IN ( SELECT Query FROM ',
			'`' + PROJECT_ID + '.' + DATASET_ID + '.' + NL_ENTITIES_TABLE_NAME + '`',
			' GROUP BY Query )',
	].join( '\n' )
;

var CREATE_MODEL_QUERY = [
		'CREATE OR REPLACE MODEL `'	+ PROJECT_ID + '.' + DATASET_ID + '.' + MODEL_NAME + '` ',
		'OPTIONS',
		'	(',
		'	MODEL_TYPE = \'linear_reg\',',
		'	OPTIMIZE_STRATEGY = \'NORMAL_EQUATION\',',
		'	INPUT_LABEL_COLS = [ \'QueryProfitPerClick\' ]',
		'	) AS',
		'SELECT * EXCEPT',
		'		( ExternalCustomerId',
		'		,Query',
		'		,SqImpressions',
		'		,SqClicks',
		'		,SqCost',
		'		,SqConversions',
		'		,SqConversionValue',
		'		,KeywordImpressions',
		'		,KeywordClicks',
		'		,KeywordCost',
		'		,KeywordConversions',
		'		,KeywordConversionValue',
		'		--,NgramImpressions',
		'		--,NgramClicks',
		'		--,NgramCost',
		'		--,NgramConversions',
		'		--,NgramConversionValue',
		'		--,QueryProfitPerClick',
		'	)',
		' FROM `'	+ PROJECT_ID + '.' + DATASET_ID + '.' + PREPROCESSED_DATA2 + '` ',
		'WHERE TRUE',
	].join( '\n' )
;

var BINARY_COLUMNS_QUERY = [
		'WITH',
		'Segments AS (',
		'	SELECT',
		'		REGEXP_REPLACE( Segment, \'[äÄöÖüÜß]\', \'_\' ) AS Segment,',
		'		Entities',
		'	FROM (',
		'		-- relevant entities for each type',
		'		SELECT',
		'			Type AS Segment,',
		'			ARRAY_AGG( DISTINCT Entity ) AS Entities,',
		'			COUNT( DISTINCT Query ) AS CountQueries',
		'		FROM `' + PROJECT_ID + '.' + DATASET_ID + '.' + NL_ENTITIES_TABLE_NAME + '`',
		'		WHERE TRUE',
		'			AND Type IN (' + ENTITY_TYPE_WHITELIST.map( function( type ){
				return '\t\t\t\t\'' + type + '\'';
			}).join( ',\n' ),
		'			)',
		'		GROUP BY',
		'			Type',
		'		UNION ALL',
		'		-- relevant types + entities',
		'		SELECT',
		'			CONCAT( Type, \'_\' , UPPER( REGEXP_REPLACE( Entity, \' \', \'_\' ) ) ) AS Segment,',
		'			[ Entity ] AS Entities,',
		'			COUNT( DISTINCT Query ) AS CountQueries',
		'		FROM `' + PROJECT_ID + '.' + DATASET_ID + '.' + NL_ENTITIES_TABLE_NAME + '`',
		'		WHERE TRUE',
		'			AND Type IN (' + ENTITY_TYPE_WHITELIST.map( function( type ){
				return '\t\t\t\t\'' + type + '\'';
			}).join( ',\n' ),
			'			)',
		'		GROUP BY',
		'			Type,',
		'			Entity',
		'	)',
		'	WHERE TRUE',
		'		AND CountQueries > ' + MIN_QUERIES_FOR_SEGMENT,
		'	ORDER BY',
		'		CountQueries',
		'),',
		'Predicates AS (',
		'	SELECT',
		'		CONCAT(',
		'			\'CAST ( \',',
		'			STRING_AGG( CONCAT( \'REGEXP_CONTAINS( Query, \\\'\', Entity ,\'\\\' )\' ) , \' OR \' ),',
		'			\' AS INT64 ) AS Is\',',
		'			CONCAT( UPPER( SUBSTR( Segment, 1, 1 ) ), LOWER( SUBSTR( Segment, 2 ) ) )',
		'		) AS Predicate',
		'	FROM Segments, UNNEST( Entities ) AS Entity',
		'	WHERE TRUE',
		'	GROUP BY',
		'		Segment',
		')',
		'SELECT',
		'	CONCAT(',
		'		\'SELECT\\n\\tdata.*\',',
		'    	IFNULL( CONCAT( \',\\t\\n\', STRING_AGG( Predicate, \',\\n\\t\' ) ), \'\' ),',
		'		\'\\n\\tFROM `' + PROJECT_ID + '.' + DATASET_ID + '.' + PREPROCESSED_DATA_TABLE_NAME + '` data\'',
		'	) AS Sql',
		'FROM Predicates',
	].join( '\n' )
;

var PRECOMPUTE_RAW_DATA_FOR_DATASTUDIO_QUERY = [
		'SELECT * ',
		' FROM `' + PROJECT_ID + '.' + DATASET_ID + '.' + 'raw_data' + '` ',
	].join( '\n' )
;

// --------- Polyfills ---------------------
Object.values = Object.values || ( function( obj ){
	return Object.keys( obj ).map( function( key ){
		return obj[key]
	})
});
String.trim = function( value ){
	return value.trim();
};

//--------- Tools --------------------------
var _ = {
	property : function(){
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
		var args = Array.prototype.slice.call( arguments );
		var f = function( item ){
			// do NOT use reduce here, because apply will interpret the third argument :(
			var res = item;
			args.forEach( function( arg ){ res = apply( res, arg ) } );
			return res;
		};
		f.name1 = args.join( '_' ); // this improves groupBy() output
		return f;
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
	
}

function createDataset(){
	if( datasetExists() ){
		Logger.log( 'Data set already exists: ' + DATASET_ID );
		return;
	}
	
	// Create new dataset.
	var dataSet = BigQuery.newDataset();
	dataSet.friendlyName = DATASET_ID;
	dataSet.datasetReference = BigQuery.newDatasetReference();
	dataSet.datasetReference.projectId = PROJECT_ID;
	dataSet.datasetReference.datasetId = DATASET_ID;

	dataSet = BigQuery.Datasets.insert( dataSet, PROJECT_ID );
	Logger.log( 'Created dataset with id %s.', dataSet.id );
}

function datasetExists(){
	// Get a list of all datasets in project.
	var datasets = BigQuery.Datasets.list( PROJECT_ID );
	var datasetExists = false;
	// Iterate through each dataset and check for an id match.
	if( datasets.datasets != null ){
		for( var i = 0; i < datasets.datasets.length; i++ ){
			var dataset = datasets.datasets[ i ];
			if( dataset.datasetReference.datasetId == DATASET_ID ){
				return true;
			}
		}
	}
	return false;
}

function createDictionaryTable(){
	if( tableExists( PROJECT_ID, DATASET_ID, DICTIONARY_TABLE_NAME ) ){
		Logger.log( 'table ' + DICTIONARY_TABLE_NAME + ' already exists. Don\'t recreate it.' );
		return;
	}
	var table = {
		friendlyName : DICTIONARY_TABLE_NAME,
		description : 'Each column of this'
			+ ' table contains keywords describing'
			+ ' a common theme of that column.',
		// location : 'US', // inherited from Dataset
		tableReference : {
			projectId : PROJECT_ID,
			datasetId : DATASET_ID,
			tableId : DICTIONARY_TABLE_NAME,
		},
		externalDataConfiguration : {
			sourceUris : [ DICTIONARY_SHEETS_URL ],
			schema : {
				fields : [], // Are created dynamically. see below.
			},
			sourceFormat : 'GOOGLE_SHEETS',
			maxBadRecords : 0, /* default == 0 */
			autodetect : false,
			ignoreUnknownValues : false, /* default == false */
			compression : 'NONE',
			googleSheetsOptions : {
				skipLeadingRows : '1'
			},
		}
	};
	
	DICTIONARY_COLUMNS.forEach( function( dictColumn ){
		table.externalDataConfiguration.schema.fields.push(
			{
				name : dictColumn,
				type : 'STRING',
				mode : 'NULLABLE',
				description : dictColumn + ' keywords',
			}
		);
	});
	
	table = BigQuery.Tables.insert(
		table,
		PROJECT_ID,
		DATASET_ID
	);
	Logger.log( 'Table %s created.', DICTIONARY_TABLE_NAME );
}

/*
	Parses Bigquery query results to JSON.
*/
function bqQueryParser( schema ){
	/*
		Strips "f" and "v" objects/properties from Bigquery query result.
	*/
	function stripUselessBoilerplate( x ){
		if( x === null || typeof x != 'object' ){
			return x; // scalar
		}
		x = ( x.f || x )
			.map( _.property( 'v' ) )
			.map( stripUselessBoilerplate )
		;
		return x;
	}
	/*
		recursive parser
	*/
	function parse1( schema, x ){
		if( typeof schema == 'undefined' ){
			throw new Error( 'schema is undefined, x is ' + JSON.stringify( x, null, 2 ) );
		}
		if( ! Array.isArray( x ) ){ // scalar
			return {
				name : schema.name,
				value : x,
			};
		}
		if( Array.isArray( schema ) ){ // zip to an object
			if( schema.length != x.length ){
				throw new Error( 'lenghts differ' );
			}
			var arr = [];
			for( var i = 0; i < schema.length; i++ ){
				arr.push( parse1( schema[ i ], x[ i ] ) );
			}
			var obj = {};
			arr.forEach( function( y ){
				obj[ y[ 'name' ] ] = y[ 'value' ];
			});
			return obj;
		}
		if( schema.mode == 'REPEATED' ){ // list of objects
			if( schema.fields ){
				return {
					name : schema.name,
					value : x.map( function( xx ){
						return parse1( schema.fields, xx );
					}),
				};
			}
			return { // list of scalars
				name : schema.name,
				value : x,
			};
		}
		throw new Error( 'x is an array, but schema is not: '
			+ JSON.stringify( x, null, 2 ) + ' <-> ' + JSON.stringify( schema, null, 2 ) );
	}
	return {
		parse : function( x ){ return parse1( schema, stripUselessBoilerplate( x ) ) },
	}
}

function queryResults( jobId, projectId ){
	var pageToken = null; // start with empty pageToken
	var resultsPerPage = 10000;
	var res = [];
	
	if( ! jobId ){
		throw new Error( 'JobId is undefined' );
	}
	
	if( ! projectId ){
		throw new Error( 'projectId is undefined' );
	}
	var schema = null;
	do{
		/*
		Logger.log( 'projectId: ' + projectId );
		Logger.log( 'jobId: ' + jobId );
		Logger.log( 'pageToken: ' + pageToken );
		Logger.log( 'maxResults: ' + resultsPerPage );
		*/
		var results = BigQuery.Jobs.getQueryResults(
			projectId,
			jobId,
			{
				pageToken  : pageToken || '',
				maxResults : resultsPerPage
			}
		);
		pageToken = results.nextPageToken;
		schema = results.schema.fields;
		res = res.concat( results.rows || [] );
	}while( pageToken );

	//log( JSON.stringify( fields, null, 2 ) );
	
	return res.map( bqQueryParser( schema ).parse );
	
	// res = res.map( stripUselessBoilerplate );
	// Logger.log( 'result from bq: ' + JSON.stringify( res, null, 2 ) );
	// return res;
}

function queryBigqueryAsync(
		projectId,
		query,
		writeDisposition,
		datasetId,
		tableId,
		clusteringFields
	){
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
		job.configuration.query.writeDisposition = writeDisposition;
			// 'WRITE_APPEND'; // WRITE_TRUNCATE
	}
	if( clusteringFields ){
		job.configuration.query.clustering = {
			fields : clusteringFields,
		};
	}
	//log( 'job: ' + JSON.stringify( job, null, 2 ) );
	return BigQuery.Jobs.insert( job, projectId );
}

function waitForJob( jobId ){
	var job = getJob( jobId );
	if( job.status && job.status.state == 'RUNNING' ){
		var seconds = 1; // can't be an argument due to forEach parameter issue, sadly
		Utilities.sleep( ( seconds || 1 ) * 1000 );
		return waitForJob( jobId );
	}
	return job;
}

function sanitizeJobId( jobId ){
	if( jobId.lastIndexOf( '.' ) >= 0 ){
		// Invalid job ID "our_project_id:US.job_nLbcaw3YDYShaqKhy-QYbVbYDyQs"
		// Need to remove "our_project_id:US." part
		jobId = jobId.substring( jobId.lastIndexOf( '.' ) + 1 );
	}
	return jobId;
}

function getJob( jobId, projectId ){
	jobId = sanitizeJobId( jobId );
	var job = BigQuery.Jobs.get( ( projectId || PROJECT_ID ), jobId );
	return job;
}

function queryBigquery( query, projectId ){

	var projectId = projectId || PROJECT_ID;
	
	var job = queryBigqueryAsync( projectId, query );
	
	var jobId = job.id.substring( ( PROJECT_ID + ':' + PROJECT_LOCATION + '.' ).length );
	
	waitForJob( jobId );
	
	var result = queryResults( jobId, projectId );
	
	//Logger.log( 'result: ' + JSON.stringify( result, null, 2 ) );
	
	return result;
}

function dropTable( projectId, datasetId, tableName ){
	if ( tableExists( projectId, datasetId, tableName ) ) {
		BigQuery.Tables.remove( projectId, datasetId, tableName );
		log( 'Table ' + tableName + ' dropped.' );
	}else{
		log( 'Can\'t find table ' + tableName + '. Hence, can\'t drop it' );
	}
}

function tableExists( projectId, datasetId, tableId, retryCount ){
	var pageToken = ''; // start with empty pageToken
	var resultsPerPage = 150;
	var finished = false;
	if( !retryCount ){
		retryCount = 0;
	}
	retryCount++;
	if( retryCount == 10 ){
		throw new Error( 'tableExists gives up after ' + retryCount + ' trys' );
	}
	
	while( ! finished ){
		// Get a list of a part of all tables in the dataset.
		var tables = [];
		try{
			tables = BigQuery.Tables.list(
				PROJECT_ID,
				DATASET_ID,
				{
					pageToken  : pageToken,
					maxResults : resultsPerPage
				}
			);
		}catch( error ){
			if( error + '' == 'Exception: Empty response' ){
				log( 'Got strange Bigquery-error: ' + error + '. pageToken is: ' + pageToken + '.' );
				return tableExists( projectId, datasetId, tableId, retryCount );
			}
			throw error;
		}
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

function prepareMatrix( matrix ){
	if( typeof matrix.length == 'undefined' ){
		matrix = Object.values( matrix );
	}
	var headers = null;
	if( typeof matrix[ 0 ].length == 'undefined' ){
		headers = Object.keys( matrix[ 0 ] );
	}
	matrix = matrix.map( function( row ){
		if( typeof row.length == 'undefined' ){
			return Object.values( row );
		}
		return row;
	});
	matrix = matrix.map( function( row ){
		return row.map( function( value ){ return value == '' ? null : value } );
	});
	if( headers ){
		// Add headers to the beginning of the array
		matrix.unshift( headers );
	}
	return matrix;
}

function determineType( column ){
	function isNumber( n ){
		return Number( n ) === n;
	}
	function isInt( n ){
		return Number( n ) === n && n % 1 === 0;
	}
	function and( a, b ){
		return a && b;
	}
	column = column.filter( _.isDefined );
	
	if( column.length == 0 ){
		// fallback to default type
		// TODO: how to improve this?
		return 'STRING';
	}
	
	if( column.map( isNumber ).reduce( and, true ) ){
		if( column.map( isInt ).reduce( and, true ) ){
			return 'INTEGER';
		}else{
			return 'FLOAT';
		}
	}
	return 'STRING';
}

function loadIntoBigquery( destinationTable, matrix ){
	matrix = prepareMatrix( matrix );
	
	try{
		var job = {
			configuration : {
				load : {
					destinationTable : destinationTable,
					schema : {
						fields : []
					},
					// autodetect : true,
					skipLeadingRows: 1,
					writeDisposition	: 'WRITE_APPEND', // Since we load chunks it must be append! Do not use 'WRITE_TRUNCATE' here!
					createDisposition   : 'CREATE_IF_NEEDED', // this is not needed, because it is default
					nullMarker 			: 'null',
				},
			}
		};
		//log( 'job: ' + JSON.stringify( job, null, 2 ) );
		
		var header = matrix[ 0 ];
		var body = matrix.slice( 1 );
		
		header.forEach( function( header, index ){
			var column = body.map( _.property( index ) );
			var type = determineType( column );
			
			if( body.filter( function( row ){
					return row[ index ] != null &&
						( ( '' + row[ index ] ).match( /\d\d\d\d-\d\d-\d\d/ ) === null );
				}).length == 0 ){ // header row is not expected to have the same format
				type = 'DATE';
			}
			
			job.configuration.load.schema.fields.push(
				{
					name : header.toLowerCase().replace( /[^a-z0-9_]+/g, '_' ),
					type : type,
				}
			);
		});
		//log( 'schema: ' + JSON.stringify( job.configuration.load.schema, null, 2 ) );
		
		var insertJob = BigQuery.Jobs.insert(
			job,
			destinationTable.projectId,
			Utilities.newBlob( toChunks( matrix )[ 0 ], 'application/octet-stream' )
		);
		return insertJob.jobReference.jobId;
	}catch( error ){
		log( error + ' - ' + JSON.stringify( destinationTable, null, 2 ) );
		throw error;
	}
}

function prepareForBigQuery( value ){
	function isNumeric( n ){
		return ! isNaN( parseFloat( n ) ) && isFinite( n );
	}
	if( typeof value == 'string' ){
		// remove thousand separator
		var num = value.split( ',' ).join( '' );
		if( isNumeric( num ) ){
			return num;
		}
		if( value.length > 0 && value.indexOf( '%' ) == value.length - 1 ){
			var num = value.substring( 0, value.length - 1 );
			if( isNumeric( num ) ){
				return num / 100;
			}
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

function toChunks( matrix ){
	function splitArray( arr, chunkSize ){
		var i, res = [];
		for( i = 0; i < arr.length; i += chunkSize ){
			res.push( arr.slice( i, i + chunkSize ) );
		}
		return res;
	}
	var rows = matrix.map( function( row ){
		return row.map( prepareForBigQuery ).join( ',' );
	});
	return splitArray( rows, CHUNK_SIZE ).map( function( rows ){ return rows.join( '\n' ) } );
}

function postProcessing( res ){
	//Logger.log( JSON.stringify( res, null, 2 ) );
	
	var charCountToSkip = WIKI_URL_PREFIX.length;
	
	res = res
		.filter( _.property( 'type', _.unequalTo( 'OTHER' ) ) )
		.map(
			function( entity ){
				var x = {
					query    : entity.text,
					entity   : entity.name,
					type     : entity.type,
					salience : entity.salience,
					title    : null,
				};
				if( entity.metadata.wikipedia_url ){
					x.title = entity.metadata.wikipedia_url.substring(
						charCountToSkip
					);
				}
				return x;
			}
	);
	//Logger.log( JSON.stringify( res, null, 2 ) );
	return res;
}

function prepareData1(){
	var job = queryBigqueryAsync(
		PROJECT_ID,
		PREPARE_DATA_QUERY,
		'WRITE_TRUNCATE',
		DATASET_ID,
		PREPROCESSED_DATA_TABLE_NAME
	);
	var jobId = job.id.substring( ( PROJECT_ID + ':' + PROJECT_LOCATION + '.' ).length );
	return jobId;
}

function prepareNlEntitiesTable(){
	// write 0 rows into table to ensure that it is created with the right schema
	var job = queryBigqueryAsync(
		PROJECT_ID,
		PREPARE_TARGET_TABLE_QUERY,
		'WRITE_APPEND',
		DATASET_ID,
		NL_ENTITIES_TABLE_NAME
	);
	var jobId = job.id.substring( ( PROJECT_ID + ':' + PROJECT_LOCATION + '.' ).length );
	return jobId;
}

function extractEntities(){
	var searchQueries = queryBigquery( GET_SEARCH_QUERIES_QUERY ).map( _.property( 'Query' ) );
	
	Logger.log( ' got ' + searchQueries.length + ' queries' );
	
	var entities = searchQueries.map( retrieveEntities )
		.map( postProcessing )
		.reduce( _.flatten, [] )
	;
	
	Logger.log( JSON.stringify( entities.slice( 0, 5 ), null, 2 ) );
	
	Logger.log( ' got ' + entities.length + ' entities' );
	
	
	//log( 'headers: ' + entities[ 0 ] );
	if( entities.length > 0 ){
		var jobId = loadIntoBigquery(
			{
				projectId : PROJECT_ID,
				datasetId : DATASET_ID,
				tableId   : NL_ENTITIES_TABLE_NAME,
			},
			entities
		);
		Logger.log( 'wait for Bigquery to finish' );
		return jobId;
	}
}

function prepareData2(){
	var computedQuery = queryBigquery( BINARY_COLUMNS_QUERY )[ 0 ].Sql;
	
	if( ! computedQuery ){
		throw ( 'Could not compute the binary columns query.' );
	}
	
	// Compute binary attribute columns and write results into a new table.
	// For example: "IsLocation_Berlin"
	
	var job = queryBigqueryAsync(
		PROJECT_ID,
		computedQuery,
		'WRITE_TRUNCATE', // write disposition
		DATASET_ID,
		PREPROCESSED_DATA2
	);
	var jobId = job.id.substring( ( PROJECT_ID + ':' + PROJECT_LOCATION + '.' ).length );
	return jobId;
}

function createRegressionModel(){
	var job = queryBigqueryAsync(
		PROJECT_ID,
		CREATE_MODEL_QUERY
	);
	var jobId = job.id.substring( ( PROJECT_ID + ':' + PROJECT_LOCATION + '.' ).length );
	return jobId;
}

function createDataStudioViews(){
	Object.keys( dataStudioQueries ).forEach( function( queryName ){
		createView( queryName.toLowerCase(), dataStudioQueries[ queryName ] );
	});
}

function precomputeRawDataForDatastuio(){
	Logger.log( 'Prepare raw data for datastudio' );
	var job = queryBigqueryAsync(
		PROJECT_ID,
		PRECOMPUTE_RAW_DATA_FOR_DATASTUDIO_QUERY,
		'WRITE_TRUNCATE',
		DATASET_ID,
		RAW_DATA_2
	);
	var jobId = job.id.substring( ( PROJECT_ID + ':' + PROJECT_LOCATION + '.' ).length );
	return jobId;
}

function dropView( viewName ){
	if ( tableExists( PROJECT_ID, DATASET_ID, viewName ) ){
		BigQuery.Tables.remove( PROJECT_ID, DATASET_ID, viewName );
		Logger.log( 'View %s dropped.', viewName );
	}
}

function createView( viewName, query ){
	if ( tableExists( PROJECT_ID, DATASET_ID, viewName ) ){
		if( RECREATE_VIEWS ){
			dropView( viewName );
		}else{
			Logger.log( 'View %s already exists. Don\'t recreate it.', viewName );
			return;
		}
	}

	var view = {
		view : {
			query : query,
			useLegacySql : false
		},
		friendlyName : viewName,
		//description : '',
		// location : 'US', // inherited from Dataset
		tableReference : {
			projectId : PROJECT_ID,
			datasetId : DATASET_ID,
			tableId : viewName,
		},
	};
	
	try{
		BigQuery.Tables.insert(
			view,
			PROJECT_ID,
			DATASET_ID
		);
		Logger.log( 'View ' + viewName + ' created.' );
	}catch( error ){
		Logger.log( '----------------------> ' + error + ' - ' + viewName );
		throw error;
	}
}

function checkPreparedData(){
	var countSearchQueries = queryBigquery( 'SELECT COUNT(*) AS Count ' +
		'FROM `' + PROJECT_ID + '.' + DATASET_ID + '.' + PREPROCESSED_DATA_TABLE_NAME + '` ' )[ 0 ].Count
	;
	if( countSearchQueries == 0 ){
		throw 'Could not find any search queries. Try to set MIN_SQ_CLICKS_FOR_TRAINING to a lower value. ';
	}
}

function main(){
	try{
		Logger.log( 'start' );
		
		var steps = [
			createDataset,
			createDictionaryTable,
			prepareData1,
			checkPreparedData,
			prepareNlEntitiesTable,
			extractEntities,
			prepareData2,
			createRegressionModel,
			createDataStudioViews,
			precomputeRawDataForDatastuio,
		];
		
		steps.forEach( function( step ){
			var jobId = step();
			if( jobId ){
				waitForJob( jobId );
			}
		});
		
		Logger.log( 'end' );
	}catch ( error ){
		log( 'Error in ' + SCRIPT_NAME + ' ' + ' -> ' + error + '\n' + error.stack );
		throw error;
	}
}

function forceAppsScriptsToAskForGoogleDriveAccess(){
	// We need to provoke a drive dialog.
	// Don't remove these comments.
	// DriveApp.getFiles()
}

function retrieveEntities( text ){
	
	var response = UrlFetchApp.fetch(
		NL_API_ENDPOINT
			+ 'documents:' + SERVICE_TYPE
			+ '?fields=entities(' + FIELDS.join( '%2C' ) + ')'
			+ '&key=' + NL_API_KEY,
		{
			method : 'post',
			contentType: 'application/json',
			muteHttpExceptions : true,
			payload : JSON.stringify(
				{
					document: {
						language: LANGUAGE,
						type:     'PLAIN_TEXT',
						content:  text
					},
					encodingType: 'UTF8'
				}
			)
		}
	);
	if( response.getResponseCode() == 400 ){
		Logger.log( 'getResponseCode = ' + 400 + ' : ' + text );
		return [];
	}
	
	var res = JSON.parse( response );
	if( ! res.entities ){
		Logger.log( 'no entities: ' + JSON.stringify( res ) );
		return [];
	}
	res.entities.forEach( function( entity ){
		entity.text = text;
	});
	return res.entities;
}

function log( str ){
	Logger.log( str );
}