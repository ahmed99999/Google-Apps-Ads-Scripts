WITH a as (
    SELECT
		a.ExternalCustomerId,
		a.CampaignId,
		a.AdGroupId,
		SUM( a.Cost / 1000000 ) AS ad_group_cost
    FROM `biddy-io.casumo_transfer_service.AdGroupBasicStats_6658020822` AS a
    WHERE TRUE
		AND DATE_DIFF(a._LATEST_DATE, a._DATA_DATE, DAY) <= 30
		AND DATE_DIFF(a._LATEST_DATE, a._DATA_DATE, DAY) > 1
    GROUP BY
		a.ExternalCustomerId,
		a.CampaignId,
		a.AdGroupId
  )
, c AS
(	SELECT
		ExternalCustomerId,
		c.CampaignId,
		SUM( c.Cost / 1000000 ) as campaign_cost
	FROM `biddy-io.casumo_transfer_service.CampaignBasicStats_6658020822` AS c
	WHERE TRUE
		AND DATE_DIFF(c._LATEST_DATE, c._DATA_DATE, DAY) <= 30
		AND DATE_DIFF(c._LATEST_DATE, c._DATA_DATE, DAY) > 1
	GROUP BY
		c.ExternalCustomerId,
		c.CampaignId
)
, d AS 
(	SELECT
		d.ExternalCustomerId,
		d.CampaignId,
		d.AdGroupId,
		SUM( d.Cost / 1000000 ) AS ad_group_cost
	FROM `biddy-io.casumo_transfer_service.AdGroupBasicStats_6658020822` AS d
	WHERE TRUE
		AND d._DATA_DATE = _LATEST_DATE
	GROUP BY
		d.ExternalCustomerId,
		d.CampaignId,
		d.AdGroupId
)
, b AS
( SELECT
		ExternalCustomerId,
		b.CampaignId,
		SUM( b.Cost / 1000000 ) as campaign_cost
	FROM `biddy-io.casumo_transfer_service.CampaignBasicStats_6658020822` AS b
	WHERE TRUE
		AND b._DATA_DATE = _LATEST_DATE
	GROUP BY
		b.ExternalCustomerId,
		b.CampaignId
)
SELECT
  a.ExternalCustomerId,
  a.CampaignId,
  a.AdGroupId,
  a.ad_group_cost,
  c.campaign_cost,
  round( a.ad_group_cost / greatest( c.campaign_cost, 1 ), 2 ) as cost_ratio
FROM a
JOIN c
ON TRUE
  AND a.ExternalCustomerId = c.ExternalCustomerId
  AND a.CampaignId = c.CampaignId
	UNION ALL
	( SELECT
			d.ExternalCustomerId,
			d.CampaignId,
			d.AdGroupId,
			d.ad_group_cost,
			b.campaign_cost,
			round( d.ad_group_cost / greatest( b.campaign_cost, 1 ), 2 ) as last_cost_ratio
		FROM d
		JOIN b
		ON TRUE
			AND d.ExternalCustomerId = b.ExternalCustomerId
			AND d.CampaignId = b.CampaignId
		)
-- AND round( d.ad_group_cost / greatest( b.campaign_cost, 1 ), 2 ) = round( a.ad_group_cost / greatest( c.campaign_cost, 1 ), 2 ) + 0.1
