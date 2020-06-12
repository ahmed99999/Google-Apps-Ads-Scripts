
-- my_sql_query
WITH
Segments AS (
	SELECT
		REGEXP_REPLACE( Segment, '[äÄöÖüÜß]', '_' ) AS Segment,
		Entities
	FROM (
		-- relevant entities for each type
		SELECT
			Type AS Segment,
			ARRAY_AGG( DISTINCT Entity ) AS Entities,
			COUNT( DISTINCT Query ) AS CountQueries
		FROM `biddy-io.regression.nl_entities`
		WHERE TRUE
			AND Type IN (
				'LOCATION',
				'NUMBER',
				'ADDRESS',
				'PRICE',
				'EVENT'
			)
		GROUP BY
			Type
		UNION ALL
		-- relevant types + entities
		SELECT
			CONCAT( Type, '_' , UPPER( REGEXP_REPLACE( Entity, ' ', '_' ) ) ) AS Segment,
			[ Entity ] AS Entities,
			COUNT( DISTINCT Query ) AS CountQueries
		FROM `biddy-io.regression.nl_entities`
		WHERE TRUE
			AND Type IN (
				'LOCATION',
				'NUMBER',
				'ADDRESS',
				'PRICE',
				'EVENT'
			)
		GROUP BY
			Type,
			Entity
	)
	WHERE TRUE
		AND CountQueries > 10
	ORDER BY
		CountQueries
),
Predicates AS (
	SELECT
		CONCAT(
			'CAST ( ',
			STRING_AGG( CONCAT( 'REGEXP_CONTAINS( Query, \'', Entity ,'\' )' ) , ' OR ' ),
			' AS INT64 ) AS Is',
			CONCAT( UPPER( SUBSTR( Segment, 1, 1 ) ), LOWER( SUBSTR( Segment, 2 ) ) )
		) AS Predicate
	FROM Segments, UNNEST( Entities ) AS Entity
	WHERE TRUE
	GROUP BY
		Segment
)
SELECT
	CONCAT(
		'SELECT\n\tdata.*,\t\n',
		STRING_AGG( Predicate, ',\n\t' ),
		'\n\tFROM `biddy-io.regression.preprocessed_data` data'
	) AS Sql
FROM Predicates







LOCATION
NUMBER
ADDRESS
PRICE
EVENT

ORGANIZATION
CONSUMER_GOOD
WORK_OF_ART
PERSON





