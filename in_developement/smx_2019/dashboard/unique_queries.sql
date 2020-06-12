SELECT
	x.*,
	y.CountUniqueQueries
FROM (
	SELECT
	  AccountName,
	  CampaignName,
	  AdGroupName,
	  Keyword,
	  KeywordMatchType,
	  Date,
	  Count(*) AS countQueries
	FROM (
	  SELECT
		ifnull( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,
		campaign.CampaignName CampaignName,
		adgroup.AdGroupName as AdGroupName,
		keyword1.Criteria AS Keyword,
		KeywordMatchType,
		Query,
		sq.Date
	  FROM `biddy-io.peak_ace_active_clients_transfer.SearchQueryStats_1036246249` AS sq
	  JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` AS campaign
		ON campaign.ExternalCustomerId = sq.ExternalCustomerId
		AND sq.CampaignId = campaign.CampaignId
	  JOIN`biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer
		ON customer.ExternalCustomerId = sq.ExternalCustomerId
	  JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` AS adgroup
		ON adgroup.ExternalCustomerId = sq.ExternalCustomerId
		AND sq.CampaignId = adgroup.CampaignId
		AND sq.AdGroupId = adgroup.AdGroupId
	  JOIN `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` AS keyword1
		ON keyword1.ExternalCustomerId = sq.ExternalCustomerId
		AND keyword1.CampaignId = sq.CampaignId
		AND keyword1.AdGroupId = sq.AdGroupId
		AND keyword1.CriterionId = sq.CriterionId
	  WHERE
		TRUE
		AND LENGTH( Query ) < 80
		AND sq.ExternalCustomerId = 7056468392
		AND ( campaign.EndDate IS NULL OR campaign.EndDate >= CURRENT_DATE( 'Europe/Berlin' ) )
		AND campaign.CampaignStatus IN ( 'ENABLED', 'PAUSED' )
		AND adgroup.AdGroupStatus IN ( 'ENABLED', 'PAUSED' )
		AND keyword1.Status IN ( 'ENABLED', 'PAUSED' )
		AND NOT keyword1.IsNegative
		AND customer._LATEST_DATE = customer._DATA_DATE
		AND campaign._LATEST_DATE = campaign._DATA_DATE
		AND adgroup._LATEST_DATE = adgroup._DATA_DATE
		AND keyword1._LATEST_DATE = keyword1._DATA_DATE
		AND DATE_DIFF( sq._LATEST_DATE, sq.Date, DAY ) <= 365
	  GROUP BY
		AccountName,
		campaign.CampaignName,
		adgroup.AdGroupName,
		keyword1.Criteria,
		KeywordMatchType,
		sq.Date,
		sq.Query
	)
	GROUP BY
	  AccountName,
	  CampaignName,
	  AdGroupName,
	  KeywordMatchType,
	  Keyword,
	  Date
	ORDER BY
	  countQueries DESC,
	  Date,
	  AccountName,
	  CampaignName,
	  AdGroupName,
	  Keyword
) as x
LEFT JOIN (
	SELECT
	  ifnull( CustomerDescriptiveName, AccountDescriptiveName ) AS AccountName,
	  sq.Date,
	  COUNT( DISTINCT Query ) as CountUniqueQueries
	FROM `biddy-io.peak_ace_active_clients_transfer.SearchQueryStats_1036246249` AS sq
	JOIN`biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` AS customer
	  ON customer.ExternalCustomerId = sq.ExternalCustomerId
	WHERE
	  TRUE
	  AND LENGTH( Query ) < 80
	  AND sq.ExternalCustomerId = 7056468392
	  AND customer._LATEST_DATE = customer._DATA_DATE
	  AND DATE_DIFF( sq._LATEST_DATE, sq.Date, DAY ) <= 365
	GROUP BY
	  AccountName,
	  sq.Date
) as y
ON x.AccountName = y.AccountName
	AND x.Date = y.Date

