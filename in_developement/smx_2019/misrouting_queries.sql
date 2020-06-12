-- misrouting queries
WITH
sq AS (
	SELECT
		IFNULL( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,
		Campaign.CampaignName,
		AdGroup.AdGroupName,
		sq.Query,
		sq.QueryMatchTypeWithVariant,
		sq.Date,
		SUM( Impressions ) AS Impressions,
		SUM( Clicks ) AS Clicks,
		SUM( Cost ) / 1000000 AS Cost,
		ROUND( SUM( Conversions ) ) AS Conversions,
		ROUND( SUM( ConversionValue ) ) AS ConversionValue
	FROM `biddy-io.peak_ace_active_clients_transfer.SearchQueryStats_1036246249` sq
	JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` Customer
		USING ( ExternalCustomerId )
	JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` Campaign
		USING ( ExternalCustomerId, CampaignId )
	JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` AdGroup
		USING ( ExternalCustomerId, CampaignId, AdGroupId )
	WHERE TRUE
		AND sq.ExternalCustomerId = 7056468392
		AND Customer._DATA_DATE = Customer._LATEST_DATE
		AND Campaign._DATA_DATE = Campaign._LATEST_DATE
		AND AdGroup._DATA_DATE = AdGroup._LATEST_DATE
		AND DATE_DIFF( sq._LATEST_DATE, sq.Date, DAY ) <= 30
		AND Campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
		AND AdGroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
		AND sq.QueryMatchTypeWithVariant IN ( 'PHRASE', 'NEAR_PHRASE', 'EXPANDED', 'BROAD', 'AUTO') --'EXACT', 'NEAR_EXACT' )
	GROUP BY
		AccountName,
		CampaignName,
		AdGroupName,
		Query,
		QueryMatchTypeWithVariant,
		Date
),



AdgroupStats AS (
	SELECT
		ExternalCustomerId,
		CampaignId,
		AdGroupId,
		SUM( Impressions ) AS Impressions,
		SUM( Clicks ) AS Clicks,
		SUM( Cost ) / 1000000 AS Cost,
		ROUND( SUM( Conversions ) ) AS Conversions,
		ROUND( SUM( ConversionValue ) ) AS ConversionValue
	FROM `biddy-io.peak_ace_active_clients_transfer.AdGroupStats_1036246249`
	WHERE TRUE
		AND ExternalCustomerId = 7056468392
		AND DATE_DIFF( _LATEST_DATE, Date, DAY ) <= 30
	GROUP BY
		ExternalCustomerId,
		CampaignId,
		AdGroupId
),



keyword AS (
	SELECT
		Keyword.ExternalCustomerId,
		Keyword.Campaignid,
		Keyword.AdGroupid,
		IFNULL( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,
		Campaign.CampaignName,
		AdGroup.AdGroupName,
		Keyword.Criteria
	FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` Keyword
	JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` Customer
		USING ( ExternalCustomerId )
	JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` Campaign
		USING ( ExternalCustomerId, CampaignId )
	JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` AdGroup
		USING ( ExternalCustomerId, CampaignId, AdGroupId )
	WHERE TRUE
		AND Customer._DATA_DATE = Customer._LATEST_DATE
		AND Campaign._DATA_DATE = Campaign._LATEST_DATE
		AND AdGroup._DATA_DATE = AdGroup._LATEST_DATE
		AND Keyword._DATA_DATE = Keyword._LATEST_DATE
		AND Campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
		AND AdGroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
		AND Keyword.Status IN ( 'ENABLED', 'PAUSED' )
		AND Keyword.ExternalCustomerId = 7056468392
		AND Keyword.KeywordMatchType = 'EXACT'
		AND NOT Keyword.IsNegative
	GROUP BY
		Keyword.ExternalCustomerId,
		Keyword.Campaignid,
		Keyword.AdGroupid,
		AccountName,
		Campaign.CampaignName,
		AdGroup.AdGroupName,
		Keyword.Criteria
),

sqAndKeyword AS (
	SELECT
		keyword.ExternalCustomerId,
		keyword.Campaignid,
		keyword.AdGroupid,
		sq.AccountName,
		sq.CampaignName,
		sq.AdGroupName,
		sq.Query,
		sq.QueryMatchTypeWithVariant,
		sq.Date,
		keyword.CampaignName AS KeywordCampaignName,
		keyword.AdGroupName AS KeywordAdGroupName,
		
		sq.Impressions AS Impressions,
		sq.Clicks AS Clicks,
		sq.Cost AS Cost,
		ROUND( sq.Conversions ) AS Conversions,
		ROUND( sq.ConversionValue ) AS ConversionValue,
		RANK() OVER (
			PARTITION BY
				sq.AccountName,
				sq.CampaignName,
				sq.AdGroupName,
				sq.Query,
				sq.QueryMatchTypeWithVariant,
				sq.Date
			ORDER BY
				AdGroupStats.Impressions 
				+ AdGroupStats.Clicks * 1000 
				+ CAST ( sq.CampaignName = keyword.CampaignName AS INT64 ) * 10000
				+ CAST ( sq.CampaignName = keyword.CampaignName AND sq.AdGroupName = keyword.AdGroupName AS INT64 ) * 1000000
				DESC
		) AS rank
	FROM sq
	JOIN keyword
		ON sq.AccountName = keyword.AccountName
		AND Query = LOWER( Criteria )
	JOIN AdgroupStats
		USING( ExternalCustomerId, CampaignId, AdGroupId )
),

proposed AS (
	SELECT
		AccountName,
		CampaignName,
		AdGroupName,
		Query,
		QueryMatchTypeWithVariant,
		Date,
		KeywordCampaignName AS ProposedKeywordCampaignName,
		KeywordAdGroupName AS ProposedKeywordAdGroupName,
		
		Impressions AS Impressions,
		Clicks AS Clicks,
		Cost AS Cost,
		ROUND( Conversions ) AS Conversions,
		ROUND( ConversionValue ) AS ConversionValue
	FROM
		sqAndKeyword
	WHERE TRUE
		AND rank = 1
),

sqKeywordAggr AS (
	SELECT
		AccountName,
		CampaignName,
		AdGroupName,
		Query,
		QueryMatchTypeWithVariant,
		Date,
		STRING_AGG( CONCAT( KeywordCampaignName, ' > ', KeywordAdGroupName ), ', ' ) AS KeywordAdGroups,
		Count(*) AS CountExactKeywords
	FROM
		sqAndKeyword
	WHERE TRUE
	GROUP BY
		AccountName,
		CampaignName,
		AdGroupName,
		Query,
		QueryMatchTypeWithVariant,
		Date
)


SELECT
	AccountName,
	CampaignName,
	AdGroupName,
	Query,
	QueryMatchTypeWithVariant,
	Date,
	KeywordAdGroups,
	CountExactKeywords,
	ProposedKeywordCampaignName,
	ProposedKeywordAdGroupName,

	Impressions,
	Clicks,
	Cost,
	Conversions,
	ConversionValue
FROM
	proposed
JOIN sqKeywordAggr
	USING( 
		AccountName,
		CampaignName,
		AdGroupName,
		Query,
		QueryMatchTypeWithVariant,
		Date
	)
WHERE TRUE
