SELECT
    a.AccountDescriptiveName,
    a.DayCount,
    a.Metric,
    a.ExternalCustomerId,
    a.AdNetworkType1,
    a.AvgHistoricValue,
    a.CurrentValue,
    ROUND( SUM( a.cost_history ) ) AS cost_history,
    ROUND( SUM( a.cost_current ) ) AS cost_current
FROM (
  SELECT
      a.AccountDescriptiveName,
      a.DayCount,
      a.Metric,
      a.ExternalCustomerId,
      a.AdNetworkType1,
      a.AvgHistoricValue,
      a.CurrentValue,
      a.date_current AS date_current,
      ROUND( AVG( a.cost_history ) ) AS cost_history,
      ROUND( AVG( a.cost_current ) ) AS cost_current
  FROM (
    SELECT
        a.AccountDescriptiveName,
        a.DayCount,
        a.Metric,
        a.ExternalCustomerId,
        a.AdNetworkType1,
        a.AvgHistoricValue,
        a.CurrentValue,
        a.Date AS date_current,
        stat2.Date as date_past,
        ROUND( SUM( stat2.Cost ) / 1000000 ) AS cost_history,
        ROUND( AVG( a.cost ) / 1000000 ) AS cost_current
    FROM (
      SELECT
        a.AccountDescriptiveName,
        a.DayCount,
        stat.Date,
        a.Metric,
        a.AvgHistoricValue,
        a.CurrentValue,
        stat.ExternalCustomerId,
        stat.AdNetworkType1,
        SUM( stat.Cost ) AS cost
      FROM (
        SELECT *
        FROM `biddy-io.pa_anomaly_detector.anomaly`
        WHERE TRUE
          AND ExternalCustomerId = 9163376425
        LIMIT 1
      ) AS a
      JOIN `biddy-io.peak_ace_active_clients_transfer.p_AccountBasicStats_1036246249` AS stat
        ON TRUE
        AND a.ExternalCustomerId = stat.ExternalCustomerId
        AND stat.Date >= DATE_SUB( CURRENT_DATE( 'Europe/Berlin' ), INTERVAL ( a.DayCount - 1 ) DAY )
      WHERE TRUE
        AND stat._PARTITIONDATE >= DATE_SUB( CURRENT_DATE( 'Europe/Berlin' ), INTERVAL 91 DAY )
      GROUP BY
        a.AccountDescriptiveName,
        a.DayCount,
        stat.Date,
        a.Metric,
        a.AvgHistoricValue,
        a.CurrentValue,
        stat.ExternalCustomerId,
        stat.AdNetworkType1
    ) as a
    JOIN `biddy-io.peak_ace_active_clients_transfer.p_AccountBasicStats_1036246249` AS stat2
      ON TRUE
      AND a.ExternalCustomerId = stat2.ExternalCustomerId
      AND a.AdNetworkType1 = stat2.AdNetworkType1
      AND stat2.Date > ( DATE_SUB( CURRENT_DATE( 'Europe/Berlin' ), INTERVAL 91 DAY ) )
      AND stat2.Date < DATE_SUB( CURRENT_DATE( 'Europe/Berlin' ), INTERVAL ( a.DayCount - 1 ) DAY )
      AND MOD( DATE_DIFF( a.Date, stat2.Date, DAY ), 7 ) = 0
    GROUP BY
      a.AccountDescriptiveName,
      a.DayCount,
      a.Metric,
      a.ExternalCustomerId,
      a.AdNetworkType1,
      a.AvgHistoricValue,
      a.CurrentValue,
      a.Date,
      stat2.Date
  ) AS a
  GROUP BY
      a.AccountDescriptiveName,
      a.DayCount,
      a.Metric,
      a.ExternalCustomerId,
      a.AdNetworkType1,
      a.AvgHistoricValue,
      a.CurrentValue,
      date_current
) AS a
GROUP BY
    a.AccountDescriptiveName,
    a.DayCount,
    a.Metric,
    a.ExternalCustomerId,
    a.AdNetworkType1,
    a.AvgHistoricValue,
    a.CurrentValue
