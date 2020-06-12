WITH
sq AS (
	SELECT
		Query
  FROM `biddy-io.AIRBNB_DEMAND_ENG_UK.SearchQueryStats_9013299573` sq
	WHERE TRUE
		AND DATE_DIFF( sq._LATEST_DATE, sq._DATA_DATE, DAY ) <= 30
	GROUP BY
		Query
),

ngram AS (
	SELECT
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
		END AS NGramWord
	FROM sq
	UNION ALL
	SELECT
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
		END AS NGramWord
	FROM sq
	UNION ALL
	SELECT
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
		END AS NGramWord
	FROM sq
	UNION ALL
	SELECT
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
		END AS NGramWord
	FROM sq
	UNION ALL
	SELECT
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
		END AS NGramWord
	FROM sq
	UNION ALL
	SELECT
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
		END AS NGramWord
	FROM sq
	UNION ALL
	SELECT
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
		END AS NGramWord
	FROM sq
	UNION ALL
	SELECT
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
		END AS NGramWord
	FROM sq
)

SELECT
  NGramWord
FROM
  ngram
WHERE TRUE
  AND NGramWord != ''
GROUP BY
  NGramWord