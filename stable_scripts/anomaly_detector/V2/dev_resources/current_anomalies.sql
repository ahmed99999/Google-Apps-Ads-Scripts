-- current_anomalies
SELECT
	current1.*
FROM (
	SELECT
		Metric,
		DayCount,
		AvgHistoricValue,
		CurrentValue,
		StdDevFactor,
		AccountDescriptiveName,
		ExternalCustomerId,
		HistoricValues,
		Smetric,
		Time
	FROM (
		SELECT
			*,
			ROW_NUMBER() OVER ( -- row_number
				PARTITION BY
					Metric,
					ExternalCustomerId,
					AccountDescriptiveName
				ORDER BY
					Time DESC
			) AS row_number
		FROM `biddy-io.anomaly_detector.anomaly`
		WHERE TRUE
			AND _PARTITIONDATE = CURRENT_DATE( 'Europe/Berlin' )
	)
	WHERE TRUE
		AND row_number = 1
		AND TIMESTAMP_DIFF( CURRENT_TIMESTAMP(), Time, HOUR ) < 1
) as current1
LEFT JOIN (
		SELECT
		Metric,
		ExternalCustomerId
	FROM (
		SELECT
			Metric,
			ExternalCustomerId,
			Time,
			ROW_NUMBER() OVER ( -- row_number
			PARTITION BY
				Metric,
				ExternalCustomerId,
				AccountDescriptiveName
			ORDER BY
				Time DESC
		) AS row_number
	FROM `biddy-io.anomaly_detector.anomaly`
	WHERE TRUE
		AND _PARTITIONDATE = CURRENT_DATE( 'Europe/Berlin' )
	)
	WHERE TRUE
		AND (
			FALSE
			OR row_number > 1
			OR TIMESTAMP_DIFF( CURRENT_TIMESTAMP(), Time, HOUR ) >= 1
    )
	GROUP BY
		Metric,
		ExternalCustomerId
) AS before
  ON TRUE
  AND current1.Metric = before.Metric
  AND current1.ExternalCustomerId = before.ExternalCustomerId
WHERE TRUE
  AND before.Metric IS NULL