SELECT
  SUM( ConversionValue ) / SUM( Conversions ) AS AvgConvValue
FROM `biddy-io.peak_ace_active_clients_transfer.SearchQueryStats_1036246249` AS sq
WHERE TRUE
  AND DATE_DIFF( _LATEST_DATE, _DATA_DATE, DAY ) < 365
  AND ExternalCustomerId = 7056468392

-- 183