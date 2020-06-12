
#StandardSQL
SELECT
  AccountDescriptiveName,
  CampaignName,
  settings.DeliveryMethod,
  count( distinct settings.DeliveryMethod ) as count
FROM `biddy-io.transfers_mcc.Campaign_9506228949` as campaign
JOIN `biddy-io.transfers_mcc.Customer_9506228949` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId
LEFT JOIN `biddy-io.transfers_mcc.CampaignSettings_9506228949` as settings
  ON campaign.ExternalCustomerId = settings.ExternalCustomerId
  AND campaign.CampaignId = settings.CampaignId
WHERE TRUE
 --AND AccountDescriptiveName = 'A&O SEM-Account'
  AND customer._LATEST_DATE = customer._DATA_DATE
  AND campaign._LATEST_DATE = campaign._DATA_DATE
	  AND ifnull( settings._LATEST_DATE = settings._DATA_DATE , true )
  --AND CampaignName = 'SUCH + RLSA DE Poshtel'
  --AND campaign.CampaignId = 691310845
  --order by AccountDescriptiveName
GROUP BY AccountDescriptiveName, campaign.campaignName, settings.DeliveryMethod
HAVING count > 0









#StandardSQL
SELECT
  *
FROM `biddy-io.transfers_mcc.CampaignSettings_9506228949` as settings
WHERE TRUE
  AND ExternalCustomerId = 7056468392
  --AND AccountDescriptiveName = 'A&O SEM-Account'
  --AND customer._LATEST_DATE = customer._DATA_DATE
  --AND campaign._LATEST_DATE = campaign._DATA_DATE
  --AND CampaignName = 'SUCH + RLSA DE Poshtel'
  --AND campaign.CampaignId = 691310845
  --order by AccountDescriptiveName
--GROUP BY AccountDescriptiveName, campaign.campaignName, settings.DeliveryMethod
--HAVING count = 0








SELECT
  device,
  sum( airbnb_impressions ) as impressions
FROM [airbnb-sov-dashboard-data:googledata.Airbnb_AuctionInsights] as auction_insights
group by device




SELECT
  device,
  sum( airbnb_impressions ) as impressions
FROM [airbnb-sov-dashboard-data:googledata.Airbnb_AuctionInsights]
WHERE true
  and account_name = 'DEMAND:GER'
  and  domain CONTAINS 'airbnb' -- 'booking.com',
  --and keyword_text = '+accommodation in +greece'
  and week = '2018-04-23'
  --and keyword_text != ''
  --and device = 'ALL'
GROUP BY device
LIMIT 1000





SELECT
  STRFTIME_UTC_USEC( week, '%Y%W' ) as year_week,
  REGEXP_EXTRACT( domain, '([^\\.]+)' ) as sl_domain,
  account_name,
  week,
  sum( average_position * airbnb_impressions ) / sum( airbnb_impressions ) as average_position,
  sum( impression_share * airbnb_impressions ) / sum( airbnb_impressions ) as impression_share,
  sum( top_of_page_rate * airbnb_impressions ) / sum( airbnb_impressions ) as top_of_page_rate,
  sum( airbnb_outranking_share * airbnb_impressions ) / sum( airbnb_impressions ) as airbnb_outranking_share,
  sum( competitor_overlap_rate * airbnb_impressions ) / sum( airbnb_impressions ) as competitor_overlap_rate,
  sum( competitor_above_rate * airbnb_impressions ) / sum( airbnb_impressions ) as competitor_above_rate,
  sum( airbnb_impressions * airbnb_impressions ) / sum( airbnb_impressions ) as airbnb_impressions,
  sum( airbnb_clicks * airbnb_impressions ) / sum( airbnb_impressions ) as airbnb_clicks,
  count(*) as count
FROM [airbnb-sov-dashboard-data:googledata.Airbnb_AuctionInsights] as auction_insights
WHERE true
  AND account_name = 'DEMAND:GER'
GROUP BY year_week, sl_domain, account_name, week
HAVING TRUE
AND sl_domain in (
    SELECT
      sl_domain as domain
    FROM (
      SELECT
        REGEXP_EXTRACT( domain, '([^\\.]+)' ) as sl_domain,
        sum( airbnb_impressions ) as impressions1
      FROM [airbnb-sov-dashboard-data:googledata.Airbnb_AuctionInsights] as x
      WHERE TRUE
        AND account_name = 'DEMAND:GER'
        AND DATEDIFF( CURRENT_DATE(), week ) <= 60
      GROUP BY sl_domain
      ORDER BY impressions1 DESC
      LIMIT 10
    )
  )
--limit 1000




Tablet
ALL
Desktop
HighEndMobile












