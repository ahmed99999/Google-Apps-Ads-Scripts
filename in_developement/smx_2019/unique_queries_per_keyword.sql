WITH

sq AS (
	SELECT
		ExternalCustomerId,
		CampaignId,
		AdGroupId,
		CriterionId,
		Query,
		AdNetworkType1,
		AdFormat,
		Device,
		QueryMatchTypeWithVariant,
		QueryTargetingStatus,
		ROUND( SUM( sq.Conversions ) ) AS Conversions,
		SUM( sq.Clicks ) AS Clicks,
		SUM( sq.Cost ) / 1000000 AS Cost,
		ROUND( SUM( sq.ConversionValue ) ) AS ConversionValue,
		Date
	FROM `biddy-io.peak_ace_active_clients_transfer.SearchQueryStats_1036246249` AS sq
	WHERE
		TRUE
		--AND LENGTH( Query ) < 80
		AND sq.ExternalCustomerId = 7056468392
		AND DATE_DIFF( sq._LATEST_DATE, sq.Date, DAY ) <= 365
	GROUP BY
		ExternalCustomerId,
		CampaignId,
		AdGroupId,
		CriterionId,
		Query,
		AdNetworkType1,
		AdFormat,
		Device,
		QueryMatchTypeWithVariant,
		QueryTargetingStatus,
		Date
	--HAVING TRUE
		--AND Clicks > 10
),


query1 AS (
	SELECT
		customer.ExternalCustomerId,
		ifnull( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,
		Query,
		campaign.CampaignName,
		adgroup.AdGroupName,
		keyword1.Criteria,
		sq.Conversions AS Conversions,
		sq.Clicks AS Clicks,
		sq.Cost AS Cost,
		sq.ConversionValue AS ConversionValue,
		keyword1.QualityScore AS QualityScore,
		keyword1.KeywordMatchType,
		AdNetworkType1,
		AdFormat,
		Device,
		QueryMatchTypeWithVariant,
		QueryTargetingStatus,
		sq.Date AS Date
	FROM sq
	JOIN`biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer
		ON customer.ExternalCustomerId = sq.ExternalCustomerId
	JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
		ON campaign.ExternalCustomerId = sq.ExternalCustomerId
		AND sq.CampaignId = campaign.CampaignId
	JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` AS adgroup
		ON adgroup.ExternalCustomerId = sq.ExternalCustomerId
		AND sq.CampaignId = adgroup.CampaignId
		AND sq.AdGroupId = adgroup.AdGroupId
	JOIN `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` AS keyword1
		ON keyword1.ExternalCustomerId = sq.ExternalCustomerId
		AND keyword1.CampaignId = sq.CampaignId
		AND keyword1.AdGroupId = sq.AdGroupId
		AND keyword1.CriterionId = sq.CriterionId
	WHERE
		TRUE
		AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
		AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
		AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
		AND keyword1.Status IN ( 'ENABLED', 'PAUSED' )
		AND NOT keyword1.IsNegative
		AND customer._LATEST_DATE = customer._DATA_DATE
		AND campaign._LATEST_DATE = campaign._DATA_DATE
		AND adgroup._LATEST_DATE = adgroup._DATA_DATE
		AND keyword1._LATEST_DATE = keyword1._DATA_DATE
)

-- query and ngram_stats
SELECT
	AccountName,
	CampaignName,
	AdGroupName,
	Criteria,
	KeywordMatchType,
	COUNT( Query ) AS QueryCount,
	query1.Date
FROM query1
GROUP BY
	AccountName,
	CampaignName,
	AdGroupName,
	Criteria,
	KeywordMatchType,
	Date