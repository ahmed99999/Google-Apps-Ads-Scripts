-- conversion_lag_view
SELECT
  DayDiff,
  ExternalCustomerId,
  GREATEST( IFNULL( ROUND( SUM( AVG( Conversions ) - AVG( ConversionsTheDayBefore ) ) OVER ( PARTITION BY ExternalCustomerId ORDER BY DayDiff RANGE BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING ) / NULLIF( AVG( Clicks ), 0 ), 4 ), 0 ), 0 ) AS ExpectedAdditionalCR,
  GREATEST( IFNULL( ROUND( SUM( AVG( ConversionValue ) - AVG( ValueTheDayBefore ) ) OVER ( PARTITION BY ExternalCustomerId ORDER BY DayDiff RANGE BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING ) / NULLIF( AVG( Clicks ), 0 ), 4 ), 0 ), 0 ) AS ExpectedAdditionalValuePerClick
FROM (
  SELECT
    ExternalCustomerId,
    Conversions,
    ConversionValue,
    Clicks,
    DATE_DIFF( RequestDate, Date, DAY ) - 1 AS DayDiff,
    AVG( Conversions ) OVER ( PARTITION BY Date, AccountDescriptiveName, ExternalCustomerId ORDER BY RequestDate ROWS BETWEEN 1 PRECEDING AND 1 PRECEDING ) as ConversionsTheDayBefore,
    AVG( ConversionValue ) OVER ( PARTITION BY Date, AccountDescriptiveName, ExternalCustomerId ORDER BY RequestDate ROWS BETWEEN 1 PRECEDING AND 1 PRECEDING ) as ValueTheDayBefore,
    COUNT(*) OVER ( PARTITION BY Date, AccountDescriptiveName, ExternalCustomerId ORDER BY RequestDate ROWS BETWEEN 1 PRECEDING AND 1 PRECEDING ) as count
  FROM `biddy-io.pa_anomaly_detector.conversion_lag_latest`
  WHERE TRUE
)
WHERE TRUE
  AND count = 1 -- exclude the first data-point which has no preceding day to compare with
GROUP BY ExternalCustomerId, DayDiff
ORDER BY ExternalCustomerId, DayDiff