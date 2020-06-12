-- paused keywords
SELECT
	sq.AccountName,
	sq.CampaignName,
	sq.AdGroupName,
	sq.Query,
	sq.QueryMatchTypeWithVariant,
	sq.Date,
	keyword.CampaignName AS KeywordCampaignName,
	keyword.AdGroupName AS KeywordAdGroupname,
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
) AS sq
JOIN ( -- keyword
	SELECT
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
		AND
			(
				Campaign.CampaignStatus IN ( 'PAUSED' )
				OR AdGroup.AdGroupStatus IN ( 'PAUSED' )
				OR Keyword.Status IN ( 'PAUSED' )
			)
		AND Campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
		AND AdGroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
		AND Keyword.Status IN ( 'ENABLED', 'PAUSED' )
		AND Keyword.ExternalCustomerId = 7056468392
		AND Keyword.KeywordMatchType = 'EXACT'
		AND NOT Keyword.IsNegative
	GROUP BY
		AccountName,
		Campaign.CampaignName,
		AdGroup.AdGroupName,
		Criteria
) AS keyword
	ON sq.AccountName = keyword.AccountName
	AND Query = LOWER( Criteria )
LEFT JOIN ( -- keyword2
	SELECT
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
		AND Campaign.CampaignStatus IN ( 'ENABLED' )
		AND AdGroup.AdGroupStatus IN ( 'ENABLED' )
		AND Keyword.Status IN ( 'ENABLED' )
		AND Keyword.ExternalCustomerId = 7056468392
		AND Keyword.KeywordMatchType = 'EXACT'
		AND NOT Keyword.IsNegative
	GROUP BY
		AccountName,
		Campaign.CampaignName,
		AdGroup.AdGroupName,
		Criteria
) AS keyword2
	ON sq.AccountName = keyword2.AccountName
	AND sq.Query = LOWER( keyword2.Criteria )
WHERE TRUE
	AND keyword2.Criteria IS NULL
GROUP BY
	AccountName,
	CampaignName,
	AdGroupName,
	Query,
	QueryMatchTypeWithVariant,
	Date,
	KeywordCampaignName,
	KeywordAdGroupName
ORDER BY
	Clicks DESC