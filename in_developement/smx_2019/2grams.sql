WITH

sq AS (
	SELECT
		ExternalCustomerId,
		Query,
		SUM( Conversions ) AS Conversions,
		SUM( Clicks ) AS Clicks,
		SUM( Cost ) / 1000000 AS Cost,
		SUM( ConversionValue) AS ConversionValue,
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
),

ngram AS (
	SELECT
		2 AS arity,
		CASE
			WHEN
				LENGTH( Query ) - LENGTH( REPLACE( Query, ' ', '' ) ) + 1 > 2
			THEN
				CONCAT(
					SPLIT( Query, ' ' )[ OFFSET ( 0 ) ],
					' ',
					SPLIT( Query, ' ' )[ OFFSET ( 1 ) ]
				)
			ELSE
				''
		END AS NGramWord,
		sq.*
	FROM sq
	UNION ALL
	SELECT
		2 AS arity,
		CASE
			WHEN
				LENGTH( Query ) - LENGTH( REPLACE( Query, ' ', '' ) ) + 1 > 3
			THEN
				CONCAT(
					SPLIT( Query, ' ' )[ OFFSET ( 1 ) ],
					' ',
					SPLIT( Query, ' ' )[ OFFSET ( 2 ) ]
				)
			ELSE
				''
		END AS NGramWord,
		sq.*
	FROM sq
	UNION ALL
	SELECT
		2 AS arity,
		CASE
			WHEN
				LENGTH( Query ) - LENGTH( REPLACE( Query, ' ', '' ) ) + 1 > 4
			THEN
				CONCAT(
					SPLIT( Query, ' ' )[ OFFSET ( 2 ) ],
					' ',
					SPLIT( Query, ' ' )[ OFFSET ( 3 ) ]
				)
			ELSE
				''
		END AS NGramWord,
		sq.*
	FROM sq
	UNION ALL
	SELECT
		2 AS arity,
		CASE
			WHEN
				LENGTH( Query ) - LENGTH( REPLACE( Query, ' ', '' ) ) + 1 > 5
			THEN
				CONCAT(
					SPLIT( Query, ' ' )[ OFFSET ( 3 ) ],
					' ',
					SPLIT( Query, ' ' )[ OFFSET ( 4 ) ]
				)
			ELSE
				''
		END AS NGramWord,
		sq.*
	FROM sq
	UNION ALL
	SELECT
		3 AS arity,
		CASE
			WHEN
				LENGTH( Query ) - LENGTH( REPLACE( Query, ' ', '' ) ) + 1 > 3
			THEN
				CONCAT(
					SPLIT( Query, ' ' )[ OFFSET ( 0 ) ],
					' ',
					SPLIT( Query, ' ' )[ OFFSET ( 1 ) ],
					' ',
					SPLIT( Query, ' ' )[ OFFSET ( 2 ) ]
				)
			ELSE
				''
		END AS NGramWord,
		sq.*
	FROM sq
	UNION ALL
	SELECT
		3 AS arity,
		CASE
			WHEN
				LENGTH( Query ) - LENGTH( REPLACE( Query, ' ', '' ) ) + 1 > 4
			THEN
				CONCAT(
					SPLIT( Query, ' ' )[ OFFSET ( 1 ) ],
					' ',
					SPLIT( Query, ' ' )[ OFFSET ( 2 ) ],
					' ',
					SPLIT( Query, ' ' )[ OFFSET ( 3 ) ]
				)
			ELSE
				''
		END AS NGramWord,
		sq.*
	FROM sq
	UNION ALL
	SELECT
		3 AS arity,
		CASE
			WHEN
				LENGTH( Query ) - LENGTH( REPLACE( Query, ' ', '' ) ) + 1 > 5
			THEN
				CONCAT(
					SPLIT( Query, ' ' )[ OFFSET ( 2 ) ],
					' ',
					SPLIT( Query, ' ' )[ OFFSET ( 3 ) ],
					' ',
					SPLIT( Query, ' ' )[ OFFSET ( 4 ) ]
				)
			ELSE
				''
		END AS NGramWord,
		sq.*
	FROM sq
	UNION ALL
	SELECT
		3 AS arity,
		CASE
			WHEN
				LENGTH( Query ) - LENGTH( REPLACE( Query, ' ', '' ) ) + 1 > 6
			THEN
				CONCAT(
					SPLIT( Query, ' ' )[ OFFSET ( 3 ) ],
					' ',
					SPLIT( Query, ' ' )[ OFFSET ( 4 ) ],
					' ',
					SPLIT( Query, ' ' )[ OFFSET ( 5 ) ]
				)
			ELSE
				''
		END AS NGramWord,
		sq.*
	FROM sq
),

ngram23 AS (
	SELECT
		ExternalCustomerId,
		arity,
		NGramWord,
		SUM( Conversions ) AS Conversions,
		SUM( Clicks ) AS Clicks,
		SUM( Cost ) AS Cost,
		SUM( ConversionValue) AS ConversionValue,
		Count(*) AS CountQueries,
		Date,
		ROUND( AVG( QueryLength ) * 10 ) / 10 AS AvgQueryLength,
		ROUND( AVG( CountWords ) * 10 ) / 10 AS AvgCountWords
	FROM ngram
	WHERE NGramWord != ''
	GROUP BY
		ExternalCustomerId,
		arity,
		NGramWord,
		Date
),

ngram1 AS (
	SELECT
		ExternalCustomerId,
		1 AS arity,
		NGramWord,
		ROUND( SUM( Conversions ) ) AS Conversions,
		SUM( Clicks ) AS Clicks,
		SUM( Cost ) AS Cost,
		ROUND( SUM( ConversionValue ) ) AS ConversionValue,
		Count(*) AS CountQueries,
		Date,
		ROUND( AVG( QueryLength ) * 10 ) / 10 AS AvgQueryLength,
		ROUND( AVG( CountWords ) * 10 ) / 10 AS AvgCountWords
	FROM sq,
	UNNEST( SPLIT( Query, ' ' ) ) as NGramWord
	GROUP BY
		ExternalCustomerId,
		NGramWord,
		Date
	HAVING TRUE
		--AND LENGTH( NGramWord ) > 2
		--AND Count > 1
),

allNgrams as (
	SELECT
		*
	FROM ngram23
	UNION ALL
	SELECT
		*
	FROM ngram1
)

SELECT
	*
FROM allNgrams
ORDER BY
	Clicks DESC