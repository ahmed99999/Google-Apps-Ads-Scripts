-- missing dsa keywords
SELECT
	AccountName,
	CampaignName,
	AdGroupName,
	Query,
	QueryMatchTypeWithVariant,
  sq.Criteria,
	Date,
	SUM( Impressions ) AS Impressions,
	SUM( Clicks ) AS Clicks,
	SUM( Cost ) / 1000000 AS Cost,
	ROUND( SUM( Conversions ) ) AS Conversions,
	ROUND( SUM( ConversionValue ) ) AS ConversionValue
FROM (
	SELECT
		IFNULL( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,
		Campaign.CampaignName,
		AdGroup.AdGroupName,
		sq.Query,
		sq.QueryMatchTypeWithVariant,
		keyword.Criteria,
		sq.Date,
		SUM( Impressions ) AS Impressions,
		SUM( Clicks ) AS Clicks,
		SUM( Cost ) AS Cost,
		ROUND( SUM( Conversions ) ) AS Conversions,
		ROUND( SUM( ConversionValue ) ) AS ConversionValue
	FROM `biddy-io.peak_ace_active_clients_transfer.SearchQueryStats_1036246249` sq
	JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` Customer
		USING ( ExternalCustomerId )
	JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` Campaign
		USING ( ExternalCustomerId, CampaignId )
	JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` AdGroup
		USING ( ExternalCustomerId, CampaignId, AdGroupId )
	JOIN `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` Keyword
		USING ( ExternalCustomerId, CampaignId, AdGroupId, CriterionId )
	WHERE true
		AND sq.ExternalCustomerId = 7056468392
		AND Customer._DATA_DATE = Customer._LATEST_DATE
		AND Campaign._DATA_DATE = Campaign._LATEST_DATE
		AND AdGroup._DATA_DATE = AdGroup._LATEST_DATE
		AND Keyword._DATA_DATE = Keyword._LATEST_DATE
		AND DATE_DIFF( sq._LATEST_DATE, sq.Date, DAY ) <= 30
		AND Campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
		AND AdGroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
		AND sq.QueryMatchTypeWithVariant NOT IN ( 'EXACT', 'NEAR_EXACT' )
		AND AdGroup.AdGroupType = 'SEARCH_DYNAMIC_ADS'
	GROUP BY
		AccountName,
		CampaignName,
		AdGroupName,
		Query,
		QueryMatchTypeWithVariant,
    Criteria,
		Date
) AS sq
LEFT JOIN (
	SELECT
		Keyword.Criteria
	FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` Keyword
	WHERE true
		AND Keyword.ExternalCustomerId = 7056468392
		AND Keyword._DATA_DATE = Keyword._LATEST_DATE
		AND Keyword.Status IN ( 'ENABLED', 'PAUSED' )
		AND Keyword.KeywordMatchType = 'EXACT'
		AND NOT Keyword.IsNegative
	GROUP BY
		Criteria
) AS keyword
	ON sq.Query = LOWER( keyword.Criteria )
WHERE TRUE
	AND keyword.Criteria IS NULL
GROUP BY
	AccountName,
	CampaignName,
	AdGroupName,
	Query,
	QueryMatchTypeWithVariant,
  sq.Criteria,
	Date
ORDER BY
	Clicks DESC