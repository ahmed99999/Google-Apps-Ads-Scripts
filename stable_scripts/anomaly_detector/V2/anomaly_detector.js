
/*
	possible improvements:
		- Mute for 7 days button

*/

var config = {
	"DESCRIPTION" : "" ,
	"INSTRUCTIONS": "",
	"VERSION" : 1,
	"VERSION_TAG" : "stable",
	"settings" : {
		"SETTINGS_SHEET_URL" : "https://docs.google.com/spreadsheets/d/1WVAKcLaM5b6hnAq30netaTlQ59OjLelCWYcHb8DapWE/edit?usp=sharing",
		"SHEET_NAME" : "settings",
		"MAILGUN" : {
			"SEND_EMAILS_THROUGH_MAILGUN" : true,
			"URL" : "https://api.mailgun.net/v3/mg.peakace.de/messages",
			"FROM" : "adwords_scripts@mg.peakace.de",
			"AUTHORISATION" : "Basic YXBpOmtleS1hYWZmMmI2MGU4MmNkMWYwOTIwYWYxNDUzZWM0MDcyOA=="
		},
		"ANOMALY_VIEW_PREFIX" : "A_",
		"SHARE_ANOMALY_VIEW_PREFIX" : "SA_",
		"MIN_ROUND_TO" : -2,
		"MAX_ROUND_TO" : 2,
		"BIGQUERY" : {
			"PROJECT_ID" : "biddy-io",
			"DATASET_ID" : "pa_anomaly_detector",
			"ANOMALY_TABLE_NAME" : "anomaly",
			"ANOMALY_EMAILS_VIEW_NAME" : "anomaly_emails",
			"ANOMALY_EMAILS_LOG_TABLE_NAME" : "anomaly_emails_log",
			"TRANSFER_SERVICE_DATASET_ID" : "peak_ace_active_clients_transfer",
			"SETTINGS_TABLE_NAME" : "settings",
			"CONVERSION_LAG_TABLE_NAME" : "conversion_lag",
			"CONVERSION_LAG_LATEST_VIEW_NAME" : "conversion_lag_latest",
			"CONVERSION_LAG_VIEW_NAME" : "conversion_lag_view",
			"PREPARED_EMAIL_ADDRESSES_VIEW_NAME" : "prepared_email_addresses",
			"CURRENT_ANOMALIES_VIEW_NAME" : "current_anomalies",
		},
		"CHUNK_SIZE" : 30000,
		"SHARE_HOUR" : 13,
		"CONV_LAG_HOURS" : [ 22 ],
		"SEND_ERROR_MESSAGES_TO" : "a.tissen@pa.ag",
		"RECREATE_VIEWS" : false,
		"DEVELOPER_EMAIL" : "a.tissen@pa.ag",
		"MAILGUN_URL" : "https://api.mailgun.net/v3/mg.peakace.de/messages",
		"MAILGUN_AUTH" : "Basic YXBpOmtleS1hYWZmMmI2MGU4MmNkMWYwOTIwYWYxNDUzZWM0MDcyOA==",
		"MAILGUN_FROM" : "adwords_scripts@mg.peakace.de"
	}
};

var config = JSON.parse( dataJSON.settings );
for( key in config ){
	this[ key ] = config[ key ];
}

// --------- SETTINGS ----------------------


// --------- CONSTANTS ---------------------

var TABLE_NAME_PREFIX = 'p_';
var TIMEZONE = 'Europe/Berlin';
var PARTITION_EXPIRATION_DAYS = 100;
var REQUIRE_PARTITION_FILTER = false;

// This is important for sql-queires. Don't change it!
var ACCOUNT_ID = 1036246249; // AdWordsApp.currentAccount().getCustomerId().split( '-' ).join( '' );
var ACCOUNT_NAME = 'Peak Ace - Aktive Betreuung'; // AdWordsApp.currentAccount().getName()

var SCRIPT_NAME = 'AnomalyDetectorBigQueryPusher';

var _ = (function(){
	// Polyfills
	Object.values = Object.values || ( function( obj ){
		return Object.keys( obj ).map( function( key ){
			return obj[key]
		})
	});
	String.trim = function( value ){
		return value.trim();
	};
	function properties(){
		var args = Array.prototype.slice.call( arguments );
		var f = function( item ){
			return args.map( function( arg ){
				apply( item, arg );
			});
		};
		f.name1 = args.join( '_' ); // this improves groupBy() output
		return f;
	}
	function apply( item, arg ){
		if( typeof arg == 'function' ){
			return arg( item );
		}
		if( typeof item[ arg ] == 'function' ){
			return item[ arg ]();
		}
		if( typeof item[ arg ] != 'undefined' ){
			return item[ arg ];
		}
		if( typeof arg[ item ] != 'undefined' ){
			return arg[ item ];
		}
		throw new Error( 'apply() can\'t determine what to do with ' + item + ' and ' + arg );
	}
	function property(){
		var args = Array.prototype.slice.call( arguments );
		var f = function( item ){
			// do NOT use reduce here, because apply will interpret the third argument :(
			var res = item;
			args.forEach( function( arg ){ res = apply( res, arg ) } );
			return res;
		};
		f.name1 = args.join( '_' ); // this improves groupBy() output
		f.equals = function( value ){
			return function( item ){
				return f( item ) == value;
			}
		};
		f.eq = f.equals;
		f.lt = function( value ){
			return function( item ){
				return f( item ) < value;
			}
		};
		f.le = function( value ){
			return function( item ){
				return f( item ) <= value;
			}
		};
		f.gt = function( value ){
			return function( item ){
				return f( item ) > value;
			}
		};
		f.endsWith = function( value ){
			return function( item ){
				var x = f( item );
				return x.indexOf( value ) == x.length - value.length;
			}
		};
		f.startsWith = function( value ){
			return function( item ){
				var x = f( item );
				return x.indexOf( value ) == 0;
			}
		};
		f.isEmpty = function(){
			return function( item ){
				var x = f( item );
				return x == '';
			}
		};
		f.isNotEmpty = function(){
			return function( item ){
				var x = f( item );
				return x != '';
			}
		};
		f.isDefined = function(){
			return function( item ){
				var x = f( item );
				return typeof x != 'undefined';
			}
		}
		return f;
	}
	function not( func ){
		return function( item ){ return ! func( item ) };
	}
	return {
		toString		: function(){ return 'my tools class'; },
		property 		: property,
		properties		: properties,
		not				: not,
	};
})();

