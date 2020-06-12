CREATE TEMPORARY FUNCTION encodeURIComponent(str STRING)
RETURNS STRING
LANGUAGE js AS """
  return encodeURIComponent( str )
  """;
SELECT
	*,
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
								keyword_variation
								,
								CASE
									WHEN SPLIT( route_type, '.' )[OFFSET(0)] IN ( 'I' ) THEN -- , '0'
										CONCAT( '_', departure_city_name )
									ELSE ''
								END
								,
								CASE
									WHEN SPLIT( route_type, '.' )[OFFSET(0)] IN ( 'I', 'II' ) THEN
										CONCAT( '_', arrival_city_name )
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
													'mode_to_position_page.',
													LOWER( domain ), -- domain or language?
													'.',
													LOWER( travel_mode ),
													'.',
													CAST( arrival_position_id AS STRING )
												)
											ELSE -- from-to
												CONCAT(
													'connection_page.',
													LOWER( domain ), -- domain or language?
													'.',
													LOWER( travel_mode ),
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
			encodeURIComponent( Campaign ),
		'&utm_term=',
			encodeURIComponent( REGEXP_REPLACE( keyword, ' ', '+' ) ),
		'&adgroup=',
			encodeURIComponent( Ad_Group ),
		'&campaignid=',
			CAST( CampaignId AS STRING ),
		'&adgroupid=',
			CAST( AdGroupId AS STRING ),
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
										keyword_variation_code,
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
FROM (
	SELECT
		campaign.CampaignId,
		adgroup.AdGroupId,
		--COUNT(*) AS count1,
		departure_city_name,
		arrival_city_name,
		--departure_city_name_original,
		--arrival_city_name_original,
		--language,
		--vertical,
		--SUM( sum_clickout_value ) AS clickout_value,
		--SUM( sum_clickouts ) AS clickouts,
		departure_position_id,
		keyword_variation,
		travel_mode,
		arrival_position_id,
		--campaign_found_in_adwords,
		--adgroup_found_in_adwords,
		--ad_nr,
		keyword_variation_code,
		route_type,
		domain,
		generated_campaign_name as Campaign,
		generated_adgroup_name as Ad_Group,
		CASE
			WHEN match_type = 'E' THEN 'Exact'
			WHEN match_type = 'P' THEN 'Phrase'
			WHEN match_type = 'B' THEN 'Broad'
		END AS Match_Type,
		CASE
			WHEN match_type = 'B' THEN
				LOWER(
					TRIM(
						REGEXP_REPLACE(
							CONCAT(
								' '
								,
								generated_names.keyword_variation
								,
								CASE
									WHEN SPLIT( route_type, '.' )[OFFSET(0)] IN ( 'I', '0' ) THEN
										CONCAT( ' ', departure_city_name )
									ELSE ''
								END
								,
								CASE
									WHEN SPLIT( route_type, '.' )[OFFSET(0)] IN ( 'I', 'II' ) THEN
										CONCAT( ' ', arrival_city_name )
									ELSE ''
								END
							),
							'\\s',
							' +'
						)
					)
				)
			ELSE
				LOWER(
					CONCAT(
						generated_names.keyword_variation
						,
						CASE
							WHEN SPLIT( route_type, '.' )[OFFSET(0)] IN ( 'I', '0' ) THEN
								CONCAT( ' ', departure_city_name )
							ELSE ''
						END
						,
						CASE
							WHEN SPLIT( route_type, '.' )[OFFSET(0)] IN ( 'I', 'II' ) THEN
								CONCAT( ' ', arrival_city_name )
							ELSE ''
						END
					)
				)
		END AS Keyword
	FROM (
		SELECT
			generated_campaign_name in (
				SELECT
					campaign.CampaignName
				FROM `biddy-io.goeuro_transferservice.Campaign_1154727861` AS campaign
			) AS campaign_found_in_adwords,
			generated_adgroup_name in (
				SELECT
					adgroup.AdGroupName
				FROM `biddy-io.goeuro_transferservice.AdGroup_1154727861` AS adgroup
			) AS adgroup_found_in_adwords,
			*
		FROM (
			SELECT
				match_type,
				CASE -- route_type
					WHEN mode = 'both' AND     goeuro.domain = departure_country_code AND     goeuro.domain = arrival_country_code THEN 'I.0'
					WHEN mode = 'both' AND     goeuro.domain = departure_country_code AND NOT goeuro.domain = arrival_country_code THEN 'I.I'
					WHEN mode = 'both' AND NOT goeuro.domain = departure_country_code AND     goeuro.domain = arrival_country_code THEN 'I.II'
					WHEN mode = 'both' AND NOT goeuro.domain = departure_country_code AND NOT goeuro.domain = arrival_country_code THEN 'I.III'
					WHEN mode = 'departure' AND goeuro.domain = departure_country_code THEN '0.0'
					WHEN mode = 'departure' AND NOT goeuro.domain = departure_country_code THEN '0.I'
					WHEN mode = 'arrival' AND goeuro.domain = arrival_country_code THEN 'II.0'
					WHEN mode = 'arrival' AND NOT goeuro.domain = arrival_country_code THEN 'II.I'
				END as route_type,
				CONCAT(
					'DT_',
					'|',
					CASE -- route_type
						WHEN mode = 'both' AND     goeuro.domain = departure_country_code AND     goeuro.domain = arrival_country_code THEN 'I.0'
						WHEN mode = 'both' AND     goeuro.domain = departure_country_code AND NOT goeuro.domain = arrival_country_code THEN 'I.I'
						WHEN mode = 'both' AND NOT goeuro.domain = departure_country_code AND     goeuro.domain = arrival_country_code THEN 'I.II'
						WHEN mode = 'both' AND NOT goeuro.domain = departure_country_code AND NOT goeuro.domain = arrival_country_code THEN 'I.III'
						WHEN mode = 'departure' AND goeuro.domain = departure_country_code THEN '0.0'
						WHEN mode = 'departure' AND NOT goeuro.domain = departure_country_code THEN '0.I'
						WHEN mode = 'arrival' AND goeuro.domain = arrival_country_code THEN 'II.0'
						WHEN mode = 'arrival' AND NOT goeuro.domain = arrival_country_code THEN 'II.I'
					END,
					'[' , keyword_variation_code , '_Rou]',
					CASE WHEN mode IN ( 'both', 'departure' ) THEN
						CASE
							WHEN departure_city_population <= 50000 THEN '50'
							WHEN departure_city_population > 50000 AND departure_city_population <= 100000  THEN '50-100'
							WHEN departure_city_population > 100000 AND departure_city_population <= 500000  THEN '100-500'
							WHEN departure_city_population > 500000 THEN '500'
						END
						ELSE ''
					END,
					'|',
					CASE WHEN mode IN ( 'both', 'arrival' ) THEN
						case
							WHEN arrival_city_population <= 50000 THEN '50'
							WHEN arrival_city_population > 50000 AND arrival_city_population <= 100000  THEN '50-100'
							WHEN arrival_city_population > 100000 AND arrival_city_population <= 500000  THEN '100-500'
							WHEN arrival_city_population > 500000 THEN '500'
						END
						ELSE ''
					END,
					'|',
					lang_domain.language,
					'_',
					goeuro.domain,
					':',
					keyword_variation
				) AS generated_campaign_name,
				CONCAT(
					'DT_',
					'|',
					keyword_variation_code,
					'_Rou|__|',
					CONCAT(
						CASE
							WHEN mode IN ( 'departure', 'both' ) THEN
								CONCAT(
									UPPER(
										SUBSTR(
											departure_location_names.city_name,
											0,
											1
										)
									),
									SUBSTR(
										departure_location_names.city_name,
										2
									)
								)
							ELSE ''
						END,
						'_',
						CASE
							WHEN mode IN ( 'departure', 'both' ) THEN
								CAST( departure_position_id AS STRING )
							ELSE ''
						END,
						'_',
						CASE
							WHEN mode IN ( 'departure', 'both' ) THEN
								departure_country_code
							ELSE ''
						END
					),
					'|',
					CONCAT(
						CASE
							WHEN mode IN ( 'arrival', 'both' ) THEN
								CONCAT(
									UPPER(
										SUBSTR(
											arrival_location_names.city_name,
											0,
											1
										)
									),
									SUBSTR(
										arrival_location_names.city_name,
										2
									)
								)
							ELSE ''
						END,
						'_',
						CASE
							WHEN mode IN ( 'arrival', 'both' ) THEN
								CAST( arrival_position_id AS STRING )
							ELSE ''
						END,
						'_',
						CASE
							WHEN mode IN ( 'arrival', 'both' ) THEN
								arrival_country_code
							ELSE ''
						END
					),
					--CASE
					--	WHEN
					--		mode IN ( 'arrival', 'both' )
					--	THEN
					--		CONCAT( CONCAT( UPPER( SUBSTR( arrival_location_names.city_name, 0, 1 ) ), SUBSTR( arrival_location_names.city_name, 2 ) ) , '_' , CAST( arrival_position_id AS STRING ) , '_' , arrival_country_code )
					--	ELSE ''
					--END,
					'|',
					CASE
						WHEN
							mode IN ( 'both' )
						THEN
							CAST( ROUND( distance_km ) AS STRING )
						ELSE ''
					END,
					'|',
					lang_domain.language,
					'_',
					goeuro.domain,
					'|',
					match_type,
					'|'
				) AS generated_adgroup_name,
				--CONCAT( departure_location_names.city_name , '_' , CAST( departure_position_id AS STRING ) , '_' , departure_country_code ) AS departure_city_and_id,
				--CONCAT( arrival_location_names.city_name , '_' , CAST( arrival_position_id AS STRING ) , '_' , arrival_country_code ) AS arrival_city_and_id,
				CONCAT( UPPER( SUBSTR( departure_location_names.city_name, 0, 1 ) ), SUBSTR( departure_location_names.city_name, 2 ) ) as departure_city_name,
				CONCAT( UPPER( SUBSTR( arrival_location_names.city_name, 0, 1 ) ), SUBSTR( arrival_location_names.city_name, 2 ) ) as arrival_city_name,
				goeuro.departure_city_name as departure_city_name_original,
				goeuro.arrival_city_name as arrival_city_name_original,
				CASE
					WHEN departure_city_population <= 50000 THEN '50'
					WHEN departure_city_population > 50000 AND departure_city_population <= 100000  THEN '50-100'
					WHEN departure_city_population > 100000 AND departure_city_population <= 500000  THEN '100-500'
					WHEN departure_city_population > 500000 THEN '500'
				END AS departure_city_population_bucket,
				CASE
					WHEN arrival_city_population <= 50000 THEN '50'
					WHEN arrival_city_population > 50000 AND arrival_city_population <= 100000  THEN '50-100'
					WHEN arrival_city_population > 100000 AND arrival_city_population <= 500000  THEN '100-500'
					WHEN arrival_city_population > 500000 THEN '500'
				END AS arrival_city_population_bucket,
				CONCAT( UPPER( SUBSTR( travel_mode, 0, 1 ) ), SUBSTR( travel_mode, 2 ) ) AS vertical,
				travel_mode,
				keyword_variation,
				keyword_variation_code,
				--goeuro.*,
				goeuro.domain,
				sum_clickout_value,
				sum_clickouts,
				lang_domain.language,
				departure_position_id,
				arrival_position_id,
				ad_nr
			FROM (
				SELECT
					UPPER( SUBSTR( REGEXP_EXTRACT( frontend_domain, '-[A-za-z]+$' ), 2 ) ) AS domain,
					*
				FROM `biddy-io.goeuro_transferservice.redshift_1` AS goeuro
				WHERE TRUE
					AND sum_clickouts > 25
			) AS goeuro
			JOIN ( select 'both' AS mode union all select 'departure' union all select 'arrival' ) AS mode1 ON TRUE
			LEFT JOIN ( -- lang_domain
				SELECT
					SPLIT( SPLIT( CampaignName, '|' )[OFFSET(3)], '_' )[OFFSET(0)] AS language,
					SPLIT( SPLIT( SPLIT( CampaignName, '|' )[OFFSET(3)], '_' )[OFFSET(1)], ':' )[OFFSET(0)] AS domain
				FROM `biddy-io.goeuro_transferservice.Campaign_1154727861` AS campaign
				LEFT JOIN `biddy-io.goeuro_transferservice.Customer_1154727861` AS account ON campaign.ExternalCustomerId = account.ExternalCustomerId
				WHERE TRUE
					AND ARRAY_LENGTH( SPLIT( SPLIT( SPLIT( CampaignName, '|')[OFFSET(1)], '_')[OFFSET(0)], '[' ) ) >= 2 -- exclude test campaigns (about 5 rows)
					AND ARRAY_LENGTH( SPLIT( SPLIT( CampaignName, '|' )[OFFSET(1)], '_' ) ) = 3 -- exclude campaigns with missing "Rou" part ( 112 rows )
					AND ARRAY_LENGTH( SPLIT( SPLIT( CampaignName, '|' )[OFFSET(3)], '_' ) ) = 2 -- exclude campaigns without domain (671 rows)
					--AND               SPLIT( SPLIT( SPLIT( CampaignName, '|')[OFFSET(1)], '_')[OFFSET(0)], '[' )[OFFSET(1)] = 'Train'
					AND CampaignStatus = 'ENABLED'
					AND SUBSTR( account.AccountDescriptiveName, 0, 2 ) = SPLIT( SPLIT( SPLIT( CampaignName, '|' )[OFFSET(3)], '_' )[OFFSET(1)], ':' )[OFFSET(0)]
					AND SUBSTR( CampaignName, 0, 3 ) = 'DT_'
				GROUP BY
					language,
					domain
				HAVING TRUE
			) AS lang_domain ON TRUE
				AND lang_domain.domain = goeuro.domain
			LEFT JOIN `biddy-io.goeuro_transferservice.goeuro_location_names` AS departure_location_names
				ON departure_location_names._position_id_ = departure_position_id
				AND departure_location_names.lang = LOWER( language )
			LEFT JOIN `biddy-io.goeuro_transferservice.goeuro_location_names` AS arrival_location_names
				ON arrival_location_names._position_id_ = arrival_position_id
				AND arrival_location_names.lang = LOWER( language )
			JOIN (
				SELECT 'DE' AS lang, 'Bus_01' AS keyword_variation_code, 'Fernbus' AS keyword_variation
				UNION ALL SELECT 'DE','Bus_02','Bus'
				UNION ALL SELECT 'DE','Train_01','Zug'
				UNION ALL SELECT 'DE','Train_02','Bahn'
				UNION ALL SELECT 'DE','Train_05','SBB'
				UNION ALL SELECT 'ES','Bus_01','Bus'
				UNION ALL SELECT 'ES','Bus_02','Autobús'
				UNION ALL SELECT 'ES','Bus_03','Autocar'
				UNION ALL SELECT 'ES','Bus_04','Micro'
				UNION ALL SELECT 'ES','Bus_05','Omnibus'
				UNION ALL SELECT 'ES','Bus_06','Colectivo'
				UNION ALL SELECT 'ES','Bus_07','Autobus nocturno'
				UNION ALL SELECT 'ES','Bus_08','Bus nocturno'
				UNION ALL SELECT 'ES','Bus_09','Alsa'
				UNION ALL SELECT 'ES','Bus_10','Avanzabus'
				UNION ALL SELECT 'ES','Bus_11','Camiones'
				UNION ALL SELECT 'ES','Train_01','Tren'
				UNION ALL SELECT 'ES','Train_02','Ave'
				UNION ALL SELECT 'ES','Train_03','Tren Ave'
				UNION ALL SELECT 'ES','Train_04','Renfe'
				UNION ALL SELECT 'ES','Train_05','Renfe Ave'
				UNION ALL SELECT 'ES','Train_06','Talgo'
				UNION ALL SELECT 'ES','Train_07','Tgv'
				UNION ALL SELECT 'ES','Train_08','Tren tgv'
				UNION ALL SELECT 'ES','Train_09','Avant'
				UNION ALL SELECT 'ES','Train_10','Feve'
				UNION ALL SELECT 'FR','Bus_01','Bus'
				UNION ALL SELECT 'FR','Bus_02','Autobus'
				UNION ALL SELECT 'FR','Bus_03','Car'
				UNION ALL SELECT 'FR','Bus_04','Idbus'
				UNION ALL SELECT 'FR','Bus_05','Bus de nuit'
				UNION ALL SELECT 'FR','Bus_06','Autocar'
				UNION ALL SELECT 'FR','Train_01','Train'
				UNION ALL SELECT 'FR','Train_02','TGV'
				UNION ALL SELECT 'FR','Train_03','SNCF'
				UNION ALL SELECT 'FR','Train_04','Renfe'
				UNION ALL SELECT 'FR','Train_05','Eurostar'
				UNION ALL SELECT 'FR','Train_06','Thello'
				UNION ALL SELECT 'FR','Train_07','Thalys'
				UNION ALL SELECT 'FR','Train_08','Train de nuit'
				UNION ALL SELECT 'FR','Train_09','Train Sncf'
				UNION ALL SELECT 'FR','Train_10','Ouigo'
				UNION ALL SELECT 'FR','Train_11','Ter'
				UNION ALL SELECT 'FR','Train_12','Italo'
				UNION ALL SELECT 'FR','Train_13','Trenitalia'
				UNION ALL SELECT 'PL','Bus_01','Bus'
				UNION ALL SELECT 'PL','Bus_02','Autobus'
				UNION ALL SELECT 'PL','Bus_03','Pks'
				UNION ALL SELECT 'PL','Bus_04','Autokar'
				UNION ALL SELECT 'PL','Train_01','Pociąg'
				UNION ALL SELECT 'PL','Train_02','PKP'
				UNION ALL SELECT 'PL','Train_03','Pendolino'
				UNION ALL SELECT 'IT','Bus_01','Autobus'
				UNION ALL SELECT 'IT','Bus_02','Pullman'
				UNION ALL SELECT 'IT','Bus_03','Bus'
				UNION ALL SELECT 'IT','Bus_04','Navetta'
				UNION ALL SELECT 'IT','Bus_05','Corriera'
				UNION ALL SELECT 'IT','Train_01','Treno'
				UNION ALL SELECT 'IT','Train_02','Freccia rossa'
				UNION ALL SELECT 'IT','Train_03','Frecce'
				UNION ALL SELECT 'IT','Train_04','Treno frecciarossa'
				UNION ALL SELECT 'IT','Train_05','Ferrovie'
				UNION ALL SELECT 'IT','Train_06','Tgv'
				UNION ALL SELECT 'IT','Train_07','Treno frecce'
				UNION ALL SELECT 'IT','Train_08','Treno ave'
				UNION ALL SELECT 'IT','Train_09','Treno tgv'
				UNION ALL SELECT 'IT','Train_10','Sncf'
				UNION ALL SELECT 'IT','Train_11','Trenitalia'
			) AS keyword_variations
			ON TRUE
				AND keyword_variations.lang = lang_domain.language
				AND SPLIT( keyword_variations.keyword_variation_code, '_' )[OFFSET(0)] = CONCAT( UPPER( SUBSTR( travel_mode, 0, 1 ) ), SUBSTR( travel_mode, 2 ) )
			--JOIN ( -- keyword_variations
			--	SELECT
			--		account.AccountDescriptiveName AS account_name,
			--		CONCAT( SPLIT( SPLIT( SPLIT( CampaignName, '|' )[OFFSET(1)], '_' )[OFFSET(0)], '[' )[OFFSET(1)] , '_' , SPLIT( SPLIT( CampaignName, '|' )[OFFSET(1)], '_' )[OFFSET(1)] ) as keyword_variation_code,
			--		SPLIT( SPLIT( CampaignName, '|' )[OFFSET(3)], '_' )[OFFSET(0)] AS language,
			--		SPLIT( SPLIT( SPLIT( CampaignName, '|' )[OFFSET(3)], '_' )[OFFSET(1)], ':' )[OFFSET(1)] AS keyword_variation
			--	FROM `biddy-io.goeuro_transferservice.Campaign_1154727861` AS campaign
			--	LEFT JOIN `biddy-io.goeuro_transferservice.Customer_1154727861` AS account ON campaign.ExternalCustomerId = account.ExternalCustomerId
			--	WHERE TRUE
			--		AND ARRAY_LENGTH( SPLIT( SPLIT( SPLIT( CampaignName, '|')[OFFSET(1)], '_')[OFFSET(0)], '[' ) ) >= 2 -- exclude test campaigns (about 5 rows)
			--		AND ARRAY_LENGTH( SPLIT( SPLIT( CampaignName, '|' )[OFFSET(1)], '_' ) ) = 3 -- exclude campaigns with missing "Rou" part ( 112 rows )
			--		AND ARRAY_LENGTH( SPLIT( SPLIT( CampaignName, '|' )[OFFSET(3)], '_' ) ) = 2 -- exclude campaigns without domain (671 rows)
			--		AND CampaignStatus = 'ENABLED'
			--		AND SUBSTR( CampaignName, 0, 3 ) = 'DT_'
			--	GROUP BY
			--		account_name,
			--		keyword_variation_code,
			--		language,
			--		keyword_variation
			--	HAVING TRUE
			--) AS keyword_variations
			--ON TRUE
			--	AND keyword_variations.account_name = CONCAT( goeuro.domain , '-SEM-', CONCAT( UPPER( SUBSTR( travel_mode, 0, 1 ) ), SUBSTR( travel_mode, 2 ) ) )
			--	AND keyword_variations.language = lang_domain.language
			JOIN ( SELECT 'E' AS match_type UNION ALL SELECT 'P' UNION ALL SELECT 'B' ) AS match_type1 ON TRUE
			JOIN ( SELECT 1 AS ad_nr UNION ALL SELECT 2 UNION ALL SELECT 3 UNION ALL SELECT 4 ) AS ad_nr1 ON TRUE
			WHERE
		  ( keyword_variations.keyword_variation != 'Zug'
			OR ( 'DE' != departure_country_code AND 'DE' != arrival_country_code )
		   )
			-- "Zug" is not allowed in germany due to contracts
		) AS goeuro_extract
	) AS generated_names
) AS generated_names2
WHERE TRUE
GROUP BY
	generated_campaign_name,
	generated_adgroup_name,
	campaign_found_in_adwords,
	adgroup_found_in_adwords,
	departure_city_name,
	arrival_city_name,
	departure_city_name_original,
	arrival_city_name_original,
	keyword_variation,
	keyword_variation_code,
	generated_names.match_type,
	route_type,
	departure_position_id,
	arrival_position_id,
	vertical,
	domain,
	language,
	travel_mode,
	ad_nr
HAVING TRUE
	AND generated_adgroup_name IS NOT NULL
	AND vertical IN ( 'Bus', 'Train' )
	--AND description IS NOT NULL
	AND NOT adgroup_found_in_adwords
	--AND Ad_Group = 'DT_|Train_02_Rou|__||Ámsterdam_393153_NL||ES_AR|P|'
	--AND Ad_Group IN ( 'DT_|Train_06_Rou|__|Florencia_388058_IT||205|ES_AR|B|', 'DT_|Bus_08_Rou|__||Granada_378585_ES||ES_AR|P|' )
	--AND domain = 'DE'
  AND ad_nr = 1
ORDER BY
	domain