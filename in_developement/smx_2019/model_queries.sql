


-- predict
SELECT
	--CampaignName,
	Query,
	round( predicted_label * 100 ) / 100 as predicted,
	QueryProfit_per_click,
	NgramProfit_per_click,
	KeywordProfit_per_click,
	AveragePageViews,
	AverageTimeOnSite,
	BounceRate,
	CountCampaignNegative,
	CountAdGroupNegative,
	QueryAvgCpc,
	QueryConversions,
	QueryClicks,
	QueryCost,
	QueryConversionValue,
	NgramConversions,
	NgramClicks,
	NgramCost,
	NgramConversionValue,
	KeywordConversions,
	KeywordClicks,
	KeywordCost,
	KeywordConversionValue,
	QualityScore,
	Length
FROM
	ML.PREDICT(
		MODEL `biddy-io.regression.my_model`,
		( SELECT *
			FROM `biddy-io.regression.ao_data2`
		)
	)















-- create model
CREATE OR REPLACE MODEL `biddy-io.regression.my_model`
OPTIONS
  ( model_type='linear_reg', OPTIMIZE_STRATEGY='NORMAL_EQUATION' ) AS
SELECT
	--CampaignName,
	NgramProfit_per_click,
	KeywordProfit_per_click,
	QueryProfit_per_click as label,
	AveragePageViews,
	AverageTimeOnSite,
	BounceRate,
	QualityScore,
	Length,
	CountCampaignNegative,
	CountAdGroupNegative,
	QueryAvgCpc
FROM
  `biddy-io.regression.ao_data2`
WHERE TRUE




-- weights
SELECT
  processed_input as Column,
  ROUND( weight * 1000 ) / 1000 AS Weight
FROM
  ML.WEIGHTS( MODEL `biddy-io.regression.my_model` )


-- 





WITH
MIN1 AS (
  SELECT
    MIN( QueryProfitPerClick ) as min2
  FROM `biddy-io.smx_2019.preprocessed_data2`
),
MAX1 AS (
  SELECT
    MAX( QueryProfitPerClick ) as max2
  FROM `biddy-io.smx_2019.preprocessed_data2`
),
RANGE1 AS (
  SELECT max2 - min2 as range2
  FROM MIN1
  JOIN MAX1
  ON TRUE
)
SELECT
  x.*,
  ROUND( CASE
    WHEN QueryProfitPerClick <= min2 + range2 * 1 / 3 THEN min2 + ( range2 * 1 / 2 / 3 )
    WHEN QueryProfitPerClick <= min2 + range2 * 2 / 3 THEN min2 + ( range2 * 3 / 2 / 3 )
    WHEN QueryProfitPerClick <= min2 + range2 * 3 / 3 THEN min2 + ( range2 * 5 / 2 / 3 )
  END, 2 ) AS bucket
FROM `biddy-io.smx_2019.preprocessed_data2` as x
JOIN RANGE1 ON TRUE
JOIN MAX1 ON TRUE
JOIN MIN1 ON TRUE
ORDER BY bucket











-- create model 2
CREATE OR REPLACE MODEL `biddy-io.smx_2019.regression_model2`
OPTIONS
	(
	MODEL_TYPE = 'linear_reg',
	OPTIMIZE_STRATEGY = 'NORMAL_EQUATION',
	INPUT_LABEL_COLS = [ 'QueryProfitPerClick' ]
	) AS
SELECT * EXCEPT
		(
		ExternalCustomerId
		,Query
		,SqImpressions
		,SqClicks
		,SqCost
		,SqConversions
		,SqConversionValue
		--,KeywordImpressions
		--,KeywordClicks
		--,KeywordCost
		--,KeywordConversions
		--,KeywordConversionValue
		--,NgramImpressions
		--,NgramClicks
		--,NgramCost
		--,NgramConversions
		--,NgramConversionValue
		--,QueryProfitPerClick
	)
FROM
  `biddy-io.smx_2019.preprocessed_data2` AS data
WHERE TRUE






-- weights
SELECT
	processed_input as Column,
	ROUND( weight * 1000 ) / 1000 AS Weight
FROM
	ML.WEIGHTS( MODEL `biddy-io.smx_2019.regression_model` )


-- 





-- predict
SELECT
	Query,
	QueryProfitPerClick as ProfitPerClick,
	round( predicted_label * 100 ) / 100 as Predicted,
	round( round( predicted_label * 100 ) / 100 - QueryProfitPerClick , 2) as Error,
	CountProperty,
	CountLocation,
	CountBrand
FROM
	ML.PREDICT(
		MODEL `biddy-io.regression.my_model3`,
		( SELECT *
			FROM `biddy-io.regression.preprocessed_data`
		)
	)




-----------------