function anomalyQuery( config ){
	/*
	var config = {
		metric : 'CLICKS',
		is_compound : false,
		name : 'clicks',
		min_dev : 20,
		lower_bound : -3.5,
		upper_bound : 6,
	};
	var config = {
		metric : 'CPO',
		is_compound : true,
		numerator : 'cost',
		denominator : 'conversions',
		min_dev : 1,
		lower_bound : -7,
		upper_bound : 4,
	};
	*/
	var historic = config.is_compound
		? 'history_' + config.numerator + ' / GREATEST( history_' + config.denominator + ', 1 )'
		: 'history_' + config.name
	;
	
	var historic2 = config.is_compound
		? config.numerator + ' / GREATEST( ' + config.denominator + ', 1 )'
		: config.name
	;
	var historic3 = config.is_compound
		? 'SUM( stat.' + config.numerator + ' ) / GREATEST( SUM( stat.' + config.denominator + ' ), 1 )'
		: 'SUM( stat.' + config.name + ' )'
	;
	
	var current = config.is_compound
		? 'target_' + config.numerator + ' / GREATEST( target_' + config.denominator + ', 1 )'
		: 'target_' + config.name
	;
	
	var query = '-- ' + config.metric.toLowerCase() + '_anomaly_detector\n\
	SELECT\n\
		\'' + config.metric + '\' AS Metric, -- special\n\
		days_count AS DayCount,\n\
		--dates_count = days_count AS valid,\n\
		--days_ago,\n\
		--current_date as current_dates,\n\
		' + historic + ' AS AvgHistoricValue, -- special\n\
		' + current + ' AS CurrentValue, -- special\n\
		ROUND( dev, 1 ) AS StdDevFactor,\n\
		AccountDescriptiveName AS AccountDescriptiveName,\n\
		ExternalCustomerId AS ExternalCustomerId,\n\
		values as HistoricValues,\n\
		[\n' +
			//STRUCT(\n
			//	\'Impressions\' AS Name,\n
			//	history_impressions AS HistoricValue,\n
			//	target_impressions AS CurrentValue\n
			//),\n
			'STRUCT(\n\
				\'Clicks\' AS Name,\n\
				history_clicks AS HistoricValue,\n\
				target_clicks AS CurrentValue\n\
			),\n\
			STRUCT(\n\
				\'Cost\' AS Name,\n\
				history_cost AS HistoricValue,\n\
				target_cost AS CurrentValue\n\
			),\n\
			STRUCT(\n\
				\'Conversions\' AS Name,\n\
				history_conversions AS HistoricValue,\n\
				target_conversions AS CurrentValue\n\
			),\n\
			STRUCT(\n\
				\'ConversionValue\' AS Name,\n\
				history_conversion_value AS HistoricValue,\n\
				target_conversion_value AS CurrentValue\n\
			),\n' +
			//STRUCT(\n
			//	\'Ctr\' AS Name,\n
			//	history_clicks / GREATEST( history_impressions, 1 ) AS HistoricValue,\n
			//	target_clicks / GREATEST( target_impressions, 1 ) AS CurrentValue\n
			//),\n
			'STRUCT(\n\
				\'Cpc\' AS Name,\n\
				history_cost / GREATEST( history_clicks, 1 ) AS HistoricValue,\n\
				target_cost / GREATEST( target_clicks, 1 ) AS CurrentValue\n\
			),\n\
			STRUCT(\n\
				\'ConvRate\' AS Name,\n\
				history_conversions / GREATEST( history_clicks, 1 ) AS HistoricValue,\n\
				target_conversions / GREATEST( target_clicks, 1 ) AS CurrentValue\n\
			),\n\
			STRUCT(\n\
				\'Cpo\' AS Name,\n\
				history_cost / GREATEST( history_conversions, 1 ) AS HistoricValue,\n\
				target_cost / GREATEST( target_conversions, 1 ) AS CurrentValue\n\
			)\n\
		] AS Smetric\n\
		--,CURRENT_DATETIME( \'Europe/Berlin\' ) AS Datetime\n\
	FROM (\n\
		SELECT\n\
			days_count,\n\
			--dates_count,\n\
			days_ago,\n\
			target_date,\n\
			ROUND( AVG( clicks ) ) AS history_clicks,\n\
			ROUND( AVG( target_clicks ) ) AS target_clicks,\n\
			( AVG( ' + current + ' )\n\
				- AVG( ' + historic2 + ' ) ) -- special\n\
			/ GREATEST( STDDEV_SAMP( ' + historic2 + ' ), ' + config.min_dev + ' ) -- special\n\
				AS dev,\n\
			-- ----\n\
			ROUND( AVG( impressions ) ) AS history_impressions,\n\
			ROUND( AVG( target_impressions ) ) AS target_impressions,\n\
			ROUND( AVG( cost ) ) AS history_cost,\n\
			ROUND( AVG( target_cost ) ) AS target_cost,\n\
			ROUND( AVG( conversions ) ) AS history_conversions,\n\
			ROUND( AVG( target_conversions ) ) AS target_conversions,\n\
			ROUND( AVG( conversion_value ) ) AS history_conversion_value,\n\
			ROUND( AVG( target_conversion_value ) ) AS target_conversion_value,\n\
			AccountDescriptiveName,\n\
			ExternalCustomerId,\n\
			count(*) AS count_weeks,\n\
			ROW_NUMBER() OVER ( -- row_number\n\
				PARTITION BY\n\
					days_ago,\n\
					ExternalCustomerId,\n\
					AccountDescriptiveName\n\
				ORDER BY \n\
					ABS( AVG( ' + current + ' ) - AVG( ' + historic2 + ' ) ) + days_count / 7 DESC\n\
						-- special\n\
			) AS row_number,\n\
			ARRAY_AGG( CAST( ROUND( ' + historic2 + ', 2 ) AS STRING ) ) AS values -- special\n\
		FROM ( -- data\n\
			SELECT\n\
				days.count AS days_count,\n\
				--count( target_date ) as dates_count,\n\
				days_ago,\n\
				customer.AccountDescriptiveName,\n\
				x.ExternalCustomerId,\n\
				STRING_AGG( CAST( target_date AS STRING ) ) AS target_date,\n\
				MAX( Date ) AS Date,\n\
				SUM( x.impressions ) AS target_impressions,\n\
				SUM( stat.impressions ) AS impressions,\n\
				SUM( x.clicks ) AS target_clicks,\n\
				SUM( stat.clicks ) AS clicks,\n\
				SUM( x.cost ) AS target_cost,\n\
				SUM( stat.cost ) AS cost,\n\
				SUM( x.conversions ) AS target_conversions,\n\
				SUM( stat.conversions ) AS conversions,\n\
				SUM( x.conversion_value ) AS target_conversion_value,\n\
				SUM( stat.conversion_value ) AS conversion_value,\n\
				DATE_DIFF( target_date, Date, DAY ) / 7 AS weeks,\n\
				RANK() OVER ( PARTITION BY -- rank_\n\
					x.ExternalCustomerId,\n\
					days.count,\n\
					days_ago\n\
				ORDER BY ' + historic3 + ' DESC ) AS rank_ -- special\n\
			FROM ( -- days_ago\n\
				SELECT * FROM UNNEST( [ 0\n\
					--, 1\n\
					--, 2, 3, 5, 6, 7, 8, 9\n\
					--,10, 11, 12, 13, 14, 15, 16, 17, 18, 19\n\
					--,20, 21, 22, 23, 24, 25, 26, 27, 28, 29\n\
					--,30, 31, 32, 33, 34, 35, 36, 37, 38, 39\n\
					--,40, 41, 42, 43, 44, 45, 46, 47, 48, 49\n\
					] ) AS days_ago\n\
			) AS target\n\
			JOIN ( -- days.count\n\
				SELECT * FROM UNNEST( [ 1, 2, 3, 4, 5, 6, 7 ] ) AS count\n\
			) as days ON TRUE\n\
			JOIN ( -- x\n\
				SELECT\n\
					stat.ExternalCustomerId,\n\
					Date AS target_date,\n\
					SUM( Clicks ) AS clicks,\n\
					SUM( Impressions ) AS impressions,\n\
					SUM( Cost / 1000000 ) AS cost,\n\
					--SUM( Conversions ) AS original_conversions,\n\
					--SUM( ConversionValue ) AS original_conversion_value,\n\
					SUM( Conversions ) + IFNULL( AVG( lag.ExpectedAdditionalCR ), 0 ) * SUM( CLICKS ) AS conversions,\n\
					SUM( ConversionValue ) + IFNULL( AVG( lag.ExpectedAdditionalValuePerClick ), 0 ) * SUM( CLICKS ) AS conversion_value\n\
				FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.TRANSFER_SERVICE_DATASET_ID + '.p_HourlyAccountStats_' + ACCOUNT_ID + '` AS stat\n\
				LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.conversion_lag_view` AS lag\n\
					ON stat.ExternalCustomerId = lag.ExternalCustomerId\n\
					AND DATE_DIFF( CURRENT_DATE( \'Europe/Berlin\' ), stat.Date, DAY ) = lag.DayDiff\n\
				WHERE TRUE\n\
					AND _PARTITIONDATE >= DATE_SUB( CURRENT_DATE( \'Europe/Berlin\' ), INTERVAL 91 DAY )\n\
					AND (\n\
						FALSE\n\
						OR Date < CURRENT_DATE( \'Europe/Berlin\' )\n\
						OR HourOfDay <= EXTRACT( HOUR FROM CURRENT_DATETIME( \'Europe/Berlin\' ) ) - 3\n\
					)\n\
					--AND ExternalCustomerId = 1840441594\n\
				GROUP BY\n\
					ExternalCustomerId,\n\
					Date\n\
			) AS x ON TRUE\n\
				AND x.target_date <= ( DATE_SUB( CURRENT_DATE( \'Europe/Berlin\' ), INTERVAL target.days_ago DAY ) )\n\
				AND x.target_date >= ( DATE_SUB( CURRENT_DATE( \'Europe/Berlin\' ), INTERVAL target.days_ago + ( days.count - 1 ) DAY ) )\n\
			JOIN ( -- stat\n\
				SELECT\n\
					stat.ExternalCustomerId,\n\
					Date,\n\
					SUM( Clicks ) AS clicks,\n\
					SUM( Impressions ) AS impressions,\n\
					SUM( Cost / 1000000 ) AS cost,\n\
					--SUM( Conversions ) AS original_conversions,\n\
					--SUM( ConversionValue ) AS original_conversion_value,\n\
					SUM( Conversions ) + IFNULL( AVG( lag.ExpectedAdditionalCR ), 0 ) * SUM( CLICKS ) AS conversions,\n\
					SUM( ConversionValue ) + IFNULL( AVG( lag.ExpectedAdditionalValuePerClick ), 0 ) * SUM( CLICKS ) AS conversion_value\n\
				FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.TRANSFER_SERVICE_DATASET_ID + '.p_HourlyAccountStats_' + ACCOUNT_ID + '` AS stat\n\
				LEFT JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.conversion_lag_view` AS lag\n\
					ON stat.ExternalCustomerId = lag.ExternalCustomerId\n\
					AND DATE_DIFF( CURRENT_DATE( \'Europe/Berlin\' ), stat.Date, DAY ) = lag.DayDiff\n\
				WHERE TRUE\n\
					AND _PARTITIONDATE > DATE_SUB( CURRENT_DATE( \'Europe/Berlin\' ), INTERVAL 91 DAY )\n\
					AND (\n\
						FALSE\n\
						--OR target.days_ago > 0\n\
						OR\n\
							CASE DayOfWeek\n\
								WHEN \'MONDAY\' THEN 2\n\
								WHEN \'TUESDAY\' THEN 3\n\
								WHEN \'WEDNESDAY\' THEN 4\n\
								WHEN \'THURSDAY\' THEN 5\n\
								WHEN \'FRIDAY\' THEN 6\n\
								WHEN \'SATURDAY\' THEN 7\n\
								WHEN \'SUNDAY\' THEN 1\n\
							END != EXTRACT( DAYOFWEEK FROM CURRENT_DATETIME( \'Europe/Berlin\' ) )\n\
						OR HourOfDay <= EXTRACT( HOUR FROM CURRENT_DATETIME( \'Europe/Berlin\' ) ) - 3\n\
					)\n\
				GROUP BY\n\
					ExternalCustomerId,\n\
					Date\n\
			) AS stat ON TRUE\n\
				AND x.ExternalCustomerId = stat.ExternalCustomerId\n\
				AND stat.Date > ( DATE_SUB( CURRENT_DATE( \'Europe/Berlin\' ), INTERVAL target.days_ago + 91 DAY ) )\n\
				AND stat.Date < ( DATE_SUB( CURRENT_DATE( \'Europe/Berlin\' ), INTERVAL target.days_ago + ( days.count - 1 ) DAY ) )\n\
				AND MOD( DATE_DIFF( x.target_date, stat.Date, DAY ), 7 ) = 0\n\
			JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = x.ExternalCustomerId\n\
			WHERE TRUE\n\
				--AND x.ExternalCustomerId = 1371763172 --7056468392\n\
				AND customer._DATA_DATE = customer._LATEST_DATE\n\
			GROUP BY\n\
				days_count,\n\
				days_ago,\n\
				AccountDescriptiveName,\n\
				x.ExternalCustomerId,\n\
				weeks\n\
			ORDER BY AccountDescriptiveName, days_ago, weeks, days.count\n\
		) AS data -- data\n\
		WHERE TRUE\n\
			AND rank_ not in ( 1, 12 )\n\
		GROUP BY\n\
			days_count,\n\
			--dates_count,\n\
			days_ago,\n\
			ExternalCustomerId,\n\
			AccountDescriptiveName,\n\
			target_date\n\
		HAVING TRUE\n\
			AND count_weeks = 10 -- 12 - 2 = 10\n\
			AND ( FALSE\n\
				OR dev + days_count / 7 < ' + config.lower_bound + ' -- special\n\
				OR dev - days_count / 7 > ' + config.upper_bound + ' -- special\n\
				)\n\
		ORDER BY\n\
			days_ago,\n\
			target_date,\n\
			AccountDescriptiveName,\n\
			days_count\n\
	) AS result\n\
	WHERE TRUE\n\
		AND row_number = 1\n\
	ORDER BY ABS( dev ) DESC';

	return query;
}

var ANOMALY_VIEWS = {
	/*IMPRESSIONS : {
		metric : 'IMPRESSIONS',
		is_compound : false,
		name : 'impressions',
		min_dev : 100,
		lower_bound : -3.5,
		upper_bound : 6,
	},
	CTR : {
		metric : 'CTR',
		is_compound : true,
		numerator : 'impressions',
		denominator : 'clicks',
		min_dev : .01,
		lower_bound : -3.5,
		upper_bound : 8,
	},*/
	CLICKS : {
		metric : 'CLICKS',
		is_compound : false,
		name : 'clicks',
		min_dev : 20,
		lower_bound : -3.5,
		upper_bound : 6,
	},
	CONVERSIONS : {
		metric : 'CONVERSIONS',
		is_compound : false,
		name : 'conversions',
		min_dev : 3,
		lower_bound : -3.5,
		upper_bound : 6,
	},
	COST : {
		metric : 'COST',
		is_compound : false,
		name : 'cost',
		min_dev : 20,
		lower_bound : -5.5,
		upper_bound : 4,
	},
	CPO : {
		metric : 'CPO',
		is_compound : true,
		numerator : 'cost',
		denominator : 'conversions',
		min_dev : 1,
		lower_bound : -7,
		upper_bound : 7,
	},
	CONVERSION_VALUE : {
		metric : 'CONVERSION_VALUE',
		is_compound : false,
		name : 'conversion_value',
		min_dev : 30,
		lower_bound : -3.5,
		upper_bound : 6,
	},
	CPC : {
		metric : 'CPC',
		is_compound : true,
		numerator : 'cost',
		denominator : 'clicks',
		min_dev : 2,
		lower_bound : -7,
		upper_bound : 4,
	},
	CONV_RATE : {
		metric : 'CONV_RATE',
		is_compound : true,
		numerator : 'conversions',
		denominator : 'clicks',
		min_dev : .02,
		lower_bound : -3.5,
		upper_bound : 7,
	},
};

function shareAnomalyQuery( config ){
	/*
	var config = {
		metric : 'impression_share',
		name : 'impr_share',
		min_dev : 1,
		lower_bound : -4,
		upper_bound : 4,
	};
	*/
	var historic = 'history_' + config.name;
	
	var historic2 = config.name;
	
	var current = 'target_' + config.name;
	
	var query = '-- impression share anomaly detector\n\
SELECT\n\
	\'' + config.metric.toUpperCase() + '\' AS Metric, -- special\n\
	days_count AS DayCount,\n\
	' + historic + ' AS AvgHistoricValue, -- special\n\
	' + current + ' AS CurrentValue, -- special\n\
	ROUND( dev, 1 ) AS StdDevFactor,\n\
	AccountDescriptiveName,\n\
	ExternalCustomerId,\n\
	values AS HistoricValues,\n\
	[\n\
			STRUCT(\n\
				\'ImprShare\' AS Name,\n\
				history_impr_share AS HistoricValue,\n\
				target_impr_share AS CurrentValue\n\
			),\n\
			STRUCT(\n\
				\'BudgetLost\' AS Name,\n\
				history_budget_lost AS HistoricValue,\n\
				target_budget_lost AS CurrentValue\n\
			),\n\
			STRUCT(\n\
				\'RankLost\' AS Name,\n\
				history_rank_lost AS HistoricValue,\n\
				target_rank_lost AS CurrentValue\n\
			),\n\
			STRUCT(\n\
				\'Impressions\' AS Name,\n\
				history_impressions AS HistoricValue,\n\
				target_impressions AS CurrentValue\n\
			)\n\
	] AS Smetric\n\
FROM (\n\
	SELECT\n\
		days_count,\n\
		days_ago,\n\
		target_date,\n\
		history_impr_share,\n\
		target_impr_share,\n\
		history_impressions,\n\
		target_impressions,\n\
		dev,\n\
		MAX( abs( dev ) ) OVER ( PARTITION BY ExternalCustomerId ) AS max_dev,\n\
		history_budget_lost,\n\
		target_budget_lost,\n\
		history_rank_lost,\n\
		target_rank_lost,\n\
		AccountDescriptiveName,\n\
		ExternalCustomerId,\n\
		values\n\
	FROM (\n\
		SELECT\n\
			days_count,\n\
			days_ago,\n\
			target_date,\n\
			ROUND( AVG( impr_share ) ) AS history_impr_share,\n\
			ROUND( AVG( target_impr_share ) ) AS target_impr_share,\n\
			( AVG( ' + current + ' ) - AVG( ' + historic2 + ' ) ) -- special\n\
			/ GREATEST( STDDEV_SAMP( ' + historic2 + ' ), ' + config.min_dev + ' ) -- special\n\
				AS dev,\n\
			-- ----\n\
			ROUND( AVG( impressions ) ) AS history_impressions,\n\
			ROUND( AVG( target_impressions ) ) AS target_impressions,\n\
			ROUND( AVG( budget_lost ) ) AS history_budget_lost,\n\
			ROUND( AVG( target_budget_lost ) ) AS target_budget_lost,\n\
			ROUND( AVG( rank_lost ) ) AS history_rank_lost,\n\
			ROUND( AVG( target_rank_lost ) ) AS target_rank_lost,\n\
			-- -----------------------------------\n\
			AccountDescriptiveName,\n\
			ExternalCustomerId,\n\
			count(*) as count_weeks,\n\
			ARRAY_AGG( CAST( ROUND( ' + historic2 + ', 2 ) AS STRING ) ) as values -- special\n\
		FROM (\n\
			SELECT\n\
				days.count as days_count,\n\
				days_ago,\n\
				customer.AccountDescriptiveName,\n\
				x.ExternalCustomerId,\n\
				DATE_DIFF( target_date, Date, DAY ) / 7 as weeks,\n\
				max( target_date ) as target_date,\n\
				max( Date ) as Date,\n\
				avg( x.impr_share * 100 ) AS target_impr_share,\n\
				avg( stat.impr_share * 100 ) AS impr_share,\n\
				SUM( x.impressions ) AS target_impressions,\n\
				SUM( stat.impressions ) AS impressions,\n\
				avg( x.budget_lost * 100 ) AS target_budget_lost,\n\
				avg( stat.budget_lost * 100 ) AS budget_lost,\n\
				avg( x.rank_lost * 100 ) AS target_rank_lost,\n\
				avg( stat.rank_lost * 100 ) AS rank_lost,\n\
				RANK() OVER ( PARTITION BY\n\
					x.ExternalCustomerId,\n\
					days.count,\n\
					days_ago\n\
				ORDER BY avg( stat.' + historic2 + ' ) DESC ) AS rank_ -- special\n\
			FROM (\n\
				SELECT * FROM UNNEST( [ 1\n\
					--, 2, 3, 5, 6, 7, 8, 9\n\
					--,10, 11, 12, 13, 14, 15, 16, 17, 18, 19\n\
					--,20, 21, 22, 23, 24, 25, 26, 27, 28, 29\n\
					--,30, 31, 32, 33, 34, 35, 36, 37, 38, 39\n\
					--,40, 41, 42, 43, 44, 45, 46, 47, 48, 49\n\
					] ) as days_ago\n\
			) as target\n\
			JOIN (\n\
				SELECT * FROM UNNEST( [ 1, 2, 3, 4, 5, 6, 7 ] ) as count\n\
			) as days ON TRUE\n\
			JOIN ( -- x\n\
				SELECT\n\
					ExternalCustomerId,\n\
					SearchImpressionShare AS impr_share,\n\
					SearchBudgetLostImpressionShare AS budget_lost,\n\
					SearchRankLostImpressionShare AS rank_lost,\n\
					Impressions,\n\
					Date as target_date\n\
				FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.TRANSFER_SERVICE_DATASET_ID + '.p_AccountMetrics_' + ACCOUNT_ID + '`\n\
				WHERE TRUE\n\
					AND _PARTITIONDATE = DATE_SUB( CURRENT_DATE( \'Europe/Berlin\' ), INTERVAL 0 DAY )\n\
					--AND ExternalCustomerId = 1371763172 --7056468392\n\
			) AS x ON TRUE\n\
				AND x.target_date <= ( DATE_SUB( CURRENT_DATE( \'Europe/Berlin\' ), INTERVAL target.days_ago DAY ) )\n\
				AND x.target_date >= ( DATE_SUB( CURRENT_DATE( \'Europe/Berlin\' ), INTERVAL target.days_ago + ( days.count - 1 ) DAY ) )\n\
			JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = x.ExternalCustomerId\n\
			JOIN ( -- stat\n\
				SELECT\n\
					ExternalCustomerId,\n\
					SearchImpressionShare AS impr_share,\n\
					SearchBudgetLostImpressionShare AS budget_lost,\n\
					SearchRankLostImpressionShare AS rank_lost,\n\
					Impressions,\n\
					Date\n\
				FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.TRANSFER_SERVICE_DATASET_ID + '.p_AccountMetrics_' + ACCOUNT_ID + '` AS stat\n\
				WHERE TRUE\n\
					AND _PARTITIONDATE = DATE_SUB( CURRENT_DATE( \'Europe/Berlin\' ), INTERVAL 0 DAY )\n\
			) AS stat ON TRUE\n\
				AND x.ExternalCustomerId = stat.ExternalCustomerId\n\
				AND stat.Date > ( DATE_SUB( CURRENT_DATE( \'Europe/Berlin\' ), INTERVAL target.days_ago + 91 DAY ) )\n\
				AND stat.Date < ( DATE_SUB( CURRENT_DATE( \'Europe/Berlin\' ), INTERVAL target.days_ago + ( days.count - 1 ) DAY ) )\n\
				AND MOD( DATE_DIFF( x.target_date, stat.Date, DAY ), 7 ) = 0\n\
			WHERE TRUE\n\
				--AND x.ExternalCustomerId = 1371763172 --7056468392\n\
				AND customer._DATA_DATE = customer._LATEST_DATE\n\
			GROUP BY\n\
				days_count,\n\
				days_ago,\n\
				AccountDescriptiveName,\n\
				x.ExternalCustomerId,\n\
				weeks\n\
			HAVING TRUE\n\
				AND ' + historic2 + ' is not null -- special\n\
			ORDER BY AccountDescriptiveName, days_ago, weeks, days.count\n\
		) AS data\n\
		WHERE TRUE\n\
			AND rank_ not in ( 1, 12 )\n\
		GROUP BY\n\
			days_count,\n\
			days_ago,\n\
			ExternalCustomerId,\n\
			AccountDescriptiveName,\n\
			target_date\n\
		HAVING TRUE\n\
			AND count_weeks = 10 -- 12 - 2 = 10\n\
			AND ' + current + ' IS NOT NULL -- special\n\
			AND ( FALSE\n\
				OR dev + days_count / 7 < ' + config.lower_bound + ' -- special\n\
				OR dev - days_count / 7 > ' + config.upper_bound + ' -- special\n\
				)\n\
		ORDER BY\n\
			days_ago,\n\
			target_date,\n\
			AccountDescriptiveName,\n\
			days_count\n\
	) AS raw_result\n\
) AS result\n\
WHERE TRUE\n\
	AND max_dev = abs( dev )\n\
ORDER BY ABS( dev ) DESC';

	return query;
}

var SHARE_VIEWS = {
	IMPR_SHARE : {
		metric : 'IMPRESSION_SHARE',
		name : 'impr_share',
		min_dev : 1,
		lower_bound : -3.5,
		upper_bound : 5,
	},
	BUDGET_LOST : {
		metric : 'BUDGET_LOST',
		name : 'budget_lost',
		min_dev : 5,
		lower_bound : -4,
		upper_bound : 3.5,
	},
	RANK_LOST : {
		metric : 'RANK_LOST',
		name : 'rank_lost',
		min_dev : 5,
		lower_bound : -4,
		upper_bound : 3.5,
	},
};

var VIEWS = {
	CONVERSION_LAG_LATEST : [
		'SELECT',
		'  DATE( RequestTime ) AS RequestDate,',
		'  Date,',
		'  AccountDescriptiveName,',
		'  ExternalCustomerId,',
		'  Conversions,',
		'  ConversionValue,',
		'  Clicks',
		'FROM (',
		'  SELECT',
		'    *,',
		'    ROW_NUMBER() OVER ( PARTITION BY _PARTITIONDATE, Date, AccountDescriptiveName, ExternalCustomerId ORDER BY RequestTime DESC ) as row_number',
		'  FROM `biddy-io.pa_anomaly_detector.conversion_lag`',
		')',
		'WHERE TRUE',
		'  AND row_number = 1',
	].join( '\n' ),
	CONVERSION_LAG_VIEW : [
		'SELECT',
		'  DayDiff,',
		'  ExternalCustomerId,',
		'  GREATEST( IFNULL( ROUND( SUM( AVG( Conversions ) - AVG( ConversionsTheDayBefore ) ) OVER ( PARTITION BY ExternalCustomerId ORDER BY DayDiff RANGE BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING ) / NULLIF( AVG( Clicks ), 0 ), 4 ), 0 ), 0 ) AS ExpectedAdditionalCR,',
		'  GREATEST( IFNULL( ROUND( SUM( AVG( ConversionValue ) - AVG( ValueTheDayBefore ) ) OVER ( PARTITION BY ExternalCustomerId ORDER BY DayDiff RANGE BETWEEN CURRENT ROW AND UNBOUNDED FOLLOWING ) / NULLIF( AVG( Clicks ), 0 ), 4 ), 0 ), 0 ) AS ExpectedAdditionalValuePerClick',
		'FROM (',
		'  SELECT',
		'    ExternalCustomerId,',
		'    Conversions,',
		'    ConversionValue,',
		'    Clicks,',
		'    DATE_DIFF( RequestDate, Date, DAY ) - 1 AS DayDiff,',
		'    AVG( Conversions ) OVER ( PARTITION BY Date, AccountDescriptiveName, ExternalCustomerId ORDER BY RequestDate ROWS BETWEEN 1 PRECEDING AND 1 PRECEDING ) as ConversionsTheDayBefore,',
		'    AVG( ConversionValue ) OVER ( PARTITION BY Date, AccountDescriptiveName, ExternalCustomerId ORDER BY RequestDate ROWS BETWEEN 1 PRECEDING AND 1 PRECEDING ) as ValueTheDayBefore,',
		'    COUNT(*) OVER ( PARTITION BY Date, AccountDescriptiveName, ExternalCustomerId ORDER BY RequestDate ROWS BETWEEN 1 PRECEDING AND 1 PRECEDING ) as count',
		'  FROM `biddy-io.pa_anomaly_detector.conversion_lag_latest`',
		'  WHERE TRUE',
		')',
		'WHERE TRUE',
		'  AND count = 1 -- exclude the first data-point which has no preceding day to compare with',
		'GROUP BY ExternalCustomerId, DayDiff',
		'ORDER BY ExternalCustomerId, DayDiff',
	].join( '\n' ),
	CURRENT_ANOMALIES : [
		'SELECT',
		'	current1.*',
		'FROM (',
		'	SELECT',
		'		Metric,',
		'		DayCount,',
		'		AvgHistoricValue,',
		'		CurrentValue,',
		'		StdDevFactor,',
		'		AccountDescriptiveName,',
		'		ExternalCustomerId,',
		'		HistoricValues,',
		'		Smetric,',
		'		Time',
		'	FROM (',
		'		SELECT',
		'			*,',
		'			ROW_NUMBER() OVER ( -- row_number',
		'				PARTITION BY',
		'					Metric,',
		'					ExternalCustomerId,',
		'					AccountDescriptiveName',
		'				ORDER BY',
		'					Time DESC',
		'			) AS row_number',
		'		FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.' + BIGQUERY.ANOMALY_TABLE_NAME + '`',
		'		WHERE TRUE',
		'			AND _PARTITIONDATE = CURRENT_DATE( \'Europe/Berlin\' )',
		'	)',
		'	WHERE TRUE',
		'		AND row_number = 1',
		'		AND TIMESTAMP_DIFF( CURRENT_TIMESTAMP(), Time, HOUR ) < 1',
		') as current1',
		'LEFT JOIN (',
		'		SELECT',
		'		Metric,',
		'		ExternalCustomerId',
		'	FROM (',
		'		SELECT',
		'			Metric,',
		'			ExternalCustomerId,',
		'			Time,',
		'			ROW_NUMBER() OVER ( -- row_number',
		'			PARTITION BY',
		'				Metric,',
		'				ExternalCustomerId,',
		'				AccountDescriptiveName',
		'			ORDER BY',
		'				Time DESC',
		'		) AS row_number',
		'	FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.' + BIGQUERY.ANOMALY_TABLE_NAME + '`',
		'	WHERE TRUE',
		'		AND _PARTITIONDATE = CURRENT_DATE( \'Europe/Berlin\' )',
		'	)',
		'	WHERE TRUE',
		'		AND (',
		'			FALSE',
		'			OR row_number > 1',
		'			OR TIMESTAMP_DIFF( CURRENT_TIMESTAMP(), Time, HOUR ) >= 1',
		'    )',
		'	GROUP BY',
		'		Metric,',
		'		ExternalCustomerId',
		') AS before',
		'  ON TRUE',
		'  AND current1.Metric = before.Metric',
		'  AND current1.ExternalCustomerId = before.ExternalCustomerId',
		'WHERE TRUE',
		'  AND before.Metric IS NULL',
	].join( '\n' ),
	PREPARED_EMAIL_ADDRESSES : [
		'SELECT',
		'	--account_name,',
		'    CAST( REGEXP_REPLACE( account_id, \'-\', \'\' ) AS INT64 ) as account_id,',
		'	TRIM( email ) as email',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.' + BIGQUERY.SETTINGS_TABLE_NAME + '`, UNNEST( SPLIT( emails_comma_separated_, \',\' ) ) as email',
		'WHERE TRUE',
		'	AND emails_comma_separated_ IS NOT NULL',
		'	AND REGEXP_CONTAINS( account_id, \'\\\\d\\\\d\\\\d-\\\\d\\\\d\\\\d-\\\\d\\\\d\\\\d\\\\d\' )',
		'	AND REGEXP_CONTAINS( emails_comma_separated_, r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+(,\\s[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\\.[a-zA-Z0-9-.]+)*$" )',
		'ORDER BY',
		'	--account_name,',
		'	email',
	].join( '\n' ),
	ANOMALY_EMAILS : [
		'SELECT',
		'	email,',
		'	ARRAY_AGG(',
		'		STRUCT(',
		'			Metric,',
		'			DayCount,',
		'			AvgHistoricValue,',
		'			CurrentValue,',
		'			StdDevFactor,',
		'			AccountDescriptiveName,',
		'			ExternalCustomerId,',
		'			HistoricValues,',
		'			Smetric,',
		'			Time',
		'		)',
		'	) AS anomaly',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.' + BIGQUERY.CURRENT_ANOMALIES_VIEW_NAME + '` as anomalies',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.' + BIGQUERY.PREPARED_EMAIL_ADDRESSES_VIEW_NAME + '`',
		'	ON TRUE',
		'	AND account_id = ExternalCustomerId',
		'WHERE TRUE',
		'GROUP BY email',
	].join( '\n' ),
};

var CONV_LAG_WRITER_VIEW_NAME = 'conversion_lag_writer'.toUpperCase();

VIEWS[ CONV_LAG_WRITER_VIEW_NAME ] = [
		'SELECT',
		'  Date AS Date,',
		'  CURRENT_TIMESTAMP() AS RequestTime,',
		'  customer.AccountDescriptiveName,',
		'  customer.ExternalCustomerId,',
		'  SUM( Conversions ) AS Conversions,',
		'  SUM( ConversionValue ) AS ConversionValue,',
		'  SUM( Clicks ) AS Clicks',
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.TRANSFER_SERVICE_DATASET_ID + '.AccountBasicStats_' + ACCOUNT_ID + '` AS stat',
		'JOIN `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.TRANSFER_SERVICE_DATASET_ID + '.Customer_' + ACCOUNT_ID + '` AS customer ON customer.ExternalCustomerId = stat.ExternalCustomerId',
		'WHERE TRUE',
		'  AND customer._DATA_DATE = customer._LATEST_DATE',
		'  AND DATE_DIFF( CURRENT_DATE( \'Europe/Berlin\' ), Date, DAY ) <= 90',
		'GROUP BY',
		'  Date,',
		'  customer.AccountDescriptiveName,',
		'  customer.ExternalCustomerId',
	].join( '\n' )
;

Object.keys( ANOMALY_VIEWS ).forEach( function( metric ){
	VIEWS[ ANOMALY_VIEW_PREFIX + metric ] = anomalyQuery( ANOMALY_VIEWS[ metric ] );
});

Object.keys( SHARE_VIEWS ).forEach( function( metric ){
	VIEWS[ SHARE_ANOMALY_VIEW_PREFIX + metric ] = shareAnomalyQuery( SHARE_VIEWS[ metric ] );
});

/*
	Parses Bigquery query results to JSON.
*/
function bqQueryParser( schema ){
	/*
		Strips "f" and "v" objects/properties from Bigquery query result.
	*/
	function stripUselessBoilerplate( x ){
		if( x === null || typeof x != 'object' ){
			return x; // scalar
		}
		x = ( x.f || x )
			.map( _.property( 'v' ) )
			.map( stripUselessBoilerplate )
		;
		return x;
	}
	/*
		recursive parser
	*/
	function parse1( schema, x ){
		if( typeof schema == 'undefined' ){
			throw new Error( 'schema is undefined, x is ' + JSON.stringify( x, null, 2 ) );
		}
		if( ! Array.isArray( x ) ){ // scalar
			return {
				name : schema.name,
				value : x,
			};
		}
		if( Array.isArray( schema ) ){ // zip to an object
			if( schema.length != x.length ){
				throw new Error( 'lenghts differ' );
			}
			var arr = [];
			for( var i = 0; i < schema.length; i++ ){
				arr.push( parse1( schema[ i ], x[ i ] ) );
			}
			var obj = {};
			arr.forEach( function( y ){
				obj[ y[ 'name' ] ] = y[ 'value' ];
			});
			return obj;
		}
		if( schema.mode == 'REPEATED' ){ // list of objects
			if( schema.fields ){
				return {
					name : schema.name,
					value : x.map( function( xx ){
						return parse1( schema.fields, xx );
					}),
				};
			}
			return { // list of scalars
				name : schema.name,
				value : x,
			};
		}
		throw new Error( 'x is an array, but schema is not: ' + JSON.stringify( x, null, 2 ) + ' <-> ' + JSON.stringify( schema, null, 2 ) );
	}
	return {
		parse : function( x ){ return parse1( schema, stripUselessBoilerplate( x ) ) },
	}
}

function queryResults( projectId, jobId ){
	var pageToken = null; // start with empty pageToken
	var resultsPerPage = 10000;
	var res = [];
	
	do{
		var results = BigQuery.Jobs.getQueryResults(
			projectId,
			jobId,
			{
				pageToken  : pageToken || '',
				maxResults : resultsPerPage
			}
		);
		pageToken = results.nextPageToken;
		res = res.concat( results.rows || [] );
	}while( pageToken );
	
	var schema = BigQuery.Tables.get(
		BIGQUERY.PROJECT_ID,
		BIGQUERY.DATASET_ID,
		BIGQUERY.ANOMALY_EMAILS_VIEW_NAME
	).schema.fields;
	//log( JSON.stringify( fields, null, 2 ) );
	
	return res.map( bqQueryParser( schema ).parse );
}

function queryBigqueryAsync( projectId, query, writeDisposition, datasetId, tableId, clusteringFields ){
	var job = {
		configuration: {
			query: {
				query : query,
				useLegacySql : false,
			}
		}
	}
	if( datasetId && tableId ){
		job.configuration.query.destinationTable = {
			projectId: projectId,
			datasetId: datasetId,
			tableId: tableId,
		};
		job.configuration.query.createDisposition = 'CREATE_IF_NEEDED';
		job.configuration.query.writeDisposition = writeDisposition; // 'WRITE_APPEND'; // WRITE_TRUNCATE
		job.configuration.query.timePartitioning = {
			type : 'DAY',
			expirationMs : 1000 * 60 * 60 * 24 * PARTITION_EXPIRATION_DAYS,
			requirePartitionFilter : REQUIRE_PARTITION_FILTER,
		};
	}
	if( clusteringFields ){
		job.configuration.query.clustering = {
			fields : clusteringFields,
		};
	}
	//log( 'job: ' + JSON.stringify( job, null, 2 ) );
	return BigQuery.Jobs.insert( job, projectId );
}

function dropTable( projectId, datasetId, tableName ){
	if ( tableExists( projectId, datasetId, tableName ) ) {
		BigQuery.Tables.remove( projectId, datasetId, tableName );
		log( 'Table ' + tableName + ' dropped.' );
	}else{
		log( 'Can\'t find table ' + tableName + '. Hence, can\'t drop it' );
	}
}

function prepareMatrix( matrix ){
	if( typeof matrix.length == 'undefined' ){
		matrix = toMatrix( matrix );
	}
	matrix = matrix.map( function( row ){
		if( typeof row.length == 'undefined' ){
			return Object.values( row );
		}
		return row;
	});
	matrix = matrix.map( function( row ){
		return row.map( function( value ){ return value == '' ? null : value } );
	});
	return matrix;
}

function toMatrix( obj ){
	return Object.values( obj ).map( Object.values );
}

function loadCSVTable( destinationTable, matrix ){
	matrix = prepareMatrix( matrix );
	
	try{
		var job = {
			configuration : {
				load : {
					destinationTable : destinationTable,
					schema : {
						fields : []
					},
					// autodetect : true,
					skipLeadingRows: 1,
					writeDisposition	: 'WRITE_APPEND', // Since we load chunks it must be append! Do not use 'WRITE_TRUNCATE' here!
					createDisposition   : 'CREATE_IF_NEEDED', // this is not needed, because it is default
					nullMarker 			: 'null',
				},
			}
		};
		//log( 'job: ' + JSON.stringify( job, null, 2 ) );
		matrix[ 0 ].forEach( function( header, index ){
			var type = 'STRING';
			if( matrix.slice( 1 ).filter( function( row ){
					return row[ index ] != null &&
						( ( '' + row[ index ] ).match( /\d\d\d\d-\d\d-\d\d/ ) === null );
				}).length == 0 ){ // header row is not expected to have the same format
				type = 'DATE';
			}
			
			job.configuration.load.schema.fields.push(
				{
					name : header.toLowerCase().replace( /[^a-z0-9_]+/g, '_' ),
					type : type,
				}
			);
		});
		//log( 'schema: ' + JSON.stringify( job.configuration.load.schema, null, 2 ) );
		
		var insertJob = BigQuery.Jobs.insert(
			job,
			destinationTable.projectId,
			Utilities.newBlob( toCsvChunks( matrix )[ 0 ], 'application/octet-stream' )
		);
		return insertJob.jobReference.jobId;
	}catch( error ){
		log( error + ' - ' + JSON.stringify( destinationTable, null, 2 ) );
		throw error;
	}
}

function prepareForBigQuery( value ){
	function isNumeric( n ){
		return ! isNaN( parseFloat( n ) ) && isFinite( n );
	}
	if( typeof value == 'string' ){
		// remove thousand separator
		var num = value.split( ',' ).join( '' );
		if( isNumeric( num ) ){
			return num;
		}
		if( value.length > 0 && value.indexOf( '%' ) == value.length - 1 ){
			var num = value.substring( 0, value.length - 1 );
			if( isNumeric( num ) ){
				return num / 100;
			}
		}
		if( value.indexOf( '"' ) >= 0 ){
			value = value.replace( new RegExp( '"', 'g' ), '""' );
		}
		value = '"' + value + '"';
		return value;
	}
	value = value + '';
	
	if( value.indexOf(',') >= 0 ){
		value = value.replace( new RegExp( ',', 'g' ), '' );
	}
	return value;
}

function toCsvChunks( matrix ){
	function splitArray( arr, chunkSize ){
		var i, res = [];
		for( i = 0; i < arr.length; i += chunkSize ){
			res.push( arr.slice( i, i + chunkSize ) );
		}
		return res;
	}
	var rows = matrix.map( function( row ){
		return row.map( prepareForBigQuery ).join( ',' );
	});
	return splitArray( rows, CHUNK_SIZE ).map( function( rows ){ return rows.join( '\n' ) } );
}

function computeAnomalies(){
	var now = new Date( Utilities.formatDate( new Date(), 'Europe/Berlin', 'MMM dd,yyyy HH:mm:ss' ) );
	
	var views = Object.keys( VIEWS )
		.filter( function( view ){
			var res = view.indexOf( ANOMALY_VIEW_PREFIX ) == 0
				||
					(
						now.getHours() == SHARE_HOUR
						&& view.indexOf( SHARE_ANOMALY_VIEW_PREFIX ) == 0
					)
			;
			return res;
		})
		.map( _.property( 'toLowerCase' ) )
	;
	
	log( 'anomaly views: ' + views );
	
	var time = new Date().getTime();
	
	var jobIds = [];
	
	views.forEach( function( viewName ){
		var query = 'SELECT\n' +
			'*, TIMESTAMP_MILLIS( ' + time + ' ) AS Time ' +
			'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.' + viewName + '`\n'
		;
		
		//log( query );
		var job = queryBigqueryAsync(
			BIGQUERY.PROJECT_ID,
			query,
			'WRITE_APPEND',
			BIGQUERY.DATASET_ID,
			BIGQUERY.ANOMALY_TABLE_NAME
		);
		jobIds.push( job.id );
		jobIds = waitForJobs( jobIds, 10 );
	});
	
	jobIds = waitForJobs( jobIds, 0 );
	
	var job = queryBigqueryAsync(
		BIGQUERY.PROJECT_ID,
		'SELECT *\n' +
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.' + 'anomaly_emails' + '`\n'
		//'WRITE_APPEND',
		//,BIGQUERY.DATASET_ID
		//,BIGQUERY.ANOMALY_EMAILS_LOG_TABLE_NAME
	);
	var jobId = job.id.split( '.' )[ 1 ];
	jobIds.push( job.id );
	
	//log( JSON.stringify( job, null, 2 ) );
	
	jobIds = waitForJobs( jobIds, 0 );
	
	var jsonResults = queryResults( BIGQUERY.PROJECT_ID, jobId );
	log( jsonResults.length + ' anomalies found' );
	log( 'results: ' + JSON.stringify( jsonResults, null, 2 ) );
	return jsonResults;
}

function waitForJobs( jobIds, untilLeft ){
	log( jobIds.length + ' jobs are being processed. Wait for them.' );
	while( jobIds.length > untilLeft ){
		var seconds = 10;
		
		Utilities.sleep( seconds * 1000 );
		//failed = failed.concat( jobIds.filter( _.property( jobIdToStatus ).eq( 'ERROR' ) ) );
		jobIds = jobIds.filter( _.property( jobIdToStatus ).eq( 'RUNNING' ) );
	}
	return jobIds;
}

function createAnomalyTable(){
	var viewName = CONV_LAG_WRITER_VIEW_NAME.toLowerCase();
	createView(
		BIGQUERY.PROJECT_ID,
		BIGQUERY.DATASET_ID,
		viewName,
		VIEWS[ CONV_LAG_WRITER_VIEW_NAME ]
	);
	
	// write 0 results into table conversion_lag to ensure that it is created with the right schema
	var job1 = queryBigqueryAsync(
		BIGQUERY.PROJECT_ID,
		'SELECT\n' +
		'*\n' +
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.' + viewName + '`\n' +
		'LIMIT 0' + '\n', // we don't really want to write something into this table at this moment
		'WRITE_APPEND',
		BIGQUERY.DATASET_ID,
		BIGQUERY.CONVERSION_LAG_TABLE_NAME
	);

	// +++++++++++++++++++++++++++++++++++
	createView( BIGQUERY.PROJECT_ID, BIGQUERY.DATASET_ID, BIGQUERY.CONVERSION_LAG_LATEST_VIEW_NAME, VIEWS[ BIGQUERY.CONVERSION_LAG_LATEST_VIEW_NAME.toUpperCase() ] );
	createView( BIGQUERY.PROJECT_ID, BIGQUERY.DATASET_ID, BIGQUERY.CONVERSION_LAG_VIEW_NAME, VIEWS[ BIGQUERY.CONVERSION_LAG_VIEW_NAME.toUpperCase() ] );
	var viewNameCap = ANOMALY_VIEW_PREFIX + Object.keys( ANOMALY_VIEWS )[ 0 ];
	var viewName = viewNameCap.toLowerCase();
	createView( BIGQUERY.PROJECT_ID, BIGQUERY.DATASET_ID, viewName, VIEWS[ viewNameCap ] );
	
	// write 0 results into table anomaly to ensure that it is created with the right schema
	var job2 = queryBigqueryAsync(
		BIGQUERY.PROJECT_ID,
		'SELECT\n' +
		'*, TIMESTAMP_MILLIS( ' + 1546971647783 + ' ) AS Time ' +
		'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.' + viewName + '`\n' +
		'LIMIT 0' + '\n', // we don't really want to write something into this table at this moment
		'WRITE_APPEND',
		BIGQUERY.DATASET_ID,
		BIGQUERY.ANOMALY_TABLE_NAME
	);
	
	waitForJobs( [ job1.id, job2.id ], 0 );
}

function synchronizeSettings(){
	var matrix = GOOGLE_SHEETS.loadSheet( SETTINGS_SHEET_URL, SHEET_NAME );
	var tableDef = {
		projectId : BIGQUERY.PROJECT_ID,
		datasetId : BIGQUERY.DATASET_ID,
		tableId   : BIGQUERY.SETTINGS_TABLE_NAME,
	};
	try{
		//log( 'headers: ' + matrix[ 0 ] );
		
		dropTable(
			tableDef.projectId,
			tableDef.datasetId,
			tableDef.tableId
		);
		var jobId = loadCSVTable(
			tableDef,
			matrix
		);
		waitForJobs( [ jobId ], 0 );
	}catch ( error ){
		log( 'Error in ' + SCRIPT_NAME + ' ' + ' -> ' + error + '\n' + error.stack );
		throw error;
	}
}

function main(){
	log( 'start' );
	
	try{
		// ++++++++++++++++++++++
		createDataset( BIGQUERY.PROJECT_ID, BIGQUERY.DATASET_ID );
		
		createAnomalyTable();
		
		synchronizeSettings();
		
		Object.keys( VIEWS ).forEach( function( view ){
			var viewName = view.toLowerCase();
			var query = VIEWS[ view ];
			//log( query );
			createView(
				BIGQUERY.PROJECT_ID,
				BIGQUERY.DATASET_ID,
				viewName,
				query
			);
		});
		//return;
		
		// ++++++++++++++++++++++
		
		log( 'write into conversion_lag table' );
		var now = new Date( Utilities.formatDate( new Date(), 'Europe/Berlin', 'MMM dd,yyyy HH:mm:ss' ) );
		if( CONV_LAG_HOURS.indexOf( now.getHours() ) >= 0 ){
			var viewName = CONV_LAG_WRITER_VIEW_NAME.toLowerCase();
			var job2 = queryBigqueryAsync(
				BIGQUERY.PROJECT_ID,
				'SELECT\n' +
				'*\n' +
				'FROM `' + BIGQUERY.PROJECT_ID + '.' + BIGQUERY.DATASET_ID + '.' + viewName + '`\n',
				'WRITE_APPEND',
				BIGQUERY.DATASET_ID,
				BIGQUERY.CONVERSION_LAG_TABLE_NAME
			);
		}
		// +++++++++++++++++++++
		
		// log( 'stop here. Don\'t compute anomalies' );
		// return;
		
		var anomalyEmails = computeAnomalies();
		
		var isPreview = false; // AdWordsApp.getExecutionInfo().isPreview();
		
		anomalyEmails.forEach( function( anomalyEmail ){
			var email = anomalyEmail.email;
			if( email != DEVELOPER_EMAIL && isPreview ){
				log( 'don\'t send emails to ' + email + ' in preview mode' );
				return;
			}
			//if( [ DEVELOPER_EMAIL, 'j.riml@pa.ag' ].indexOf( email ) == -1  ){
			if( email != DEVELOPER_EMAIL && ! ( email == 'j.riml@pa.ag' && now.getHours() >= 13 && now.getHours() <= 13 ) ){
				log( 'don\'t send emails to ' + email + ' during testing' );
				return;
			}
			var html = formatForEmail( anomalyEmail.anomaly );
			log( 'send Email to ' + email );
			sendEmail(
				email,
				SCRIPT_NAME + ' ' + 
					ACCOUNT_NAME +
					' ' + ( isPreview ? '(Preview Mode)' : '' ),
					null /* no text body */,
					html
			);
		});
	}catch( error ){
		log( 'Error in ' + SCRIPT_NAME + ' ' + ACCOUNT_NAME + ' -> ' + error + '\n' + error.stack );
		 // 'throw' replaces the stack trace. To preserve the stack we add it to the message
		error.message += ' <-> ' + error.stack;
		throw error;
	}
}

function createDataset( projectId, datasetId ){
	if( datasetExists( projectId, datasetId ) ){
		// log( 'Dataset ' + datasetId + ' in project ' + projectId + ' already exists. Don\'t recreate it.' );
		return;
	}
	// Create new dataset.
	var dataSet = BigQuery.newDataset();
	dataSet.friendlyName = datasetId;
	dataSet.datasetReference = BigQuery.newDatasetReference();
	dataSet.datasetReference.projectId = projectId;
	dataSet.datasetReference.datasetId = datasetId;

	dataSet = BigQuery.Datasets.insert( dataSet, projectId );
	log( 'Created dataset with id ' + dataSet.id + '.' );
}

function datasetExists( projectId, datasetId ){
	// Get a list of all datasets in project.
	var datasets = BigQuery.Datasets.list( projectId );
	var datasetExists = false;
	// Iterate through each dataset and check for an id match.
	if( datasets.datasets != null ){
		for( var i = 0; i < datasets.datasets.length; i++ ){
			var dataset = datasets.datasets[ i ];
			if( dataset.datasetReference.datasetId == datasetId ){
				datasetExists = true;
				break;
			}
		}
	}
	return datasetExists;
}

function createView( projectId, datasetId, viewName, query ){
	if ( tableExists( projectId, datasetId, viewName ) ){
		if( RECREATE_VIEWS ){
			log( 'Recreate view ' + viewName );
			dropView( projectId, datasetId, viewName );
		}else{
			//log( 'View ' + viewName + ' already exists. Don\'t recreate it.' );
			return;	
		}
	}

	var table = BigQuery.newTable();
	
	table.friendlyName = viewName;

	table.tableReference = BigQuery.newTableReference();
	table.tableReference.projectId = projectId;
	table.tableReference.datasetId = datasetId;
	table.tableReference.tableId = viewName;
	
	table.view = {
		query : query,
		useLegacySql : false
	};
	
	try{
		BigQuery.Tables.insert(
			table,
			projectId,
			datasetId
		);
		log( 'View ' + viewName + ' created.' );
	}catch( error ){
		log( '----------------------> ' + error + ' - ' + viewName );
		throw error;
	}
}

function dropView( projectId, datasetId, viewName ){
	if ( tableExists( projectId, datasetId, viewName ) ){
		BigQuery.Tables.remove( projectId, datasetId, viewName );
		log('View ' + viewName + ' dropped.' );
	}
}

function tableExists( projectId, datasetId, tableId, retryCount ){
	var pageToken = ''; // start with empty pageToken
	var resultsPerPage = 150;
	var finished = false;
	if( !retryCount ){
		retryCount = 0;
	}
	retryCount++;
	if( retryCount == 10 ){
		throw new Error( 'tableExists gives up after ' + retryCount + ' trys' );
	}
	
	while( ! finished ){
		// Get a list of a part of all tables in the dataset.
		var tables = [];
		try{
			tables = BigQuery.Tables.list(
				BIGQUERY.PROJECT_ID,
				BIGQUERY.DATASET_ID,
				{
					pageToken  : pageToken,
					maxResults : resultsPerPage
				}
			);
		}catch( error ){
			if( error + '' == 'Exception: Empty response' ){
				log( 'Got strange Bigquery-error: ' + error + '. pageToken is: ' + pageToken + '.' );
				return tableExists( projectId, datasetId, tableId, retryCount );
			}
			throw error;
		}
		pageToken = tables.nextPageToken;
      
		if( ! pageToken ){
			finished = true;
		}
		// Iterate through each table and check for an id match.
		if ( tables.tables != null ){
			for( var i = 0; i < tables.tables.length; i++ ){
				var table = tables.tables[ i ];
				if( table.tableReference.tableId == tableId ){
					return true;
				}
			}
		}
	}
	return false;
}

function jobIdToStatus( jobId ){
	if( jobId.lastIndexOf( '.' ) >= 0 ){
		// Invalid job ID "biddy-io:US.job_nLbcaw3YDYShaqKhy-QYbVbYDyQs"
		// Need to remove "biddy-io:US." part
		jobId = jobId.substring( jobId.lastIndexOf( '.' ) + 1 );
	}
	var job = BigQuery.Jobs.get( BIGQUERY.PROJECT_ID, jobId );
	if( ! job.status ){
		return 'BigqueryStatusBug';
	}
	return job.status.state;
}

function checkJobs( jobIds ){
	var states = {};
	for( var i in jobIds ){
		var jobId = jobIds[ i ];
		var job = BigQuery.Jobs.get( BIGQUERY.PROJECT_ID, jobId );
		if( ! job.status ){
			// strange bug from bigquery?
			continue;
		}
		var state = job.status.state;
		states[ state ] = ( states[ state ] || 0 ) + 1;
		
		if( job.status.errorResult ){
			log( 'message : ' + job.status.errorResult.message );
			log( 'location : ' + job.status.errorResult.location );
			log( 'Debug-info: ' + job.status.errorResult.debugInfo );	
		}
	}
	log( JSON.stringify( states, null, '\t' ) );
	
	if( states[ 'RUNNING' ] ){
		Utilities.sleep( 5000 );
		checkJobs( jobIds );
	}
}

// +++++++++++++++++++++++++++++++++++++

function roundTo( digits ){
	return function( value ){
		return roundX( value, digits )
	};
}

function roundToSignificantDigits( value, digits, min, max ){
	var digits2 = digits - 1 - Math.floor( Math.log( value ) / Math.log( 10 ) );
	if( value <= 0 ){
		digits2 = 0;
	}
	var digits3 = digits2;
	digits3 = min != undefined ? Math.max( digits3, min ) : digits3;
	digits3 = max != undefined ? Math.min( digits3, max ) : digits3;
	
	//log( 'value: ' + value + ';digits: ' + digits + '; digits2: ' + digits2 + '; digits3: ' + digits3 + '; min: ' + min + '; max: ' + max   );
	
	return roundX( value , digits3 );
}

function clone( obj ){
	if ( obj === null || typeof( obj ) !== 'object' || 'isActiveClone' in obj ){
		return obj;
	}

	var temp;
	if ( obj instanceof Date ){
		temp = new obj.constructor(); //or new Date( obj );
	} else {
		temp = obj.constructor();
	}

	for ( var key in obj ){
		if ( Object.prototype.hasOwnProperty.call( obj, key ) ){
			obj['isActiveClone'] = null;
			temp[key] = clone( obj[key] );
			delete obj['isActiveClone'];
		}
	}
	return temp;
}

function partition( arr ){
	return {
		by: function( keyName ){
			var res = {};

			for ( var i = 0; i < arr.length; i++ ){
				var obj = clone( arr[i] );
				var key;
				if ( typeof keyName == 'function' ){
					key = keyName( obj );
				} else {
					key = obj[ keyName ];
				}

				// init
				res[ key ] = ( res[ key ] || [] );
				if( typeof keyName != 'function' ){
					delete obj[ keyName ];
				}
				res[ key ].push( obj );
			}
			return res;
		}
	};
}

function roundX( value, digits ){
	if( value === null || value === undefined ){
		return value;
	}
	var dec = Math.pow( 10, digits == undefined ? 2 : digits );
	return Math.round( value * dec ) / dec;
}

function addThousendDelimiters( value ){
	value = value + '';
	
	var index = value.indexOf( '.' );
	if( index == -1 ){
		index = value.length;
	}
	while( index > 3 ){
		index -= 3;
		value = value.substring( 0, index ) + ',' + value.substring( index );
	}
	return value;
}


// source: https://gist.github.com/Fluidbyte/2973986
// console.log( Object.keys( codes ).map( x => codes[x] ).filter( x => x.symbol.length == 1 ).map( x => '\'' + x.code + '\': \'' + x.symbol + '\'' ).join( ', ' ) )
var currencyCodes = { 'USD': '$', 'EUR': '€', 'CRC': '₡', 'GBP': '£', 'ILS': '₪', 'JPY': '¥', 'KRW': '₩', 'NGN': '₦', 'PHP': '₱', 'PYG': '₲', 'THB': '฿', 'UAH': '₴', 'VND': '₫', 'ZAR': 'R' };

function formatForEmail( allAlerts ){
	function formatMetric( name, value, currency, originalValue ){
		//log( 'formatMetric( ' + JSON.stringify( name ) + ', ' + value + ', ' + originalValue );
		var round1 = roundTo( 1 );
		var digits = 2;
		var minDigits = MIN_ROUND_TO;
		var maxDigits = MAX_ROUND_TO;
		var round_ = roundToSignificantDigits;
		
		var percentMetrics = [ 'Ctr', 'Cvr', 'SearchImpressionShare', 'SearchBudgetLostImpressionShare', 'SearchRankLostImpressionShare' ];
		
		if( percentMetrics.indexOf( name ) >= 0 ){
			value *= 100;
		}
		
		var res = round_( value, digits, minDigits, maxDigits ) + '';
		
		res = addThousendDelimiters( res );
		
		var currencySymbol = currencyCodes[ currency ] || '€';
		
		var suffix = percentMetrics
			.indexOf( name ) >= 0 ? '%' : 
			[ 'Cpc', 'Cpo', 'Cost', 'ConversionValue' ].indexOf( name ) >= 0 ? currencySymbol : ''; 
		
		res = res + suffix;
		
		if( [ 'Conversions', 'ConversionValue' ].indexOf( name ) >= 0 && originalValue != undefined ){
			var diff = value - originalValue;
			
			var v1 = round_( originalValue, digits, minDigits, maxDigits );
			var v2 = round_( diff, digits, minDigits, maxDigits );
			
			var sign = v2 > 0 ? '+' : '';
			
			v1 = addThousendDelimiters( v1 );
			v2 = addThousendDelimiters( v2 );
			
			res = v1 + suffix + ' (' + sign + v2 + suffix + ')';
			
		}
		
		return res;
	}

	function rename( metric ){
		// rename to make it shorter and clearer
			
		if( metric == 'SearchBudgetLostImpressionShare' ){
			return 'Lost by Budget';
		}
		if( metric == 'SearchRankLostImpressionShare' ){
			return 'Lost by Rank';
		}
		if( metric == 'SearchImpressionShare' ){
			return 'Impression Share';
		}
		if( metric == 'AverageCpc' ){
			return 'Average Cpc';
		}
		if( metric == 'ConversionValue' ){
			return 'Conversion Value';
		}
		if( metric == 'ConversionValuePerClick' ){
			return 'Conversion Value per Click';
		}
		if( metric == 'ConversionValuePerCost' ){
			return 'Conversion Value per Cost';
		}
		return metric;
	}

	function formatDays( value, metric ){
		if( [
				'SearchBudgetLostImpressionShare',
				'SearchRankLostImpressionShare',
				'SearchImpressionShare'
			].indexOf( metric ) >= 0 ){
			return 'yesterday' + ( value > 1 ? ( value > 2 ? ' + last ' + ( value - 1 ) + ' days' : ' + the day before' ) : '' );
		}
		return 'today ' + ( value > 1 ? ( value > 2 ? '+ last ' + ( value - 1 ) + ' days' : '+ yesterday' ) : '' );
	}
	
	var html = '';
	var i = 0;
	while( i++ < 1 ){
		html = '<!DOCTYPE html>\
	<html lang="de">\
	<head>\
		<meta http-equiv="Content-Type" content="text/html charset=UTF-8" />\
		<meta content="telephone=no" name="format-detection">\
		<meta name="viewport" content="width=device-width, initial-scale=1.0">\
		<meta http-equiv="X-UA-Compatible" content="ie=edge">\
		<title>Document</title>\
		<style>\
			td, th {\
				vertical-align: middle;\
			}\
			.header,\
			span.gray,\
			span.green,\
			span.red {\
				color: #fff\
			}\
			.email-container {\
				font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol";\
				font-size: 14px\
			}\
			a[x-apple-data-detectors] {\
				color: inherit !important;\
				text-decoration: none !important;\
			}\
			#logo td{\
				background: #fe0000;\
				color: #fff;\
				padding: 7px 15px;\
				display: inline-block;\
			}\
			#anomaly {\
				margin-bottom: 15px;\
			}\
			#anomaly .header {\
				background-color: #007499;\
				overflow: hidden\
			}\
			#anomaly .header .account {\
				text-align: left;\
				font-size: 20px;\
				font-weight: 700\
			}\
			#anomaly .header .account-id {\
				text-align: right;\
				line-height: 27px\
			}\
			#anomaly .header a {\
				color: #fff!important;\
				text-decoration: none;\
			}\
			#anomaly .stats {\
				padding: 10px 10px 0;\
			}\
			#anomaly, #anomaly table{\
				width: 100%;\
				text-align: center\
			}\
			#anomaly tr.regular {\
				background: #f2f2f2;\
				text-align: center;\
			}\
			#anomaly td span.title {\
				display: none;\
			}\
			@media only screen and (max-width:800px) {\
				#anomaly .header td {\
					width: 100%;\
					display: block;\
					text-align: center!important;\
					float: none\
				}\
				#anomaly .stats {\
					padding: 0;\
				}\
				#anomaly table,\
				#anomaly tbody,\
				#anomaly td,\
				#anomaly th,\
				#anomaly thead,\
				#anomaly tr {\
					display: block\
				}\
				#anomaly tr.irregular {\
					display: table-row\
				}\
				#anomaly tr.irregular td {\
					display: table-cell;\
					padding-left: 0\
				}\
				#anomaly thead tr {\
					display: none;\
				}\
				#anomaly tr.regular {\
					border: 1px solid #f1f1f1;\
					padding: 10px 0;\
					margin: 0\
				}\
				#anomaly tr.regular td {\
					border: none;\
					border-bottom: 1px solid #f1f1f1;\
					padding: 5px 20px 5px 20px;\
					position: relative;\
					white-space: normal;\
					text-align: right\
				}\
				#anomaly tr.regular td.metric {\
					padding: 10px;\
					text-align: left;\
					font-size: 18px\
				}\
				#anomaly td span.title {\
					display: inherit;\
					float: left;\
					font-weight: 700;\
				}\
				#anomaly tr.irregular td {\
					text-align: left!important;\
					padding: 20px 0 30px!important\
				}\
			}\
			#anomaly tr .irregular td {\
				text-align: right;\
				padding: 15px 0 30px\
			}\
			#anomaly tr .irregular td .metric {\
				display: inline-block;\
				margin: 0 0 0 20px\
			}\
			span,\
			span.gray,\
			span.green {\
				padding: 0 5px\
			}\
			span {\
				font-weight: 700\
			}\
			span.red {\
				background: red\
			}\
			span.yellow {\
				background: #ffd800;\
				color: #fff\
			}\
			span.green {\
				background: green\
			}\
			span.gray {\
				background: #a6a6a6\
			}\
			i.yellow {\
				color: #ffd800\
			}\
			i.green {\
				color: green\
			}\
			i.red {\
				color: red\
			}\
			i.metric {\
				font-style: normal;\
				margin-left: 10px;\
			}\
		</style>\
	</head>\
	<body>\
	<div class="email-container">\
		<table id="logo" cellpadding="15" cellspacing="0" border="0" >\
			<tbody>\
				<tr>\
					<td>ANOMALY DETECTOR</td>\
				</tr>\
			</tbody>\
		</table>\
		<table id="anomaly" cellpadding="0" cellspacing="0" border="1" bordercolor="#d2d2d2">\
		'
		;
	}
	
	var alerts = partition( allAlerts ).by( 'AccountDescriptiveName' );
	
	for( var accountName in alerts ){
		
		var accountAlerts = alerts[ accountName ];
		
		html +=
			'<tr>\
            <td>\
                <table class="header" cellpadding="10" cellspacing="0" border="0" >\
                    <tbody>\
                    <tr>\
							<td class="account">' + accountName + '\
								' + '\
									<a href="https://adwords.google.com/aw/campaigns?__e=' + accountAlerts[ 0 ].ExternalCustomerId + '">\
										<img src="https://www.pa.ag/wp-content/uploads/email/icon-link.png">\
									</a>'
								+ '\
							</td>\
							<td class="account-id">Account-ID: ' + accountAlerts[ 0 ].ExternalCustomerId + '</td>\
						</tr>\
						</tbody>\
					</table>\
					<table class="stats">\
						<tbody>\
							<tr>\
								<td>\
									<table cellpadding="10" cellspacing="0" border="0" >\
										<thead>\
											<tr>\
												<th>Metric</th>\
												<th>Date range</th>\
												<th>StdDevFactor</th>\
												<th>Value</th>\
												<th>Change</th>\
											</tr>\
										</thead>\
										<tbody>\
										'
		;
		
		
		accountAlerts.forEach( function( alert1 ){
			alert1.Currency = 'EUR';
			var name = alert1.Metric;
			var factor = alert1.CurrentValue / Math.max( alert1.AvgHistoricValue, 0.01 );
			// yellow or red warning?
			var color = factor < .5 || factor > 2 ? 'red' : 'yellow';
			
			html += '<tr class="regular">\
							<td class="metric"><i class="' + color + '">•</i> <b>' + rename( name ) + '</b></td>\
							<td><span class="title">Date Range</span>' + formatDays( alert1.DayCount, name ) + '</td>\
							<td><span class="title">StdDevFactor</span>' + alert1.StdDevFactor + '</td>\
							<td><span class="title">Value</span>' + formatMetric( name, alert1.CurrentValue, alert1.Currency )  + '</td>\
							<td><span class="title">Change</span><span class="' + color + '">'
								+ Math.round( ( alert1.CurrentValue / Math.max( alert1.AvgHistoricValue, 0.001 ) - 1 ) * 100 ) + '%'
								//+ ( typeof alert1.currentValueOriginal != 'undefined' ? ' ( + ' 
								//	+ formatMetric( name, alert1.CurrentValue - alert1.currentValueOriginal, alert1.Currency ) + ' ) ' : '' )
								+ '</span></td>\
						</tr>'
			;
			alert1.Smetric = alert1.Smetric.filter( function( metric ){
					// TODO: when impression-share-metrics are implemented this needs to be evaluated anew.
					return metric.HistoricValue != undefined;
			});
			
			if( alert1.Smetric.length > 0 ){
				html += '<tr class="irregular" >\n';
				html += '<td colspan=6>\n';
				
				alert1.Smetric.sort( function( a, b ){
					var a_ = a.CurrentValue / a.HistoricValue; // TODO: division by zero?
					var b_ = b.CurrentValue / b.HistoricValue; // TODO: division by zero?
					
					if( a_ < 1 ){ a_ = 1 / a_ }; // TODO: division by zero?
					if( b_ < 1 ){ b_ = 1 / b_ }; // TODO: division by zero?
					
					// DESC
					return b_ - a_;
				});
				
				html += alert1.Smetric.map( function( metric ){
					var res = '<i class="metric">\n'
						+ '<b class="title">' + rename( metric.Name ) + ': </b>'
						+ formatMetric( metric.Name, metric.HistoricValue, alert1.currency, metric.wasOriginal  ) + ' '
						+ ( metric.mostImportant ? '<span class="gray">' : '<b>' )
						+ ' > '
						+ formatMetric( metric.Name, metric.CurrentValue, alert1.currency, metric.isOriginal )
						+ ( metric.mostImportant ? '</span>\n' : '</b>' )
						+ '</i>\n'
					;
					return res;
				}).reduce( function( a, b ){ return a + b }, '');
				
				html += '</td>\n';
				html += '</tr>';
			}
		});
		
		html += '\
						</tbody>\
					</table>\
				</td>\
			</tr>\
						</tbody>\
					</table>\
				</td>\
			</tr>\
		';
	}
	html += '</table>';
	
	html += '<a href="' + SETTINGS_SHEET_URL + '">Settings-Sheet</a>';
	html += '</div></body></html>';
	return html;
}

// ####################################################
// ####################################################

function sendEmail( recipient, subject, text, html ){
	if( !text && !html ){
		throw new Error( 'Whether text-body nor html supplied for email.' );
	}
	if( MAILGUN.SEND_EMAILS_THROUGH_MAILGUN ){
		return mailGunSender( recipient, subject, text, html );
	}
	mailAppSender( recipient, subject, text, html );
}

function mailAppSender( recipient, subject, text, html ){
	MailApp.sendEmail(
		recipient,
		subject,
		text,
		{
			name: SCRIPT_NAME + SCRIPT_INSTANCE,
			htmlBody : html
		}
	);
}

function mailGunSender( recipient, subject, text, html ){
	if ( html ){
		if ( !text ){
			text = 'this is supposed to be a html email. Seems like your device doesn\'t support html emails.';
		}
		//html = '<html><body>' + html + '</body></html>';
	} else {
		html = null;
	}
	log( 'fetch URL' );

	return UrlFetchApp.fetch(
		MAILGUN.URL,
		{
			method : 'post',
			payload : {
				from : MAILGUN.FROM,
				to: recipient,
				subject : subject,
				text : text,
				html : html,
			},
			headers : {
				Authorization : MAILGUN.AUTHORISATION,
			}
		}
	 );
}

// ####################################################
// ####################################################

// ####################################################
// ####################################################

var GOOGLE_SHEETS = ( function (){
	var HAS_HEADER_ROW = true;
	
	function autoResizeColumns( sheet ){
		for( var column = 1; column <= sheet.getLastColumn(); column++ ){
			sheet.autoResizeColumn( column );
		}
	}
	
	function getMapOfLists( keyColumnIndex, valueColumnIndex, sheetUrl, sheetName, keyPredicate ){
		var values = loadSheet( sheetUrl, sheetName );
		var res = {};
		for( var index = HAS_HEADER_ROW ? 1 : 0; index < values.length; index++ ){
			var key =  values[ index ][ keyColumnIndex ];
			var value = values[ index ][ valueColumnIndex ];
			
			if( !keyPredicate || keyPredicate( key ) ){
				res[ key ] = value.split(',').map( _.trim() );
			}
		}
		return res;
	}
	
	function initSheet( sheetUrl, sheetName ){
		var book = SpreadsheetApp.openByUrl( sheetUrl );
		if ( !sheetName ){
			sheetName = book.getSheetName();
		}
		var sheet = book.getSheetByName( sheetName );

		if ( !sheet ){
			sheet = book.insertSheet( sheetName );

			if ( sheet.getMaxColumns() > 1 ){
				// delete unused columns to stay below
				// the 2 mio cells limit of google sheets
				sheet.deleteColumns( 2, sheet.getMaxColumns() - 1 );
			}

			if ( sheet.getMaxRows() > 1 ){
				// delete unused rows to stay below
				// the 2 mio cells limit of google sheets
				sheet.deleteRows( 2, sheet.getMaxRows() - 1 );
			}
		}

		return sheet;
	}
	
	function loadSheet2( sheet ){
		return sheet
			.getRange( 
				1,
				1,
				Math.max( 1, sheet.getLastRow() ),
				Math.max( 1, sheet.getLastColumn() )
			 )
			.getValues();
	}
	
	function loadSheet( sheetUrl, sheetName ){
		var sheet = initSheet( sheetUrl, sheetName );
		return loadSheet2( sheet );
	}
	
	function accountPredicate( cellValue ){
		return ( typeof cellValue == 'string' && cellValue.match( /^\d\d\d-\d\d\d-\d\d\d\d$/ ) ) 
	}
	
	function getAccountIds( sheetUrl, sheetName, columnIndex ){
		var res = [];
		var values = loadSheet( sheetUrl, sheetName );
		for( var index = HAS_HEADER_ROW ? 1 : 0; index < values.length; index++ ){
			var cellValue = values[ index ][ columnIndex ];
			if( accountPredicate( cellValue ) ){
				res.push( cellValue );
			}else{
				log( 'WARNING: ' + cellValue + ' is not a valid account-id. Expected: xxx-xxx-xxxx' );
			}
		}
		return res;
	}
	
	function getAccountEmailMap( accountIndex, emailIndex, sheetUrl, sheetName ){
		return getMapOfLists(
			accountIndex,
			emailIndex,
			sheetUrl,
			sheetName, 
			accountPredicate
		);
	}
	
	return {
		loadSheet			: loadSheet,
		//getMapOfLists		: getMapOfLists,
		getAccountIds		: getAccountIds,
		getAccountEmailMap 	: getAccountEmailMap,
	};
})();
// ####################################################
// ####################################################

function log( message ){
	Logger.log( message );
	console.info( message );
}