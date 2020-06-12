
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
	CAST( AdGroupId as STRING ) as AdGroupId,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	CampaignName,
	AdGroupName
FROM `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = adgroup.ExternalCustomerId AND adgroup.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId
WHERE TRUE
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND ( SELECT count(*) from `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword WHERE keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.AdGroupId = adgroup.AdGroupId AND NOT IsNegative AND KeywordMatchType = 'EXACT' AND keyword._LATEST_DATE = keyword._DATA_DATE ) > 10
	AND AdvertisingChannelType = 'SEARCH'
ORDER BY AccountName, CampaignName, AdGroupName


-- adgroup_no_negative_keywords_in_broad_adgroup
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
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND ( SELECT count(*) from `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword WHERE keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.AdGroupId = adgroup.AdGroupId AND IsNegative AND keyword._LATEST_DATE = keyword._DATA_DATE ) = 0
	AND REGEXP_CONTAINS( AdGroupName, 'Broad' )
ORDER BY AccountName, CampaignName, AdGroupName




-- adgroup_too_many_broad_keywords
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
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND ( SELECT count(*) from `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword WHERE keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.AdGroupId = adgroup.AdGroupId AND NOT IsNegative AND KeywordMatchType = 'BROAD' AND keyword._LATEST_DATE = keyword._DATA_DATE ) > 1
	AND AdvertisingChannelType = 'SEARCH'
ORDER BY AccountName, CampaignName, AdGroupName




-- adgroup_no_etas
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
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND ( SELECT count(*) from `biddy-io.peak_ace_active_clients_transfer.Ad_1036246249` as ad WHERE ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId AND AdType = 'EXPANDED_TEXT_AD' AND ad._LATEST_DATE = ad._DATA_DATE ) = 0
	AND AdGroupType = 'SEARCH_STANDARD'
ORDER BY AccountName, CampaignName, AdGroupName



-- adgroup_too_few_etas
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
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND ( SELECT count(*) from `biddy-io.peak_ace_active_clients_transfer.Ad_1036246249` as ad WHERE ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId AND AdType = 'EXPANDED_TEXT_AD' AND ad._LATEST_DATE = ad._DATA_DATE ) IN (1,2,3)
	AND AdGroupType = 'SEARCH_STANDARD'
ORDER BY AccountName, CampaignName, AdGroupName


-- adgroup_too_many_active_etas
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
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND ( SELECT count(*) from `biddy-io.peak_ace_active_clients_transfer.Ad_1036246249` as ad WHERE ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId AND AdType = 'EXPANDED_TEXT_AD' AND ad._LATEST_DATE = ad._DATA_DATE AND Status = 'ENABLED' ) > 6
	AND AdGroupType = 'SEARCH_STANDARD'
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
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND ( SELECT count(*) from `biddy-io.peak_ace_active_clients_transfer.Ad_1036246249` as ad WHERE ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId AND AdType = 'DYNAMIC_SEARCH_AD' AND ad._LATEST_DATE = ad._DATA_DATE AND Status = 'ENABLED' ) = 0
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
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND ( SELECT count(*) from `biddy-io.peak_ace_active_clients_transfer.Ad_1036246249` as ad WHERE ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId AND AdType = 'DYNAMIC_SEARCH_AD' AND ad._LATEST_DATE = ad._DATA_DATE AND Status = 'ENABLED' ) IN (1,2)
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
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND ( SELECT count(*) from `biddy-io.peak_ace_active_clients_transfer.Ad_1036246249` as ad WHERE ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.AdGroupId = adgroup.AdGroupId AND AdType = 'DYNAMIC_SEARCH_AD' AND ad._LATEST_DATE = ad._DATA_DATE AND Status = 'ENABLED' ) > 6
	AND AdGroupType = 'SEARCH_DYNAMIC_ADS'
ORDER BY AccountName, CampaignName, AdGroupName



-- adgroup_negative_keyword_conflicts
#StandardSQL
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
#StandardSQL
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
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.Audience_1036246249` AS audience
	ON adgroup.ExternalCustomerId = audience.ExternalCustomerId
	AND adgroup.AdGroupId = audience.AdGroupId
	AND audience._DATA_DATE = audience._LATEST_DATE
	AND CriterionAttachmentLevel = 'ADGROUP'
	AND Status IN ( 'ENABLED', 'PAUSED' )
WHERE TRUE
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
	AND AdType = 'EXPANDED_TEXT_AD'
	AND Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND ad._LATEST_DATE = ad._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND LENGTH( Description ) <= 60


-- ad_duplicate_special_chars_in_description
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
	AND AdType = 'EXPANDED_TEXT_AD'
	AND Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND ad._LATEST_DATE = ad._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND REGEXP_CONTAINS( Description, '[\\?\\!].*[\\?\\!]' )




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
	CampaignMobileBidModifier,
	AdvertisingChannelType,
	TargetingSetting,
	DeliveryMethod,
	AdRotationType
FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.CampaignSettings_1036246249` as settings
	ON  settings.ExternalCustomerId = campaign.ExternalCustomerId
	AND settings.CampaignId = campaign.CampaignId
