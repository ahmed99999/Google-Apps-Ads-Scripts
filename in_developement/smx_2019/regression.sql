WITH
analytics AS (
	SELECT
		ExternalCustomerId,
		CampaignId,
		AdGroupId,
		CriterionId,
		ROUND( AVG( AveragePageViews ) ) AS AveragePageViews,
		ROUND( AVG( AverageTimeOnSite ) ) AS AverageTimeOnSite,
		ROUND( AVG( BounceRate ) * 100 ) / 100 AS BounceRate
	FROM `biddy-io.peak_ace_active_clients_transfer.KeywordCrossDeviceStats_1036246249`
	WHERE TRUE
		AND ExternalCustomerId = 7056468392
		AND DATE_DIFF( _LATEST_DATE, Date, DAY ) <= 365
	GROUP BY
		ExternalCustomerId,
		CampaignId,
		AdGroupId,
		CriterionId
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
		ROUND( SUM( ConversionValue ) ) AS ConversionValue
	FROM `biddy-io.peak_ace_active_clients_transfer.KeywordBasicStats_1036246249`
	WHERE TRUE
		AND ExternalCustomerId = 7056468392
		AND DATE_DIFF( _LATEST_DATE, Date, DAY ) <= 365
	GROUP BY
		ExternalCustomerId,
		CampaignId,
		AdGroupId,
		CriterionId
),

ngram AS (
	SELECT
		ExternalCustomerId,
		Word1 AS Word,
		ROUND( SUM( Conversions ) ) AS Conversions,
		SUM( Clicks ) AS Clicks,
		SUM( Cost ) / 1000000 AS Cost,
		ROUND( SUM( ConversionValue ) ) AS ConversionValue,
		COUNT(*) as Count
	FROM (
		SELECT
			ExternalCustomerId,
			Query,
			SUM( Conversions ) AS Conversions,
			SUM( Clicks ) AS Clicks,
			SUM( Cost ) AS Cost,
			SUM( ConversionValue) AS ConversionValue,
			SPLIT( Query, ' ' ) as Word
		FROM `biddy-io.peak_ace_active_clients_transfer.SearchQueryStats_1036246249` AS sq
		WHERE TRUE
			AND sq.ExternalCustomerId = 7056468392
			AND DATE_DIFF( sq._LATEST_DATE, sq._DATA_DATE, DAY ) <= 365
		GROUP BY
			ExternalCustomerId,
			Query
	) as x,
	UNNEST( Word ) as Word1
	GROUP BY
		ExternalCustomerId,
		Word1
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
		--AdNetworkType1,
		--AdFormat,
		--Device,
		--QueryMatchTypeWithVariant,
		--QueryTargetingStatus,
		ROUND( SUM( sq.Conversions ) ) AS Conversions,
		SUM( sq.Clicks ) AS Clicks,
		SUM( sq.Cost ) / 1000000 AS Cost,
		ROUND( SUM( sq.ConversionValue ) ) AS ConversionValue
	FROM `biddy-io.peak_ace_active_clients_transfer.SearchQueryStats_1036246249` AS sq
	WHERE
		TRUE
		AND LENGTH( Query ) < 80
		AND sq.ExternalCustomerId = 7056468392
		AND DATE_DIFF( sq._LATEST_DATE, sq.Date, DAY ) <= 365
	GROUP BY
		ExternalCustomerId,
		CampaignId,
		AdGroupId,
		CriterionId,
		Query
	HAVING TRUE
		AND Clicks > 100
),


