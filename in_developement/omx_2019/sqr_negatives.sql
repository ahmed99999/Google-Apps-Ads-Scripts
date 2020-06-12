WITH
search_queries AS (
	SELECT
		IFNULL( CustomerDescriptiveName,  AccountDescriptiveName ) AS AccountName
		,CampaignName
		,AdGroupName
		,ExternalCustomerId
		,CampaignId
		,AdGroupId
		,CriterionId
		,criteria.Criteria      AS keyword
		,Query
		,SUM( Clicks )          AS clicks
		,SUM( Cost )            AS cost
		,SUM( Conversions )     AS conversions
		,SUM( ConversionValue ) AS conversionValue
	FROM `biddy-io.peak_ace_active_clients_transfer.SearchQueryStats_1036246249` AS sq
	JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer
		USING( ExternalCustomerId )
	JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
		USING( ExternalCustomerId, CampaignId )
	JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249`  AS adgroup
		USING( ExternalCustomerId, CampaignId, AdGroupId )
	JOIN `biddy-io.peak_ace_active_clients_transfer.Criteria_1036246249` AS criteria
		USING( ExternalCustomerId, CampaignId, AdGroupId, CriterionId )
	WHERE TRUE
		AND DATE_DIFF( sq._LATEST_DATE, sq._DATA_DATE, DAY ) < 365
		AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
		AND adgroup.AdGroupStatus   IN ( 'ENABLED', 'PAUSED' )
		AND criteria.Status         IN ( 'ENABLED', 'PAUSED' )
		AND customer._LATEST_DATE = customer._DATA_DATE
		AND campaign._LATEST_DATE = campaign._DATA_DATE
		AND adgroup ._LATEST_DATE = adgroup ._DATA_DATE
		AND criteria._LATEST_DATE = criteria._DATA_DATE
		AND sq.ExternalCustomerId = 7056468392
		AND sq.clicks > 0
	GROUP BY
		AccountName
		,CampaignName
		,AdGroupName
		,ExternalCustomerId
		,CampaignId
		,AdGroupId
		,CriterionId
		,criteria.Criteria
		,Query
),

account_level AS (
	SELECT
		AccountName
		,ExternalCustomerId
		,word
		,SUM( clicks )              AS account_clicks
		,SUM( cost )                AS account_cost
		,SUM( conversions )         AS account_conversions
		,SUM( conversionValue )     AS account_conversion_value
		,`pa-internal-projects`.omx_2019.crUpperBound( .5, SUM( clicks ), SUM( conversions ), 100, .031 ) AS upper_bound_cr
	FROM (
		SELECT
			AccountName,
			sq.ExternalCustomerId
			,sq.Query
			,SUM( Clicks )          AS clicks
			,SUM( Cost )            AS cost
			,SUM( Conversions )     AS conversions
			,SUM( ConversionValue ) AS conversionValue
		FROM search_queries AS sq
		WHERE TRUE
		GROUP BY
			AccountName
			,ExternalCustomerId
			,Query
	) AS sq
	,UNNEST( SPLIT( Query, ' ' ) ) AS word
	WHERE TRUE
		AND REGEXP_CONTAINS( word, '^\\w+$' )
		AND LENGTH( word ) > 3
		--AND word = 'hotel'
	GROUP BY
		AccountName
		,ExternalCustomerId
		,word
	HAVING TRUE
		--AND `pa-internal-projects`.omx_2019.crUpperBound( .5, clicks, conversions, 100, .031 ) < 0.005
),

campaign_level AS (
	SELECT
		ExternalCustomerId
		,CampaignName
		,CampaignId
		,word
		,SUM( clicks )               AS campaign_clicks
		,SUM( cost )                 AS campaign_cost
		,SUM( conversions )          AS campaign_conversions
		,SUM( conversionValue )      AS campaign_conversion_value
		,`pa-internal-projects`.omx_2019.crUpperBound( .5, SUM( clicks ), SUM( conversions ), 100, .031 ) AS upper_bound_cr
	FROM (
		SELECT
			ExternalCustomerId
			,CampaignName
			,CampaignId
			,Query
			,SUM( Clicks )          AS clicks
			,SUM( Cost )            AS cost
			,SUM( Conversions )     AS conversions
			,SUM( ConversionValue ) AS conversionValue
		FROM search_queries AS sq
		WHERE TRUE
		GROUP BY
			ExternalCustomerId
			,CampaignName
			,CampaignId
			,Query
	) AS sq
	,UNNEST( SPLIT( Query, ' ' ) ) AS word
	WHERE TRUE
		AND REGEXP_CONTAINS( word, '^\\w+$' )
		AND LENGTH( word ) > 3
		--AND word = 'hotel'
	GROUP BY
		ExternalCustomerId
		,CampaignName
		,CampaignId
		,word
	HAVING TRUE
		--AND upper_bound_cr < .005
),

ad_group_level AS (
	SELECT
		ExternalCustomerId
		,CampaignId
		,AdGroupName
		,AdGroupId
		,word
		,SUM( clicks )                               AS ad_group_clicks
		,SUM( cost )                                 AS ad_group_cost
		,SUM( conversions )                          AS ad_group_conversions
		,SUM( conversionValue )                      AS ad_group_conversion_value
		,CASE -- is_targeted
			WHEN
				LOGICAL_OR(
					REGEXP_CONTAINS(
						CONCAT(
							' ',
							REGEXP_REPLACE(
								sq.keywords1,
								'\\+',
								''
							),
							' '
						),
						CONCAT(
							' ',
							word,
							' '
						)
					)
				)
			THEN 'ADDED'
			ELSE 'NONE'
		END AS is_targeted
		,STRING_AGG( DISTINCT sq.keywords2 , ',' )   AS keywords
		,STRING_AGG( DISTINCT sq.Query )             AS queries
		,`pa-internal-projects`.omx_2019.crUpperBound( .5, SUM( clicks ), SUM( conversions ), 100, .031 ) AS upper_bound_cr
	FROM (
		SELECT
			ExternalCustomerId
			,CampaignId
			,AdGroupName
			,AdGroupId
			,Query
			,STRING_AGG( DISTINCT sq.keyword , ' ' ) AS keywords1
			,STRING_AGG( DISTINCT sq.keyword , ',' ) AS keywords2
			,SUM( Clicks )                           AS clicks
			,SUM( Cost )                             AS cost
			,SUM( Conversions )                      AS conversions
			,SUM( ConversionValue )                  AS conversionValue
		FROM search_queries AS sq
		WHERE TRUE
		GROUP BY
			ExternalCustomerId
			,CampaignId
			,AdGroupName
			,AdGroupId
			,Query
	) AS sq
	,UNNEST( SPLIT( Query, ' ' ) ) AS word
	WHERE TRUE
		AND REGEXP_CONTAINS( word, '^\\w+$' )
		AND LENGTH( word ) > 3
		--AND word = 'hotel'
	GROUP BY
		ExternalCustomerId
		,CampaignId
		,AdGroupName
		,AdGroupId
		,word
	HAVING TRUE
		--AND upper_bound_cr < .005
),

-------------------------------

ad_group_join AS (
	SELECT
		AccountName
		,CampaignName
		,AdGroupName
		,'Ad Group' AS Level
		,ExternalCustomerId
		,CampaignId
		,AdGroupId
		,word
		
		,is_targeted
		
	
		--,keywords
		--,queries
		
		,account_clicks
		,account_cost
		,account_conversions
		,account_conversion_value
		,campaign_clicks
		,campaign_cost
		,campaign_conversions
		,campaign_conversion_value
		,ad_group_clicks
		,ad_group_cost
		,ad_group_conversions
		,ad_group_conversion_value
		,`pa-internal-projects`.omx_2019.crUpperBound( -- account_cr_upper_bound
			.5,
			account_clicks,
			account_conversions,
			100,
			.031
		) AS account_cr_upper_bound
	FROM ad_group_level
	JOIN account_level  USING( ExternalCustomerId,             word )
	JOIN campaign_level USING( ExternalCustomerId, CampaignId, word )
),

campaign_join AS (
	SELECT
		AccountName
		,CampaignName
		,'ALL' AS AdGroupName
		,'Campaign' AS Level
		,ExternalCustomerId
		,CampaignId
		,CAST( NULL AS INT64 ) AS AdGroupId
		,word
		
		,CAST( NULL AS STRING ) AS is_targeted
		--,keywords
		--,queries
		
		,account_clicks
		,account_cost
		,account_conversions
		,account_conversion_value
		,campaign_clicks
		,campaign_cost
		,campaign_conversions
		,campaign_conversion_value
		,CAST( NULL AS INT64   ) AS ad_group_clicks
		,CAST( NULL AS FLOAT64 ) AS ad_group_cost
		,CAST( NULL AS FLOAT64 ) AS ad_group_conversions
		,CAST( NULL AS FLOAT64 ) AS ad_group_conversion_value
		,`pa-internal-projects`.omx_2019.crUpperBound( -- account_cr_upper_bound
			.5,
			account_clicks,
			account_conversions,
			100,
			.031
		) AS account_cr_upper_bound
	FROM campaign_level
	JOIN account_level  USING( ExternalCustomerId, word )
)
/*,CASE -- is_ad_group_excluded
	WHEN
		(
			SELECT
				STRING_AGG( DISTINCT negative.Criteria ) AS negativeKeywords
			FROM `biddy-io.peak_ace_active_clients_transfer.Criteria_1036246249` AS negative
			WHERE TRUE
				AND source.ExternalCustomerId = negative.ExternalCustomerId
				AND source.CampaignId         = negative.CampaignId
				AND source.AdGroupId          = negative.AdGroupId
				AND negative.IsNegative
				AND _LATEST_DATE              = _DATA_DATE
				AND source.word               = REGEXP_REPLACE( negative.Criteria, '\\+', '' )
		) IS NULL
	THEN 'NOT_EXCLUDED'
	ELSE 'EXCLUDED'
END AS is_ad_group_excluded
*/

SELECT
	*
FROM (
	SELECT
		*
	FROM campaign_join
	UNION ALL
	SELECT
		*
	FROM ad_group_join
) AS source
WHERE TRUE
	AND account_cr_upper_bound < .005
	AND (
		( AdGroupName  = 'ALL' AND campaign_conversions < .001 )
		OR
		( AdGroupName != 'ALL' AND campaign_conversions > .001 AND ad_group_conversions < .001 )
	)
ORDER BY
	account_cr_upper_bound
	,word
	,CampaignName
	,AdGroupName




