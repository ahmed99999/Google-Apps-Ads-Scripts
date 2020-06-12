
-- raw_data
WITH
analytics AS (
	SELECT
		ExternalCustomerId,
		CampaignId,
		AdGroupId,
		CriterionId,
		ROUND( AVG( AveragePageViews ) ) AS AveragePageViews,
		ROUND( AVG( AverageTimeOnSite ) ) AS AverageTimeOnSite,
		ROUND( AVG( BounceRate ) * 100 ) / 100 AS BounceRate,
		Date
	FROM `biddy-io.peak_ace_active_clients_transfer.KeywordCrossDeviceStats_1036246249`
	WHERE TRUE
		AND ExternalCustomerId = 7056468392
		AND DATE_DIFF( _LATEST_DATE, Date, DAY ) <= 365
	GROUP BY
		ExternalCustomerId,
		CampaignId,
		AdGroupId,
		CriterionId,
		Date
),



keyword AS (
	SELECT
		ExternalCustomerId,
		CampaignId,
		AdGroupId,
		CriterionId,
		ROUND( SUM( Conversions ) ) AS Conversions,
		SUM( Clicks ) AS Clicks,
		SUM( Cost ) / 1000000 AS Cost,
		ROUND( SUM( ConversionValue ) ) AS ConversionValue,
		Date,
		AdNetworkType1,
		Device
	FROM `biddy-io.peak_ace_active_clients_transfer.KeywordBasicStats_1036246249`
	WHERE TRUE
		AND ExternalCustomerId = 7056468392
		AND DATE_DIFF( _LATEST_DATE, Date, DAY ) <= 365
	GROUP BY
		ExternalCustomerId,
		CampaignId,
		AdGroupId,
		CriterionId,
		Date,
		AdNetworkType1,
		Device
),

ngram AS (
	SELECT
		ExternalCustomerId,
		Word1 AS Word,
		ROUND( SUM( Conversions ) ) AS Conversions,
		SUM( Clicks ) AS Clicks,
		SUM( Cost ) / 1000000 AS Cost,
		ROUND( SUM( ConversionValue ) ) AS ConversionValue,
		COUNT(*) as Count,
		Date
	FROM (
		SELECT
			ExternalCustomerId,
			Query,
			SUM( Conversions ) AS Conversions,
			SUM( Clicks ) AS Clicks,
			SUM( Cost ) AS Cost,
			SUM( ConversionValue) AS ConversionValue,
			SPLIT( Query, ' ' ) as Word,
			Date
		FROM `biddy-io.peak_ace_active_clients_transfer.SearchQueryStats_1036246249` AS sq
		WHERE TRUE
			AND sq.ExternalCustomerId = 7056468392
			AND DATE_DIFF( sq._LATEST_DATE, sq._DATA_DATE, DAY ) <= 365
		GROUP BY
			ExternalCustomerId,
			Query,
			Date
	) as x,
	UNNEST( Word ) as Word1
	GROUP BY
		ExternalCustomerId,
		Word1,
		Date
	HAVING
		Count >= 10
		AND LENGTH( Word ) > 2
),