SELECT *
FROM (
  SELECT
    *,
    campaign_name CONTAINS ':BRD' as brand,
    campaign_name CONTAINS ':DSA' as dsa,
    campaign_name CONTAINS ':COMP' as competitor,
    campaign_name CONTAINS 'Generic' as generic,
    campaign_name CONTAINS ':KW'
      AND NOT campaign_name CONTAINS ':BRD'
      AND NOT campaign_name CONTAINS ':DSA'
      AND NOT campaign_name CONTAINS ':COMP'
      AND NOT campaign_name CONTAINS 'Generic' as non_brand
  FROM (
    SELECT
      account_name,
      campaign_name
    FROM [airbnb-sov-dashboard-data:googledata.Airbnb_AuctionInsights]
    GROUP BY account_name, campaign_name
    ORDER BY account_name, campaign_name
  )
)WHERE TRUE
  AND account_name IN ( 'DEMAND:FRE', 'DEMAND:ENG-UK', 'DEMAND:SPA', 'DEMAND:GER', 'DEMAND:ITA', 'DEMAND:DUT', 'DEMAND:ENG-IRL', 'DEMAND:POR-ROW', 'DEMAND:DAN', 'DEMAND:GRE' )
  --AND brand + dsa + competitor + generic + non_brand > 1
  and non_brand

x







SELECT
	STRFTIME_UTC_USEC( week, '%Y%W' ) as year_week,
	REGEXP_EXTRACT( domain, '([^\\.]+)' ) as sl_domain,
	account_name,
	week,
	CASE WHEN campaign_name CONTAINS ':BRD' THEN 'BRD'
		WHEN campaign_name CONTAINS ':DSA' THEN 'DSA'
		WHEN campaign_name CONTAINS ':COMP' THEN 'COMP'
		WHEN campaign_name CONTAINS 'Generic' THEN 'Generic'
		WHEN campaign_name CONTAINS ':KW'
			AND NOT campaign_name CONTAINS ':BRD'
			AND NOT campaign_name CONTAINS ':DSA'
			AND NOT campaign_name CONTAINS ':COMP'
			AND NOT campaign_name CONTAINS 'Generic' THEN 'Non-Brand'
		ELSE 'No-Category'
	END AS category,
	sum( average_position * airbnb_impressions ) / sum( airbnb_impressions ) as average_position,
	sum( impression_share * airbnb_impressions ) / sum( airbnb_impressions ) as impression_share,
	sum( top_of_page_rate * airbnb_impressions ) / sum( airbnb_impressions ) as top_of_page_rate,
	sum( airbnb_outranking_share * airbnb_impressions ) / sum( airbnb_impressions ) as airbnb_outranking_share,
	sum( competitor_overlap_rate * airbnb_impressions ) / sum( airbnb_impressions ) as competitor_overlap_rate,
	sum( competitor_above_rate * airbnb_impressions ) / sum( airbnb_impressions ) as competitor_above_rate,
	sum( airbnb_impressions ) as airbnb_impressions,
	sum( airbnb_clicks) as airbnb_clicks
FROM [airbnb-sov-dashboard-data:googledata.Airbnb_AuctionInsights] as auction_insights
WHERE true  
GROUP BY year_week, sl_domain, account_name, week, category
HAVING TRUE
	AND sl_domain in (
		SELECT
			sl_domain as domain
		FROM (
			SELECT
				REGEXP_EXTRACT( domain, '([^\\.]+)' ) as sl_domain,
				sum( airbnb_impressions ) as impressions1
			FROM [airbnb-sov-dashboard-data:googledata.Airbnb_AuctionInsights] as x
			WHERE TRUE
				AND DATEDIFF( CURRENT_DATE(), week ) <= 60
			GROUP BY sl_domain
			ORDER BY impressions1 DESC
			LIMIT 10
		)
	)








-- ao_auction_insights
SELECT
  ao.Date,
  ao.customer_name,
  ao.account_name,
  ao.campaign_id,
  ao.campaign_name,
  ao.ad_group_id,
  ao.ad_group_name,
  ao.criterion_id,
  ao.keyword_text,
  ao.device,
  ao.match_type,
  ao.impressions as ao_impressions,
  competitor.Domain,
  ao.impression_share as ao_impr_share,
  competitor.impression_share as competitor_impr_share,
  ao.average_position as ao_average_position,
  competitor.average_position as competitor_average_position,
  ao.top_of_page_rate as ao_top_of_page_rate,
  competitor.overlap_rate as competitor_top_of_page_rate,
  outranking_share,
  position_above_rate
