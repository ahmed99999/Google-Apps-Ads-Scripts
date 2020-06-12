#StandardSQL
SELECT
  day,
  -- account_name,
  account_id,
  --conversions_delta,
  -- clicks,
  -- conversions,
  -- conversion_value,
  -- round( conversions / nullif( clicks, 0 ) * 100, 2) as cr,
  -- round( SUM( conversions_delta ) OVER ( PARTITION BY account_id ORDER BY day RANGE BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING ), 2 ) AS expected_conversions,
  -- round( SUM( value_delta ) OVER ( PARTITION BY account_id ORDER BY day RANGE BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING ), 2 ) AS expected_value,
  ifnull( round( SUM( conversions_delta ) OVER ( PARTITION BY account_id ORDER BY day RANGE BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING ) / nullif( clicks, 0 ), 4 ), 0) as expected_additional_cr,
  ifnull( round( SUM( value_delta ) OVER ( PARTITION BY account_id ORDER BY day RANGE BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING ) / nullif( clicks, 0 ), 4 ), 0) as expected_additional_value_per_click
  -- ,count
FROM (
  SELECT
    DATE_DIFF( y.partition_time, y.date, DAY ) as day,
    -- x.account_name,
    x.account_id,
    avg( ( y.conversions - x.conversions ) ) as conversions_delta,
    avg( ( y.conversion_value - x.conversion_value ) ) as value_delta,
    avg( y.conversions ) as conversions,
    avg( y.conversion_value ) as conversion_value,
    avg( y.clicks ) as clicks,
	count(*) as count
  FROM `biddy-io.anomaly_detector.conversion_lag_latest` as x
  JOIN `biddy-io.anomaly_detector.conversion_lag_latest` as y
  ON TRUE
    AND DATE_DIFF( y.partition_time, x.partition_time, DAY ) = 1
    AND x.account_id = y.account_id
    AND x.date = y.date
  GROUP BY
    -- x.account_name,
    x.account_id,
    day
  --HAVING account_id = 7056468392
  ORDER BY
    -- x.account_name,
    x.account_id,
    day
)




-- basic query
#StandardSQL
  SELECT
    y.partition_time as y_partition_time,
    x.partition_time as x_partition_time,
    y.date,
    x.account_name,
    x.account_id,
    y.conversions as y_conv,
    x.conversions as x_conv
  FROM `biddy-io.anomaly_detector.conversion_lag_latest` as x
  JOIN `biddy-io.anomaly_detector.conversion_lag_latest` as y
  ON TRUE
    AND DATE_DIFF( y.partition_time, x.partition_time, DAY ) = 1
    AND x.account_id = y.account_id
    AND x.date = y.date
  WHERE x.account_id = 1209530348 -- 7056468392
  ORDER by y.partition_time, y.date
LIMIT 10000






-- ---------------------








#StandardSQL
SELECT
  *
FROM `biddy-io.anomaly_detector.conversion_lag_latest`
WHERE TRUE
ORDER BY date desc
LIMIT 100000






-- LATEST VIEW


#StandardSQL
SELECT
  DATE( data.partition_time ) as partition_time,
  account_name,
  data.account_id,
  date,
  conversions,
  conversion_value,
  clicks
FROM (
  SELECT
    _PARTITIONTIME as partition_time,
    *
  FROM `biddy-io.anomaly_detector.conversion_lag`
  WHERE TRUE
    AND _PARTITIONTIME = _PARTITIONTIME
) AS data
JOIN (
  SELECT
    _PARTITIONTIME as partition_time,
    account_id,
    max( request_time ) as max_time
  FROM `biddy-io.anomaly_detector.conversion_lag` AS z
  WHERE TRUE
    AND z._PARTITIONTIME = z._PARTITIONTIME
  GROUP BY account_id, _PARTITIONTIME
) AS latest
  ON data.account_id = latest.account_id
  AND data.partition_time = latest.partition_time
WHERE TRUE
  AND data.request_time = latest.max_time
ORDER BY date desc





-- last month view


#StandardSQL
SELECT
  `biddy-io.anomaly_detector.conversion_lag_latest`.account_name,
  `biddy-io.anomaly_detector.conversion_lag_latest`.account_id,
  --date,
  --DATE_DIFF(current_date(), date, day) as day_diff,
  round( sum( conversions ), 0 ) as conversions,
  round( sum( conversion_value ), 0 ) as conversion_value,
  sum( clicks ) as clicks,
  --`anomaly_detector.conversion_lag_view`.expected_additional_cr,
  --`anomaly_detector.conversion_lag_view`.expected_additional_value_per_click,
  round( sum( `biddy-io.anomaly_detector.conversion_lag_view`.expected_additional_cr * clicks ), 0 ) as expected_additional_conversions,
  round( sum( `biddy-io.anomaly_detector.conversion_lag_view`.expected_additional_value_per_click * clicks ), 0 ) as expected_additionl_conversion_value
