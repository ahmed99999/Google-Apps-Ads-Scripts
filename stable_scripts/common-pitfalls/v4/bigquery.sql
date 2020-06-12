
-- adgroup_no_keywords
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( AdGroupId as STRING ) as AdGroupId,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	CampaignName,
	AdGroupName
FROM `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND ( SELECT count(*) from `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword WHERE keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.AdGroupId = adgroup.AdGroupId AND NOT IsNegative AND keyword._LATEST_DATE = keyword._DATA_DATE ) = 0
	AND AdGroupType = 'SEARCH_STANDARD'
	AND AdvertisingChannelType = 'SEARCH'
ORDER BY AccountName, CampaignName, AdGroupName


-- adgroup_no_active_keywords
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( AdGroupId as STRING ) as AdGroupId,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	CampaignName,
	AdGroupName
FROM `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND ( SELECT count(*) from `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword WHERE keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.AdGroupId = adgroup.AdGroupId AND NOT IsNegative AND Status = 'ENABLED' AND keyword._LATEST_DATE = keyword._DATA_DATE ) = 0
	AND ( SELECT count(*) from `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword WHERE keyword.AdGroupId = adgroup.AdGroupId AND NOT IsNegative AND keyword._LATEST_DATE = keyword._DATA_DATE ) > 0
	AND AdGroupType = 'SEARCH_STANDARD'
	AND AdvertisingChannelType = 'SEARCH'
ORDER BY AccountName, CampaignName, AdGroupName




-- adgroup_too_many_exact_keywords
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	CampaignName,
	AdGroupName,
	count(*) as countExactKeywords
FROM `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword ON keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId AND NOT IsNegative AND KeywordMatchType = 'EXACT'
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND AdvertisingChannelType = 'SEARCH'
GROUP BY AccountName, CampaignName, AdGroupName, customer.ExternalCustomerId, CampaignId, AdGroupId, AdGroupStatus, CampaignStatus
HAVING TRUE
  AND countExactKeywords > 10
ORDER BY AccountName, CampaignName, AdGroupName



-- adgroup_no_negative_keywords_in_broad_adgroup
SELECT
    adgroup.AccountName,
    CAST( adgroup.ExternalCustomerId as STRING ) as ExternalCustomerId,
    CAST( adgroup.CampaignId as STRING ) as CampaignId,
    CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
    adgroup.CampaignStatus,
    adgroup.AdGroupStatus,
    adgroup.CampaignName,
    adgroup.AdGroupName
    --,adgroup.CountBroadKeywords
    --,SystemServingStatus
    --,SUM( Impressions ) AS ImpressionisLast30Days
FROM (
	SELECT
		IFNULL( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
		customer.ExternalCustomerId,
		campaign.CampaignId,
		adgroup.AdGroupId,
		campaign.CampaignStatus,
		adgroup.AdGroupStatus,
		CampaignName,
		AdGroupName,
		SUM( CAST( IsNegative AS INT64 ) ) AS CountNegativeKeywords,
		SUM( CAST( NOT IsNegative AND KeywordMatchType != 'BROAD' AS INT64 ) ) AS CountNonBroadKeywords,
		SUM( CAST( NOT IsNegative AND KeywordMatchType = 'BROAD' AS INT64 ) ) AS CountBroadKeywords,
		STRING_AGG( SystemServingStatus, ', ' ) AS SystemServingStatus
	FROM `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` AS adgroup
	JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId
	JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId
	JOIN `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` AS keyword ON keyword.ExternalCustomerId = customer.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId
	WHERE TRUE
		AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
		AND campaign.AdvertisingChannelType = 'SEARCH'
		AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
		AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
		AND campaign._LATEST_DATE = campaign._DATA_DATE
		AND customer._LATEST_DATE = customer._DATA_DATE
		AND adgroup._LATEST_DATE = adgroup._DATA_DATE
		AND keyword._LATEST_DATE = keyword._DATA_DATE
	GROUP BY AccountName, ExternalCustomerId, CampaignName, campaign.CampaignId, AdGroupId, CampaignStatus, AdGroupStatus, CampaignName, AdGroupName
	HAVING
		CountNegativeKeywords = 0
		AND CountNonBroadKeywords = 0
		AND CountBroadKeywords > 0
) AS adgroup
-- the join excludes adgroups without impressions in the last 30 days
JOIN `biddy-io.peak_ace_active_clients_transfer.KeywordBasicStats_1036246249` AS stat
	ON stat.ExternalCustomerId = adgroup.ExternalCustomerId
	AND stat.CampaignId = adgroup.CampaignId
	AND stat.AdGroupId = adgroup.AdGroupId
	AND DATE_DIFF( CURRENT_DATE( 'Europe/Berlin' ), _DATA_DATE, DAY ) <= 30
WHERE TRUE
	AND REGEXP_CONTAINS( SystemServingStatus, 'ELIGIBLE' )
GROUP BY AccountName, ExternalCustomerId, CampaignName, adgroup.CampaignId, AdGroupId, CampaignStatus, AdGroupStatus, CampaignName, AdGroupName, CountBroadKeywords, SystemServingStatus
ORDER BY AccountName, ExternalCustomerId, CampaignName, adgroup.CampaignId, AdGroupId, CampaignStatus, AdGroupStatus, CampaignName, AdGroupName, CountBroadKeywords, SystemServingStatus
--ImpressionisLast30Days DESC





-- adgroup_too_many_broad_keywords
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	CampaignName,
	AdGroupName,
	count(*) as countBroadKeywords
FROM `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword ON keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId AND NOT IsNegative AND KeywordMatchType = 'BROAD'
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND AdvertisingChannelType = 'SEARCH'
GROUP BY AccountName, CampaignName, AdGroupName, customer.ExternalCustomerId, CampaignId, AdGroupId, AdGroupStatus, CampaignStatus
HAVING TRUE
  AND countBroadKeywords > 1
ORDER BY AccountName, CampaignName, AdGroupName




-- adgroup_no_ads
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( AdGroupId as STRING ) as AdGroupId,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	CampaignName,
	AdGroupName
FROM `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND (
		SELECT
			count(*) 
		FROM `biddy-io.peak_ace_active_clients_transfer.Ad_1036246249` AS ad
		WHERE TRUE
			AND ad.ExternalCustomerId = adgroup.ExternalCustomerId
			AND ad.AdGroupId = adgroup.AdGroupId
			AND AdType IN (
				'GMAIL_AD',
				'MULTI_ASSET_RESPONSIVE_DISPLAY_AD',
				'TEMPLATE_AD',
				'CALL_ONLY_AD',
				'EXPANDED_TEXT_AD',
				'RESPONSIVE_SEARCH_AD',
				'TEXT_AD',
				'RESPONSIVE_DISPLAY_AD',
				'IMAGE_AD',
				'DYNAMIC_SEARCH_AD',
				'EXPANDED_DYNAMIC_SEARCH_AD'
			)
			AND ad._LATEST_DATE = ad._DATA_DATE
	) = 0
	AND AdGroupType IN ( 'SEARCH_STANDARD', 'DISPLAY_STANDARD' )
ORDER BY AccountName, CampaignName, AdGroupName



-- adgroup_too_few_ads
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	CampaignName,
	AdGroupName,
	count(*) AS countAds
FROM `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.Ad_1036246249` AS ad
	ON ad.ExternalCustomerId = adgroup.ExternalCustomerId
	AND ad.CampaignId = campaign.CampaignId
	AND ad.AdGroupId = adgroup.AdGroupId
	AND AdType IN (
		'GMAIL_AD',
		'MULTI_ASSET_RESPONSIVE_DISPLAY_AD',
		'TEMPLATE_AD',
		'CALL_ONLY_AD',
		'EXPANDED_TEXT_AD',
		'RESPONSIVE_SEARCH_AD',
		'TEXT_AD',
		'RESPONSIVE_DISPLAY_AD',
		'IMAGE_AD',
		'DYNAMIC_SEARCH_AD',
		'EXPANDED_DYNAMIC_SEARCH_AD'
	)
	AND ad._LATEST_DATE = ad._DATA_DATE
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND ad.Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND AdGroupType IN ( 'SEARCH_STANDARD', 'DISPLAY_STANDARD' )
GROUP BY AccountName, CampaignName, AdGroupName, CustomerDescriptiveName, AccountDescriptiveName, customer.ExternalCustomerId, AdGroupId, campaign.CampaignStatus, adgroup.AdGroupStatus, campaign.CampaignId
HAVING TRUE
	AND countAds = 2 --IN ( 1, 2, 3 )
ORDER BY AccountName, CampaignName, AdGroupName


-- adgroup_too_many_enabled_ads
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	CampaignName,
	AdGroupName,
	count(*) AS countAds
FROM `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.Ad_1036246249` AS ad
	ON ad.ExternalCustomerId = adgroup.ExternalCustomerId
	AND ad.CampaignId = campaign.CampaignId
	AND ad.AdGroupId = adgroup.AdGroupId
	AND AdType IN (
		'GMAIL_AD',
		'MULTI_ASSET_RESPONSIVE_DISPLAY_AD',
		'TEMPLATE_AD',
		'CALL_ONLY_AD',
		'EXPANDED_TEXT_AD',
		'RESPONSIVE_SEARCH_AD',
		'TEXT_AD',
		'RESPONSIVE_DISPLAY_AD',
		'IMAGE_AD',
		'DYNAMIC_SEARCH_AD',
		'EXPANDED_DYNAMIC_SEARCH_AD'
	)
	AND ad._LATEST_DATE = ad._DATA_DATE
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND ad.Status IN ( 'ENABLED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND AdGroupType IN ( 'SEARCH_STANDARD', 'DISPLAY_STANDARD' )
GROUP BY AccountName, CampaignName, AdGroupName, CustomerDescriptiveName, AccountDescriptiveName, customer.ExternalCustomerId, AdGroupId, campaign.CampaignStatus, adgroup.AdGroupStatus, campaign.CampaignId
HAVING TRUE
	AND countAds > 6
ORDER BY AccountName, CampaignName, AdGroupName


-- adgroup_no_dsa
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( AdGroupId as STRING ) as AdGroupId,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	CampaignName,
	AdGroupName
FROM `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND (
		SELECT
			count(*)
		FROM `biddy-io.peak_ace_active_clients_transfer.Ad_1036246249` AS ad
		WHERE TRUE
			AND ad.ExternalCustomerId = adgroup.ExternalCustomerId
			AND ad.AdGroupId = adgroup.AdGroupId
			AND AdType IN (
				'EXPANDED_DYNAMIC_SEARCH_AD',
				'DYNAMIC_SEARCH_AD'
			)
			AND ad._LATEST_DATE = ad._DATA_DATE
			AND Status = 'ENABLED'
	) = 0
	AND AdGroupType = 'SEARCH_DYNAMIC_ADS'
ORDER BY AccountName, CampaignName, AdGroupName


-- adgroup_too_few_dsa
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( AdGroupId as STRING ) as AdGroupId,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	CampaignName,
	AdGroupName
FROM `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND (
		SELECT
			count(*)
		FROM `biddy-io.peak_ace_active_clients_transfer.Ad_1036246249` AS ad
		WHERE TRUE
			AND ad.ExternalCustomerId = adgroup.ExternalCustomerId
			AND ad.AdGroupId = adgroup.AdGroupId
			AND AdType IN (
				'EXPANDED_DYNAMIC_SEARCH_AD',
				'DYNAMIC_SEARCH_AD'
			)
			AND ad._LATEST_DATE = ad._DATA_DATE
			AND Status = 'ENABLED'
	) IN ( 1, 2 )
	AND AdGroupType = 'SEARCH_DYNAMIC_ADS'
ORDER BY AccountName, CampaignName, AdGroupName


-- adgroup_too_many_dsa
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( AdGroupId as STRING ) as AdGroupId,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	CampaignName,
	AdGroupName
FROM `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND (
		SELECT
			count(*)
		FROM `biddy-io.peak_ace_active_clients_transfer.Ad_1036246249` AS ad
		WHERE TRUE
			AND ad.ExternalCustomerId = adgroup.ExternalCustomerId
			AND ad.AdGroupId = adgroup.AdGroupId
			AND AdType IN (
				'EXPANDED_DYNAMIC_SEARCH_AD',
				'DYNAMIC_SEARCH_AD'
			)
			AND ad._LATEST_DATE = ad._DATA_DATE
			AND Status = 'ENABLED'
	) > 6
	AND AdGroupType = 'SEARCH_DYNAMIC_ADS'
ORDER BY AccountName, CampaignName, AdGroupName



-- adgroup_negative_keyword_conflicts
SELECT
	AccountName,
	ExternalCustomerId,
	CampaignId,
	AdGroupId,
	CampaignName,
	AdGroupName,
	CampaignStatus,
	AdGroupStatus,
	keyword_ as keyword,
	negative_keyword,
	keyword_match_type as match_type,
	neg_match_type as match_type_of_negative_keyword
FROM (
	SELECT
		ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
		CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
		CAST( campaign.CampaignId as STRING ) as CampaignId,
		CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
		campaign.CampaignName,
		adgroup.AdGroupName,
		campaign.CampaignStatus,
		adgroup.AdGroupStatus,
		keyword.Criteria as keyword_,
		neg.Criteria as negative_keyword,
		keyword.KeywordMatchType as keyword_match_type,
		neg.KeywordMatchType as neg_match_type,
		(
			select ARRAY_TO_STRING(
			(
				array(
					select x
					from unnest( split( REGEXP_REPLACE( REGEXP_REPLACE( keyword.Criteria, '\\s\\+', ' ' ), '^\\+', '' ), ' ' ) ) as x
					ORDER BY x
				)
			),
			' '
			)
		) as keyword_sorted,
		(
			select ARRAY_TO_STRING(
			(
				array(
					select x
					from unnest( SPLIT( REGEXP_REPLACE( REGEXP_REPLACE( neg.Criteria, '\\s\\+', ' ' ), '^\\+', '' ), ' ' ) ) as x
					ORDER BY x
				)
			),
			' '
			)
		) as neg_sorted
	FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword
	JOIN `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as neg ON keyword.ExternalCustomerId = neg.ExternalCustomerId AND keyword.AdGroupId = neg.AdGroupId
	JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON keyword.ExternalCustomerId = campaign.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId AND keyword.ExternalCustomerId = campaign.ExternalCustomerId
	JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON keyword.ExternalCustomerId = customer.ExternalCustomerId
	JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.AdGroupId = adgroup.AdGroupId
	WHERE TRUE
		AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
		AND NOT keyword.IsNegative
		AND neg.IsNegative
		AND neg.Status = 'ENABLED'
		AND keyword.Status = 'ENABLED'
		AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
		AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
		AND campaign._LATEST_DATE = campaign._DATA_DATE
		AND customer._LATEST_DATE = customer._DATA_DATE
		AND adgroup._LATEST_DATE = adgroup._DATA_DATE
		AND keyword._LATEST_DATE = keyword._DATA_DATE
		AND neg._LATEST_DATE = neg._DATA_DATE
		--AND keyword.KeywordMatchType IN ( 'EXACT', 'PHRASE' )
	GROUP BY
		customer.ExternalCustomerId,
		AccountName,
		campaign.CampaignName,
		CampaignId,
		AdGroupId,
		adgroup.AdGroupName,
		campaign.CampaignStatus,
		adgroup.AdGroupStatus,
		keyword.Criteria,
		keyword.KeywordMatchType,
		neg.Criteria,
		neg.KeywordMatchType
)
WHERE TRUE
	AND (
		( neg_match_type = 'EXACT'  AND negative_keyword = keyword_ AND keyword_match_type = 'EXACT' )
		OR ( neg_match_type = 'PHRASE' AND REGEXP_CONTAINS( CONCAT( ' ', keyword_, ' ' ), CONCAT( ' ', negative_keyword, ' ' ) ) )
		OR ( neg_match_type = 'BROAD'  AND REGEXP_CONTAINS( CONCAT( ' ', keyword_sorted, ' ' ),
			CONCAT( ' ', ARRAY_TO_STRING( SPLIT( neg_sorted, ' ' ), '\\s(\\w*\\s)*' ), ' ' ) ) )
	)



-- adgroup_without_audience
SELECT
	CustomerDescriptiveName as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
	campaign.CampaignName,
	adgroup.AdGroupName,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus
	--,sum( cast( audience.ExternalCustomerId is not null as int64 ) ) as countAudiences
FROM `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` AS adgroup
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer
	ON customer.ExternalCustomerId = adgroup.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
	ON campaign.CampaignId = adgroup.CampaignId
	AND campaign.ExternalCustomerId = adgroup.ExternalCustomerId
	AND campaign. AdvertisingChannelType IN ( 'SEARCH', 'SHOPPING' )
	AND REGEXP_CONTAINS( campaign.CampaignName , 'RLSA' )
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.Criteria_1036246249` AS audience
	ON  adgroup.ExternalCustomerId = audience.ExternalCustomerId
	AND campaign.CampaignId = audience.CampaignId
	AND adgroup.AdGroupId = audience.AdGroupId
	AND audience._DATA_DATE = audience._LATEST_DATE
	AND CriteriaType = 'USER_LIST'
	AND Status IN ( 'ENABLED', 'PAUSED' )
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND customer._DATA_DATE = customer._LATEST_DATE
	AND campaign._DATA_DATE = campaign._LATEST_DATE
	AND adgroup._DATA_DATE = adgroup._LATEST_DATE
	AND audience.ExternalCustomerId is null
GROUP BY
	customer.ExternalCustomerId,
	CustomerDescriptiveName,
	campaign.CampaignName,
	adgroup.AdGroupName,
	CampaignId,
	AdGroupId,
	adgroup.AdGroupStatus,
	campaign.CampaignStatus
HAVING TRUE
  --AND customer.ExternalCustomerId = 5974641331
ORDER BY CustomerDescriptiveName, campaign.CampaignName, adgroup.AdGroupName



-- ad_policy_violation
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
  	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
	CAST( ad.CreativeId as STRING ) as AdId,
	CampaignName,
	AdGroupName,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	Status,
	HeadLinePart1,
	HeadLinePart2,
	Description,
	PolicySummary,
	Path1,
	Path2
FROM `biddy-io.peak_ace_active_clients_transfer.Ad_1036246249` as ad
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON ad.ExternalCustomerId = campaign.ExternalCustomerId AND ad.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = ad.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND AdType = 'EXPANDED_TEXT_AD'
	AND Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND ad._LATEST_DATE = ad._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND PolicySummary is not null


-- ad_path1_missing_in_non_brand_campaign
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
  	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
	CAST( ad.CreativeId as STRING ) as AdId,
	CampaignName,
	AdGroupName,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	Status,
	HeadLinePart1,
	HeadLinePart2,
	Description,
	PolicySummary,
	Path1,
	Path2
FROM `biddy-io.peak_ace_active_clients_transfer.Ad_1036246249` as ad
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON ad.ExternalCustomerId = campaign.ExternalCustomerId AND ad.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = ad.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId
WHERE TRUE
	AND AdType = 'EXPANDED_TEXT_AD'
	AND Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND ad._LATEST_DATE = ad._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND Path1 is null
	AND NOT REGEXP_CONTAINS( CampaignName, 'Brand' )



-- ad_path2_missing_in_non_brand_campaign
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
	CAST( ad.CreativeId as STRING ) as AdId,
	CampaignName,
	AdGroupName,
	campaign.CampaignStatus,
	AdGroupStatus,
	Status,
	HeadLinePart1,
	HeadLinePart2,
	Description,
	PolicySummary,
	Path1,
	Path2
FROM `biddy-io.peak_ace_active_clients_transfer.Ad_1036246249` as ad
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON ad.ExternalCustomerId = campaign.ExternalCustomerId AND ad.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = ad.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND AdType = 'EXPANDED_TEXT_AD'
	AND Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND ad._LATEST_DATE = ad._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND Path2 is null
	AND NOT REGEXP_CONTAINS( CampaignName, 'Brand' )



-- ad_too_short_headline
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
	CAST( ad.CreativeId as STRING ) as AdId,
	CampaignName,
	AdGroupName,
	campaign.CampaignStatus,
	AdGroupStatus,
	Status,
	HeadLinePart1,
	HeadLinePart2,
	Description,
	PolicySummary,
	Path1,
	Path2
FROM `biddy-io.peak_ace_active_clients_transfer.Ad_1036246249` as ad
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON ad.ExternalCustomerId = campaign.ExternalCustomerId AND ad.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = ad.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND AdType = 'EXPANDED_TEXT_AD'
	AND Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND ad._LATEST_DATE = ad._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND ( LENGTH( HeadLinePart1 ) <= 15 OR LENGTH( HeadLinePart2 ) <= 15 )


-- ad_too_short_description
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
	CAST( ad.CreativeId as STRING ) as AdId,
	CampaignName,
	AdGroupName,
	campaign.CampaignStatus,
	AdGroupStatus,
	Status,
	HeadLinePart1,
	HeadLinePart2,
	Description,
	PolicySummary,
	Path1,
	Path2
FROM `biddy-io.peak_ace_active_clients_transfer.Ad_1036246249` as ad
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON ad.ExternalCustomerId = campaign.ExternalCustomerId AND ad.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = ad.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND AdType = 'EXPANDED_TEXT_AD'
	AND Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND ad._LATEST_DATE = ad._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND LENGTH( Description ) <= 60


-- ad_last_char_is_not_special
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
	CampaignName,
	AdGroupName,
	campaign.CampaignStatus,
	AdGroupStatus,
	Status,
	HeadLinePart1,
	HeadLinePart2,
	Description,
	PolicySummary,
	Path1,
	Path2
FROM `biddy-io.peak_ace_active_clients_transfer.Ad_1036246249` as ad
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON ad.ExternalCustomerId = campaign.ExternalCustomerId AND ad.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = ad.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND AdType = 'EXPANDED_TEXT_AD'
	AND Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND ad._LATEST_DATE = ad._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND NOT SUBSTR( Description, -1 ) IN unnest( [ '?', '!', '.' ] ) AND LENGTH( Description ) < 80





-- campaign_missing_mobile_bid_modifier
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CampaignName,
	campaign.CampaignStatus,
	AdvertisingChannelType,
  sum( Clicks ) AS Clicks
FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.CampaignBasicStats_1036246249` AS stat
  ON stat.ExternalCustomerId = campaign.ExternalCustomerId
  AND stat.CampaignId = campaign.CampaignId
  AND DATE_DIFF( CURRENT_DATE( 'Europe/Berlin' ), stat._DATA_DATE, DAY ) <= 30
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND CampaignMobileBidModifier IS NULL
GROUP BY CustomerDescriptiveName, AccountDescriptiveName, campaign.CampaignId, customer.ExternalCustomerId, CampaignName, CampaignStatus, AdvertisingChannelType
HAVING Clicks > 0
ORDER BY Clicks DESC


-- campaign_multi_channel
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CampaignName,
	campaign.CampaignStatus,
	AdvertisingChannelType
FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND AdvertisingChannelType = 'MULTI_CHANNEL'



-- campaign_target_and_bid
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CampaignName,
	campaign.CampaignStatus,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	AdvertisingChannelType,
	TargetingSetting
FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.CampaignSettings_1036246249` as settings
	ON  settings.ExternalCustomerId = campaign.ExternalCustomerId
	AND settings.CampaignId = campaign.CampaignId
	AND DATE_SUB( settings._LATEST_DATE, INTERVAL 1 DAY ) = settings._DATA_DATE
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	-- targeting is narrowed
	AND TargetingSetting = 'TARGET_ALL_FALSE'
	AND AdvertisingChannelType = 'SEARCH'
	AND NOT ( FALSE
		OR REGEXP_CONTAINS( UPPER( CampaignName ), 'RLSA' )
		OR REGEXP_CONTAINS( UPPER( CampaignName ), 'REMARKETING' )
		OR REGEXP_CONTAINS( UPPER( CampaignName ), 'RETARGETING' )
		OR REGEXP_CONTAINS( UPPER( CampaignName ), 'RMK' )
		OR REGEXP_CONTAINS( UPPER( CampaignName ), 'WETTBEWERBER' )
		OR REGEXP_CONTAINS( UPPER( CampaignName ), 'NEUKUNDEN' )
	)




-- campaign_non_standard_delivery_method
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CampaignName,
	campaign.CampaignStatus,
	AdvertisingChannelType,
	DeliveryMethod,
	STRING_AGG( SearchBudgetLostImpressionShare, ', ' ) AS SearchBudgetLostImpressionShares
FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.CampaignSettings_1036246249` as settings
	ON  settings.ExternalCustomerId = campaign.ExternalCustomerId
	AND settings.CampaignId = campaign.CampaignId
	AND DATE_SUB( settings._LATEST_DATE, INTERVAL 1 DAY ) = settings._DATA_DATE
JOIN `biddy-io.peak_ace_active_clients_transfer.CampaignCrossDeviceStats_1036246249` as stat
	ON  stat.ExternalCustomerId = campaign.ExternalCustomerId
	AND stat.CampaignId = campaign.CampaignId
	AND DATE_DIFF( CURRENT_DATE( 'Europe/Berlin' ), stat._DATA_DATE, DAY ) <= 5
	AND SearchBudgetLostImpressionShare != '0.00%'
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND DeliveryMethod != 'STANDARD'
GROUP BY
	CustomerDescriptiveName,
	AccountDescriptiveName,
	customer.ExternalCustomerId,
	campaign.CampaignId,
	CampaignName,
	campaign.CampaignStatus,
	AdvertisingChannelType,
	DeliveryMethod






-- campaign_rotation_type_not_optimized
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CampaignName,
	campaign.CampaignStatus,
	AdvertisingChannelType,
	AdRotationType
FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.CampaignSettings_1036246249` as settings
	ON  settings.ExternalCustomerId = campaign.ExternalCustomerId
	AND settings.CampaignId = campaign.CampaignId
	AND settings._LATEST_DATE = settings._DATA_DATE
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND AdRotationType NOT IN ( 'OPTIMIZE', 'CONVERSION_OPTIMIZE' )



-- campaign_negative_keyword_conflict
SELECT
	AccountName,
	ExternalCustomerId,
	CampaignName,
	CampaignId,
	keyword_ as keyword,
	CampaignStatus,
	Status,
	negative_keyword,
	keyword_match_type as match_type,
	neg_match_type as match_type_of_negative_keyword
FROM (
	SELECT
		ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
		CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
		CAST( campaign.CampaignId as STRING ) as CampaignId,
		campaign.CampaignName,
		keyword.Criteria as keyword_,
		campaign.CampaignStatus,
		keyword.Status,
		REGEXP_REPLACE( REGEXP_REPLACE( neg.Text, '^["\\[\\+]', '' ), '["\\]]$', '' ) as negative_keyword,
		keyword.KeywordMatchType as keyword_match_type,
		neg.MatchType as neg_match_type,
		(
			select ARRAY_TO_STRING(
				(
					array(
						select x
						from unnest( split( REGEXP_REPLACE( REGEXP_REPLACE( keyword.Criteria, '\\s\\+', ' ' ), '^\\+', '' ), ' ' ) ) as x
						ORDER BY x
					)
				),
				' '
			)
		) as keyword_sorted,
		(
			select ARRAY_TO_STRING(
				(
					array(
						select x
						from unnest( SPLIT( REGEXP_REPLACE( REGEXP_REPLACE( REGEXP_REPLACE( neg.Text, '\\s\\+', ' ' ), '^["\\[\\+]', '' ), '["\\]]$', '' ), ' ' ) ) as x
						ORDER BY x
					)
				),
				' '
			)
		) as neg_sorted
	FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword
	JOIN `biddy-io.peak_ace_active_clients_transfer.CampaignNegativeKeywords_1036246249` as neg ON keyword.ExternalCustomerId = neg.ExternalCustomerId AND keyword.CampaignId = neg.CampaignId
	JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON keyword.ExternalCustomerId = campaign.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId
	JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON keyword.ExternalCustomerId = customer.ExternalCustomerId
	WHERE TRUE
		AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
		AND NOT keyword.IsNegative
		AND keyword.Status IN ( 'ENABLED', 'PAUSED' )
		AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
		AND campaign._LATEST_DATE = campaign._DATA_DATE
		AND customer._LATEST_DATE = customer._DATA_DATE
		AND keyword._LATEST_DATE = keyword._DATA_DATE
		AND neg._LATEST_DATE = neg._DATA_DATE
	GROUP BY
		customer.ExternalCustomerId,
		AccountName,
		campaign.CampaignName,
		CampaignId,
		keyword.Criteria,
		keyword.KeywordMatchType,
		campaign.CampaignStatus,
		keyword.Status,
		neg.Text,
		neg.MatchType
)
WHERE TRUE
	AND (
		( neg_match_type = 'EXACT'  AND negative_keyword = keyword_ AND keyword_match_type = 'EXACT' )
		OR ( neg_match_type = 'PHRASE' AND REGEXP_CONTAINS( CONCAT( ' ', keyword_, ' ' ), CONCAT( ' ', REGEXP_REPLACE( negative_keyword, '[+]', '\\\\+' ), ' ' ) ) )
		OR ( neg_match_type = 'BROAD'  AND REGEXP_CONTAINS( CONCAT( ' ', keyword_sorted, ' ' ),
			CONCAT( ' ', ARRAY_TO_STRING( SPLIT(  REGEXP_REPLACE( neg_sorted, '[+]', '\\\\+' ), ' ' ), '\\s(\\w*\\s)*' ), ' ' ) ) )
	)



-- duplicate_conversion_tracker
SELECT
	AccountName,
	ExternalCustomerId,
	STRING_AGG( CONCAT( ConversionTypeName, '[ ', cast( ConversionTrackerId as STRING ), ' ]' ) , ', ' ) as conversion_tracker_ids,
	count(*) as count,
	conversions,
	value
FROM (
	SELECT
		ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
		CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
		ConversionTrackerId,
		ConversionTypeName,
		sum( Conversions ) as conversions,
		sum( ConversionValue ) as value
	FROM `biddy-io.peak_ace_active_clients_transfer.CriteriaConversionStats_1036246249` as k
	JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = k.ExternalCustomerId
	WHERE TRUE
		AND DATE_DIFF( CURRENT_DATE(), k._DATA_DATE, DAY ) <= 30
		AND customer._LATEST_DATE = customer._DATA_DATE
		--AND k._LATEST_DATE = k._DATA_DATE
	GROUP BY customer.ExternalCustomerId, AccountName, ConversionTrackerId, ConversionTypeName
	ORDER BY AccountName, ConversionTrackerId, ConversionTypeName
)
GROUP BY
	ExternalCustomerId,
	AccountName,
	conversions,
	value
HAVING count > 1
	AND conversions > 1







-- extension_no_site_links
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CampaignName,
	campaign.CampaignStatus,
	ifnull( sum( cast( EntityType = 'sitelinks' as int64 ) ), 0 ) as count_site_links,
	ifnull( sum( cast( EntityType = 'callouts' as int64 ) ), 0 ) as count_callouts,
	ifnull( sum( cast( EntityType = 'snippets' as int64 ) ), 0 ) as count_snippets,
	ifnull( sum( cast( EntityType = 'messages' as int64 ) ), 0 ) as count_messages,
	ifnull( sum( cast( EntityType = 'phoneNumbers' as int64 ) ), 0 ) as count_phone_numbers,
	ifnull( sum( cast( EntityType = 'mobileApps' as int64 ) ), 0 ) as count_mobile_apps
FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.ExtensionsCampaignMap_1036246249` AS map
	ON campaign.ExternalCustomerId = map.ExternalCustomerId
	AND campaign.CampaignId = map.CampaignId
	AND map._DATA_DATE = map._LATEST_DATE
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._DATA_DATE = campaign._LATEST_DATE
	AND customer._DATA_DATE = customer._LATEST_DATE
	-- take into account only campaigns which are served by adwords-script
	AND campaign.ExternalCustomerId IN (
		SELECT ExternalCustomerId
		FROM `biddy-io.peak_ace_active_clients_transfer.CampaignSettings_1036246249` as x 
		WHERE x._DATA_DATE = x._LATEST_DATE
		GROUP BY ExternalCustomerId
	)
GROUP BY
	customer.ExternalCustomerId,
	campaign.CampaignName,
	campaign.CampaignStatus,
	CustomerDescriptiveName,
	AccountDescriptiveName,
	CampaignId
HAVING TRUE
	AND count_site_links = 0


-- extension_too_few_site_links
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CampaignName,
	campaign.CampaignStatus,
	ifnull( sum( cast( EntityType = 'sitelinks' as int64 ) ), 0 ) as count_site_links,
	ifnull( sum( cast( EntityType = 'callouts' as int64 ) ), 0 ) as count_callouts,
	ifnull( sum( cast( EntityType = 'snippets' as int64 ) ), 0 ) as count_snippets,
	ifnull( sum( cast( EntityType = 'messages' as int64 ) ), 0 ) as count_messages,
	ifnull( sum( cast( EntityType = 'phoneNumbers' as int64 ) ), 0 ) as count_phone_numbers,
	ifnull( sum( cast( EntityType = 'mobileApps' as int64 ) ), 0 ) as count_mobile_apps
FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.ExtensionsCampaignMap_1036246249` AS map
	ON campaign.ExternalCustomerId = map.ExternalCustomerId
	AND campaign.CampaignId = map.CampaignId
	AND map._DATA_DATE = map._LATEST_DATE
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._DATA_DATE = campaign._LATEST_DATE
	AND customer._DATA_DATE = customer._LATEST_DATE
	-- take into account only campaigns which are served by adwords-script
	AND campaign.ExternalCustomerId IN (
		SELECT ExternalCustomerId
		FROM `biddy-io.peak_ace_active_clients_transfer.CampaignSettings_1036246249` as x 
		WHERE x._DATA_DATE = x._LATEST_DATE
		GROUP BY ExternalCustomerId
	)
GROUP BY
	customer.ExternalCustomerId,
	campaign.CampaignName,
	campaign.CampaignStatus,
	CustomerDescriptiveName,
	AccountDescriptiveName,
	CampaignId
HAVING TRUE
	AND count_site_links in ( 1, 2, 3 )



-- extension_no_callouts
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CampaignName,
	campaign.CampaignStatus,
	ifnull( sum( cast( EntityType = 'sitelinks' as int64 ) ), 0 ) as count_site_links,
	ifnull( sum( cast( EntityType = 'callouts' as int64 ) ), 0 ) as count_callouts,
	ifnull( sum( cast( EntityType = 'snippets' as int64 ) ), 0 ) as count_snippets,
	ifnull( sum( cast( EntityType = 'messages' as int64 ) ), 0 ) as count_messages,
	ifnull( sum( cast( EntityType = 'phoneNumbers' as int64 ) ), 0 ) as count_phone_numbers,
	ifnull( sum( cast( EntityType = 'mobileApps' as int64 ) ), 0 ) as count_mobile_apps
FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.ExtensionsCampaignMap_1036246249` AS map
	ON campaign.ExternalCustomerId = map.ExternalCustomerId
	AND campaign.CampaignId = map.CampaignId
	AND map._DATA_DATE = map._LATEST_DATE
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._DATA_DATE = campaign._LATEST_DATE
	AND customer._DATA_DATE = customer._LATEST_DATE
	-- take into account only campaigns which are served by adwords-script
	AND campaign.ExternalCustomerId IN (
		SELECT ExternalCustomerId
		FROM `biddy-io.peak_ace_active_clients_transfer.CampaignSettings_1036246249` as x 
		WHERE x._DATA_DATE = x._LATEST_DATE
		GROUP BY ExternalCustomerId
	)
GROUP BY
	customer.ExternalCustomerId,
	campaign.CampaignName,
	campaign.CampaignStatus,
	CustomerDescriptiveName,
	AccountDescriptiveName,
	CampaignId
HAVING TRUE
	AND count_callouts = 0



-- extension_too_few_callouts
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CampaignName,
	campaign.CampaignStatus,
	ifnull( sum( cast( EntityType = 'sitelinks' as int64 ) ), 0 ) as count_site_links,
	ifnull( sum( cast( EntityType = 'callouts' as int64 ) ), 0 ) as count_callouts,
	ifnull( sum( cast( EntityType = 'snippets' as int64 ) ), 0 ) as count_snippets,
	ifnull( sum( cast( EntityType = 'messages' as int64 ) ), 0 ) as count_messages,
	ifnull( sum( cast( EntityType = 'phoneNumbers' as int64 ) ), 0 ) as count_phone_numbers,
	ifnull( sum( cast( EntityType = 'mobileApps' as int64 ) ), 0 ) as count_mobile_apps
FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.ExtensionsCampaignMap_1036246249` AS map
	ON campaign.ExternalCustomerId = map.ExternalCustomerId
	AND campaign.CampaignId = map.CampaignId
	AND map._DATA_DATE = map._LATEST_DATE
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._DATA_DATE = campaign._LATEST_DATE
	AND customer._DATA_DATE = customer._LATEST_DATE
	-- take into account only campaigns which are served by adwords-script
	AND campaign.ExternalCustomerId IN (
		SELECT ExternalCustomerId
		FROM `biddy-io.peak_ace_active_clients_transfer.CampaignSettings_1036246249` as x
		WHERE x._DATA_DATE = x._LATEST_DATE
		GROUP BY ExternalCustomerId
	)
GROUP BY
	customer.ExternalCustomerId,
	campaign.CampaignName,
	campaign.CampaignStatus,
	CustomerDescriptiveName,
	AccountDescriptiveName,
	CampaignId
HAVING TRUE
	AND count_callouts in ( 1, 2, 3 )



-- extension_no_snippets
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CampaignName,
	campaign.CampaignStatus,
	ifnull( sum( cast( EntityType = 'sitelinks' as int64 ) ), 0 ) as count_site_links,
	ifnull( sum( cast( EntityType = 'callouts' as int64 ) ), 0 ) as count_callouts,
	ifnull( sum( cast( EntityType = 'snippets' as int64 ) ), 0 ) as count_snippets,
	ifnull( sum( cast( EntityType = 'messages' as int64 ) ), 0 ) as count_messages,
	ifnull( sum( cast( EntityType = 'phoneNumbers' as int64 ) ), 0 ) as count_phone_numbers,
	ifnull( sum( cast( EntityType = 'mobileApps' as int64 ) ), 0 ) as count_mobile_apps
FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.ExtensionsCampaignMap_1036246249` AS map
	ON campaign.ExternalCustomerId = map.ExternalCustomerId
	AND campaign.CampaignId = map.CampaignId
	AND map._DATA_DATE = map._LATEST_DATE
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._DATA_DATE = campaign._LATEST_DATE
	AND customer._DATA_DATE = customer._LATEST_DATE
	-- take into account only campaigns which are served by adwords-script
	AND campaign.ExternalCustomerId IN (
		SELECT ExternalCustomerId
		FROM `biddy-io.peak_ace_active_clients_transfer.CampaignSettings_1036246249` as x 
		WHERE x._DATA_DATE = x._LATEST_DATE
		GROUP BY ExternalCustomerId
	)
GROUP BY
	customer.ExternalCustomerId,
	campaign.CampaignName,
	campaign.CampaignStatus,
	CustomerDescriptiveName,
	AccountDescriptiveName,
	CampaignId
HAVING TRUE
	AND count_snippets = 0



-- extension_too_few_snippets
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CampaignName,
	campaign.CampaignStatus,
	ifnull( sum( cast( EntityType = 'sitelinks' as int64 ) ), 0 ) as count_site_links,
	ifnull( sum( cast( EntityType = 'callouts' as int64 ) ), 0 ) as count_callouts,
	ifnull( sum( cast( EntityType = 'snippets' as int64 ) ), 0 ) as count_snippets,
	ifnull( sum( cast( EntityType = 'messages' as int64 ) ), 0 ) as count_messages,
	ifnull( sum( cast( EntityType = 'phoneNumbers' as int64 ) ), 0 ) as count_phone_numbers,
	ifnull( sum( cast( EntityType = 'mobileApps' as int64 ) ), 0 ) as count_mobile_apps
FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.ExtensionsCampaignMap_1036246249` AS map
	ON campaign.ExternalCustomerId = map.ExternalCustomerId
	AND campaign.CampaignId = map.CampaignId
	AND map._DATA_DATE = map._LATEST_DATE
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._DATA_DATE = campaign._LATEST_DATE
	AND customer._DATA_DATE = customer._LATEST_DATE
	-- take into account only campaigns which are served by adwords-script
	AND campaign.ExternalCustomerId IN (
		SELECT ExternalCustomerId
		FROM `biddy-io.peak_ace_active_clients_transfer.CampaignSettings_1036246249` as x 
		WHERE x._DATA_DATE = x._LATEST_DATE
		GROUP BY ExternalCustomerId
	)
GROUP BY
	customer.ExternalCustomerId,
	campaign.CampaignName,
	campaign.CampaignStatus,
	CustomerDescriptiveName,
	AccountDescriptiveName,
	CampaignId
HAVING TRUE
	AND count_snippets in ( 1, 2, 3 )



-- extension_no_messages
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CampaignName,
	campaign.CampaignStatus,
	ifnull( sum( cast( EntityType = 'sitelinks' as int64 ) ), 0 ) as count_site_links,
	ifnull( sum( cast( EntityType = 'callouts' as int64 ) ), 0 ) as count_callouts,
	ifnull( sum( cast( EntityType = 'snippets' as int64 ) ), 0 ) as count_snippets,
	ifnull( sum( cast( EntityType = 'messages' as int64 ) ), 0 ) as count_messages,
	ifnull( sum( cast( EntityType = 'phoneNumbers' as int64 ) ), 0 ) as count_phone_numbers,
	ifnull( sum( cast( EntityType = 'mobileApps' as int64 ) ), 0 ) as count_mobile_apps
FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.ExtensionsCampaignMap_1036246249` AS map
	ON campaign.ExternalCustomerId = map.ExternalCustomerId
	AND campaign.CampaignId = map.CampaignId
	AND map._DATA_DATE = map._LATEST_DATE
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._DATA_DATE = campaign._LATEST_DATE
	AND customer._DATA_DATE = customer._LATEST_DATE
	-- take into account only campaigns which are served by adwords-script
	AND campaign.ExternalCustomerId IN (
		SELECT ExternalCustomerId
		FROM `biddy-io.peak_ace_active_clients_transfer.CampaignSettings_1036246249` as x 
		WHERE x._DATA_DATE = x._LATEST_DATE
		GROUP BY ExternalCustomerId
	)
GROUP BY
	customer.ExternalCustomerId,
	campaign.CampaignName,
	campaign.CampaignStatus,
	CustomerDescriptiveName,
	AccountDescriptiveName,
	CampaignId
HAVING TRUE
	AND count_messages = 0


-- extension_no_phone_numbers
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CampaignName,
	campaign.CampaignStatus,
	ifnull( sum( cast( EntityType = 'sitelinks' as int64 ) ), 0 ) as count_site_links,
	ifnull( sum( cast( EntityType = 'callouts' as int64 ) ), 0 ) as count_callouts,
	ifnull( sum( cast( EntityType = 'snippets' as int64 ) ), 0 ) as count_snippets,
	ifnull( sum( cast( EntityType = 'messages' as int64 ) ), 0 ) as count_messages,
	ifnull( sum( cast( EntityType = 'phoneNumbers' as int64 ) ), 0 ) as count_phone_numbers,
	ifnull( sum( cast( EntityType = 'mobileApps' as int64 ) ), 0 ) as count_mobile_apps
FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.ExtensionsCampaignMap_1036246249` AS map
	ON campaign.ExternalCustomerId = map.ExternalCustomerId
	AND campaign.CampaignId = map.CampaignId
	AND map._DATA_DATE = map._LATEST_DATE
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._DATA_DATE = campaign._LATEST_DATE
	AND customer._DATA_DATE = customer._LATEST_DATE
	-- take into account only campaigns which are served by adwords-script
	AND campaign.ExternalCustomerId IN (
		SELECT ExternalCustomerId
		FROM `biddy-io.peak_ace_active_clients_transfer.CampaignSettings_1036246249` as x 
		WHERE x._DATA_DATE = x._LATEST_DATE
		GROUP BY ExternalCustomerId
	)
GROUP BY
	customer.ExternalCustomerId,
	campaign.CampaignName,
	campaign.CampaignStatus,
	CustomerDescriptiveName,
	AccountDescriptiveName,
	CampaignId
HAVING TRUE
	AND count_phone_numbers = 0



-- extension_no_mobile_apps
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CampaignName,
	campaign.CampaignStatus,
	ifnull( sum( cast( EntityType = 'sitelinks' as int64 ) ), 0 ) as count_site_links,
	ifnull( sum( cast( EntityType = 'callouts' as int64 ) ), 0 ) as count_callouts,
	ifnull( sum( cast( EntityType = 'snippets' as int64 ) ), 0 ) as count_snippets,
	ifnull( sum( cast( EntityType = 'messages' as int64 ) ), 0 ) as count_messages,
	ifnull( sum( cast( EntityType = 'phoneNumbers' as int64 ) ), 0 ) as count_phone_numbers,
	ifnull( sum( cast( EntityType = 'mobileApps' as int64 ) ), 0 ) as count_mobile_apps
FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.ExtensionsCampaignMap_1036246249` AS map
	ON campaign.ExternalCustomerId = map.ExternalCustomerId
	AND campaign.CampaignId = map.CampaignId
	AND map._DATA_DATE = map._LATEST_DATE
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._DATA_DATE = campaign._LATEST_DATE
	AND customer._DATA_DATE = customer._LATEST_DATE
	-- take into account only campaigns which are served by adwords-script
	AND campaign.ExternalCustomerId IN (
		SELECT ExternalCustomerId
		FROM `biddy-io.peak_ace_active_clients_transfer.CampaignSettings_1036246249` as x 
		WHERE x._DATA_DATE = x._LATEST_DATE
		GROUP BY ExternalCustomerId
	)
GROUP BY
	customer.ExternalCustomerId,
	campaign.CampaignName,
	campaign.CampaignStatus,
	CustomerDescriptiveName,
	AccountDescriptiveName,
	CampaignId
HAVING TRUE
	AND count_mobile_apps = 0





-- informational_search_query
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
	CampaignName,
	AdGroupName,
	Criteria,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	keyword.Status,
	Query
FROM `biddy-io.peak_ace_active_clients_transfer.SearchQueryStats_1036246249` as sq
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON sq.ExternalCustomerId = campaign.ExternalCustomerId AND sq.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON sq.ExternalCustomerId = adgroup.ExternalCustomerId AND sq.AdGroupId = adgroup.AdGroupId
JOIN `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword ON sq.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.AdGroupId = sq.AdGroupId AND keyword.CriterionId = sq.CriterionId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND sq._LATEST_DATE = sq._DATA_DATE
	--AND DATE_DIFF( CURRENT_DATE(), sq._DATA_DATE, DAY ) <= 30
	AND REGEXP_CONTAINS( sq.Query, '^was\\s|^wo\\s|^wie\\s|^wann\\s|^warum\\s|^wieso\\s|^weshalb\\s|^wer\\s|^wen\\s' )
GROUP BY
	customer.ExternalCustomerId,
	AccountName,
	CampaignName,
	AdGroupName,
	Criteria,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	keyword.Status,
	Query,
	AdGroupId,
	CampaignId


-- keyword_target_url_multiple_question_marks
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
	CampaignName,
	AdGroupName,
	Criteria,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	keyword.Status,
	KeywordMatchType,
	FinalUrls
FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND NOT IsNegative
	AND REGEXP_CONTAINS( FinalUrls, '\\?.*\\?' )
	AND NOT REGEXP_CONTAINS( FinalUrls, ',' ) -- consider only lists with one url



-- keyword_target_url_missing
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
	CampaignName,
	AdGroupName,
	Criteria,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	keyword.Status,
	KeywordMatchType,
	FinalUrls
FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND AdvertisingChannelType = 'SEARCH'
	AND Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND NOT IsNegative
	AND FinalUrls is NULL



-- keyword_campaign_match_type_mismatch
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
	CampaignName,
	AdGroupName,
	Criteria,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	keyword.Status,
	KeywordMatchType,
	FinalUrls
FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND NOT IsNegative 
	AND (
		( KeywordMatchType != 'BROAD' AND REGEXP_CONTAINS( UPPER( CampaignName ), 'BROAD' ) )
		OR
		( KeywordMatchType != 'EXACT' AND REGEXP_CONTAINS( UPPER( CampaignName ), 'EXACT' ) )
		OR
		( KeywordMatchType != 'BROAD' AND REGEXP_CONTAINS( UPPER( CampaignName ), 'BMM' ) )
	)


-- keyword_adgroup_match_type_mismatch
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
	CampaignName,
	AdGroupName,
	Criteria,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	keyword.Status,
	KeywordMatchType,
	FinalUrls
FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND NOT IsNegative 
	AND (
		( KeywordMatchType != 'BROAD' AND REGEXP_CONTAINS( UPPER( AdGroupName ), 'BROAD' ) )
		OR
		( KeywordMatchType != 'EXACT' AND REGEXP_CONTAINS( UPPER( AdGroupName ), 'EXACT' ) )
		OR
		( KeywordMatchType != 'BROAD' AND REGEXP_CONTAINS( UPPER( AdGroupName ), 'BMM' ) )
	)








-- keyword_session_id_in_url
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
	CampaignName,
	AdGroupName,
	Criteria,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	keyword.Status,
	KeywordMatchType,
	FinalUrls
FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND keyword.Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND NOT IsNegative
	AND REGEXP_CONTAINS( ifnull( FinalUrls, '' ), 'session[-_]?[Ii]d' )




-- keyword_modified_negative
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
	CampaignName,
	AdGroupName,
	Criteria,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	KeywordMatchType,
	FinalUrls
FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND keyword.Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND keyword.IsNegative
	AND REGEXP_CONTAINS( CONCAT( ' ', Criteria ), '\\s\\+' )







-- location_bid_modifier_missing
SELECT
	IFNULL( CustomerDescriptiveName,  AccountDescriptiveName ) AS AccountName,
	CAST( customer.ExternalCustomerId AS STRING ) AS ExternalCustomerId,
	CAST( campaign.CampaignId AS STRING ) AS CampaignId,
	campaign.CampaignName,
	campaign.CampaignStatus,
	COUNT(*) AS GeoLocationCount,
	SUM( CAST( ( location.BidModifier IS NULL ) AS int64 ) ) AS GeoLocationWithoutBidModifierCount
FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer
	ON customer.ExternalCustomerId = campaign.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.LocationBasedCampaignCriterion_1036246249` AS location
	ON campaign.ExternalCustomerId = location.ExternalCustomerId
	AND campaign.campaignId = location.CampaignId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND location._LATEST_DATE = location._DATA_DATE
	AND NOT isNegative
GROUP BY customer.ExternalCustomerId, AccountName, CampaignName, CampaignId, campaign.CampaignStatus
HAVING TRUE
	AND GeoLocationCount > 1
	AND GeoLocationWithoutBidModifierCount > 0
ORDER BY AccountName, CampaignName





-- multiple_domains_in_adgroup
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	CampaignName,
	AdGroupName,
	STRING_AGG( DISTINCT REGEXP_Extract( keyword.FinalUrls, '[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\\.[a-zA-Z]{2,}\\/' ) , ', ' ) as domains,
	count(*) as countKeywords,
	count( DISTINCT REGEXP_Extract( keyword.FinalUrls, '[a-zA-Z0-9][a-zA-Z0-9-]{1,61}[a-zA-Z0-9]\\.[a-zA-Z]{2,}\\/' ) ) as countDomains
FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword
	JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND campaign.CampaignId = keyword.CampaignId
	JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId
	JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND adgroup.AdGroupId = keyword.AdGroupId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND NOT keyword.IsNegative
	AND keyword.ApprovalStatus = 'APPROVED'
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND keyword.Status IN ( 'ENABLED', 'PAUSED' )
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
group by customer.ExternalCustomerId, AccountName, CampaignName, AdGroupName, AdGroupId, CampaignId, campaign.CampaignStatus, adgroup.AdGroupStatus
having countDomains > 1







-- replaceable_negative_keywords
SELECT
	AccountName,
	ExternalCustomerId,
	campaigns.CampaignId,
	campaigns.CampaignStatus,
	negKeywords.CampaignName,
	Criteria as negative_keyword,
	KeywordMatchType as match_type,
	countAdgroups as count
FROM (
	SELECT
		ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
		CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
		CAST( campaign.CampaignId as STRING ) as CampaignId,
		CampaignName,
		Criteria,
		keyword.KeywordMatchType
		,count( DISTINCT AdGroupName ) as countAdgroups
	FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword
	JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND campaign.CampaignId = keyword.CampaignId
	JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId
	JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND adgroup.AdGroupId = keyword.AdGroupId
	WHERE TRUE
		AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
		AND keyword.IsNegative
		AND keyword.Status IN ( 'ENABLED', 'PAUSED' )
		AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
		AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
		AND keyword._LATEST_DATE = keyword._DATA_DATE
		AND campaign._LATEST_DATE = campaign._DATA_DATE
		AND customer._LATEST_DATE = customer._DATA_DATE
		AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	GROUP BY customer.ExternalCustomerId, AccountName, campaign.CampaignId, CampaignName, Criteria, KeywordMatchType
) AS negKeywords
JOIN (
	SELECT
		CAST( campaign.CampaignId as STRING ) as CampaignId,
		CampaignStatus,
		count( AdGroupName ) as countAdgroupsInCampaign
	FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign
	JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON adgroup.ExternalCustomerId = campaign.ExternalCustomerId AND campaign.CampaignId = adgroup.CampaignId
	WHERE TRUE
		AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
		AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
		AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
		AND campaign._LATEST_DATE = campaign._DATA_DATE
		AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	GROUP BY CampaignId, CampaignName, CampaignStatus
) as campaigns
ON negKeywords.CampaignId = campaigns.CampaignId
WHERE countAdgroups = countAdgroupsInCampaign
	AND countAdgroups > 1




-- search_queries_triggered_by_more_than_one_keyword
SELECT
	AccountName,
	CAST( ExternalCustomerId as STRING ) as ExternalCustomerId,
	Query,
	CampaignName,
	CampaignId,
	AdGroupName,
	AdGroupId,
	CampaignStatus,
	AdGroupStatus,
	Status,
	Criteria,
	CriterionId,
	KeywordMatchType,
	Impressions,
	Clicks,
	Cost,
	Conversions,
	Cpo,
	Cvr,
	DENSE_RANK() OVER ( PARTITION BY ExternalCustomerId ORDER BY FARM_FINGERPRINT( CONCAT( AccountName, CampaignName, Query ) ) ) as Rank
FROM (
	SELECT
		*
		,
		COUNT(*) OVER (
			PARTITION BY
			ExternalCustomerId,
			AccountName,
			CampaignId,
			Query
		) AS CriteriaCount
	FROM (
		SELECT
			ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
			customer.ExternalCustomerId,
			Query,
			campaign.CampaignName,
			campaign.CampaignId,
			adgroup.AdGroupName,
			adgroup.AdGroupId,
			campaign.CampaignStatus,
			adgroup.AdGroupStatus,
			keyword.Status,
			keyword.Criteria,
			keyword.CriterionId,
			keyword.KeywordMatchType,
			SUM( Impressions ) AS Impressions,
			SUM( Clicks ) AS Clicks,
			SUM( Cost ) / 1000000 AS Cost,
			SUM( Conversions ) AS Conversions,
			ROUND( SUM( Cost ) / 1000000 / GREATEST( SUM( Conversions ), .01 ), 2 ) AS Cpo,
			ROUND( SUM( Conversions ) / GREATEST( SUM( Clicks ), 1 ), 4 ) AS Cvr
		FROM `biddy-io.peak_ace_active_clients_transfer.SearchQueryStats_1036246249` as sq
		JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = sq.ExternalCustomerId AND sq.CampaignId = campaign.CampaignId
		JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = sq.ExternalCustomerId
		JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON adgroup.ExternalCustomerId = sq.ExternalCustomerId AND sq.CampaignId = adgroup.CampaignId AND sq.AdGroupId = adgroup.AdGroupId
		JOIN `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword ON keyword.ExternalCustomerId = sq.ExternalCustomerId AND sq.CampaignId = keyword.CampaignId AND sq.AdGroupId = keyword.AdGroupId AND keyword.CriterionId = sq.CriterionId
		WHERE TRUE
			AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
			AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
			AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
			AND keyword.Status IN ( 'ENABLED', 'PAUSED' )
			AND NOT keyword.IsNegative
			AND customer._LATEST_DATE = customer._DATA_DATE
			AND campaign._LATEST_DATE = campaign._DATA_DATE
			AND adgroup._LATEST_DATE = adgroup._DATA_DATE
			AND keyword._LATEST_DATE = keyword._DATA_DATE
			AND sq._LATEST_DATE = sq._DATA_DATE
			--AND DATE_DIFF( sq._LATEST_DATE, sq._DATA_DATE, DAY ) <= 30
		GROUP BY
			customer.ExternalCustomerId,
			AccountName,
			Query,
			campaign.CampaignName,
			campaign.CampaignId,
			adgroup.AdGroupName,
			adgroup.AdGroupId,
			keyword.Criteria,
			keyword.CriterionId,
			campaign.CampaignStatus,
			adgroup.AdGroupStatus,
			keyword.Status,
			keyword.KeywordMatchType
	)
)
WHERE TRUE
	AND CriteriaCount > 1
ORDER BY
	--CriteriaCount DESC,
	ExternalCustomerId,
	AccountName,
	Rank








-- worldwide_targeting
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	campaign.CampaignName,
	campaign.CampaignStatus
FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.LocationBasedCampaignCriterion_1036246249` as location
	ON campaign.ExternalCustomerId = location.ExternalCustomerId
	AND campaign.campaignId = location.CampaignId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND NOT REGEXP_CONTAINS( LOWER( CampaignName ), 'welt|world|glo|alle\\sstädte' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND location.CriterionId is null
ORDER BY AccountName, CampaignName





-- disapproved_extensions
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	disapproved.DisapprovalShortNames as disapprovalReasons,
	disapproved.PlaceholderType,
	UPPER( disapproved.Status ) AS Status,
	ifnull( ifnull( site_link.LinkText, ifnull( callout.Text, ifnull( messages.ExtensionText, ifnull( apps.LinkText, ifnull( cast( phones.Id as string), snippets.Values ) ) ) ) ), '' ) as text
FROM `biddy-io.peak_ace_active_clients_transfer.ExtensionsDisapproved_1036246249` as disapproved
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer
	ON customer.ExternalCustomerId = disapproved.ExternalCustomerId
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.ExtensionsSitelinks_1036246249` as site_link
	ON site_link.ExternalCustomerId = disapproved.ExternalCustomerId
	AND site_link.id = disapproved.FeedItemId
	AND site_link._LATEST_DATE = site_link._DATA_DATE
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.ExtensionsCallouts_1036246249` as callout
	ON callout.ExternalCustomerId = disapproved.ExternalCustomerId
	AND callout.id = disapproved.FeedItemId
	AND callout._LATEST_DATE = callout._DATA_DATE
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.ExtensionsMessages_1036246249` as messages
	ON messages.ExternalCustomerId = disapproved.ExternalCustomerId
	AND messages.id = disapproved.FeedItemId
	AND messages._LATEST_DATE = messages._DATA_DATE
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.ExtensionsMobileApps_1036246249` as apps
	ON apps.ExternalCustomerId = disapproved.ExternalCustomerId
	AND apps.id = disapproved.FeedItemId
	AND apps._LATEST_DATE = apps._DATA_DATE
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.ExtensionsPhoneNumbers_1036246249` as phones
	ON phones.ExternalCustomerId = disapproved.ExternalCustomerId
	AND phones.id = disapproved.FeedItemId
	AND phones._LATEST_DATE = phones._DATA_DATE
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.ExtensionsSnippets_1036246249` as snippets
	ON snippets.ExternalCustomerId = disapproved.ExternalCustomerId
	AND snippets.id = disapproved.FeedItemId
	AND snippets._LATEST_DATE = snippets._DATA_DATE
WHERE TRUE
	AND disapproved._LATEST_DATE = disapproved._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND disapproved.Status = disapproved.Status
GROUP BY
	customer.ExternalCustomerId,
	CustomerDescriptiveName,
	AccountDescriptiveName,
	disapproved.DisapprovalShortNames,
	disapproved.PlaceholderType,
	disapproved.Status,
	text




-- duplicate_keywords_by_case
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
	CampaignName,
	AdGroupName,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	keyword.Status,
	KeywordMatchType,
	LOWER( keyword.Criteria ) as keyword,
	count( * ) as count,
	STRING_AGG( keyword.Criteria, ', ' ) as keywords
FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON keyword.ExternalCustomerId = campaign.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId AND campaign._LATEST_DATE = campaign._DATA_DATE
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId AND adgroup._LATEST_DATE = adgroup._DATA_DATE
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer
	ON customer.ExternalCustomerId = keyword.ExternalCustomerId
	AND customer._LATEST_DATE = customer._DATA_DATE
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND keyword.Status IN ( 'ENABLED', 'PAUSED' )
	AND NOT IsNegative
GROUP BY
	customer.ExternalCustomerId,
	CustomerDescriptiveName,
	AccountDescriptiveName,
	CampaignName,
	AdGroupName,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	Status,
	KeywordMatchType,
	AdGroupId,
	CampaignId,
	keyword
HAVING count > 1




-- dominated_negative_keywords_in_adgroups
SELECT
	ifnull( CustomerDescriptiveName,
    AccountDescriptiveName ) AS AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST(keyword2.AdGroupId as STRING ) as AdGroupId,
	CAST(keyword1.CampaignId as STRING ) as CampaignId,
	keyword1.CampaignName,
	AdGroupName,
	keyword1.CampaignStatus,
	adgroup.AdGroupStatus,
	keyword1.KeywordMatchType AS kw1_match_type,
	keyword2.KeywordMatchType AS kw2_match_type,
	keyword1.Criteria AS kw1,
	keyword2.Criteria AS kw2
FROM ( 	SELECT
			k.ExternalCustomerId,
			k.CampaignId,
			CampaignName,
			AdGroupId,
			CriterionId,
			Criteria,
			KeywordMatchType,
			campaign.CampaignStatus
		FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as k
		JOIN
		  `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
		ON
			k.ExternalCustomerId = campaign.ExternalCustomerId
			AND k.CampaignId = campaign.CampaignId
			AND campaign._LATEST_DATE = campaign._DATA_DATE
			AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
		WHERE TRUE
			AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
			AND k._LATEST_DATE = k._DATA_DATE
			AND k.Status = 'ENABLED'
			AND k.IsNegative
	) AS keyword1
JOIN (	SELECT
			k.ExternalCustomerId,
			k.CampaignId,
			CampaignName,
			AdGroupId,
			CriterionId,
			Criteria,
			KeywordMatchType
		FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as k
		JOIN
		  `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
		ON
			k.ExternalCustomerId = campaign.ExternalCustomerId
			AND k.CampaignId = campaign.CampaignId
			AND campaign._LATEST_DATE = campaign._DATA_DATE
			AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
		WHERE TRUE
			AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
			AND k._LATEST_DATE = k._DATA_DATE
			AND k.Status = 'ENABLED'
			AND k.IsNegative
			AND k.KeywordMatchType != 'EXACT'
	) AS keyword2
ON
	REGEXP_EXTRACT( CONCAT( ' ', keyword1.Criteria, ' ' ), CONCAT( ' ', REGEXP_REPLACE( keyword2.Criteria, '\\+', '\\\\+' ), ' ' ) ) IS NOT NULL
	AND keyword1.CampaignId = keyword2.CampaignId
	AND keyword1.AdGroupId = keyword2.AdGroupId
	AND keyword1.CriterionId != keyword2.CriterionId
	AND keyword1.ExternalCustomerId = keyword2.ExternalCustomerId
JOIN
	`biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` AS adgroup
ON
	keyword1.ExternalCustomerId = adgroup.ExternalCustomerId
	AND keyword1.CampaignId = adgroup.CampaignId
	AND keyword1.AdGroupId = adgroup.AdGroupId
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
JOIN
	`biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer
ON TRUE
	AND customer.ExternalCustomerId = keyword1.ExternalCustomerId
	AND customer._LATEST_DATE = customer._DATA_DATE
WHERE
	TRUE
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )












-- dominated_negative_keywords_in_campaigns
SELECT
	ifnull( CustomerDescriptiveName,
	AccountDescriptiveName ) AS AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( keyword1.CampaignId as STRING ) as CampaignId,
	keyword1.CampaignName,
	keyword1.MatchType AS kw1_match_type,
	keyword2.MatchType AS kw2_match_type,
	keyword1.Text AS kw1,
	keyword2.Text AS kw2,
	keyword1.CampaignStatus
FROM (	SELECT
			k.ExternalCustomerId,
			k.CampaignId,
			CampaignName,
			Text,
			MatchType,
			campaign.CampaignStatus
		FROM `biddy-io.peak_ace_active_clients_transfer.CampaignNegativeKeywords_1036246249` as k
		JOIN
			`biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
		ON
			k.ExternalCustomerId = campaign.ExternalCustomerId
			AND k.CampaignId = campaign.CampaignId
			AND campaign._LATEST_DATE = campaign._DATA_DATE
			AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
		WHERE TRUE
			AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
			AND k._LATEST_DATE = k._DATA_DATE
	) AS keyword1
JOIN (	SELECT
			k.ExternalCustomerId,
			k.CampaignId,
			CampaignName,
			Text,
			MatchType
		FROM `biddy-io.peak_ace_active_clients_transfer.CampaignNegativeKeywords_1036246249` as k
		JOIN
		  `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
		ON
			k.ExternalCustomerId = campaign.ExternalCustomerId
			AND k.CampaignId = campaign.CampaignId
			AND campaign._LATEST_DATE = campaign._DATA_DATE
			AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
		WHERE TRUE
			AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
			AND k._LATEST_DATE = k._DATA_DATE
			AND k.MatchType != 'EXACT'
	) AS keyword2
ON TRUE
  AND keyword1.ExternalCustomerId = keyword2.ExternalCustomerId
  AND keyword1.CampaignId = keyword2.CampaignId
  AND keyword1.Text != keyword2.Text
  AND REGEXP_EXTRACT( CONCAT( ' ', keyword1.Text, ' ' ), CONCAT( ' ', REGEXP_REPLACE( keyword2.Text, '\\+', '\\\\+' ), ' ' ) ) IS NOT NULL
JOIN
  `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer
ON
  customer.ExternalCustomerId = keyword1.ExternalCustomerId
  AND customer._LATEST_DATE = customer._DATA_DATE



-- missing_excluded_content_labels
SELECT *
FROM (
  SELECT
    ifnull( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,
    CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
    campaign.CampaignName,
    CAST( settings.CampaignId as STRING ) as CampaignId,
    campaign.CampaignStatus,
    ( SELECT ARRAY_TO_STRING(
      ARRAY(
        SELECT x
        FROM UNNEST( SPLIT( "ADULTISH, BELOW_THE_FOLD, DP, EMBEDDED_VIDEO, GAMES, JUVENILE, PROFANITY, TRAGEDY, VIDEO, SOCIAL_ISSUES", ", " ) ) as x
        LEFT JOIN UNNEST( SPLIT( ExcludedContentLabels, ", " ) ) as y
          ON x = y
        WHERE y is null
        ORDER BY x
      ),
      ', '
    ) ) AS MissingExcludedContentLabels,
    settings.ExcludedContentLabels
  FROM `biddy-io.peak_ace_active_clients_transfer.CampaignSettings_1036246249` as settings
  JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign
    ON TRUE
    AND settings.ExternalCustomerId = campaign.ExternalCustomerId
    AND settings.CampaignId = campaign.CampaignId
    AND campaign._DATA_DATE = campaign._LATEST_DATE
    AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
  JOIN
    `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer
    ON TRUE
    AND customer.ExternalCustomerId = settings.ExternalCustomerId
    AND customer._LATEST_DATE = customer._DATA_DATE
  WHERE TRUE
    AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
    AND settings._DATA_DATE = settings._LATEST_DATE
    AND ExcludedContentLabels is not null
)
WHERE TRUE
  AND MissingExcludedContentLabels != ''




-- negative_keyword_in_ad
SELECT
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	ifnull( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,
	CampaignName,
	AdGroupName,
	CampaignStatus,
	AdGroupStatus,
	Status,
	neg.Text as negative_keyword,
	neg.MatchType as negative_match_type,
	ad.HeadLinePart1,
	ad.HeadLinePart2,
	ad.description,
	CAST( ad.CampaignId as STRING ) as CampaignId,
	CAST( ad.AdGroupId as STRING ) as AdGroupId
FROM (
	SELECT
		ExternalCustomerId,
		CampaignId,
		Text,
		MatchType
	FROM `biddy-io.peak_ace_active_clients_transfer.CampaignNegativeKeywords_1036246249`
	WHERE TRUE
		AND _LATEST_DATE = _DATA_DATE
		AND MatchType != 'EXACT'
) as neg
JOIN (
	SELECT
		ExternalCustomerId,
		CampaignId,
		AdGroupId,
		HeadLinePart1,
		HeadLinePart2,
		description,
		Status
	FROM `biddy-io.peak_ace_active_clients_transfer.Ad_1036246249`
	WHERE TRUE
		AND _DATA_DATE = _LATEST_DATE
		AND Status IN ( 'ENABLED', 'PAUSED' )
	) as ad
	ON ad.ExternalCustomerId = neg.ExternalCustomerId AND ad.CampaignId = neg.CampaignId
JOIN (
	SELECT
		ExternalCustomerId,
		CampaignId,
		AdGroupName,
		AdGroupId,
		AdGroupStatus
	FROM `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249`
	WHERE TRUE
		AND _DATA_DATE = _LATEST_DATE
		AND AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	) as adgroup
	ON ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.CampaignId = adgroup.CampaignId AND ad.AdGroupId = adgroup.AdGroupId
JOIN (
	SELECT
		ExternalCustomerId,
		CampaignName,
		CampaignId,
		CampaignStatus
	FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249`
	WHERE TRUE
		AND ( EndDate IS NULL OR EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
		AND _DATA_DATE = _LATEST_DATE
		AND CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	) as campaign
	ON ad.ExternalCustomerId = campaign.ExternalCustomerId AND ad.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer 
	ON neg.ExternalCustomerId = customer.ExternalCustomerId
    AND customer._LATEST_DATE = customer._DATA_DATE
WHERE TRUE
  AND (
    FALSE
    OR REGEXP_CONTAINS( CONCAT( ' ', ad.HeadLinePart1, ' ' ), CONCAT( ' ', REGEXP_REPLACE( neg.Text, '["\\+\\-\\[\\]]', '' ), ' ' ) )
    OR REGEXP_CONTAINS( CONCAT( ' ', ad.HeadLinePart2, ' ' ), CONCAT( ' ', REGEXP_REPLACE( neg.Text, '["\\+\\-\\[\\]]', '' ), ' ' ) )
    OR REGEXP_CONTAINS( CONCAT( ' ', ad.Description, ' ' ), CONCAT( ' ', REGEXP_REPLACE( neg.Text, '["\\+\\-\\[\\]]', '' ), ' ' ) )
)





-- dki_errors
SELECT
	ifnull( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,
	CAST( ad.ExternalCustomerId as STRING ) as ExternalCustomerId,
	campaign.CampaignName,
	CAST( ad.CampaignId as STRING ) as CampaignId,
	adgroup.AdGroupName,
	CAST( ad.AdGroupId as STRING ) as AdGroupId,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	ad.Status,
	ad.HeadlinePart1,
	ad.HeadlinePart2,
	ad.Description
FROM `biddy-io.peak_ace_active_clients_transfer.Ad_1036246249` as ad
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = ad.ExternalCustomerId AND ad.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = ad.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON adgroup.ExternalCustomerId = ad.ExternalCustomerId AND ad.CampaignId = adgroup.CampaignId AND ad.AdGroupId = adgroup.AdGroupId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND (
		FALSE
		OR ( TRUE
			AND REGEXP_CONTAINS( ad.HeadlinePart1, '{\\w+' )
			AND NOT REGEXP_CONTAINS( ad.HeadlinePart1, '{[kK]ey[wW]ord:.+}' )
		)OR ( TRUE
			AND REGEXP_CONTAINS( ad.HeadlinePart2, '{\\w+' )
			AND NOT REGEXP_CONTAINS( ad.HeadlinePart2, '{[kK]ey[wW]ord:.+}' )
		)OR ( TRUE
			AND REGEXP_CONTAINS( ad.Description, '{\\w+' )
			AND NOT REGEXP_CONTAINS( ad.Description, '{[kK]ey[wW]ord:.+}' )
		)
	)
	AND ad._LATEST_DATE = ad._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND ad.Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )


-- wrong_dki
SELECT
	ifnull( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	campaign.CampaignName,
	CAST( ad.CampaignId as STRING ) as CampaignId,
	adgroup.AdGroupName,
	CAST( ad.AdGroupId as STRING ) as AdGroupId,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	ad.Status,
	ad.HeadlinePart1,
	ad.HeadlinePart2,
	ad.Description
FROM `biddy-io.peak_ace_active_clients_transfer.Ad_1036246249` as ad
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = ad.ExternalCustomerId AND ad.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = ad.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON adgroup.ExternalCustomerId = ad.ExternalCustomerId AND ad.CampaignId = adgroup.CampaignId AND ad.AdGroupId = adgroup.AdGroupId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND (
		FALSE
		OR ( REGEXP_CONTAINS( ad.HeadlinePart1, '{keyWord:.+}' )  )
		OR ( REGEXP_CONTAINS( ad.HeadlinePart1, '{Keyword:.+\\s.+}' )  )
		OR ( REGEXP_CONTAINS( ad.HeadlinePart1, '{keyword:.+}' )  )
		OR ( REGEXP_CONTAINS( ad.HeadlinePart2, '{keyWord:.+}' )  )
		OR ( REGEXP_CONTAINS( ad.HeadlinePart2, '{Keyword:.+\\s.+}' )  )
		OR ( REGEXP_CONTAINS( ad.HeadlinePart2, '{keyword:.+}' )  )
		OR ( REGEXP_CONTAINS( ad.Description, '{keyWord:.+}' )  )
		OR ( REGEXP_CONTAINS( ad.Description, '{Keyword:.+\\s.+}' )  )
		OR ( REGEXP_CONTAINS( ad.Description, '{keyword:.+}' )  )
	)
	AND ad._LATEST_DATE = ad._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND ad.Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )




-- low_volume_exact_excluded_adgroup_level
SELECT
	Customer.AccountDescriptiveName,
	Customer.ExternalCustomerId,
	Campaign.CampaignName as CampaignName,
	Campaign.CampaignId as CampaignId,
	BroadAdGroup.AdGroupName as broadAdGroupName,
	BroadAdGroup.AdGroupId as broadAdGroupId,
	ExactNegativeKeywordInBroad.Criteria as exactNegativeKeyword
FROM `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as Customer
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as Campaign
	ON TRUE
	AND Campaign.ExternalCustomerId = Customer.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as BroadAdGroup
	ON TRUE
	AND Campaign.ExternalCustomerId = BroadAdGroup.ExternalCustomerId
	AND Campaign.CampaignId = BroadAdGroup.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as ExactAdGroup
	ON TRUE
	AND Campaign.ExternalCustomerId = ExactAdGroup.ExternalCustomerId
	AND Campaign.CampaignId = ExactAdGroup.CampaignId
	AND REGEXP_EXTRACT( LOWER( ExactAdGroup.AdGroupName ), '(.*)(?:exact|exm)' ) = REGEXP_EXTRACT( LOWER( BroadAdGroup.AdGroupName ), '(.*)(?:broad|bmm)' )
JOIN `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as ExactKeyword
	ON TRUE
	AND Campaign.ExternalCustomerId = ExactKeyword.ExternalCustomerId
	AND Campaign.CampaignId = ExactKeyword.CampaignId
	AND ExactAdGroup.AdGroupId = ExactKeyword.AdGroupId
JOIN `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as ExactNegativeKeywordInBroad
	ON TRUE
	AND ( Campaign.EndDate IS NULL OR Campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND Campaign.ExternalCustomerId = ExactNegativeKeywordInBroad.ExternalCustomerId
	AND Campaign.CampaignId = ExactNegativeKeywordInBroad.CampaignId
	AND BroadAdGroup.AdGroupId = ExactNegativeKeywordInBroad.AdGroupId
	AND LOWER( ExactNegativeKeywordInBroad.Criteria ) = LOWER( ExactKeyword.Criteria )
WHERE TRUE
	-- AND customer.ExternalCustomerId = 1371763172 --7056468392
	AND Customer._LATEST_DATE = Customer._DATA_DATE
	AND Campaign.CampaignStatus = 'ENABLED'
	AND Campaign._LATEST_DATE = Campaign._DATA_DATE
	AND ExactAdGroup.AdGroupStatus = 'ENABLED'
	AND BroadAdGroup.AdGroupStatus = 'ENABLED'
	AND ExactAdGroup._LATEST_DATE = ExactAdGroup._DATA_DATE
	AND BroadAdGroup._LATEST_DATE = BroadAdGroup._DATA_DATE
	AND ExactKeyword.Status = 'ENABLED'
	AND ExactNegativeKeywordInBroad.Status = 'ENABLED'
	AND ExactKeyword._LATEST_DATE = ExactKeyword._DATA_DATE
	AND ExactNegativeKeywordInBroad._LATEST_DATE = ExactNegativeKeywordInBroad._DATA_DATE
	AND ExactKeyword.SystemServingStatus = 'RARELY_SERVED'
	AND ExactKeyword.KeywordMatchType = 'EXACT'
	AND ExactNegativeKeywordInBroad.KeywordMatchType = 'EXACT'
	AND ExactKeyword.IsNegative = false
	AND ExactNegativeKeywordInBroad.IsNegative = true



-- low_volume_exact_excluded_campaign_level
SELECT
	Customer.AccountDescriptiveName,
	Customer.ExternalCustomerId,
	BroadCampaign.CampaignName as broadCampaignName,
	BroadCampaign.CampaignId as broadCampaignId,
	BroadAdGroup.AdGroupName as broadAdGroupName,
	BroadAdGroup.AdGroupId as broadAdGroupId,
	ExactNegativeKeywordInBroad.Criteria as exactNegativeKeyword
FROM `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as Customer
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as ExactCampaign
	ON TRUE
	AND ExactCampaign.ExternalCustomerId = Customer.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as BroadCampaign
	ON TRUE
	AND ExactCampaign.ExternalCustomerId = BroadCampaign.ExternalCustomerId
	AND REGEXP_EXTRACT( LOWER( ExactCampaign.CampaignName ), '(.*)(?:exact|exm)' ) = REGEXP_EXTRACT( LOWER( BroadCampaign.CampaignName ), '(.*)(?:broad|bmm)' )
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as BroadAdGroup
	ON TRUE
	AND BroadCampaign.ExternalCustomerId = BroadAdGroup.ExternalCustomerId
	AND BroadCampaign.CampaignId = BroadAdGroup.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as ExactAdGroup
	ON TRUE
	AND ExactCampaign.ExternalCustomerId = ExactAdGroup.ExternalCustomerId
	AND ExactCampaign.CampaignId = ExactAdGroup.CampaignId
	AND BroadAdGroup.AdGroupName = ExactAdGroup.AdGroupName
JOIN `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as ExactKeyword
	ON TRUE
	AND ExactCampaign.ExternalCustomerId = ExactKeyword.ExternalCustomerId
	AND ExactCampaign.CampaignId = ExactKeyword.CampaignId
	AND ExactAdGroup.AdGroupId = ExactKeyword.AdGroupId
JOIN `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as ExactNegativeKeywordInBroad
	ON TRUE
	AND BroadCampaign.ExternalCustomerId = ExactNegativeKeywordInBroad.ExternalCustomerId
	AND BroadCampaign.CampaignId = ExactNegativeKeywordInBroad.CampaignId
	AND BroadAdGroup.AdGroupId = ExactNegativeKeywordInBroad.AdGroupId
	AND LOWER( ExactNegativeKeywordInBroad.Criteria ) = LOWER( ExactKeyword.Criteria )
WHERE TRUE
	AND ( BroadCampaign.EndDate IS NULL OR BroadCampaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND ( ExactCampaign.EndDate IS NULL OR ExactCampaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	-- AND customer.ExternalCustomerId = 1371763172 --7056468392
	AND Customer._LATEST_DATE = Customer._DATA_DATE
	AND ExactCampaign.CampaignStatus = 'ENABLED'
	AND BroadCampaign.CampaignStatus = 'ENABLED'
	AND ExactCampaign._LATEST_DATE = ExactCampaign._DATA_DATE
	AND BroadCampaign._LATEST_DATE = BroadCampaign._DATA_DATE
	AND ExactAdGroup.AdGroupStatus = 'ENABLED'
	AND BroadAdGroup.AdGroupStatus = 'ENABLED'
	AND ExactAdGroup._LATEST_DATE = ExactAdGroup._DATA_DATE
	AND BroadAdGroup._LATEST_DATE = BroadAdGroup._DATA_DATE
	AND ExactKeyword.Status = 'ENABLED'
	AND ExactNegativeKeywordInBroad.Status = 'ENABLED'
	AND ExactKeyword._LATEST_DATE = ExactKeyword._DATA_DATE
	AND ExactNegativeKeywordInBroad._LATEST_DATE = ExactNegativeKeywordInBroad._DATA_DATE
	AND ExactKeyword.SystemServingStatus = 'RARELY_SERVED'
	AND ExactKeyword.KeywordMatchType = 'EXACT'
	AND ExactNegativeKeywordInBroad.KeywordMatchType = 'EXACT'
	AND ExactKeyword.IsNegative = false
	AND ExactNegativeKeywordInBroad.IsNegative = true







-- no_traffic_keywords
SELECT
	CustomerDescriptiveName,
	AccountDescriptiveName,
	customer.ExternalCustomerId,
	CampaignName,
	campaign.CampaignStatus,
	campaign.CampaignId,
	AdGroupName,
	adgroup.AdGroupStatus,
	adgroup.AdGroupId,
	keyword.Criteria,
	keyword.Status,
  keyword.CriterionId,
	KeywordMatchType,
  SystemServingStatus,
  SUM( Impressions ) as Impressions
FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign
  ON keyword.ExternalCustomerId = campaign.ExternalCustomerId
  AND keyword.CampaignId = campaign.CampaignId
  AND campaign._LATEST_DATE = campaign._DATA_DATE
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup
  ON keyword.ExternalCustomerId = adgroup.ExternalCustomerId
  AND keyword.CampaignId = adgroup.CampaignId
  AND keyword.AdGroupId = adgroup.AdGroupId
  AND adgroup._LATEST_DATE = adgroup._DATA_DATE
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer
	ON customer.ExternalCustomerId = keyword.ExternalCustomerId
	AND customer._LATEST_DATE = customer._DATA_DATE
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.KeywordBasicStats_1036246249` AS stat
	ON TRUE
	AND DATE_DIFF( CURRENT_DATE( 'Europe/Berlin' ), stat._DATA_DATE, DAY ) < 180
	AND stat.ExternalCustomerId = customer.ExternalCustomerId
	AND stat.CampaignId = campaign.CampaignId
	AND stat.AdGroupId = adgroup.AdGroupId
	AND stat.CriterionId = keyword.CriterionId
WHERE TRUE
	AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND campaign.CampaignStatus IN ( 'ENABLED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED' )
	AND keyword.Status IN ( 'ENABLED' )
	AND NOT IsNegative
GROUP BY
	CustomerDescriptiveName,
	AccountDescriptiveName,
	customer.ExternalCustomerId,
	CampaignName,
	campaign.CampaignStatus,
	campaign.CampaignId,
	AdGroupName,
	adgroup.AdGroupStatus,
	adgroup.AdGroupId,
	keyword.Criteria,
	keyword.Status,
  keyword.CriterionId,
	KeywordMatchType,
  SystemServingStatus
HAVING TRUE
  AND Impressions IS NULL
  AND SystemServingStatus = 'ELIGIBLE'





-- keyword_problems
WITH step1 AS
(
	SELECT
		ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
		customer.ExternalCustomerId AS ExternalCustomerId,
		keyword.CampaignId AS CampaignId,
		CampaignName,
		adgroup.AdGroupId,
		adgroup.AdGroupName,
		CASE
			WHEN KeywordMatchType = 'BROAD' THEN
				CONCAT( '+', REGEXP_REPLACE( LOWER( TRIM( REGEXP_REPLACE( Criteria, '[\\+\'"\\-\\.\\[\\]\\s]+', ' ' ) ) ), '\\s\\b', ' +' ) )
			ELSE
				LOWER( TRIM( REGEXP_REPLACE( Criteria, '[\\+\'"\\-\\.\\[\\]\\s]+', ' ' ) ) )
		END AS NormalizedKeyword1,
		REGEXP_CONTAINS( Criteria, '\\.' ) AS ContainsDot,
		Criteria != LOWER( Criteria ) AS ContainsCapital,
		REGEXP_CONTAINS( Criteria, '\\-' ) AS ContainsDash,
		KeywordMatchType = 'BROAD' AND REGEXP_CONTAINS( Criteria, '(\\S\\+)|(\\+(\\s+|$))' ) AS WronglyModifiedBroad,
		KeywordMatchType = 'BROAD' AND REGEXP_CONTAINS( Criteria, '((^|\\s)\\+\\S.*\\s[^\\+])|((^|\\s)[^\\+].*(\\s)\\+\\S)' ) AS PartlyModifiedBroad,
		KeywordMatchType = 'BROAD' AND NOT REGEXP_CONTAINS( Criteria, '\\+' ) AS UnmodifiedBroad,
		KeywordMatchType != 'BROAD' AND REGEXP_CONTAINS( Criteria, '\\+' ) AS PlusInNonBroad,
		REGEXP_CONTAINS( Criteria, '"' ) AS ContainsQuotes,
		REGEXP_CONTAINS( Criteria, '[\\[\\]]' ) AS ContainsBrackets,
		Criteria,
		keyword.CriterionId,
		keyword.QualityScore,
		keyword.KeywordMatchType
	FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword
	JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON keyword.ExternalCustomerId = customer.ExternalCustomerId
	JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON keyword.ExternalCustomerId = campaign.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId
	JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId
	WHERE TRUE
		AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
		AND AdvertisingChannelType = 'SEARCH'
		AND campaign.CampaignStatus IN ( 'ENABLED' )
		AND adgroup.AdGroupStatus IN ( 'ENABLED' )
		AND keyword.Status IN ( 'ENABLED' )
		AND NOT keyword.isNegative
		AND customer._LATEST_DATE = customer._DATA_DATE
		AND campaign._LATEST_DATE = campaign._DATA_DATE
		AND adgroup._LATEST_DATE = adgroup._DATA_DATE
		AND keyword._LATEST_DATE = keyword._DATA_DATE
	--AND keyword.ExternalCustomerId = 7056468392--2143422790
	--AND keyword.CampaignId = 1066487659
)
,step2 AS
(	-- remove duplicate/multiple parts from broad keywords
	SELECT
		*
	FROM (
		SELECT
			*,
			CASE WHEN KeywordMatchType = 'BROAD' THEN
				(
				SELECT
					STRING_AGG ( x, ' ' )
				FROM (
						SELECT
							x
						FROM unnest( split( NormalizedKeyword1, ' ' ) ) as x
						GROUP BY x
				)
			) ELSE NormalizedKeyword1 END AS NormalizedKeyword2
		FROM step1
	)
)
, step3 AS
( -- order broad fragments alphabetically in order to find duplicates
	SELECT
		*,
		NormalizedKeyword1 != NormalizedKeyword2 AS DuplicateBmmFragments,
		CASE WHEN KeywordMatchType = 'BROAD' THEN
			(
				SELECT ARRAY_TO_STRING(
					ARRAY(
						SELECT x
						FROM UNNEST(
							SPLIT(
								NormalizedKeyword2,
								' '
							)
						) AS x
						ORDER BY x
					),
					' '
				)
			)
			ELSE NormalizedKeyword2
		END AS NormalizedKeyword3
	FROM step2
)
, step4 AS
(
	SELECT
		*,
		COUNT( * ) OVER ( PARTITION BY ExternalCustomerId, CampaignId, KeywordMatchType, NormalizedKeyword3 ) AS count1
	FROM step3
)
, keyword2 AS (
	SELECT
		step4.AccountName,
		step4.ExternalCustomerId,
		step4.CampaignId,
		step4.CampaignName,
		NormalizedKeyword2,
		NormalizedKeyword3,
		KeywordMatchType,
		Criteria AS Criteria,
		step4.CriterionId,
		QualityScore,
		step4.AdGroupId,
		AdGroupName,
		ContainsDot,
		ContainsCapital,
		ContainsDash,
		WronglyModifiedBroad,
		PartlyModifiedBroad,
		UnmodifiedBroad,
		PlusInNonBroad,
		ContainsQuotes,
		ContainsBrackets,
		DuplicateBmmFragments,
		COUNT(*) OVER ( PARTITION BY step4.ExternalCustomerId, step4.CampaignId, KeywordMatchType, NormalizedKeyword3 ) as Count,
		SUM( Impressions ) AS Impressions,
		SUM( Clicks ) AS Clicks,
		SUM( Cost ) / 1000000 AS Cost,
		ROUND( SUM( Conversions ), 2 ) AS Conversions,
		ROUND( SUM( Cost ) / 1000000 / GREATEST( SUM( Clicks ), 1 ), 2 ) AS Cpc,
		ROUND( SUM( Cost ) / 1000000 / GREATEST( SUM( Conversions ), .01 ), 2 ) AS Cpo,
		ROUND( SUM( Conversions ) / GREATEST( SUM( Clicks ), 1 ), 4 ) AS Cvr
	FROM step4
	LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.KeywordBasicStats_1036246249` AS stat
		ON TRUE
		AND DATE_DIFF( CURRENT_DATE( 'Europe/Berlin' ), stat._DATA_DATE, DAY ) < 180
		AND stat.ExternalCustomerId = step4.ExternalCustomerId
		AND stat.CampaignId = step4.CampaignId
		AND stat.AdGroupId = step4.AdGroupId
		AND stat.CriterionId = step4.CriterionId
	WHERE count1 > 1
		OR ContainsDot
		--OR ContainsCapital
		--OR ContainsDash
		OR WronglyModifiedBroad
		OR PartlyModifiedBroad
		OR UnmodifiedBroad
		OR PlusInNonBroad
		OR ContainsQuotes
		OR ContainsBrackets
		OR DuplicateBmmFragments
	GROUP BY 
		step4.AccountName,
		step4.ExternalCustomerId,
		step4.CampaignId,
		step4.CampaignName,
		NormalizedKeyword2,
		NormalizedKeyword3,
		KeywordMatchType,
		Criteria,
		step4.CriterionId,
		QualityScore,
		step4.AdGroupId,
		AdGroupName,
		ContainsDot,
		ContainsCapital,
		ContainsDash,
		WronglyModifiedBroad,
		PartlyModifiedBroad,
		UnmodifiedBroad,
		PlusInNonBroad,
		ContainsQuotes,
		ContainsBrackets,
		DuplicateBmmFragments
),
keyword3 AS
(
	SELECT
		keyword2.AccountName,
		keyword2.ExternalCustomerId,
		keyword2.CampaignId,
		keyword2.CampaignName,
		KeywordMatchType,
		Criteria AS Criteria,
		NormalizedKeyword2 AS NormalizedKeyword,
		keyword2.CriterionId AS CriterionId,
		QualityScore AS QualityScore,
		keyword2.AdGroupId AS AdGroupId,
		AdGroupName AS AdGroupName,
		Impressions AS Impressions,
		Clicks AS Clicks,
		Cost AS Cost,
		Conversions AS Conversions,
		Cpo AS Cpo,
		Cpc AS Cpc,
		Cvr AS Cvr,
		DuplicateBmmFragments,
		ContainsDot,
		ContainsCapital,
		ContainsDash,
		ContainsQuotes,
		ContainsBrackets,
		WronglyModifiedBroad,
		PartlyModifiedBroad,
		UnmodifiedBroad,
		PlusInNonBroad,
		ARRAY_TO_STRING(
			ARRAY(
				SELECT CASE WHEN DuplicateBmmFragments THEN 'DUPLICATE_BMM_FRAGMENTS' ELSE NULL END
				UNION ALL
				SELECT CASE WHEN ContainsDot THEN 'CONTAINS_DOT' ELSE NULL END
				UNION ALL
				SELECT CASE WHEN ContainsCapital THEN 'CONTAINS_CAPITAL' ELSE NULL END
				UNION ALL
				SELECT CASE WHEN ContainsDash THEN 'CONTAINS_DASH' ELSE NULL END
				UNION ALL
				SELECT CASE WHEN ContainsQuotes THEN 'CONTIANS_QUOTES' ELSE NULL END
				UNION ALL
				SELECT CASE WHEN ContainsBrackets THEN 'CONTIANS_BRACKETS' ELSE NULL END
				UNION ALL
				SELECT CASE WHEN WronglyModifiedBroad THEN 'WRONGLY_MODIFIED_BROAD' ELSE NULL END
				UNION ALL
				SELECT CASE WHEN PartlyModifiedBroad THEN 'PARTLY_MODIFIED_BROAD' ELSE NULL END
				UNION ALL
				SELECT CASE WHEN UnmodifiedBroad THEN 'UNMODIFIED_BROAD' ELSE NULL END
				UNION ALL
				SELECT CASE WHEN PlusInNonBroad THEN 'PLUS_IN_NON_BROAD' ELSE NULL END
				UNION ALL
				SELECT CASE WHEN Count > 1 THEN 'DUPLICATE' ELSE NULL END
			)
		, ', ' ) AS Problems,
		Count,
		DENSE_RANK() OVER ( PARTITION BY keyword2.ExternalCustomerId ORDER BY FARM_FINGERPRINT( CONCAT( AccountName, CampaignName, KeywordMatchType, NormalizedKeyword3 ) ) ) as Rank,
		ROW_NUMBER() OVER (
			PARTITION BY
				keyword2.ExternalCustomerId,
				keyword2.CampaignId,
				NormalizedKeyword3
			ORDER BY
				ROUND(
					IFNULL( QualityScore, 0 ) 
					+ IFNULL( Conversions, 0 ) * 1000
					+ IFNULL( Cost / 1000, 0 )
					+ IFNULL( Clicks / 100, 0 )
					+ IFNULL( Impressions / 10000, 0 )
					- CASE WHEN DuplicateBmmFragments THEN .1 ELSE 0 END
					- CASE WHEN ContainsDot THEN .1 ELSE 0 END
					- CASE WHEN ContainsCapital THEN .1 ELSE 0 END
					- CASE WHEN ContainsDash THEN .1 ELSE 0 END
					- CASE WHEN ContainsQuotes THEN 1 ELSE 0 END
					- CASE WHEN ContainsBrackets THEN 1 ELSE 0 END
					- CASE WHEN WronglyModifiedBroad THEN 2 ELSE 0 END
					- CASE WHEN PartlyModifiedBroad THEN 1 ELSE 0 END
					- CASE WHEN UnmodifiedBroad THEN 3 ELSE 0 END
					- CASE WHEN PlusInNonBroad THEN .1 ELSE 0 END
					,1
				) DESC
		) as RowNumber
	FROM keyword2
)
SELECT
	AccountName,
	ExternalCustomerId,
	CampaignId,
	CampaignName,
	KeywordMatchType,
	--NormalizedKeyword,
	CriterionId,
	AdGroupId,
	AdGroupName,
	QualityScore,
	Impressions,
	Clicks,
	Cost,
	Conversions,
	Cpo,
	Cpc,
	Cvr,
	Criteria,
	Problems,
	--Count,
	Rank,
	--RowNumber,
	CASE
		WHEN RowNumber > 1 THEN 'PAUSE'
		WHEN RowNumber = 1 AND Conversions > 0.02 THEN 'KEEP'
		WHEN FALSE
			OR DuplicateBmmFragments
			OR ContainsDot
			OR ContainsCapital
			OR ContainsDash
			OR ContainsQuotes
			OR ContainsBrackets
			OR WronglyModifiedBroad
			OR PartlyModifiedBroad
			OR UnmodifiedBroad
			OR PlusInNonBroad
			THEN CONCAT( 'REPLACE WITH ', NormalizedKeyword )
		ELSE 'KEEP'
	END AS Recomendation
FROM keyword3
ORDER BY
	ExternalCustomerId,
	Rank,
	RowNumber








-- campaign_enabled_at_weekend
WITH
currentlyEnabled AS (
	SELECT
		CustomerDescriptiveName,
		campaign.*
	FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
	JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer USING ( ExternalCustomerId )
	WHERE TRUE
		AND ( EndDate IS NULL OR EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
		AND CampaignStatus IN ( 'ENABLED' )
		AND customer._LATEST_DATE = customer._DATA_DATE
		AND campaign._LATEST_DATE = campaign._DATA_DATE
),
yesterday AS (
	SELECT
		ExternalCustomerId,
		CampaignId,
		CampaignStatus
	FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
	WHERE TRUE
		AND ( EndDate IS NULL OR EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
		AND DATE_DIFF( CURRENT_DATE( 'Europe/Berlin' ), _DATA_DATE, DAY ) = 1
)
SELECT
	CustomerDescriptiveName,
	CampaignName,
	yesterday.CampaignStatus AS PreviousCampaignStatus
FROM currentlyEnabled
LEFT JOIN yesterday USING ( ExternalCustomerId, CampaignId )
WHERE TRUE
	AND ( yesterday.CampaignStatus IS NULL OR yesterday.CampaignStatus = 'PAUSED' )
	AND EXTRACT( DAYOFWEEK FROM CURRENT_DATE( 'Europe/Berlin' ) )
		IN (
			1, -- sunday
			6, -- friday
			7 -- saturday
		)




-- ad_group_enabled_at_weekend
WITH
currentlyEnabled AS (
	SELECT
		CustomerDescriptiveName,
		CampaignName,
		ad_group.*
	FROM `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` AS ad_group
	JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign USING ( ExternalCustomerId, CampaignId )
	JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer USING ( ExternalCustomerId )
	WHERE TRUE
		AND ( EndDate IS NULL OR EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
		AND CampaignStatus IN ( 'ENABLED' )
		AND AdGroupStatus IN ( 'ENABLED' )
		AND customer._LATEST_DATE = customer._DATA_DATE
		AND campaign._LATEST_DATE = campaign._DATA_DATE
		AND ad_group._LATEST_DATE = ad_group._DATA_DATE
),
yesterday AS (
	SELECT
		ExternalCustomerId,
		CampaignId,
		AdGroupId,
		AdGroupStatus
	FROM `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` AS ad_group
	JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign USING ( ExternalCustomerId, CampaignId )
	WHERE TRUE
		AND CampaignStatus IN ( 'ENABLED' )
		AND ( EndDate IS NULL OR EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
		AND DATE_DIFF( CURRENT_DATE( 'Europe/Berlin' ), campaign._DATA_DATE, DAY ) = 1
		AND DATE_DIFF( CURRENT_DATE( 'Europe/Berlin' ), ad_group._DATA_DATE, DAY ) = 1
)
SELECT
	CustomerDescriptiveName,
	CampaignName,
	AdGroupName,
	yesterday.AdGroupStatus AS PreviousAdGroupStatus
FROM currentlyEnabled
LEFT JOIN yesterday USING ( ExternalCustomerId, CampaignId, AdGroupId )
WHERE TRUE
	AND ( yesterday.AdGroupStatus IS NULL OR yesterday.AdGroupStatus = 'PAUSED' )
	AND EXTRACT( DAYOFWEEK FROM CURRENT_DATE( 'Europe/Berlin' ) )
		IN (
			1, -- sunday
			6, -- friday
			7 -- saturday
	)





-- keywords_enabled_at_weekend
WITH
currentlyEnabled AS (
	SELECT
		CustomerDescriptiveName,
		CampaignName,
		AdGroupName,
		keyword.*
	FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` AS keyword
	JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` AS ad_group USING ( ExternalCustomerId, CampaignId, AdGroupId )
	JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign USING ( ExternalCustomerId, CampaignId )
	JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer USING ( ExternalCustomerId )
	WHERE TRUE
		AND ( EndDate IS NULL OR EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
		AND CampaignStatus IN ( 'ENABLED' )
		AND AdGroupStatus IN ( 'ENABLED' )
		AND Status IN ( 'ENABLED' )
		AND customer._LATEST_DATE = customer._DATA_DATE
		AND campaign._LATEST_DATE = campaign._DATA_DATE
		AND ad_group._LATEST_DATE = ad_group._DATA_DATE
		AND keyword._LATEST_DATE = keyword._DATA_DATE
),
yesterday AS (
	SELECT
		ExternalCustomerId,
		CampaignId,
		AdGroupId,
		CriterionId,
		Status
	FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` AS keyword
	JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` AS ad_group USING ( ExternalCustomerId, CampaignId, AdGroupId )
	JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign USING ( ExternalCustomerId, CampaignId )
	WHERE TRUE
		AND CampaignStatus IN ( 'ENABLED' )
		AND AdGroupStatus IN ( 'ENABLED' )
		AND ( EndDate IS NULL OR EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
		AND DATE_DIFF( CURRENT_DATE( 'Europe/Berlin' ), campaign._DATA_DATE, DAY ) = 1
		AND DATE_DIFF( CURRENT_DATE( 'Europe/Berlin' ), ad_group._DATA_DATE, DAY ) = 1
		AND DATE_DIFF( CURRENT_DATE( 'Europe/Berlin' ), keyword._DATA_DATE, DAY ) = 1
)
SELECT
	CustomerDescriptiveName,
	CampaignName,
	AdGroupName,
	Criteria,
	yesterday.Status AS PreviousStatus
FROM currentlyEnabled
LEFT JOIN yesterday USING ( ExternalCustomerId, CampaignId, AdGroupId, CriterionId )
WHERE TRUE
	AND ( yesterday.Status IS NULL OR yesterday.Status = 'PAUSED' )
	AND EXTRACT( DAYOFWEEK FROM CURRENT_DATE( 'Europe/Berlin' ) )
		IN (
			1, -- sunday
			6, -- friday
			7 -- saturday
	)



-- duplicate_keywords_by_case_in_campaign
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( CampaignId as STRING ) as CampaignId,
	CampaignName,
	CampaignStatus,
	KeywordMatchType,
	LOWER( Criteria ) as keyword_criteria,
	count( * ) as count,
	STRING_AGG(Criteria ) as keywords,
FROM `biddy-io.pa_airbnb.Keyword_7369193070` as keyword
JOIN `biddy-io.pa_airbnb.Campaign_7369193070` as campaign
	USING ( ExternalCustomerId, CampaignId )
JOIN `biddy-io.pa_airbnb.Customer_7369193070` as customer
	USING ( ExternalCustomerId )
WHERE TRUE
	AND ( EndDate IS NULL OR EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND Status IN ( 'ENABLED' )
	AND NOT keyword.IsNegative
	--AND LOWER( Criteria ) = 'airbnb dla firm'
GROUP BY
	ExternalCustomerId,
	CustomerDescriptiveName,
	AccountDescriptiveName,
	CampaignName,
	CampaignStatus,
	KeywordMatchType,
	CampaignId,
	keyword_criteria
HAVING count > 1










-- newly_enabled_dynamic_ads
SELECT
  ad.HeadlinePart1,
  ad.HeadlinePart2,
  ad.Headline,
  ad.AdType,
  ad.ResponsiveSearchAdHeadlines,
  ad.Description1,
  ad.Description2,
  ad.CreativeId,
  CustomerDescriptiveName,
  CampaignName,
  AdGroupName,
  IFNULL( SUM( stats.Impressions ), 0 ) AS Impressions,
  IFNULL( SUM( stats.Clicks ), 0 ) AS Clicks,
FROM `biddy-io.pa_airbnb.Ad_7369193070` ad
JOIN `biddy-io.pa_airbnb.Customer_7369193070` AS customer USING ( ExternalCustomerId )
JOIN `biddy-io.pa_airbnb.Campaign_7369193070` AS campaign USING ( ExternalCustomerId, CampaignId )
JOIN `biddy-io.pa_airbnb.AdGroup_7369193070` AS ad_group USING ( ExternalCustomerId, CampaignId, AdGroupId )
LEFT JOIN `biddy-io.pa_airbnb.AdStats_7369193070` AS stats
  ON TRUE
    AND ad.ExternalCustomerId = stats.ExternalCustomerId
    AND ad.CampaignId = stats.CampaignId
    AND ad.AdGroupId = stats.AdGroupId
    AND ad.CreativeId = stats.CreativeId
    AND DATE_DIFF( CURRENT_DATE( 'Europe/Berlin' ), stats._DATA_DATE, DAY ) < 7
WHERE
  TRUE
  AND ( EndDate IS NULL OR EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
  --AND CampaignStatus IN ( 'ENABLED' )
  --AND AdGroupStatus IN ( 'ENABLED' )
  AND ad.Status IN ( 'ENABLED' )
  AND customer._LATEST_DATE = customer._DATA_DATE
  AND campaign._LATEST_DATE = campaign._DATA_DATE
  AND ad_group._LATEST_DATE = ad_group._DATA_DATE
  AND ad._LATEST_DATE = ad._DATA_DATE
  AND AdType IN ( 'EXPANDED_DYNAMIC_SEARCH_AD', 'DYNAMIC_SEARCH_AD' )
GROUP BY
  ad.HeadlinePart1,
  ad.HeadlinePart2,
  ad.Headline,
  ad.AdType,
  ad.ResponsiveSearchAdHeadlines,
  ad.Description1,
  ad.Description2,
  ad.CreativeId,
  CustomerDescriptiveName,
  CampaignName,
  AdGroupName
HAVING TRUE
  --AND IFNULL( SUM( stats.Impressions ), 0 ) = 0
  --AND IFNULL( SUM( stats.Clicks ), 0 ) = 0
ORDER BY Impressions DESC