WHERE TRUE
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND CampaignMobileBidModifier IS NULL
	AND ifnull( settings._LATEST_DATE = settings._DATA_DATE , true )


-- campaign_multi_channel
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CampaignName,
	campaign.CampaignStatus,
	CampaignMobileBidModifier,
	AdvertisingChannelType,
	TargetingSetting,
	DeliveryMethod,
	AdRotationType
FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.CampaignSettings_1036246249` as settings
	ON  settings.ExternalCustomerId = campaign.ExternalCustomerId
	AND settings.CampaignId = campaign.CampaignId
WHERE TRUE
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND AdvertisingChannelType = 'MULTI_CHANNEL'
	AND ifnull( settings._LATEST_DATE = settings._DATA_DATE , true )


-- campaign_target_and_bid
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CampaignName,
	campaign.CampaignStatus,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CampaignMobileBidModifier,
	AdvertisingChannelType,
	TargetingSetting,
	DeliveryMethod,
	AdRotationType
FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.CampaignSettings_1036246249` as settings
	ON  settings.ExternalCustomerId = campaign.ExternalCustomerId
	AND settings.CampaignId = campaign.CampaignId
WHERE TRUE
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND TargetingSetting = 'TARGET_ALL_FALSE'
	AND ifnull( settings._LATEST_DATE = settings._DATA_DATE , true )


-- campaign_non_standard_delivery_method
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CampaignName,
	campaign.CampaignStatus,
	CampaignMobileBidModifier,
	AdvertisingChannelType,
	TargetingSetting,
	DeliveryMethod,
	AdRotationType
FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.CampaignSettings_1036246249` as settings
	ON  settings.ExternalCustomerId = campaign.ExternalCustomerId
	AND settings.CampaignId = campaign.CampaignId
WHERE TRUE
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND DeliveryMethod != 'STANDARD'
	AND ifnull( settings._LATEST_DATE = settings._DATA_DATE , true )


-- campaign_rotation_type_not_optimized
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CampaignName,
	campaign.CampaignStatus,
	CampaignMobileBidModifier,
	AdvertisingChannelType,
	TargetingSetting,
	DeliveryMethod,
	AdRotationType
FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.CampaignSettings_1036246249` as settings
	ON  settings.ExternalCustomerId = campaign.ExternalCustomerId
	AND settings.CampaignId = campaign.CampaignId
WHERE TRUE
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND AdRotationType != 'OPTIMIZE'
	AND AdRotationType != 'CONVERSION_OPTIMIZE'
	AND ifnull( settings._LATEST_DATE = settings._DATA_DATE , true )



-- campaign_negative_keyword_conflict
#StandardSQL
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
		OR ( neg_match_type = 'PHRASE' AND REGEXP_CONTAINS( CONCAT( ' ', keyword_, ' ' ), CONCAT( ' ',  REGEXP_REPLACE( negative_keyword, '[+]', '\\\\+' ), ' ' ) ) )
		OR ( neg_match_type = 'BROAD'  AND REGEXP_CONTAINS( CONCAT( ' ', keyword_sorted, ' ' ),
			CONCAT( ' ', ARRAY_TO_STRING( SPLIT(  REGEXP_REPLACE( neg_sorted, '[+]', '\\\\+' ), ' ' ), '\\s(\\w*\\s)*' ), ' ' ) ) )
	)


-- close_variants
#StandardSQL
SELECT
	AccountName,
	ExternalCustomerId,
	Campaign_ AS Campaign,
	CampaignId,
	AdGroupId,
	AdGroup_ AS AdGroup,
	CampaignStatus,
	AdGroupStatus,
	Status,
	Keyword_ as exact_keyword,
	Query
