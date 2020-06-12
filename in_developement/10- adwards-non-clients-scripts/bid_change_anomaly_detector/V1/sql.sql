SELECT
	ExternalCustomerId,
	AccountName,
	count(*) as count_all,
	sum( is_changed ) as count_changed
FROM (
	SELECT
		customer.ExternalCustomerId,
		ifnull( CustomerDescriptiveName,  AccountDescriptiveName ) as AccountName,  
		x.Criteria,
		( cast ( REGEXP_REPLACE( REGEXP_REPLACE( y.CpcBid, 'auto: ', '' ), 'auto', '' ) AS INT64 ) ) / 1000000 as old_bid,
		( cast ( REGEXP_REPLACE( REGEXP_REPLACE( x.CpcBid, 'auto: ', '' ), 'auto', '' ) AS INT64 ) ) / 1000000 as new_bid,
		--y._DATA_DATE as old_bid_date,
		--x._DATA_DATE as new_bid_date,
		cast( ( y.CpcBid != x.CpcBid ) AS INT64 ) as is_changed
	FROM (
		SELECT
			keyword.*
		FROM `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as keyword
		JOIN `biddy-io.peak_ace_active_clients_transfer.Campaign_1036246249` as campaign ON keyword.ExternalCustomerId = campaign.ExternalCustomerId AND keyword.CampaignId = campaign.CampaignId
		JOIN `biddy-io.peak_ace_active_clients_transfer.AdGroup_1036246249` as adgroup ON keyword.ExternalCustomerId = adgroup.ExternalCustomerId AND keyword.CampaignId = adgroup.CampaignId AND keyword.AdGroupId = adgroup.AdGroupId
		WHERE keyword._DATA_DATE = keyword._LATEST_DATE
			AND NOT keyword.IsNegative
			AND keyword.Status = 'ENABLED'
			AND campaign.CampaignStatus = 'ENABLED'
			AND campaign._LATEST_DATE = campaign._DATA_DATE
			AND adgroup._LATEST_DATE = adgroup._DATA_DATE
			AND adgroup.AdGroupStatus = 'ENABLED'
	) AS x
	JOIN `biddy-io.peak_ace_active_clients_transfer.Customer_1036246249` as customer
		ON x.ExternalCustomerId = customer.ExternalCustomerId
		AND customer._LATEST_DATE = customer._DATA_DATE
	JOIN `biddy-io.peak_ace_active_clients_transfer.Keyword_1036246249` as y
		ON y._DATA_DATE = DATE_SUB( y._LATEST_DATE, INTERVAL 1 DAY )
		AND x.ExternalCustomerId = y.ExternalCustomerId
		AND x.CampaignId = y.CampaignId
		AND x.AdGroupId = y.AdGroupId
		AND x. CriterionId = y. CriterionId
		AND NOT y.IsNegative
		AND y.Status IN ( 'ENABLED' )
		--AND y.CpcBid != x.CpcBid
	WHERE TRUE
		--AND x.ExternalCustomerId = 7056468392
)
GROUP BY AccountName, ExternalCustomerId