FROM `biddy-io.anomaly_detector.conversion_lag_latest`
JOIN `biddy-io.anomaly_detector.conversion_lag_view` ON TRUE
  AND `biddy-io.anomaly_detector.conversion_lag_view`.day = DATE_DIFF(current_date(), date, day)
  AND `biddy-io.anomaly_detector.conversion_lag_view`.account_id = `biddy-io.anomaly_detector.conversion_lag_latest`.account_id
WHERE TRUE
  --AND `anomaly_detector.conversion_lag_latest`.account_id = 1209530348
  AND EXTRACT( month FROM date ) = EXTRACT( month FROM DATE_SUB( current_date(), INTERVAL 1 month ) )
  AND partition_time = ( select max( partition_time ) FROM `biddy-io.anomaly_detector.conversion_lag_latest` as x WHERE TRUE AND x.account_id = `biddy-io.anomaly_detector.conversion_lag_latest`.account_id )
GROUP BY `biddy-io.anomaly_detector.conversion_lag_latest`.account_id,
  `biddy-io.anomaly_detector.conversion_lag_latest`.account_name
  





-- last month (ungrouped)

#StandardSQL
SELECT
  date,
  `biddy-io.anomaly_detector.conversion_lag_latest`.account_name,
  `biddy-io.anomaly_detector.conversion_lag_latest`.account_id,
  --date,
  --DATE_DIFF(current_date(), date, day) as day_diff,
  round( conversions, 0 ) as conversions,
  round( conversion_value, 0 ) as conversion_value,
  clicks as clicks,
  `biddy-io.anomaly_detector.conversion_lag_view`.expected_additional_cr,
  `biddy-io.anomaly_detector.conversion_lag_view`.expected_additional_value_per_click,
  round( `biddy-io.anomaly_detector.conversion_lag_view`.expected_additional_cr * clicks, 0 ) as expected_additional_conversions,
  round( `biddy-io.anomaly_detector.conversion_lag_view`.expected_additional_value_per_click * clicks, 0 ) as expected_additionl_conversion_value
FROM `biddy-io.anomaly_detector.conversion_lag_latest`
JOIN `biddy-io.anomaly_detector.conversion_lag_view` ON TRUE
  AND `biddy-io.anomaly_detector.conversion_lag_view`.day = DATE_DIFF(current_date(), date, day)
  AND `biddy-io.anomaly_detector.conversion_lag_view`.account_id = `biddy-io.anomaly_detector.conversion_lag_latest`.account_id
WHERE TRUE
  AND `biddy-io.anomaly_detector.conversion_lag_latest`.account_id = 5095586252
  AND EXTRACT( month FROM date ) = EXTRACT( month FROM DATE_SUB( current_date(), INTERVAL 1 month ) )
  AND partition_time = ( select max( partition_time ) FROM `biddy-io.anomaly_detector.conversion_lag_latest` as x WHERE TRUE AND x.account_id = `biddy-io.anomaly_detector.conversion_lag_latest`.account_id )
ORDER BY date





-- landakademie Vergleich conversion lag
#StandardSQL
SELECT
  x.date,
  x.conversions as conversions_24_5,
  y.conversions as conversions_03_6,
  x.clicks as clicks_24_5,
  y.clicks as clicks_03_6
FROM `biddy-io.anomaly_detector.conversion_lag_latest` as x
JOIN `biddy-io.anomaly_detector.conversion_lag_latest` as y
  ON TRUE
  AND x.account_id = y.account_id
  AND x.date = y.date
WHERE TRUE
  AND x.partition_time = '2018-05-24'
  AND y.partition_time = '2018-06-03'
  AND x.account_id = 5095586252
  --AND partition_time = ( select max( partition_time ) FROM `biddy-io.anomaly_detector.conversion_lag_latest` as x WHERE TRUE AND x.account_id = `biddy-io.anomaly_detector.conversion_lag_latest`.account_id )
ORDER BY date

  


-- Self-join mit einem Tag abstand. Hilfreich zum debuggen.
SELECT
	DATE_DIFF( y.partition_time, y.date, DAY ) as day,
	-- x.account_name,
	y.partition_time as partition_time_y,
	x.partition_time as partition_time_x,
	y.date,
	y.conversions as y_converions,
	x.conversions as x_conversions,
	y.conversion_value as y_value,
	x.conversion_value as x_value,
	y.clicks as y_clicks,
	x.clicks as x_clicks
FROM `biddy-io.anomaly_detector.conversion_lag_latest` as x
JOIN `biddy-io.anomaly_detector.conversion_lag_latest` as y
	ON TRUE
	AND DATE_DIFF( y.partition_time, x.partition_time, DAY ) = 1
	AND x.account_id = y.account_id
	AND x.date = y.date
WHERE x.account_id = 2143422790
	-- AND ( FALSE
	--   OR y.conversions - x.conversions > 0
	--   OR y.conversion_value - x.conversion_value > 0
	--   OR y.clicks - x.clicks > 0
	--)
	AND DATE_DIFF( y.partition_time, y.date, DAY ) = 1
ORDER BY
	-- x.account_name,
	x.account_id,
	DATE_DIFF( y.partition_time, y.date, DAY ),
	y.date,
	y.partition_time
    






