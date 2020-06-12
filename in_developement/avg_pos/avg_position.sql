WITH
position_stat AS (
	SELECT
		ExternalCustomerId, CampaignId, AdNetworkType1, AdNetworkType2, Date,
		SUM( Impressions ) AS Impressions,
		ROUND( SUM( Impressions * AveragePosition ) / NULLIF( SUM( Impressions ), 0 ), 2 ) AS AveragePosition
	FROM `biddy-io.peak_ace_active_clients_transfer.CampaignBasicStats_1036246249`
	WHERE TRUE
		AND DATE_DIFF( CURRENT_DATE(), _DATA_DATE, DAY ) <= 200
		AND DATE_DIFF( CURRENT_DATE(), _DATA_DATE, DAY ) > 80
	GROUP BY
		ExternalCustomerId, CampaignId, AdNetworkType1, AdNetworkType2, Date
		-- ,Device, Slot
),
share_stat AS (
	SELECT
		ExternalCustomerId, CampaignId, AdNetworkType1, AdNetworkType2, Date,
		
		CAST( TopImpressionPercentage AS FLOAT64 ) AS TopImpressionPercentage,
		CAST( AbsoluteTopImpressionPercentage AS FLOAT64 ) AS AbsoluteTopImpressionPercentage,
		
		( CAST( REGEXP_REPLACE( REGEXP_REPLACE( SearchAbsoluteTopImpressionShare, '< 10\\%', '5' ), '%', '' ) AS FLOAT64 ) / 100 ) AS SearchAbsoluteTopImpressionShare,
		( CAST( SearchTopImpressionShare AS FLOAT64 ) ) AS SearchTopImpressionShare,
		( CAST( REGEXP_REPLACE( REGEXP_REPLACE( SearchImpressionShare, '< 10\\%', '5' ), '%', '' ) AS FLOAT64 ) / 100 ) AS SearchImpressionShare,
		
		SearchExactMatchImpressionShare
		
	FROM `biddy-io.peak_ace_active_clients_transfer.CampaignCrossDeviceStats_1036246249` AS stat
	--JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
		--USING ( ExternalCustomerId, CampaignId )
	--LEFT JOIN position_stat USING ( ExternalCustomerId, CampaignId, AdNetworkType1, AdNetworkType2, Date )
	WHERE TRUE
		--AND campaign._DATA_DATE = campaign._LATEST_DATE
		AND DATE_DIFF( CURRENT_DATE(), stat._DATA_DATE, DAY ) <= 200
		AND DATE_DIFF( CURRENT_DATE(), stat._DATA_DATE, DAY ) > 80
		--AND ExternalCustomerId = 1371763172
		--AND CampaignId = 2063388133
		--AND Date = '2019-08-05'
	--GROUP BY
	--	ExternalCustomerId, CampaignId, AdNetworkType1, AdNetworkType2, Date
)

SELECT
	* EXCEPT (
	SearchExactMatchImpressionShare, AdNetworkType1, ExternalCustomerId, CampaignId, Date
	,AdNetworkType2
	,Impressions
    --,
    --SearchAbsoluteTopImpressionShare,
    --SearchTopImpressionShare,
    --SearchImpressionShare
  )
  --,Impressions / SearchImpressionShare AS eligibleImpr
  --DISTINCT CONCAT( CAST( TopImpressionPercentage AS STRING ), CAST( AbsoluteTopImpressionPercentage AS STRING ) )
FROM share_stat
LEFT JOIN position_stat USING( ExternalCustomerId, CampaignId, AdNetworkType1, AdNetworkType2, Date )
WHERE TRUE
  --AND AveragePosition = 1
	--AND AbsoluteTopImpressionPercentage = 1
  --AND TopImpressionPercentage > 0
  --AND TopImpressionPercentage < AbsoluteTopImpressionPercentage
  --AND SearchAbsoluteTopImpressionShare > SearchTopImpressionShare
  AND AdNetworkType1 NOT IN ( 'CONTENT', 'MIXED', 'YOUTUBE_WATCH', 'YOUTUBE_SEARCH' )
  AND SearchImpressionShare IS NOT NULL
  AND AveragePosition > 0
  
  
	--AND Impressions = 3
	--AND AbsoluteTopImpressionPercentage > 0
  --AND AbsoluteTopImpressionPercentage < 1
  
  --AND TopImpressionPercentage > AbsoluteTopImpressionPercentage
  --AND AveragePosition NOT IN ( 2, 3, 4 )
  --AND AveragePosition = 1
  
  -- AND ABS( ROUND( AveragePosition ) - AveragePosition ) > .02
  
  --AND Impressions = 1
  --AND SearchAbsoluteTopImpressionShare > .05
  --AND SearchAbsoluteTopImpressionShare < 1
  
  
  
  /*
  AND Impressions = 5
  AND ABS( ROUND( TopImpressionPercentage * Impressions ) - TopImpressionPercentage * Impressions ) > .02
  AND ABS( ROUND( AbsoluteTopImpressionPercentage * Impressions ) - AbsoluteTopImpressionPercentage * Impressions ) > .02
  */
ORDER BY
  AveragePosition DESC,
  Impressions,
  TopImpressionPercentage - AbsoluteTopImpressionPercentage DESC,
  Impressions DESC,
  AveragePosition
  













  



