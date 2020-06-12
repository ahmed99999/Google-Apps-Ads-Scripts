SELECT
  NGramWord
FROM (
SELECT 
  Query
FROM `biddy-io.AIRBNB_DEMAND_ENG_UK.SearchQueryStats_9013299573` sq
WHERE TRUE
		AND DATE_DIFF( sq._LATEST_DATE, sq._DATA_DATE, DAY ) <= 30
GROUP BY
  Query
),
	UNNEST( SPLIT( Query, ' ' ) ) as NGramWord
GROUP BY
  NGramWord