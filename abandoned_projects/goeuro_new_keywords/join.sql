

CREATE TEMPORARY FUNCTION encodeURIComponent(str STRING)
RETURNS STRING
LANGUAGE js AS """
	return encodeURIComponent( str )
	""";
SELECT
	customer.CustomerDescriptiveName,
	campaign.CampaignName,
	adgroup.AdGroupName,
	criteria.Criteria,
	criteria.finalUrls,
	CONCAT(
		'https://www.goeuro.',
		LOWER( domain ),
		CASE
			WHEN SPLIT( route_type, '.' )[OFFSET(0)] = '0' THEN
				CONCAT(
					'/?departure_fk=',
					CAST( departure_position_id AS STRING )
				)
			ELSE
				CONCAT( '/lps/',
						LOWER( -- keyword
							CONCAT(
								CASE WHEN vertical_presence = 'with_vertical' THEN keyword_variation ELSE '' END
								,
								CASE
									WHEN SPLIT( route_type, '.' )[OFFSET(0)] IN ( 'I' ) THEN -- , '0'
										CONCAT( '_', departure_city_name ) -- TODO: Leerzeichen entfernen?
									ELSE ''
								END
								,
								CASE
									WHEN SPLIT( route_type, '.' )[OFFSET(0)] IN ( 'I', 'II' ) THEN
										CONCAT( '_', arrival_city_name ) -- TODO: Leerzeichen entfernen?
									ELSE ''
								END
							)
						),
						'?id=',
						TO_BASE64(
							CODE_POINTS_TO_BYTES(
								TO_CODE_POINTS(
									CASE
										WHEN SPLIT( route_type, '.' )[OFFSET(0)] = 'II' -- to
											THEN
												CONCAT(
													CASE WHEN vertical_presence = 'with_vertical'
														THEN 'mode_to_position_page'
														ELSE 'to_location_page'
													END,
													'.',
													LOWER( domain ), -- domain or language?
													CASE WHEN vertical_presence = 'with_vertical'
														THEN CONCAT( '.', LOWER( travel_mode ) )
														ELSE ''
													END,
													'.',
													CAST( arrival_position_id AS STRING )
												)
											ELSE -- from-to
												CONCAT(
													CASE WHEN vertical_presence = 'with_vertical'
														THEN 'connection_page'
														ELSE 'connection_page_nt'
													END,
													'.',
													LOWER( domain ), -- domain or language?
													CASE WHEN vertical_presence = 'with_vertical'
														THEN CONCAT( '.', LOWER( travel_mode ) )
														ELSE ''
													END,
													'.',
													CAST( departure_position_id AS STRING ),
													'.',
													CAST( arrival_position_id AS STRING )
												)
									END
								)
							)
						)
				)
		END,
		'&utm_source=',
			'google',
		'&utm_medium=',
			'cpc',
		'&utm_campaign=',
			encodeURIComponent( campaign.CampaignName ),
		'&utm_term=',
			REGEXP_REPLACE( encodeURIComponent( keyword ), '%20', '+' ),
		'&adgroup=',
			encodeURIComponent( adgroup.AdGroupName ),
		'&campaignid=',
			CAST( campaign.CampaignId AS STRING ),
		'&adgroupid=',
			CAST( adgroup.AdGroupId AS STRING ),
		'&keywordid=',
			CAST( criteria.CriterionId AS STRING ),
		'&content=',
			'basic',
		CASE
			WHEN SPLIT( route_type, '.' )[OFFSET(0)] != '0' THEN
				CONCAT(
					'&h=',
					TO_BASE64(
						CODE_POINTS_TO_BYTES(
							TO_CODE_POINTS(
								LOWER(
									CONCAT(
										'lps.h.sem.',
										SPLIT( route_type, '.' )[OFFSET(0)],
										'.',
										CASE WHEN vertical_presence = 'with_vertical' THEN keyword_variation_code ELSE 'wv_01' END,
										'_rou.__.'
									)
								)
							)
						)
					)
				)
			ELSE
				''
		END
	) AS url
FROM `biddy-io.goeuro_transferservice.results_found_in_adwords` as x
JOIN ( SELECT 'with_vertical' AS vertical_presence UNION ALL SELECT 'without_vertical' ) AS vertical_presence1 ON TRUE
JOIN `biddy-io.goeuro_transferservice.Campaign_1154727861` as campaign
  ON  campaign.CampaignStatus = 'ENABLED'
  AND campaign.CampaignName = x.Campaign
JOIN `biddy-io.goeuro_transferservice.AdGroup_1154727861` as adgroup
  ON  campaign.ExternalCustomerId = adgroup.ExternalCustomerId 
  AND campaign.CampaignId = adgroup.CampaignId
  AND x.Ad_Group = adgroup.AdGroupName
  AND adgroup._LATEST_DATE = adgroup._DATA_DATE
JOIN `biddy-io.goeuro_transferservice.Criteria_1154727861` as criteria
  ON  criteria.ExternalCustomerId = campaign.ExternalCustomerId
  AND criteria.CampaignId = campaign.CampaignId
  AND criteria._LATEST_DATE = criteria._DATA_DATE
  AND criteria.AdGroupId = adgroup.AdGroupId
  AND x.Keyword = criteria.Criteria
JOIN `biddy-io.goeuro_transferservice.Customer_1154727861` as customer
  ON  campaign.ExternalCustomerId = customer.ExternalCustomerId 
  AND customer._LATEST_DATE = customer._DATA_DATE
WHERE TRUE
  AND campaign._LATEST_DATE = campaign._DATA_DATE
  AND adgroup.AdGroupStatus = 'ENABLED'
  AND criteria.Status = 'ENABLED'
  AND NOT IsNegative
  AND CustomerDescriptiveName = 'DE-SEM-Train'