, stat AS (
	SELECT
		AveragePosition,
		Impressions,
		CampaignId,
  

    /*
    ROUND(
    (

      ( CAST( AbsoluteTopImpressionPercentage AS FLOAT64 ) ) * 1
      + ( CAST( TopImpressionPercentage AS FLOAT64 ) - CAST( AbsoluteTopImpressionPercentage AS FLOAT64 ) ) * 2
      + (  ( CAST( REGEXP_REPLACE( REGEXP_REPLACE( SearchImpressionShare, '< 10\\%', '5' ), '%', '' ) AS FLOAT64 ) / 100 ) - CAST( TopImpressionPercentage AS FLOAT64 ) ) * 5

    ) / ( CAST( REGEXP_REPLACE( REGEXP_REPLACE( SearchImpressionShare, '< 10\\%', '5' ), '%', '' ) AS FLOAT64 ) / 100 )

    , 2 ) AS computed_avg_pos,

    ROUND( ABS(  AveragePosition -
      ROUND(
    (

      ( CAST( AbsoluteTopImpressionPercentage AS FLOAT64 ) ) * 1
      + ( CAST( TopImpressionPercentage AS FLOAT64 ) - CAST( AbsoluteTopImpressionPercentage AS FLOAT64 ) ) * 2
      + (  ( CAST( REGEXP_REPLACE( REGEXP_REPLACE( SearchImpressionShare, '< 10\\%', '5' ), '%', '' ) AS FLOAT64 ) / 100 ) - CAST( TopImpressionPercentage AS FLOAT64 ) ) * 5

    ) / ( CAST( REGEXP_REPLACE( REGEXP_REPLACE( SearchImpressionShare, '< 10\\%', '5' ), '%', '' ) AS FLOAT64 ) / 100 )

    , 2 )
     )
    , 2 ) AS error,
      */


    CampaignName,

    CAST( TopImpressionPercentage AS FLOAT64 ) AS TopImpressionPercentage,
    CAST( AbsoluteTopImpressionPercentage AS FLOAT64 ) AS AbsoluteTopImpressionPercentage,

    --AdNetworkType2,
    --Device,
    --Slot,

    Date,
    --SearchClickShare,
    ( CAST( REGEXP_REPLACE( REGEXP_REPLACE( SearchAbsoluteTopImpressionShare, '< 10\\%', '5' ), '%', '' ) AS FLOAT64 ) / 100 ) AS AbsoluteTop,
    ( CAST( REGEXP_REPLACE( REGEXP_REPLACE( SearchTopImpressionShare, '< 10\\%', '5' ), '%', '' ) AS FLOAT64 ) ) AS Top,
    ( CAST( REGEXP_REPLACE( REGEXP_REPLACE( SearchImpressionShare, '< 10\\%', '5' ), '%', '' ) AS FLOAT64 ) / 100 ) AS ImpressionShare,

    SearchBudgetLostAbsoluteTopImpressionShare AS BudgetLostAbsoluteTop,
    SearchBudgetLostTopImpressionShare AS BudgetLostTop,
    SearchBudgetLostImpressionShare AS BudgetLost,

    SearchRankLostAbsoluteTopImpressionShare AS RankLostAbsoluteTop,
    SearchRankLostTopImpressionShare AS RankLostTop,
    SearchRankLostImpressionShare AS RankLost,

    SearchExactMatchImpressionShare AS ExactMatchImpressionShare

  FROM `biddy-io.peak_ace_active_clients_transfer.CampaignCrossDeviceStats_1036246249` AS stat
  JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign USING ( ExternalCustomerId, CampaignId )
  LEFT JOIN position_stat USING ( ExternalCustomerId, CampaignId, AdNetworkType1, AdNetworkType2, Date )
  WHERE TRUE
    AND campaign._DATA_DATE = campaign._LATEST_DATE
    AND DATE_DIFF( CURRENT_DATE(), stat._DATA_DATE, DAY ) <= 200
    AND DATE_DIFF( CURRENT_DATE(), stat._DATA_DATE, DAY ) > 80
    AND ExternalCustomerId = 1371763172
    AND CampaignId = 2063388133
    AND Date = '2019-08-05'
    --AND CampaignId = 1727077853 --827587431
    --AND Impressions = 130
    --AND stat.AdNetworkType2 IN ( 'SEARCH' )
    --AND Device = 
)
, stat2 AS (
  SELECT
/*
    Impressions / ImpressionShare AS EligibleImpressions,
    Impressions * Top AS EligibleITop,
    Impressions * AbsoluteTop AS EligibleIAbsTop,
    
    TopPercentage * Impressions * Top AS realizedTop,
    AbsoluteTopPercentage * Impressions * AbsoluteTop AS realizedAbsTop,
    TopPercentage * Impressions * Top - AbsoluteTopPercentage * Impressions * AbsoluteTop AS realizedTopButNotAbs,
  */  
    ROUND(
    ( AbsoluteTopPercentage * Impressions * AbsoluteTop * 1
    + ( TopPercentage * Impressions * Top - AbsoluteTopPercentage * Impressions * AbsoluteTop ) * 2
    + ( Impressions - Top ) * 4
    ) /
    NULLIF(
    AbsoluteTopPercentage * Impressions * AbsoluteTop
    + ( TopPercentage * Impressions * Top - AbsoluteTopPercentage * Impressions * AbsoluteTop )
    + ( Impressions - Top )
    , 0 )
    ,2 ) AS computedAvgPos,
    

    *
  FROM stat
  WHERE TRUE
)

SELECT
  ROUND( ABS( AveragePosition - computedAvgPos ), 1 ) AS abs_error,
  *
FROM stat2
WHERE TRUE
  AND Impressions > 10
ORDER BY
  --CampaignName,
  abs_error DESC
  --SearchTopImpressionShare DESC