FROM plx.google.aircsv_dremel.advertiser_aohostelshotels.all as ao
JOIN plx.google.aircsv_dremel.competitor_aohostelshotels.all as competitor
  ON TRUE
  AND (
    ao.Date,
    ao.customer_name,
    ao.account_name,
    ao.campaign_id,
    ao.campaign_name,
    ao.ad_group_id,
    ao.ad_group_name,
    ao.criterion_id,
    ao.keyword_text,
    ao.device ) = (
    competitor.Date,
    competitor.customer_name,
    competitor.account_name,
    competitor.campaign_id,
    competitor.campaign_name,
    competitor.ad_group_id,
    competitor.ad_group_name,
    competitor.criterion_id,
    competitor.keyword_text,
    competitor.device
  )
WHERE TRUE
ORDER BY
  ao.Date,
  ao.customer_name,
  ao.account_name,
  ao.campaign_id,
  ao.campaign_name,
  ao.ad_group_id,
  ao.ad_group_name,
  ao.criterion_id,
  ao.keyword_text,
  ao.device 
LIMIT 100












  
-- Campaigns without category
select * from (
  select
    account_name,
    campaign_name,
    CASE WHEN campaign_name CONTAINS ':BRD' THEN 'BRD'
      WHEN campaign_name CONTAINS ':DSA' THEN 'DSA'
      WHEN campaign_name CONTAINS ':COMP' THEN 'COMP'
      WHEN campaign_name CONTAINS 'Generic' THEN 'Generic'
      WHEN campaign_name CONTAINS ':KW'
        AND NOT campaign_name CONTAINS ':BRD'
        AND NOT campaign_name CONTAINS ':DSA'
        AND NOT campaign_name CONTAINS ':COMP'
        AND NOT campaign_name CONTAINS 'Generic' THEN 'Non-Brand'
      ELSE 'No-Category'
    END AS category
  FROM (
    SELECT
      account_name,
      campaign_name
    FROM [airbnb-sov-dashboard-data:googledata.Airbnb_AuctionInsights] as auction_insights
    WHERE TRUE
      AND account_name IN ( 'DEMAND:FRE', 'DEMAND:ENG-UK', 'DEMAND:SPA', 'DEMAND:GER', 'DEMAND:ITA', 'DEMAND:DUT', 'DEMAND:ENG-IRL', 'DEMAND:POR-ROW', 'DEMAND:DAN', 'DEMAND:GRE' )
      AND DATEDIFF( CURRENT_DATE(), week ) <= 12
    GROUP BY account_name,campaign_name
  )
)
WHERE TRUE
  AND category = 'No-Category'
  --AND NOT category = 'BRD'
  --AND NOT category = 'DSA'
  --AND NOT category = 'COMP'
  --AND NOT category = 'Generic'
  --AND NOT category = 'Non-Brand'


  
  5296250242
  3519998675
  
-- campaigns without category From Transfer-Service
select
  account_name,
  campaign_name,
  category,
  date
FROM (
  SELECT
    campaign._LATEST_DATE as date,
    campaign.ExternalCustomerId as account_id,
    AccountDescriptiveName as account_name,
    CampaignName as campaign_name,
    CASE
      WHEN REGEXP_CONTAINS( CampaignName, ':BRD' ) THEN 'BRD'
      WHEN REGEXP_CONTAINS( CampaignName, ':DSA' ) THEN 'DSA'
      WHEN REGEXP_CONTAINS( CampaignName, ':COMP' ) THEN 'COMP'
      WHEN REGEXP_CONTAINS( CampaignName, 'Generic' ) THEN 'Generic'
      WHEN REGEXP_CONTAINS( CampaignName, ':KW' ) THEN 'Non-Brand'
      ELSE 'No-Category'
    END AS category
  FROM `airbnb-sov-dashboard-data.googledata.Campaign_3519998675` as campaign
  JOIN `airbnb-sov-dashboard-data.googledata.Customer_3519998675` as customer ON campaign.ExternalCustomerId = customer.ExternalCustomerId
  WHERE TRUE
    AND campaign.CampaignStatus = 'ENABLED'
    AND campaign._LATEST_DATE = campaign._DATA_DATE
    AND customer._LATEST_DATE = customer._DATA_DATE
    AND AccountDescriptiveName IN ( 'DEMAND:FRE', 'DEMAND:ENG-UK', 'DEMAND:SPA', 'DEMAND:GER', 'DEMAND:ITA', 'DEMAND:DUT', 'DEMAND:ENG-IRL', 'DEMAND:POR-ROW', 'DEMAND:DAN', 'DEMAND:GRE' )
  GROUP BY campaign.ExternalCustomerId, date, account_name, campaign_name, category
)
WHERE TRUE
  AND category = 'No-Category'