sq AS (
	SELECT
		ExternalCustomerId,
		CampaignId,
		AdGroupId,
		CriterionId,
		Query,
		AdNetworkType1, -- attribute ( SEARCH / CONTENT / YOUTUBE_SEARCH / .. )
		--AdFormat, -- segment ( text / image / ... )
		Device, -- segment ( desktop / tablet / connected_tv / .. )
		QueryMatchTypeWithVariant,
			-- segment ( auto / broad / exact / expanded / phrase / near_exact / near_phrase
		QueryTargetingStatus, -- attribute ( added / excluded / both / none )
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
		--AdFormat,
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
		sq.CampaignId,
		sq.AdGroupId,
		--sq.CriterionId,
		ifnull( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,
		Query,
		campaign.CampaignName,
		adgroup.AdGroupName,
		keyword1.Criteria,
		sq.Conversions AS Conversions,
		sq.Clicks AS Clicks,
		sq.Cost AS Cost,
		sq.ConversionValue AS ConversionValue,
		keyword.Conversions AS KeywordConversions,
		keyword.Clicks AS KeywordClicks,
		keyword.Cost AS KeywordCost,
		keyword.ConversionValue AS KeywordConversionValue,
		AveragePageViews AS AveragePageViews,
		AverageTimeOnSite AS AverageTimeOnSite,
		BounceRate AS BounceRate,
		keyword1.QualityScore AS QualityScore,
		sq.AdNetworkType1,
		--AdFormat,
		sq.Device,
		sq.QueryMatchTypeWithVariant,
		sq.QueryTargetingStatus,
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
	JOIN analytics
		ON analytics.ExternalCustomerId = sq.ExternalCustomerId
		AND analytics.CampaignId = sq.CampaignId
		AND analytics.AdGroupId = sq.AdGroupId
		AND analytics.CriterionId = sq.CriterionId
		AND analytics.Date = sq.Date
	LEFT JOIN keyword
		ON keyword.ExternalCustomerId = sq.ExternalCustomerId
		AND keyword.CampaignId = sq.CampaignId
		AND keyword.AdGroupId = sq.AdGroupId
		AND keyword.CriterionId = sq.CriterionId
		AND keyword.Date = sq.Date
		AND keyword.AdNetworkType1 = sq.AdNetworkType1
		AND keyword.Device = sq.Device
		AND keyword1.KeywordMatchType = sq.QueryMatchTypeWithVariant
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
),





query2 AS (
	SELECT
		query1.ExternalCustomerId,
		query1.CampaignId,
		query1.AdGroupId,
		query1.AccountName,
		query1.CampaignName,
		query1.AdGroupName,
		query1.Criteria,
		query1.Query,
		ROUND( ANY_VALUE( query1.Conversions ) ) AS QueryConversions,
		ANY_VALUE( query1.Clicks ) AS QueryClicks,
		ROUND( ANY_VALUE( query1.Cost ) * 100 ) / 100 AS QueryCost,
		ROUND( ANY_VALUE( query1.ConversionValue ) ) AS QueryConversionValue,
		ROUND( 
			( ANY_VALUE( query1.Conversions ) * 50 - ANY_VALUE( query1.Cost ) )
			/ GREATEST( ANY_VALUE( query1.Clicks ), 1 ) * 100 ) / 100 AS QueryProfit_per_click,
			
		ROUND( SUM( ngram.Conversions ) ) AS NgramConversions,
		SUM( ngram.Clicks ) AS NgramClicks,
		ROUND( SUM( ngram.Cost ) * 100 ) / 100 AS NgramCost,
		ROUND( SUM( ngram.ConversionValue ) ) AS NgramConversionValue,
		ROUND( ( SUM( ngram.Conversions ) * 50 - SUM( ngram.Cost ) ) 
			/ GREATEST( SUM( ngram.Clicks ), 1 ) * 100 ) / 100 AS NgramProfit_per_click,
		
		ROUND( ANY_VALUE( KeywordConversions ) ) AS KeywordConversions,
		ANY_VALUE( KeywordClicks ) AS KeywordClicks,
		ROUND( ANY_VALUE( KeywordCost ) * 100 ) / 100 AS KeywordCost,
		ROUND( ANY_VALUE( KeywordConversionValue ) ) AS KeywordConversionValue,
		ROUND( ( ANY_VALUE( KeywordConversions ) * 50 - ANY_VALUE( KeywordCost ) ) 
			/ GREATEST( ANY_VALUE( KeywordClicks ), 1 ) * 100 ) / 100 AS KeywordProfit_per_click,
		
		ROUND( ANY_VALUE( AveragePageViews ) ) AS AveragePageViews,
		ROUND( ANY_VALUE( AverageTimeOnSite ) ) AS AverageTimeOnSite,
		ROUND( ANY_VALUE( BounceRate ) * 100 ) / 100 AS BounceRate,
		
		ANY_VALUE( query1.QualityScore ) AS QualityScore,
		LENGTH( query1.Query ) AS QueryLength,
		ARRAY_LENGTH( SPLIT( query1.Query, ' ' ) ) AS CountWords,
		
		AdNetworkType1 AS AdNetworkType1,
		--AdFormat AS AdFormat,
		Device AS Device,
		QueryMatchTypeWithVariant AS QueryMatchTypeWithVariant,
		QueryTargetingStatus AS QueryTargetingStatus,
		query1.Date
	FROM query1
	LEFT JOIN ngram
		ON TRUE
		AND ngram.ExternalCustomerId = query1.ExternalCustomerId
		AND REGEXP_CONTAINS(
			CONCAT( ' ', Query, ' ' ),
			CONCAT( ' ', REGEXP_REPLACE( Word, '["\\\\$\\\\*\\\\+\\\\?]', '' ), ' ' )
		)
		AND query1.Date = ngram.Date
	GROUP BY
		query1.ExternalCustomerId,
		query1.CampaignId,
		query1.AdGroupId,
		AccountName,
		CampaignName,
		AdGroupName,
		Criteria,
		Query,
		AdNetworkType1,
		Device,
		QueryMatchTypeWithVariant,
		QueryTargetingStatus,
		Date
),


campaign_negative AS (
	SELECT
		ExternalCustomerId,
		CampaignId,
		Text
	FROM `biddy-io.peak_ace_active_clients_transfer.CampaignNegativeKeywords_1036246249`
		AS campaign_negative
	WHERE TRUE
		AND campaign_negative._LATEST_DATE = campaign_negative._DATA_DATE
		AND campaign_negative.ExternalCustomerId = 7056468392
),

adgroup_negative AS (
	SELECT
		ExternalCustomerId,
		CampaignId,
		AdGroupId,
		Criteria
	FROM `biddy-io.peak_ace_active_clients_transfer.Criteria_1036246249`
		AS negative
	WHERE TRUE
		AND negative.isNegative
		AND negative._LATEST_DATE = negative._DATA_DATE
		AND negative.ExternalCustomerId = 7056468392
),


query3 AS (
	SELECT
		query2.ExternalCustomerId,
		query2.CampaignId,
		query2.AdGroupId,
		query2.AccountName,
		query2.CampaignName,
		query2.AdGroupName,
		query2.Criteria,
		query2.Query,
		query2.AdNetworkType1,
		query2.Device,
		query2.QueryMatchTypeWithVariant,
		query2.QueryTargetingStatus,
		query2.Date,
		
		query2.QueryConversions,
		query2.QueryClicks,
		query2.QueryCost,
		query2.QueryConversionValue,
		query2.QueryProfit_per_click,
		
		query2.NgramConversions,
		query2.NgramClicks,
		query2.NgramCost,
		query2.NgramConversionValue,
		query2.NgramProfit_per_click,
			
		query2.KeywordConversions,
		query2.KeywordClicks,
		query2.KeywordCost,
		query2.KeywordConversionValue,
		query2.KeywordProfit_per_click,
		
		query2.AveragePageViews,
		query2.AverageTimeOnSite,
		query2.BounceRate,
		
		query2.QualityScore,
		query2.QueryLength,
		query2.CountWords,
		
		COUNT( campaign_negative.Text ) AS CountCampaignNegatives
	FROM
		query2
	LEFT JOIN campaign_negative
		ON  campaign_negative.ExternalCustomerId = query2.ExternalCustomerId
			AND campaign_negative.CampaignId = query2.CampaignId
		AND REGEXP_CONTAINS(
			CONCAT( ' ', LOWER( Query ), ' ' ),
			CONCAT(
				' ',
				REGEXP_REPLACE(
					LOWER( campaign_negative.Text ),
					'["\\\\$\\\\*\\\\+\\\\?]',
					''
				),
				' '
			)
		)
	GROUP BY
		query2.ExternalCustomerId,
		query2.CampaignId,
		query2.AdGroupId,
		query2.AccountName,
		query2.CampaignName,
		query2.AdGroupName,
		query2.Criteria,
		query2.Query,
		query2.AdNetworkType1,
		query2.Device,
		query2.QueryMatchTypeWithVariant,
		query2.QueryTargetingStatus,
		query2.Date,
		
		query2.QueryConversions,
		query2.QueryClicks,
		query2.QueryCost,
		query2.QueryConversionValue,
		query2.QueryProfit_per_click,
		
		query2.NgramConversions,
		query2.NgramClicks,
		query2.NgramCost,
		query2.NgramConversionValue,
		query2.NgramProfit_per_click,
			
		query2.KeywordConversions,
		query2.KeywordClicks,
		query2.KeywordCost,
		query2.KeywordConversionValue,
		query2.KeywordProfit_per_click,
		
		query2.AveragePageViews,
		query2.AverageTimeOnSite,
		query2.BounceRate,
		
		query2.QualityScore,
		query2.QueryLength,
		query2.CountWords
),





query4 AS (
	SELECT
		query3.ExternalCustomerId,
		query3.CampaignId,
		query3.AdGroupId,
		query3.AccountName,
		query3.CampaignName,
		query3.AdGroupName,
		query3.Criteria,
		query3.Query,
		query3.AdNetworkType1,
		query3.Device,
		query3.QueryMatchTypeWithVariant,
		query3.QueryTargetingStatus,
		query3.Date,
		
		query3.QueryConversions,
		query3.QueryClicks,
		query3.QueryCost,
		query3.QueryConversionValue,
		query3.QueryProfit_per_click,
		
		query3.NgramConversions,
		query3.NgramClicks,
		query3.NgramCost,
		query3.NgramConversionValue,
		query3.NgramProfit_per_click,
		
		query3.KeywordConversions,
		query3.KeywordClicks,
		query3.KeywordCost,
		query3.KeywordConversionValue,
		query3.KeywordProfit_per_click,
		
		query3.AveragePageViews,
		query3.AverageTimeOnSite,
		query3.BounceRate,
		
		query3.QualityScore,
		query3.QueryLength,
		query3.CountWords,
		
		query3.CountCampaignNegatives,
		
		COUNT( adgroup_negative.Criteria ) AS CountAdGroupNegatives
	FROM
		query3
	LEFT JOIN adgroup_negative
		ON  adgroup_negative.ExternalCustomerId = query3.ExternalCustomerId
		AND adgroup_negative.CampaignId = query3.CampaignId
		AND adgroup_negative.AdGroupId = query3.AdGroupId
		AND REGEXP_CONTAINS(
			CONCAT( ' ', LOWER( Query ), ' ' ),
			CONCAT(
				' ',
				REGEXP_REPLACE(
					LOWER( adgroup_negative.Criteria ),
					'["\\\\$\\\\*\\\\+\\\\?]',
					''
				),
				' '
			)
		)
	GROUP BY
		query3.ExternalCustomerId,
		query3.CampaignId,
		query3.AdGroupId,
		query3.AccountName,
		query3.CampaignName,
		query3.AdGroupName,
		query3.Criteria,
		query3.Query,
		query3.AdNetworkType1,
		query3.Device,
		query3.QueryMatchTypeWithVariant,
		query3.QueryTargetingStatus,
		query3.Date,
		
		query3.QueryConversions,
		query3.QueryClicks,
		query3.QueryCost,
		query3.QueryConversionValue,
		query3.QueryProfit_per_click,
		
		query3.NgramConversions,
		query3.NgramClicks,
		query3.NgramCost,
		query3.NgramConversionValue,
		query3.NgramProfit_per_click,
			
		query3.KeywordConversions,
		query3.KeywordClicks,
		query3.KeywordCost,
		query3.KeywordConversionValue,
		query3.KeywordProfit_per_click,
		
		query3.AveragePageViews,
		query3.AverageTimeOnSite,
		query3.BounceRate,
		
		query3.QualityScore,
		query3.QueryLength,
		query3.CountWords,
		
		query3.CountCampaignNegatives 
)


SELECT *
FROM query4