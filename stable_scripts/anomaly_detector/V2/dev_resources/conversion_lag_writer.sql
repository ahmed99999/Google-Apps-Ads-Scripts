-- conversion_lag_writer
SELECT
	Date AS Date,
	CURRENT_TIMESTAMP() AS RequestTime,
	customer.AccountDescriptiveName,
	customer.ExternalCustomerId,
	SUM( Conversions ) AS Conversions,
	SUM( ConversionValue ) AS ConversionValue,
	SUM( Clicks ) AS Clicks
FROM `biddy-io.peak_ace_active_clients_transfer.AccountBasicStats_1036246249` AS stat
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer ON customer.ExternalCustomerId = stat.ExternalCustomerId
WHERE TRUE
	AND customer._DATA_DATE = customer._LATEST_DATE
	AND DATE_DIFF( CURRENT_DATE( 'Europe/Berlin' ), Date, DAY ) <= 90
GROUP BY
	Date,
	customer.AccountDescriptiveName,
	customer.ExternalCustomerId