query1 AS (
	SELECT
		sq.ExternalCustomerId,
		sq.CampaignId,
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
		keyword1.QualityScore AS QualityScore
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
	JOIN keyword
		ON keyword.ExternalCustomerId = sq.ExternalCustomerId
		AND keyword.CampaignId = sq.CampaignId
		AND keyword.AdGroupId = sq.AdGroupId
		AND keyword.CriterionId = sq.CriterionId
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


query2 AS (
	SELECT
		query1.ExternalCustomerId,
		query1.CampaignId,
		AccountName,
		CampaignName,
		Query,
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
		
		ANY_VALUE( QualityScore ) AS QualityScore,
		LENGTH( Query ) AS Length
	FROM query1
	JOIN ngram
		ON REGEXP_CONTAINS(
			CONCAT( ' ', Query, ' ' ),
			CONCAT( ' ', REGEXP_REPLACE( Word, '["\\\\$\\\\*\\\\+\\\\?]', '' ), ' ' )
		)
	GROUP BY
		query1.ExternalCustomerId,
		query1.CampaignId,
		AccountName,
		CampaignName,
		Query
),


query3 AS (

	SELECT
		query2.ExternalCustomerId,
		query2.CampaignId,
		query2.AccountName,
		query2.CampaignName,
		query2.Query,
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
		query2.Length,
		
		COUNT( campaign_negative.Text ) AS CountCampaignNegative
		
	FROM query2
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
		query2.AccountName,
		query2.CampaignName,
		query2.Query,
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
		query2.Length
	
)



SELECT
	query3.AccountName,
	query3.Query,
	
	SUM( query3.QueryConversions ) AS QueryConversions,
	SUM( query3.QueryClicks ) AS QueryClicks,
	SUM( query3.QueryCost ) AS QueryCost,
	SUM( query3.QueryConversionValue ) AS QueryConversionValue,
	ROUND(
			( SUM( query3.QueryConversions ) * 50 - SUM( query3.QueryCost ) )
			/ GREATEST( SUM( query3.QueryClicks ), 1 ) * 100 ) / 100 AS QueryProfit_per_click,
	
	SUM( query3.NgramConversions ) AS NgramConversions,
	SUM( query3.NgramClicks ) AS NgramClicks,
	SUM( query3.NgramCost ) AS NgramCost,
	SUM( query3.NgramConversionValue ) AS NgramConversionValue,
	ROUND(
			( ( SUM( query3.NgramConversions ) - SUM( query3.QueryConversions ) ) * 50 
			- ( SUM( query3.NgramCost ) - SUM( query3.QueryCost ) ) )
			/ GREATEST( ( SUM( query3.NgramClicks ) - SUM( query3.QueryClicks ) ), 1 ) * 100 )
			/ 100 AS NgramProfit_per_click,
	
	SUM( query3.KeywordConversions ) AS KeywordConversions,
	SUM( query3.KeywordClicks ) AS KeywordClicks,
	SUM( query3.KeywordCost ) AS KeywordCost,
	SUM( query3.KeywordConversionValue ) AS KeywordConversionValue,
	ROUND(
			( ( SUM( query3.KeywordConversions ) - SUM( query3.QueryConversions ) ) * 50 
				- ( SUM( query3.KeywordCost ) - SUM( query3.QueryCost ) ) )
			/ GREATEST( ( SUM( query3.KeywordClicks ) - SUM( query3.QueryClicks ) ), 1 ) * 100 )
			/ 100 AS KeywordProfit_per_click,
	
	AVG( query3.AveragePageViews ) AS AveragePageViews,
	AVG( query3.AverageTimeOnSite ) AS AverageTimeOnSite,
	AVG( query3.BounceRate ) AS BounceRate,
	
	AVG( query3.QualityScore ) AS QualityScore,
	AVG( query3.Length ) AS Length,
	ROUND( ( SUM( query3.QueryCost ) )
		/ GREATEST( SUM( query3.QueryClicks ), 1 ) * 100 ) / 100 AS QueryAvgCpc,
	
	SUM( query3.CountCampaignNegative ) AS CountCampaignNegative,
	COUNT( adgroup_negative.Criteria ) AS CountAdGroupNegative
	
FROM query3
LEFT JOIN adgroup_negative
	ON  adgroup_negative.ExternalCustomerId = query3.ExternalCustomerId
	AND adgroup_negative.CampaignId = query3.CampaignId
	--AND adgroup_negative.AdGroupId = query3.AdGroupId
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
	query3.AccountName,
	--query3.CampaignName,
	query3.Query
	