FROM (
	SELECT
		ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
		CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
		CAST( campaign.CampaignId as STRING ) as CampaignId,
		CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
		CampaignName as Campaign_,
		AdGroupName as AdGroup_,
		keyword.Criteria as Keyword_,
		sq.Query,
		campaign.CampaignStatus,
		adgroup.AdGroupStatus,
		keyword.Status,
		count(*) as count
	FROM (
		SELECT ExternalCustomerId, CampaignId, AdGroupId, CriterionId, Query
		FROM `biddy-io.peak_ace_active_clients_transfer.SearchQueryStats_1036246249`
		WHERE true
			AND _LATEST_DATE = _DATA_DATE
			--AND DATE_DIFF( CURRENT_DATE(), Date, DAY ) <= 30
		GROUP BY ExternalCustomerId, CampaignId, AdGroupId, CriterionId, Query
	) as sq
	JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = sq.ExternalCustomerId
	JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = sq.ExternalCustomerId AND sq.CampaignId = campaign.CampaignId
	JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON adgroup.ExternalCustomerId = sq.ExternalCustomerId AND sq.AdGroupId = adgroup.AdGroupId
	JOIN `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword ON keyword.ExternalCustomerId = sq.ExternalCustomerId AND keyword.AdGroupId = sq.AdGroupId AND keyword.CriterionId = sq.CriterionId
	JOIN (
		SELECT sq2.ExternalCustomerId, sq2.CampaignId, sq2.AdGroupId, sq2.CriterionId, sq2.Query
		FROM `biddy-io.peak_ace_active_clients_transfer.SearchQueryStats_1036246249` as sq2
		JOIN `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as other_keyword
			ON other_keyword.ExternalCustomerId = sq2.ExternalCustomerId
			AND other_keyword.CampaignId = sq2.CampaignId
			AND other_keyword.AdGroupId = sq2.AdGroupId
			AND other_keyword.CriterionId = sq2.CriterionId
		WHERE true
			AND sq2._LATEST_DATE = sq2._DATA_DATE
			--AND DATE_DIFF( CURRENT_DATE(), Date, DAY ) <= 30
			AND other_keyword._LATEST_DATE = other_keyword._DATA_DATE
			AND other_keyword.Status IN ( 'ENABLED', 'PAUSED' )
			AND other_keyword.KeywordMatchType = 'EXACT'
		GROUP BY sq2.ExternalCustomerId, CampaignId, AdGroupId, CriterionId, Query
	) as other_sq ON sq.ExternalCustomerId = other_sq.ExternalCustomerId AND sq.Query = other_sq.Query
	WHERE TRUE
		AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
		AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
		AND keyword.Status IN ( 'ENABLED', 'PAUSED' )
		AND keyword.KeywordMatchType = 'EXACT'
		AND customer._LATEST_DATE = customer._DATA_DATE
		AND campaign._LATEST_DATE = campaign._DATA_DATE
		AND adgroup._LATEST_DATE = adgroup._DATA_DATE
		AND keyword._LATEST_DATE = keyword._DATA_DATE
	GROUP BY
		customer.ExternalCustomerId,
		AccountName,
		CampaignName,
		AdGroupId,
		CampaignId,
		AdGroupName,
		keyword.Criteria,
		campaign.CampaignStatus,
		adgroup.AdGroupStatus,
		keyword.Status,
		Query
	HAVING count > 1
)
ORDER BY AccountName, query




-- duplicate_bmm_keywords_in_campaign
SELECT
	AccountName,
	CAST( keyword2.ExternalCustomerId as STRING ) AS ExternalCustomerId,
	CAST( keyword2.CampaignId as STRING ) AS CampaignId,
	CampaignName,
	CampaignStatus,
	keyword2.AdGroupId,
	AdGroupName,
	AdGroupStatus,
	Rank,
	Criteria,
	keyword2.CriterionId,
	QualityScore,
	SUM( Impressions ) AS Impressions,
	SUM( Clicks ) AS Clicks,
	SUM( Cost ) / 1000000 AS Cost,
	SUM( Conversions ) AS Conversions,
	SUM( Cost ) / 1000000 / GREATEST( SUM( Conversions ), .01 ) AS Cpo,
	SUM( Conversions ) / GREATEST( SUM( Clicks ), 1 ) AS Cvr
