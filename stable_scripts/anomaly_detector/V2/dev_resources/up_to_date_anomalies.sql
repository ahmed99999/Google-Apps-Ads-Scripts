-- unique_anomalies (only the most up-to-date anomalies for a day)
SELECT *
FROM (
  SELECT
    *,
    ROW_NUMBER() OVER ( PARTITION BY _PARTITIONDATE, Metric, AccountDescriptiveName, ExternalCustomerId ORDER BY Time DESC ) as row_number
  FROM `biddy-io.pa_anomaly_detector.anomaly`
  WHERE TRUE
    AND _PARTITIONTIME > '2019-02-01' -- = TIMESTAMP( CURRENT_DATE( ' Europe/Berlin ' ) )
    AND ExternalCustomerId = 1371763172
)
WHERE TRUE
  AND row_number = 1
ORDER BY Time DESC



-- anomaly ranking by metric
SELECT
  Metric,
  count(*) AS Count
FROM (
  SELECT
    Metric,
    AccountDescriptiveName,
    _PARTITIONDATE AS Date,
    count(*) AS Count
  FROM `biddy-io.pa_anomaly_detector.anomaly`
  WHERE TRUE
    --AND Metric = 'CPC'
    AND DATE_DIFF( CURRENT_DATE( 'Europe/Berlin' ), _PARTITIONDATE, DAY ) < 7
  GROUP BY
    Metric,
    AccountDescriptiveName,
    Date
)
GROUP BY
  Metric
ORDER BY
  Count DESC
  
  
-- CPO
SELECT
  a.Metric,
  a.DayCount,
  round( a.AvgHistoricValue, 2 ) AS historic,
  round( a.CurrentValue, 2 ) AS current1,
  a.StdDevFactor,
  a.AccountDescriptiveName,
  round( s.HistoricValue, 2 ) AS HistoricConversions,
  round( s.CurrentValue, 2 ) AS CurrentConversions,
  a.Time AS date
FROM `biddy-io.pa_anomaly_detector.anomaly` AS a, UNNEST( Smetric ) as s
WHERE TRUE
  AND Metric = 'CPO'
  AND s.Name = 'Conversions'
  --AND s.CurrentValue > 5
  AND s.HistoricValue > 1
  AND s.CurrentValue / s.HistoricValue > .5
  AND StdDevFactor > 7
  AND DATE_DIFF( CURRENT_DATE( 'Europe/Berlin' ), _PARTITIONDATE, DAY ) < 1
GROUP BY
  Metric,
  DayCount,
  historic,
  current1,
  StdDevFactor,
  AccountDescriptiveName,
  HistoricConversions,
  CurrentConversions,
  Time
ORDER BY
  a.StdDevFactor DESC