-- prepare_data
WITH
sq AS (
	SELECT
		ExternalCustomerId, Query,
		
		SUM( Impressions ) AS SqImpressions,
		SUM( Clicks ) AS SqClicks,
		SUM( Cost ) / 1000000 AS SqCost,
		ROUND( SUM( Conversions ) ) AS SqConversions,
		ROUND( SUM( ConversionValue ) ) AS SqConversionValue
		
	FROM `biddy-io.peak_ace_active_clients_transfer.SearchQueryStats_1036246249` AS sq
	WHERE
		TRUE
		AND LENGTH( Query ) < 80
		AND sq.ExternalCustomerId = 7056468392
		AND DATE_DIFF( sq._LATEST_DATE, sq.Date, DAY ) <= 365
	GROUP BY
		ExternalCustomerId,
		Query
	HAVING TRUE
		AND SqClicks > 100
),
SearchQueriesGrouped AS (
	SELECT
		ExternalCustomerId, CampaignId, AdGroupId, CriterionId, Query,
		
		SUM( Impressions ) AS SqImpressions,
		SUM( Clicks ) AS SqClicks,
		ROUND( SUM( Cost ) / 1000000, 2 ) AS SqCost,
		ROUND( SUM( Conversions ) ) AS SqConversions,
		ROUND( SUM( ConversionValue ) ) AS SqConversionValue

	FROM sq
	JOIN `biddy-io.peak_ace_active_clients_transfer.SearchQueryStats_1036246249`
		USING ( ExternalCustomerId, Query )
	WHERE TRUE
		AND ExternalCustomerId = 7056468392
		AND DATE_DIFF( _LATEST_DATE, Date, DAY ) <= 365
	GROUP BY
		ExternalCustomerId, CampaignId, AdGroupId, CriterionId, Query
),
KeywordStatsGrouped AS (
	SELECT
		ExternalCustomerId, CampaignId, AdGroupId, CriterionId,
		
		SUM( Impressions ) AS Impressions,
		SUM( Clicks ) AS Clicks,
		SUM( Cost ) AS Cost,
		SUM( Conversions ) AS Conversions,
		SUM( ConversionValue ) AS ConversionValue
		
	FROM `biddy-io.peak_ace_active_clients_transfer.KeywordBasicStats_1036246249`
	WHERE TRUE
		AND ExternalCustomerId = 7056468392
		AND DATE_DIFF( _LATEST_DATE, Date, DAY ) <= 365
	GROUP BY
		ExternalCustomerId, CampaignId, AdGroupId, CriterionId
),
KeywordStats AS (
	SELECT
		ExternalCustomerId, Query,
		
		SUM( Impressions ) - SUM( SqImpressions ) AS KeywordImpressions,
		SUM( Clicks ) - SUM( SqClicks ) AS KeywordClicks,
		ROUND( ( SUM( Cost ) - SUM( SqCost ) ) / 1000000, 2 ) AS KeywordCost,
		ROUND( SUM( Conversions ) - SUM( SqConversions ) ) AS KeywordConversions,
		ROUND( SUM( ConversionValue ) - SUM( SqConversionValue ) ) AS KeywordConversionValue
		
	FROM KeywordStatsGrouped
	JOIN SearchQueriesGrouped
		USING( ExternalCustomerId, CampaignId, AdGroupId, CriterionId )
	GROUP BY
		ExternalCustomerId, Query
),
CrossDeviceGrouped AS (
	SELECT
		ExternalCustomerId, CampaignId, AdGroupId, CriterionId,
		
		AVG( AveragePageViews ) AS AveragePageViews,
		AVG( AverageTimeOnSite ) AS AverageTimeOnSite,
		AVG( BounceRate ) AS BounceRate
		
	FROM `biddy-io.peak_ace_active_clients_transfer.KeywordCrossDeviceStats_1036246249`
	WHERE TRUE
		AND ExternalCustomerId = 7056468392
		AND DATE_DIFF( _LATEST_DATE, Date, DAY ) <= 365
	GROUP BY
		ExternalCustomerId, CampaignId, AdGroupId, CriterionId
),
CrossDevice AS (
	SELECT
		ExternalCustomerId, Query,
		
		ROUND( AVG( AveragePageViews ) ) AS AveragePageViews,
		ROUND( AVG( AverageTimeOnSite ) ) AS AverageTimeOnSite,
		ROUND( AVG( BounceRate ) * 100 ) / 100 AS BounceRate
		
	FROM CrossDeviceGrouped
	JOIN SearchQueriesGrouped
		USING( ExternalCustomerId, CampaignId, AdGroupId, CriterionId )
	GROUP BY
		ExternalCustomerId, Query
),
NgramGrouped AS (
	SELECT
		ExternalCustomerId,
		Word,
		
		SUM( SqImpressions ) AS WordImpressions,
		SUM( SqClicks ) AS WordClicks,
		SUM( SqCost ) AS WordCost,
		SUM( SqConversions ) AS WordConversions,
		SUM( SqConversionValue ) AS WordConversionValue
		
	FROM sq,
	UNNEST( SPLIT( QUERY, ' ' ) ) as Word
	GROUP BY
		ExternalCustomerId,
		Word
	HAVING TRUE
		--AND COUNT(*) >= 10
		--AND LENGTH( Word ) > 2
),
Ngram AS (
	SELECT
		sq.ExternalCustomerId, sq.Query,
		
		SUM( WordImpressions ) - SUM( SqImpressions ) AS NgramImpressions,
		SUM( WordClicks ) - SUM( SqClicks ) AS NgramClicks,
		ROUND( ( SUM( WordCost ) - SUM( SqCost ) ) / 1000000, 2 ) AS NgramCost,
		ROUND( SUM( WordConversions ) - SUM( SqConversions ) ) AS NgramConversions,
		ROUND( SUM( WordConversionValue ) - SUM( SqConversionValue ) ) AS NgramConversionValue
		
	FROM sq
	JOIN NgramGrouped
		ON sq.ExternalCustomerId = NgramGrouped.ExternalCustomerId
		AND REGEXP_CONTAINS(
			CONCAT( ' ', Query, ' ' ),
			CONCAT( ' ', REGEXP_REPLACE( Word, '["\\\\$\\\\*\\\\+\\\\?]', '' ), ' ' )
		)
	GROUP BY
		ExternalCustomerId, Query
),
CampaignNegativeGrouped AS (
	SELECT
		ExternalCustomerId,
		Text
	FROM `biddy-io.peak_ace_active_clients_transfer.CampaignNegativeKeywords_1036246249`
		AS campaign_negative
	WHERE TRUE
		AND campaign_negative._LATEST_DATE = campaign_negative._DATA_DATE
		AND campaign_negative.ExternalCustomerId = 7056468392
	GROUP BY
		ExternalCustomerId,
		Text
),
CampaignNegative AS (
	SELECT
		sq.ExternalCustomerId, sq.Query,
		
		COUNT( Text ) AS CountCampaignNegative
		
	FROM sq
	LEFT JOIN CampaignNegativeGrouped
		ON sq.ExternalCustomerId = CampaignNegativeGrouped.ExternalCustomerId
		AND REGEXP_CONTAINS(
			CONCAT( ' ', Query, ' ' ),
			CONCAT( ' ', REGEXP_REPLACE( Text, '["\\\\$\\\\*\\\\+\\\\?]', '' ), ' ' )
		)
	GROUP BY
		sq.ExternalCustomerId, Query
),
BrandGrouped AS (
	SELECT
		7056468392 AS ExternalCustomerId,
		Brand_
	FROM `biddy-io.regression.dictionary`
	WHERE Brand_ IS NOT NULL
	GROUP BY
		ExternalCustomerId,
		Brand_
),
Brand AS (
	SELECT
		sq.ExternalCustomerId, sq.Query,
		
		COUNT( Brand_ ) AS CountBrand
		
	FROM sq
	LEFT JOIN BrandGrouped
		ON sq.ExternalCustomerId = BrandGrouped.ExternalCustomerId
		AND REGEXP_CONTAINS(
			CONCAT( ' ', Query, ' ' ),
			CONCAT( ' ', REGEXP_REPLACE( Brand_, '["\\\\$\\\\*\\\\+\\\\?]', '' ), ' ' )
		)
	GROUP BY
		ExternalCustomerId, Query
),
LocationGrouped AS (
	SELECT
		7056468392 AS ExternalCustomerId,
		Location
	FROM `biddy-io.regression.dictionary`
	WHERE Location IS NOT NULL
	GROUP BY
		ExternalCustomerId,
		Location
),
Location AS (
	SELECT
		sq.ExternalCustomerId, sq.Query,
		
		COUNT( Location ) AS CountLocation
		
	FROM sq
	LEFT JOIN LocationGrouped
		ON sq.ExternalCustomerId = LocationGrouped.ExternalCustomerId
		AND REGEXP_CONTAINS(
			CONCAT( ' ', Query, ' ' ),
			CONCAT( ' ', REGEXP_REPLACE( Location, '["\\\\$\\\\*\\\\+\\\\?]', '' ), ' ' )
		)
	GROUP BY
		ExternalCustomerId, Query
),
PropertyGrouped AS (
	SELECT
		7056468392 AS ExternalCustomerId,
		Property
	FROM `biddy-io.regression.dictionary`
	WHERE Property IS NOT NULL
	GROUP BY
		ExternalCustomerId,
		Property
),
Property AS (
	SELECT
		sq.ExternalCustomerId, sq.Query,
		
		COUNT( Property ) AS CountProperty
		
	FROM sq
	LEFT JOIN PropertyGrouped
		ON sq.ExternalCustomerId = PropertyGrouped.ExternalCustomerId
		AND REGEXP_CONTAINS(
			CONCAT( ' ', Query, ' ' ),
			CONCAT( ' ', REGEXP_REPLACE( Property, '["\\\\$\\\\*\\\\+\\\\?]', '' ), ' ' )
		)
	GROUP BY
		ExternalCustomerId, Query
),
adgroupNegativeGrouped AS (
	SELECT
		ExternalCustomerId,
		Criteria
	FROM `biddy-io.peak_ace_active_clients_transfer.Criteria_1036246249`
		AS negative
	WHERE TRUE
		AND negative.isNegative
		AND negative._LATEST_DATE = negative._DATA_DATE
		AND negative.ExternalCustomerId = 7056468392
	GROUP BY
		ExternalCustomerId,
		Criteria
),
adgroupNegative AS (
	SELECT
		sq.ExternalCustomerId, sq.Query,
		
		COUNT( Criteria ) AS CountAdGroupNegative
		
	FROM sq
	LEFT JOIN adgroupNegativeGrouped
		ON sq.ExternalCustomerId = adgroupNegativeGrouped.ExternalCustomerId
		AND REGEXP_CONTAINS(
			CONCAT( ' ', Query, ' ' ),
			CONCAT( ' ', REGEXP_REPLACE( Criteria, '["\\\\$\\\\*\\\\+\\\\?]', '' ), ' ' )
		)
	GROUP BY
		ExternalCustomerId, Query
),
keyword AS (
	SELECT
		ExternalCustomerId,
		Query,
		
		ROUND( AVG( QualityScore ) * 10 ) / 10 AS QualityScore
		
	FROM SearchQueriesGrouped
	JOIN `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249`
		USING( ExternalCustomerId, CampaignId, AdGroupId, CriterionId )
	WHERE TRUE
		AND ExternalCustomerId = 7056468392
		AND _LATEST_DATE = _DATA_DATE
		AND Status IN ( 'ENABLED', 'PAUSED' )
	GROUP BY
		ExternalCustomerId,
		Query
),
adGroup AS (
	SELECT
		ExternalCustomerId,
		Query
		
	FROM SearchQueriesGrouped
	JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249`
		USING( ExternalCustomerId, CampaignId, AdGroupId )
	WHERE TRUE
		AND ExternalCustomerId = 7056468392
		AND _LATEST_DATE = _DATA_DATE
		AND AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	GROUP BY
		ExternalCustomerId,
		Query
),
campaign AS (
	SELECT
		ExternalCustomerId,
		Query
	FROM SearchQueriesGrouped
	JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249`
		USING( ExternalCustomerId, CampaignId )
	--,UNNEST( SPLIT( REGEXP_REPLACE( Labels, '["\\\\[\\\\]]', '' ), ',' ) ) as Label
	WHERE TRUE
		AND ExternalCustomerId = 7056468392
		AND _LATEST_DATE = _DATA_DATE
		AND CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	GROUP BY
		ExternalCustomerId,
		Query
)
SELECT
	*,
	ROUND( ( SqConversions * 50 - SqCost ) / GREATEST( SqClicks, 1 ) * 100 )
		/ 100 AS QueryProfitPerClick,
	ROUND( ( NgramConversions * 50 - NgramCost ) / GREATEST( NgramClicks, 1 ) * 100 )
		/ 100 AS NgramProfitPerClick,
	ROUND( ( KeywordConversions * 50 - KeywordCost ) / GREATEST( KeywordClicks, 1 ) * 100 )
		/ 100 AS KeywordProfitPerClick,
	ROUND( KeywordCost / KeywordClicks * 100 ) / 100 AS KeywordAvgCpc
FROM sq
JOIN campaign
	USING( ExternalCustomerId, Query )
JOIN adGroup
	USING( ExternalCustomerId, Query )
JOIN keyword
	USING( ExternalCustomerId, Query )
LEFT JOIN CampaignNegative
	USING( ExternalCustomerId, Query )
LEFT JOIN adgroupNegative
	USING( ExternalCustomerId, Query )
LEFT JOIN Ngram
	USING( ExternalCustomerId, Query )
LEFT JOIN CrossDevice
	USING( ExternalCustomerId, Query )
LEFT JOIN KeywordStats
	USING( ExternalCustomerId, Query )
LEFT JOIN Brand
	USING( ExternalCustomerId, Query )
LEFT JOIN Location
	USING( ExternalCustomerId, Query )
LEFT JOIN Property
	USING( ExternalCustomerId, Query )
WHERE TRUE
--	AND Query = 'a undo'
ORDER BY
	ExternalCustomerId,
	Query


