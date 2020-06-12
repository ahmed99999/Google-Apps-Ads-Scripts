WITH

ngram AS (
	SELECT
		ExternalCustomerId,
		1 AS arity,
		Word1 AS Word,
		ROUND( SUM( Conversions ) ) AS Conversions,
		SUM( Clicks ) AS Clicks,
		SUM( Cost ) / 1000000 AS Cost,
		ROUND( SUM( ConversionValue ) ) AS ConversionValue,
		COUNT(*) as Count,
		Date,
		ROUND( AVG( QueryLength ) * 10 ) / 10 AS AvgQueryLength,
		ROUND( AVG( CountWords ) * 10 ) / 10 AS AvgCountWords
	FROM (
		SELECT
			ExternalCustomerId,
			Query,
			SUM( Conversions ) AS Conversions,
			SUM( Clicks ) AS Clicks,
			SUM( Cost ) AS Cost,
			SUM( ConversionValue) AS ConversionValue,
			SPLIT( Query, ' ' ) as Word,
			Date,
			LENGTH( Query ) AS QueryLength,
			ARRAY_LENGTH( SPLIT( Query, ' ' ) ) AS CountWords
		FROM `biddy-io.peak_ace_active_clients_transfer.SearchQueryStats_1036246249` AS sq
		WHERE TRUE
			AND sq.ExternalCustomerId = 7056468392
			AND DATE_DIFF( sq._LATEST_DATE, sq._DATA_DATE, DAY ) <= 365
		GROUP BY
			ExternalCustomerId,
			Query,
			Date
		ORDER BY
			ExternalCustomerId,
			Query,
			Date
		--LIMIT 100
	) as x,
	UNNEST( Word ) as Word1
	GROUP BY
		ExternalCustomerId,
		Word1,
		Date
	HAVING TRUE
		AND LENGTH( Word1 ) > 2
		AND Count > 1
)

SELECT * FROM ngram