FROM (
	SELECT
		AccountName,
		ExternalCustomerId,
		CampaignId,
		CampaignName,
		CampaignStatus,
		AdGroupId,
		AdGroupName,
		AdGroupStatus,
		DENSE_RANK() OVER ( PARTITION BY ExternalCustomerId ORDER BY FARM_FINGERPRINT( CONCAT( AccountName, CampaignName, keyword1 ) ) ) as Rank,
		Criteria,
		CriterionId,
		QualityScore
		--count1,
		--DistinctDuplicates
	FROM (
		SELECT
			*,
			COUNT( * ) OVER ( PARTITION BY ExternalCustomerId, CampaignId, CampaignName, keyword1 ) AS count1,
			COUNT( DISTINCT Criteria ) OVER ( PARTITION BY ExternalCustomerId, CampaignId, CampaignName, keyword1 ) AS DistinctDuplicates
		FROM (
			SELECT
				ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
				customer.ExternalCustomerId AS ExternalCustomerId,
				keyword.CampaignId AS CampaignId,
				CampaignName,
				campaign.CampaignStatus,
				adgroup.AdGroupId,
				adgroup.AdGroupName,
				adgroup.AdGroupStatus,
				( select ARRAY_TO_STRING(
				  (
				  array(
					select x
					from unnest( split( Criteria, ' ' ) ) as x
					ORDER BY x
				  )
				  ),
				  ' '
				  )
				) as keyword1,
				Criteria,
				keyword.CriterionId,
				keyword.QualityScore
			FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword
			JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON keyword.ExternalCustomerId = customer.ExternalCustomerId
			JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON keyword.ExternalCustomerId = campaign.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId
			JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId
			WHERE TRUE
				AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
				AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
				AND keyword.Status IN ( 'ENABLED', 'PAUSED' )
				AND keyword.KeywordMatchType = 'BROAD'
				AND NOT keyword.isNegative
				AND REGEXP_CONTAINS( keyword.Criteria, '^(\\+\\w+)+' )
				AND customer._LATEST_DATE = customer._DATA_DATE
				AND campaign._LATEST_DATE = campaign._DATA_DATE
				AND adgroup._LATEST_DATE = adgroup._DATA_DATE
				AND keyword._LATEST_DATE = keyword._DATA_DATE
		)
	)
	WHERE TRUE
		AND count1 > 1
		AND DistinctDuplicates > 1
) AS keyword2
LEFT JOIN `biddy-io.peak_ace_active_clients_transfer.KeywordBasicStats_1036246249` AS stat
	ON TRUE
	AND DATE_DIFF( CURRENT_DATE( 'Europe/Berlin' ), stat._DATA_DATE, DAY ) < 90
	AND stat.ExternalCustomerId = keyword2.ExternalCustomerId
	AND stat.CampaignId = keyword2.CampaignId
	AND stat.AdGroupId = keyword2.AdGroupId
	AND stat.CriterionId = keyword2.CriterionId
GROUP BY
	AccountName,
	ExternalCustomerId,
	CampaignId,
	CampaignName,
	CampaignStatus,
	AdGroupId,
	AdGroupName,
	AdGroupStatus,
	Rank,
	Criteria,
	CriterionId,
	QualityScore
ORDER BY
	ExternalCustomerId,
	Rank




-- duplicate_conversion_tracker
#StandardSQL
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
		AND DATE_DIFF( CURRENT_DATE(), k.Date, DAY ) <= 30
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




-- duplicate_keyword_in_campaign
#StandardSQL
SELECT
	ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	CAST( keyword.CampaignId as STRING ) as CampaignId,
	CampaignName,
	campaign.CampaignStatus,
	Criteria,
	KeywordMatchType,
	count(*) as count
FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign
	ON keyword.ExternalCustomerId = campaign.ExternalCustomerId
	AND keyword.CampaignId = campaign.CampaignId
	AND campaign.AdvertisingChannelType = 'SEARCH'
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = campaign.ExternalCustomerId
WHERE TRUE
	AND NOT keyword.isNegative
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED' )
	AND keyword.Status IN ( 'ENABLED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND keyword._LATEST_DATE = keyword._DATA_DATE
GROUP BY
	customer.ExternalCustomerId,
	AccountName,
	CampaignName,
	campaign.CampaignStatus,
	Criteria,
	KeywordMatchType,
	CampaignId
HAVING count > 1
ORDER BY count desc



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
#StandardSQL
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
	AND Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND sq._LATEST_DATE = sq._DATA_DATE
	--AND DATE_DIFF( CURRENT_DATE(), sq.Date, DAY ) <= 30
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



-- keyword_contains_dot
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
	AND Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND NOT IsNegative
	AND REGEXP_CONTAINS( Criteria, '\\.' )




-- keyword_contains_capital
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
	AND Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND NOT IsNegative
	AND REGEXP_CONTAINS( Criteria, '[A-Z]' )



-- keyword_contains_dash
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
	AND Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND NOT IsNegative
	AND REGEXP_CONTAINS( Criteria, '-' )



-- keyword_wrongly_modified_broad
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
	AND Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND NOT IsNegative
	AND KeywordMatchType = 'BROAD' 
	AND REGEXP_CONTAINS( Criteria, '(\\S\\+)|(\\+(\\s+|$))' )


-- keyword_duplicate_bmm_fragments
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
	AND Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND NOT IsNegative
	AND KeywordMatchType = 'BROAD'
	AND (
		SELECT count(*) > 0 as contains_duplicate_words
		FROM (
			SELECT x, count(*) as count
			FROM unnest( split( REGEXP_REPLACE( REGEXP_REPLACE( Criteria, '\\s\\+', ' ' ), '^\\+', '' ), ' ' ) ) as x
			WHERE LENGTH( x ) > 1
			GROUP BY x
			HAVING count > 1
		)
	)



-- keyword_plus_in_non_broad
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
	AND Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND NOT IsNegative
	AND KeywordMatchType != 'BROAD'
	AND REGEXP_CONTAINS( Criteria, '\\+' )


-- keyword_partly_modified_broad
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
	AND Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND NOT IsNegative
	AND KeywordMatchType = 'BROAD'
	AND REGEXP_CONTAINS( Criteria, '((^|\\s)\\+\\S.*\\s[^\\+])|((^|\\s)[^\\+].*(\\s)\\+\\S)' )


-- keyword_unmodified_broad
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
	AND Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND NOT IsNegative
	AND KeywordMatchType = 'BROAD'
	AND NOT REGEXP_CONTAINS( Criteria, '\\+' )



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
	keyword.Status, -- negative keywords are always enabled, but we need this column for ds_ views
	KeywordMatchType,
	FinalUrls
FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId
WHERE TRUE
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
#StandardSQL
SELECT
	AccountName,
	ExternalCustomerId,
	CampaignName,
	CampaignStatus,
	CampaignId,
	round( count_missing_location_bid_modifier / count_locations, 2 ) as missing_bid_modifier_share
FROM (
	SELECT
		ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
		CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
		CAST( campaign.CampaignId as STRING ) as CampaignId,
		campaign.CampaignName,
		campaign.CampaignStatus,
		count(*) as count_locations,
		sum( cast( ( location.BidModifier is null ) as int64 ) ) as count_missing_location_bid_modifier
	FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign
	JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer
		ON customer.ExternalCustomerId = campaign.ExternalCustomerId
	JOIN `biddy-io.peak_ace_active_clients_transfer.LocationBasedCampaignCriterion_1036246249` as location
		ON campaign.ExternalCustomerId = location.ExternalCustomerId
		AND campaign.campaignId = location.CampaignId
	WHERE TRUE
		AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
		AND campaign._LATEST_DATE = campaign._DATA_DATE
		AND customer._LATEST_DATE = customer._DATA_DATE
		AND location._LATEST_DATE = location._DATA_DATE
		AND NOT isNegative
	GROUP BY customer.ExternalCustomerId, AccountName, CampaignName, CampaignId, campaign.CampaignStatus
	HAVING TRUE
		AND count_locations > 1
		AND count_missing_location_bid_modifier > 0
	ORDER BY AccountName, CampaignName
)





-- multiple_domains_in_adgroup
#StandardSQL
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
#StandardSQL
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
#StandardSQL
SELECT *
FROM (
	SELECT
		*
		,
		COUNT(*) OVER (
			PARTITION BY
			ExternalCustomerId,
			AccountName,
			Query
		) AS criteriaCount
	FROM (
		SELECT
			ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,
			CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
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
			keyword.KeywordMatchType
			--,STRING_AGG( DISTINCT CONCAT( campaign.CampaignName, '>', adgroup.AdGroupName, '>', keyword.Criteria, '[', keyword.KeywordMatchType, ']' ) , ',\n' ) as keywords
			--,COUNT( DISTINCT CONCAT( campaign.CampaignName, '>', adgroup.AdGroupName, '>', keyword.Criteria ) ) as countKeywords
		FROM `biddy-io.peak_ace_active_clients_transfer.SearchQueryStats_1036246249` as sq
		JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = sq.ExternalCustomerId AND sq.CampaignId = campaign.CampaignId
		JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = sq.ExternalCustomerId
		JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON adgroup.ExternalCustomerId = sq.ExternalCustomerId AND sq.CampaignId = adgroup.CampaignId AND sq.AdGroupId = adgroup.AdGroupId
		JOIN `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword ON keyword.ExternalCustomerId = sq.ExternalCustomerId AND keyword.CampaignId = sq.CampaignId AND keyword.AdGroupId = sq.AdGroupId AND keyword.CriterionId = sq.CriterionId
		WHERE TRUE
			AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
			AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
			AND keyword.Status IN ( 'ENABLED', 'PAUSED' )
			AND NOT keyword.IsNegative
			--AND sq._LATEST_DATE = sq._DATA_DATE
			AND customer._LATEST_DATE = customer._DATA_DATE
			AND campaign._LATEST_DATE = campaign._DATA_DATE
			AND adgroup._LATEST_DATE = adgroup._DATA_DATE
			AND keyword._LATEST_DATE = keyword._DATA_DATE
			AND sq._LATEST_DATE = sq._DATA_DATE
			AND DATE_DIFF( sq._LATEST_DATE, sq.Date, DAY ) <= 30
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
	AND criteriaCount > 1
ORDER BY criteriaCount DESC,
	ExternalCustomerId,
	AccountName,
	Query,
	CampaignName,
	CampaignId,
	AdGroupName,
	AdGroupId,
	Criteria,
	CriterionId,
	KeywordMatchType



-- worldwide_targeting
#StandardSQL
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
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND location.CriterionId is null
ORDER BY AccountName, CampaignName





-- disapproved_extensions
#StandardSQL
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
#StandardSQL
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
#StandardSQL
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
#StandardSQL
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





-- excluded_geo_locations
SELECT
	ifnull( CustomerDescriptiveName,
	AccountDescriptiveName ) AS AccountName,
	CAST( criterion.ExternalCustomerId as STRING ) as ExternalCustomerId,
	campaign.CampaignName,
	campaign.CampaignStatus,
	CAST( criterion.CampaignId as STRING ) as CampaignId,
	CAST( criterion.CriterionId as STRING ) as CriterionId,
	--geo.Name,
	geo.TargetType,
	geo.CountryCode,
	geo.CanonicalName
FROM `biddy-io.peak_ace_active_clients_transfer.LocationBasedCampaignCriterion_1036246249` as criterion
JOIN `biddy-io.peak_ace_active_clients_transfer.p_Geotargets_1036246249` as geo
	ON TRUE
	AND criterion.CriterionId = geo.CriteriaId
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign
	ON TRUE
	AND criterion.ExternalCustomerId = campaign.ExternalCustomerId
	AND criterion.CampaignId = campaign.CampaignId
	AND campaign._DATA_DATE = campaign._LATEST_DATE
JOIN
	`biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer
ON TRUE
	AND customer.ExternalCustomerId = criterion.ExternalCustomerId
	AND customer._LATEST_DATE = customer._DATA_DATE
WHERE TRUE
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND criterion._DATA_DATE = criterion._LATEST_DATE
	AND criterion.isNegative


-- excluded_content_labels
SELECT
	ifnull( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	campaign.CampaignName,
	CAST( settings.CampaignId as STRING ) as CampaignId,
	campaign.CampaignStatus,
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
	AND settings._DATA_DATE = settings._LATEST_DATE
	AND ExcludedContentLabels is not null


-- brackets_in_non_exact
SELECT
	ifnull( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	campaign.CampaignName,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	adgroup.AdGroupName,
	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	keyword.Status,
	keyword.Criteria,
	keyword.KeywordMatchType
FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId
WHERE TRUE 
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND keyword.Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND KeywordMatchType != 'EXACT'
	AND ( REGEXP_CONTAINS( Criteria, '^\\[' ) OR REGEXP_CONTAINS( Criteria, '\\]$' ) )


-- quotes_in_non_phrase
SELECT
	ifnull( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	campaign.CampaignName,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	adgroup.AdGroupName,
	CAST( adgroup.AdGroupId as STRING ) as AdGroupId,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	keyword.Status,
	keyword.Criteria,
	keyword.KeywordMatchType
FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword
JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON campaign.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId
JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer ON customer.ExternalCustomerId = keyword.ExternalCustomerId
JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON adgroup.ExternalCustomerId = keyword.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId
WHERE TRUE 
	AND keyword._LATEST_DATE = keyword._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND keyword.Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	AND KeywordMatchType != 'PHRASE'
	AND ( REGEXP_CONTAINS( Criteria, '^"' ) OR REGEXP_CONTAINS( Criteria, '"$' ) )




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
  
  
  
  
  

 -- shared_negative_keyword_in_ad
SELECT
	CAST( customer.ExternalCustomerId as STRING ) as ExternalCustomerId,
	ifnull( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,
	CampaignName,
	campaign.CampaignStatus,
	adgroup.AdGroupStatus,
	neg.Text as negative_keyword,
	neg.MatchType as negative_match_type,
	ListName as list_name,
	ad.HeadLinePart1,
	ad.HeadLinePart2,
	CAST( campaign.CampaignId as STRING ) as CampaignId,
	CAST( ad.AdGroupId as STRING ) as AdGroupId,
	ad.description
FROM (
	SELECT
		ExternalCustomerId,
		ListId,
		Text,
		MatchType
	FROM `biddy-io.peak_ace_active_clients_transfer.CampaignNegativeListKeywords_1036246249`
	WHERE TRUE
		AND _LATEST_DATE = _DATA_DATE
) as neg
JOIN (
	SELECT
		ExternalCustomerId,
		ListId,
		CampaignId
	FROM `biddy-io.peak_ace_active_clients_transfer.CampaignNegativeListMappings_1036246249`
	WHERE TRUE
		AND _LATEST_DATE = _DATA_DATE
) as list_mapping
	ON list_mapping.ExternalCustomerId = neg.ExternalCustomerId AND list_mapping.ListId = neg.ListId
JOIN (
	SELECT
		ExternalCustomerId,
		ListId,
		ListName
	FROM `biddy-io.peak_ace_active_clients_transfer.CampaignNegativeLists_1036246249`
	WHERE TRUE
		AND _LATEST_DATE = _DATA_DATE
) as neg_list
	ON neg_list.ExternalCustomerId = list_mapping.ExternalCustomerId AND neg_list.ListId = list_mapping.ListId
JOIN (
	SELECT
		ExternalCustomerId,
		CampaignName,
		CampaignId,
		CampaignStatus
	FROM `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249`
	WHERE TRUE
		AND _DATA_DATE = _LATEST_DATE
		AND CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	) as campaign
	ON list_mapping.ExternalCustomerId = campaign.ExternalCustomerId AND list_mapping.CampaignId = campaign.CampaignId
JOIN (
	SELECT
		ExternalCustomerId,
		CampaignId,
		AdGroupId,
		HeadLinePart1,
		HeadLinePart2,
		description
	FROM `biddy-io.peak_ace_active_clients_transfer.Ad_1036246249`
	WHERE TRUE
		AND _DATA_DATE = _LATEST_DATE
		AND Status = 'ENABLED'
	) as ad
	ON ad.ExternalCustomerId = list_mapping.ExternalCustomerId AND ad.CampaignId = list_mapping.CampaignId
JOIN (
	SELECT
		ExternalCustomerId,
		CampaignId,
		AdGroupId,
		AdGroupStatus
	FROM `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249`
	WHERE TRUE
		AND _DATA_DATE = _LATEST_DATE
		AND AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
	) as adgroup
	ON ad.ExternalCustomerId = adgroup.ExternalCustomerId AND ad.CampaignId = adgroup.CampaignId AND ad.AdGroupId = adgroup.AdGroupId
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
	AND (
		FALSE
		OR ( REGEXP_CONTAINS( ad.HeadlinePart1, '{keyWord:.+}' )  )
		OR ( REGEXP_CONTAINS( ad.HeadlinePart1, '{Keyword:.+}' )  )
		OR ( REGEXP_CONTAINS( ad.HeadlinePart1, '{keyword:.+}' )  )
		OR ( REGEXP_CONTAINS( ad.HeadlinePart2, '{keyWord:.+}' )  )
		OR ( REGEXP_CONTAINS( ad.HeadlinePart2, '{Keyword:.+}' )  )
		OR ( REGEXP_CONTAINS( ad.HeadlinePart2, '{keyword:.+}' )  )
		OR ( REGEXP_CONTAINS( ad.Description, '{keyWord:.+}' )  )
		OR ( REGEXP_CONTAINS( ad.Description, '{Keyword:.+}' )  )
		OR ( REGEXP_CONTAINS( ad.Description, '{keyword:.+}' )  )
	)
	AND ad._LATEST_DATE = ad._DATA_DATE
	AND campaign._LATEST_DATE = campaign._DATA_DATE
	AND customer._LATEST_DATE = customer._DATA_DATE
	AND adgroup._LATEST_DATE = adgroup._DATA_DATE
	AND ad.Status IN ( 'ENABLED', 'PAUSED' )
	AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
	AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )





-- ds_ad
SELECT *, 'last_char_is_not_special' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2ad_last_char_is_not_special`
UNION ALL
SELECT *, 'ad_duplicate_special_chars_in_description' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2ad_duplicate_special_chars_in_description`
UNION ALL
SELECT *, 'ad_too_short_description' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2ad_too_short_description`
UNION ALL
SELECT *, 'ad_too_short_headline' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2ad_too_short_headline`
UNION ALL
SELECT *, 'ad_path2_missing_in_non_brand_campaign' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2ad_path2_missing_in_non_brand_campaign`
UNION ALL
SELECT *, 'ad_path1_missing_in_non_brand_campaign' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2ad_path1_missing_in_non_brand_campaign`
UNION ALL
SELECT *, 'ad_policy_violation' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2ad_policy_violation`





-- ds_campaign
SELECT *, 'campaign_missing_mobile_bid_modifier' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2campaign_missing_mobile_bid_modifier`
UNION ALL
SELECT *, 'campaign_multi_channel' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2campaign_multi_channel`
UNION ALL
SELECT *, 'campaign_target_and_bid' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2campaign_target_and_bid`
UNION ALL
SELECT *, 'campaign_non_standard_delivery_method' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2campaign_non_standard_delivery_method`
UNION ALL
SELECT *, 'campaign_rotation_type_not_optimized' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2campaign_rotation_type_not_optimized`



-- ds_extension
SELECT *, 'extension_no_site_links' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2extension_no_site_links`
UNION ALL
SELECT *, 'extension_too_few_site_links' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2extension_too_few_site_links`
UNION ALL
SELECT *, 'extension_no_callouts' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2extension_no_callouts`
UNION ALL
SELECT *, 'extension_too_few_callouts' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2extension_too_few_callouts`
UNION ALL
SELECT *, 'extension_no_snippets' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2extension_no_snippets`
UNION ALL
SELECT *, 'extension_too_few_snippets' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2extension_too_few_snippets`
UNION ALL
SELECT *, 'extension_no_messages' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2extension_no_messages`
UNION ALL
SELECT *, 'extension_no_phone_numbers' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2extension_no_phone_numbers`
UNION ALL
SELECT *, 'extension_no_mobile_apps' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2extension_no_mobile_apps`







-- ds_keyword
SELECT *, 'keyword_target_url_multiple_question_marks' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2keyword_target_url_multiple_question_marks`
UNION ALL
SELECT *, 'keyword_target_url_missing' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2keyword_target_url_missing`
UNION ALL
SELECT *, 'keyword_campaign_match_type_mismatch' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2keyword_campaign_match_type_mismatch`
UNION ALL
SELECT *, 'keyword_adgroup_match_type_mismatch' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2keyword_adgroup_match_type_mismatch`
UNION ALL
SELECT *, 'keyword_contains_dot' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2keyword_contains_dot`
UNION ALL
SELECT *, 'keyword_contains_capital' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2keyword_contains_capital`
UNION ALL
SELECT *, 'keyword_contains_dash' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2keyword_contains_dash`
UNION ALL
SELECT *, 'keyword_wrongly_modified_broad' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2keyword_wrongly_modified_broad`
UNION ALL
SELECT *, 'keyword_duplicate_bmm_fragments' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2keyword_duplicate_bmm_fragments`
UNION ALL
SELECT *, 'keyword_plus_in_non_broad' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2keyword_plus_in_non_broad`
UNION ALL
SELECT *, 'keyword_partly_modified_broad' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2keyword_partly_modified_broad`
UNION ALL
SELECT *, 'keyword_unmodified_broad' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2keyword_unmodified_broad`
UNION ALL
SELECT *, 'keyword_session_id_in_url' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2keyword_session_id_in_url`
UNION ALL
SELECT *, 'keyword_modified_negative' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2keyword_modified_negative`





-- ds_adgroup
SELECT *, 'adgroup_no_keywords' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2adgroup_no_keywords`
UNION ALL
SELECT *, 'adgroup_no_active_keywords' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2adgroup_no_active_keywords`
UNION ALL
SELECT *, 'adgroup_too_many_exact_keywords' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2adgroup_too_many_exact_keywords`
UNION ALL
SELECT *, 'adgroup_no_negative_keywords_in_broad_adgroup' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2adgroup_no_negative_keywords_in_broad_adgroup`
UNION ALL
SELECT *, 'adgroup_too_many_broad_keywords' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2adgroup_too_many_broad_keywords`
UNION ALL
SELECT *, 'adgroup_no_etas' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2adgroup_no_etas`
UNION ALL
SELECT *, 'adgroup_too_few_etas' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2adgroup_too_few_etas`
UNION ALL
SELECT *, 'adgroup_too_many_active_etas' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2adgroup_too_many_active_etas`
UNION ALL
SELECT *, 'adgroup_no_dsa' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2adgroup_no_dsa`
UNION ALL
SELECT *, 'adgroup_too_few_dsa' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2adgroup_too_few_dsa`
UNION ALL
SELECT *, 'adgroup_too_many_dsa' as pitfall
FROM `biddy-io.peak_ace_active_clients_transfer.2adgroup_too_many_dsa`












