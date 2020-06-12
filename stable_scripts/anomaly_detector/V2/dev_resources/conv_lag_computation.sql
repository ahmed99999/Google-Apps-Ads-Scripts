SELECT
	stat.ExternalCustomerId,
	Date AS target_date,
	DATE_DIFF( CURRENT_DATE( 'Europe/Berlin' ), Date, Day ) as day_diff,
	SUM( Clicks ) AS clicks,
	SUM( Impressions ) AS impressions,
	SUM( Cost / 1000000 ) AS cost,
	--SUM( Conversions ) AS original_conversions,
	--SUM( ConversionValue ) AS original_conversion_value,
	SUM( Conversions ) + AVG( lag.expected_additional_cr ) * SUM( CLICKS ) AS conversions,
	SUM( ConversionValue ) + AVG( lag.expected_additional_value_per_click ) * SUM( CLICKS ) AS conversion_value
FROM `biddy-io.peak_ace_active_clients_transfer.p_HourlyAccountStats_1036246249` AS stat
LEFT JOIN `biddy-io.pa_anomaly_detector.conversion_lag_view` AS lag
	ON stat.ExternalCustomerId = lag.ExternalCustomerId
	AND DATE_DIFF( CURRENT_DATE( 'Europe/Berlin' ), stat.Date, DAY ) = lag.day
WHERE TRUE
	AND _PARTITIONDATE >= DATE_SUB( CURRENT_DATE( 'Europe/Berlin' ), INTERVAL 91 DAY )
	AND (
		FALSE
		OR
			CASE DayOfWeek
				WHEN 'MONDAY' THEN 2
				WHEN 'TUESDAY' THEN 3
				WHEN 'WEDNESDAY' THEN 4
				WHEN 'THURSDAY' THEN 5
				WHEN 'FRIDAY' THEN 6
				WHEN 'SATURDAY' THEN 7
				WHEN 'SUNDAY' THEN 1
			END != EXTRACT( DAYOFWEEK FROM CURRENT_DATETIME( 'Europe/Berlin' ) )
		OR HourOfDay <= EXTRACT( HOUR FROM CURRENT_DATETIME( 'Europe/Berlin' ) ) - 3
	)
	--AND ExternalCustomerId = 1840441594
GROUP BY
	stat.ExternalCustomerId,
	stat.Date
