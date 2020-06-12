
-- redshift-query
select
	frontend_domain,
	departure_city_name,
	arrival_city_name,
	departure_country_name,
	arrival_country_name,
	departure_country_code,
	arrival_country_code,
	departure_city_population,
	arrival_city_population,
	distance_km,
	COALESCE( trip_type, '' ) as trip_type,
	COALESCE( travel_mode, '' ) as travel_mode,
	COALESCE( sum( search_count ), 0 ) as sum_searches,
	COALESCE( sum( clickout_count ), 0 ) as sum_clickouts,
	COALESCE( sum( clickout_value), 0 ) as sum_clickout_value,
	count(*) as count
from reporting.agg_routes
WHERE TRUE
	AND "date" = '2018-08-01'
	AND frontend_domain IN ( 'goeuro-de',  'goeuro-pl',  'goeuro-com-ar',  'goeuro-fr', 'goeuro-at', 'goeuro-ch' )
group by
	frontend_domain,
	departure_city_name,
	arrival_city_name,
	departure_country_name,
	arrival_country_name,
	departure_country_code,
	arrival_country_code,
	departure_city_population,
	arrival_city_population,
	distance_km,
	trip_type,
	travel_mode
HAVING TRUE
	AND sum_searches > 1
	--AND sum_clickouts > 0
order by
	count desc
limit 40000






-- missing cities
select
	UPPER( SUBSTRING( frontend_domain, instr( frontend_domain, '-', -1 ) + 1 ) ) as domain,
	INITCAP( travel_mode ) as vertical,
	departure_city_name || '_' || departure_position_id || '_' || departure_country_code as departure_city_and_id,
	arrival_city_name || '_' || arrival_position_id || '_' || arrival_country_code as arrival_city_and_id,
	'DT_|['  || INITCAP( travel_mode ) || '_01_' || 'Gen]|' || UPPER( SUBSTRING( frontend_domain, instr( frontend_domain, '-', -1 ) + 1 ) ) || ':' || INITCAP( travel_mode ) as example_campaign_name,
	'DT_|'  || INITCAP( travel_mode ) || '_01_' || 'Gen|Chip-01_Tic-02_|' || departure_city_name || '_' || departure_position_id || '_' || departure_country_code || '|' || arrival_city_name || '_' || arrival_position_id || '_' || arrival_country_code || '|' || distance_km || '|EN_' || UPPER( SUBSTRING( frontend_domain, instr( frontend_domain, '-', -1 ) + 1 ) ) || '|E|' as example_adgroup_name,
	frontend_domain,
	device_type_name,
	departure_position_id,
	arrival_position_id,
	departure_city_name,
	arrival_city_name,
	user_location_country_name,
	page_url_host,
	popular_travel_mode,
	trip_type,
	travel_mode,
	is_user_local,
	service_name,
	distance_km,
	departure_city_population,
	arrival_city_population,
	sum( sum_clickouts ) as sum_clickouts,
	sum( sum_clickout_value ) as sum_clickout_value,
	sum( count ) as count,
	departure_city_name NOT IN (
		select
			SPLIT_PART( SPLIT_PART( name, '|', 4 ), '_', 1 ) as "departure_city"
		from adgroup
		where true
			and account_id in (
				select account_id
				from account
				where name like '%-SEM-%'
					and state = 1
			)
			and state = 1
			and campaign_id in ( select campaign_id from campaign where state = 1 )
	) as departure_city_not_found,
	arrival_city_name NOT IN (
		select
			SPLIT_PART( SPLIT_PART( name, '|', 5 ), '_', 1 ) as "arrival_city"
		from adgroup
		where true
			and account_id in (
				select account_id
				from account
				where name like '%-SEM-%'
					and state = 1
			)
			and state = 1
			and campaign_id in ( select campaign_id from campaign where state = 1 )
	) as arrival_city_not_found,
	( departure_city_name, arrival_city_name ) NOT IN (
		select
			SPLIT_PART( SPLIT_PART( name, '|', 4 ), '_', 1 ) as "departure_city",
			SPLIT_PART( SPLIT_PART( name, '|', 5 ), '_', 1 ) as "arrival_city"
		from adgroup
		where true
			and account_id in (
				select account_id
				from account
				where name like '%-SEM-%'
					and state = 1
			)
			and state = 1
			and campaign_id in ( select campaign_id from campaign where state = 1 )
	) as route_not_found
from biddy2.goeuro_routes3
where true
	and sum_clickouts > 0
	AND (
		departure_city_name NOT IN (
			select
				SPLIT_PART( SPLIT_PART( name, '|', 4 ), '_', 1 ) as "departure_city"
			from adgroup
			where true
				and account_id in (
					select account_id
					from account
					where name like '%-SEM-%'
						and state = 1
				)
				and state = 1
				and campaign_id in ( select campaign_id from campaign where state = 1 )
		)
		OR
		arrival_city_name NOT IN (
			select
				SPLIT_PART( SPLIT_PART( name, '|', 5 ), '_', 1 ) as "arrival_city"
			from adgroup
			where true
				and account_id in (
					select account_id
					from account
					where name like '%-SEM-%'
						and state = 1
				)
				and state = 1
				and campaign_id in ( select campaign_id from campaign where state = 1 )
		)
		OR
		( departure_city_name, arrival_city_name ) NOT IN (
			select
				SPLIT_PART( SPLIT_PART( name, '|', 4 ), '_', 1 ) as "departure_city",
				SPLIT_PART( SPLIT_PART( name, '|', 5 ), '_', 1 ) as "arrival_city"
			from adgroup
			where true
				and account_id in (
					select account_id
					from account
					where name like '%-SEM-%'
						and state = 1
				)
				and state = 1
				and campaign_id in ( select campaign_id from campaign where state = 1 )
		)
	)
group by
	frontend_domain,
	device_type_name,
	departure_position_id,
	arrival_position_id,
	departure_city_name,
	departure_country_code,
	arrival_country_code,
	arrival_city_name,
	departure_city_not_found,
	arrival_city_not_found,
	route_not_found,
	travel_mode,
	user_location_country_name,
	page_url_host,
	popular_travel_mode,
	trip_type,
	is_user_local,
	service_name,
	distance_km,
	departure_city_population,
	arrival_city_population,
	departure_country_name,
	arrival_country_name
order by
	sum_clickout_value desc,
	sum_clickouts desc,
	count













-- adgroup-names decoded
select
	--count(*)
	SPLIT_PART( SPLIT_PART( name, '|', 1 ), '_', 1 ) as devices,
	SPLIT_PART( SPLIT_PART( name, '|', 1 ), '_', 2 ) as audience,
	SPLIT_PART( SPLIT_PART( name, '|', 2 ), '_', 1 ) as vertical,
	SPLIT_PART( SPLIT_PART( name, '|', 2 ), '_', 2 ) as adjective_variation,
	SPLIT_PART( SPLIT_PART( name, '|', 2 ), '_', 3 ) as campaign_type,
	SPLIT_PART( name, '|', 3 ) as keyword_cluster,
	SPLIT_PART( SPLIT_PART( name, '|', 4 ), '_', 1 ) as "departure_city",
	SPLIT_PART( SPLIT_PART( name, '|', 4 ), '_', 2 ) as "departure_id",
	SPLIT_PART( SPLIT_PART( name, '|', 4 ), '_', 3 ) as "departure_country",
	SPLIT_PART( SPLIT_PART( name, '|', 5 ), '_', 1 ) as "arrival_city",
	SPLIT_PART( SPLIT_PART( name, '|', 5 ), '_', 2 ) as "arrival_id",
	SPLIT_PART( SPLIT_PART( name, '|', 5 ), '_', 3 ) as "arrival_country",
	SPLIT_PART( name, '|', 6 ) as "distance",
	SPLIT_PART( SPLIT_PART( name, '|', 7 ), '_', 1 ) as "language",
	SPLIT_PART( SPLIT_PART( name, '|', 7 ), '_', 2 ) as "domain",
	SPLIT_PART( name, '|', 8 ) as match_type,
	name
from adgroup
where true
	and account_id in (
		select account_id
		from account
		where name like '%-SEM-%'
			and state = 1
	)
	and state = 1
	and campaign_id in ( select campaign_id from campaign where state = 1)
limit 10





-- campaign-names decoded
select
	(select name from account where account.account_id = campaign.account_id) as account_name,
	name as campaign_name,
	campaign_id,
	--account_id,
	SPLIT_PART( SPLIT_PART( name, '|', 1 ), '_', 1 ) as devices,
	SPLIT_PART( SPLIT_PART( name, '|', 1 ), '_', 2 ) as targeting,
	SPLIT_PART( SPLIT_PART( SPLIT_PART( name, '|', 2 ), '_', 1 ), '[', 1 ) as type_of_route,
	SPLIT_PART( SPLIT_PART( SPLIT_PART( name, '|', 2 ), '_', 1 ), '[', 2 ) as vertical,
	CONCAT( SPLIT_PART( SPLIT_PART( SPLIT_PART( name, '|', 2 ), '_', 1 ), '[', 2 ), SPLIT_PART( SPLIT_PART( name, '|', 2 ), '_', 2 ) ) as keyword_variation_code,
	SPLIT_PART( SPLIT_PART( SPLIT_PART( name, '|', 2 ), '_', 3 ), ']', 1 ) as route,
	SPLIT_PART( SPLIT_PART( SPLIT_PART( name, '|', 2 ), '_', 3 ), ']', 2 ) as departure_population,
	SPLIT_PART( name, '|', 3 ) as arrival_population,
	SPLIT_PART( SPLIT_PART( name, '|', 4 ), '_', 1 ) as "language",
	SPLIT_PART( SPLIT_PART( SPLIT_PART( name, '|', 4 ), '_', 2 ), ':', 1 ) as "domain",
	SPLIT_PART( SPLIT_PART( SPLIT_PART( name, '|', 4 ), '_', 2 ), ':', 2 ) as keyword_variation
from campaign
where true
	and account_id in (
		select account_id
		from account
		where name like '%-SEM-%'
			and state = 1
	)
	and state = 1
	--and SPLIT_PART( SPLIT_PART( SPLIT_PART( name, '|', 2 ), '_', 3 ), ']', 1 ) not in ( 'Brand', 'Gen' )
	--and campaign_id = 1068042463
order by account_name, campaign_name, keyword_variation_code









-- missing campaign variations
select * from (
	select
		--'DT_RLSA|' || type_of_route || '[' || vertical || '_01_Rou]' || departure_population || '|' || arrival_population || '|' || "language" || '_' || "domain" || ':' || vertical as generated_name,
		"domain",
		"language",
		"type_of_route",
		'Bus' || bus_nr as keyword_variation
		--"departure_population",
		--"arrival_population",
	from ( SELECT 'AR' as "domain" UNION ALL select 'AT' UNION ALL select 'CH' UNION ALL select 'DE' UNION ALL select 'FR' UNION ALL select 'PL' ) as "domain" 
	--JOIN ( SELECT '50' as departure_population UNION ALL select '50-100' UNION ALL select '100-500' UNION ALL select '500' UNION ALL select '' ) as dep ON true
	--JOIN ( SELECT '50' as arrival_population UNION ALL select '50-100' UNION ALL select '100-500' UNION ALL select '500' UNION ALL select '' ) as arr ON true
	JOIN ( SELECT '01' as bus_nr UNION ALL select '02' UNION ALL select '03' UNION ALL select '04' UNION ALL select '05' UNION ALL select '06' UNION ALL select '07' UNION ALL select '08' UNION ALL select '09' UNION ALL select '10' UNION ALL select '11' UNION ALL select '12' UNION ALL select '13' UNION ALL select '14' UNION ALL select '15' ) as "bus_nr"
		ON false
		OR ( "domain" = 'AR' AND bus_nr <= 11 )
		OR ( "domain" = 'AT' AND bus_nr <= 15 )
		OR ( "domain" = 'CH' AND bus_nr <= 15 )
		OR ( "domain" = 'DE' AND bus_nr <= 15 )
		OR ( "domain" = 'FR' AND bus_nr <= 6 )
		OR ( "domain" = 'PL' AND bus_nr <= 4 )
	JOIN ( SELECT 'I.0' as "type_of_route" UNION ALL select 'I.I' UNION ALL select 'I.II' UNION ALL select 'I.III' UNION ALL select '0.0' UNION ALL select '0.I' UNION ALL select 'II.0' UNION ALL select 'II.I' ) as "type_of_route" ON true
	JOIN ( SELECT 'ES' as "language" UNION ALL select 'DE' UNION ALL select 'FR' UNION ALL select 'IT' UNION ALL select 'PL' ) as "language"
		ON true
		AND ( "language"."language" = "domain"
			OR ("language"."language" = 'ES' AND "domain" = 'AR' )
			OR ("language"."language" = 'DE' AND "domain" = 'AT' )
			OR ("language"."language" = 'DE' AND "domain" = 'CH' )
			OR ("language"."language" = 'FR' AND "domain" = 'CH' )
			OR ("language"."language" = 'IT' AND "domain" = 'CH' )
			)
	UNION ALL
	select
		--'DT_RLSA|' || type_of_route || '[' || vertical || '_01_Rou]' || departure_population || '|' || arrival_population || '|' || "language" || '_' || "domain" || ':' || vertical as generated_name,
		"domain",
		"language",
		"type_of_route",
		'Train' || train_nr as keyword_variation
		--"departure_population",
		--"arrival_population",
	from ( SELECT 'AR' as "domain" UNION ALL select 'AT' UNION ALL select 'CH' UNION ALL select 'DE' UNION ALL select 'FR' UNION ALL select 'PL' ) as "domain" 
	--JOIN ( SELECT '50' as departure_population UNION ALL select '50-100' UNION ALL select '100-500' UNION ALL select '500' UNION ALL select '' ) as dep ON true
	--JOIN ( SELECT '50' as arrival_population UNION ALL select '50-100' UNION ALL select '100-500' UNION ALL select '500' UNION ALL select '' ) as arr ON true
	JOIN ( SELECT '01' as train_nr UNION ALL select '02' UNION ALL select '03' UNION ALL select '04' UNION ALL select '05' UNION ALL select '06' UNION ALL select '07' UNION ALL select '08' UNION ALL select '09' UNION ALL select '10' UNION ALL select '11' UNION ALL select '12' UNION ALL select '13' UNION ALL select '14' UNION ALL select '15' ) as "train_nr"
		ON false
		OR ( "domain" = 'AR' AND train_nr <= 10 )
		OR ( "domain" = 'AT' AND train_nr <= 4 )
		OR ( "domain" = 'CH' AND train_nr <= 13 )
		OR ( "domain" = 'DE' AND train_nr <= 2 )
		OR ( "domain" = 'FR' AND train_nr <= 13 )
		OR ( "domain" = 'PL' AND train_nr <= 3 )
	JOIN ( SELECT 'I.0' as "type_of_route" UNION ALL select 'I.I' UNION ALL select 'I.II' UNION ALL select 'I.III' UNION ALL select '0.0' UNION ALL select '0.I' UNION ALL select 'II.0' UNION ALL select 'II.I' ) as "type_of_route" ON true
	JOIN ( SELECT 'ES' as "language" UNION ALL select 'DE' UNION ALL select 'FR' UNION ALL select 'IT' UNION ALL select 'PL' ) as "language"
		ON true
		AND ( "language"."language" = "domain"
			OR ("language"."language" = 'ES' AND "domain" = 'AR' )
			OR ("language"."language" = 'DE' AND "domain" = 'AT' )
			OR ("language"."language" = 'DE' AND "domain" = 'CH' )
			OR ("language"."language" = 'FR' AND "domain" = 'CH' )
			OR ("language"."language" = 'IT' AND "domain" = 'CH' )
			)
) as x
where ( "domain", "language", "type_of_route", "keyword_variation" ) not in (
	select
		SPLIT_PART( SPLIT_PART( SPLIT_PART( name, '|', 4 ), '_', 2 ), ':', 1 ) as "domain",
		SPLIT_PART( SPLIT_PART( name, '|', 4 ), '_', 1 ) as "language",
		SPLIT_PART( SPLIT_PART( SPLIT_PART( name, '|', 2 ), '_', 1 ), '[', 1 ) as type_of_route,
			CONCAT( SPLIT_PART( SPLIT_PART( SPLIT_PART( name, '|', 2 ), '_', 1 ), '[', 2 ), SPLIT_PART( SPLIT_PART( name, '|', 2 ), '_', 2 ) ) as keyword_variation_code
	from campaign
	where true
		and account_id in (
			select account_id
			from account
			where name like '%-SEM-%'
				and state = 1
		)
		and state = 1
)






Was geht alles aus DB in den Kampagnen-Namen?
	- Vertical ( Bus / Train )
	- Pop-Count deprature ( 50, 50-100, 100-500, 500 buckets )
	- Pop-Count arrival ( 50, 50-100, 100-500, 500 buckets )
	- Domain
PL	PL


Was davon kann variiert werden?
	- Keyword-Kombination (Bus_01, Bus_02,...)
	- Type of Route
		- From/To
		- only From
		- only To
	- Languages ergeben sich aus Domain. CH hat 3 Languages
		- AR	ES
		- AT	DE
		- CH	DE
		- CH	FR
		- CH	IT
		- DE	DE
		- FR	FR
	- RLSA oder nicht

Was ist konstant
	- Kampagnen-Typ ( ist immer "Rou" )







CREATE TABLE biddy2.goeuro_location_names2
(
    position_id int NOT NULL,
    lang varchar(2) NOT NULL,
    city_name varchar(80) NOT NULL
);


select
	lang,
	count(*)
from biddy2.goeuro_location_names2
group by lang

insert into biddy2.goeuro_location_names2
select position_id, 'de', city_name_de
from biddy2.goeuro_location_names

insert into biddy2.goeuro_location_names2
select position_id, 'fr', city_name_fr
from biddy2.goeuro_location_names

insert into biddy2.goeuro_location_names2
select position_id, 'pl', city_name_pl
from biddy2.goeuro_location_names

insert into biddy2.goeuro_location_names2
select position_id, 'es', city_name_es
from biddy2.goeuro_location_names

insert into biddy2.goeuro_location_names2
select position_id, 'it', city_name_it
from biddy2.goeuro_location_names









-- missing campaigns / adgroups / keywords


select
	departure_position_id1,
	arrival_position_id1
	--count( DISTINCT arrival_position_id1 )
	--count(*)
from (



select
	count(*) as count1,
	vertical,
	"domain",
	sum( sum_clickout_value ) as clickout_value,
	sum( sum_clickouts ) as clickouts,
	generated_campaign_name,
	generated_adgroup_name,
	case
		when match_type = 'E' then 'Exact'
		when match_type = 'P' then 'Phrase'
		when match_type = 'B' then 'Broad'
	end as match_type1,
	LOWER(
		case
			when match_type = 'B' then '+'
			else ''
		end
		||
		keyword_variation
		||
		case
			when SPLIT_PART( route_type, '.', 1 ) IN ( 'I', '0' ) then
				' '
				|| case
					when match_type = 'B' then '+'
					else ''
				end
				|| LOWER( z2.departure_city_name1 )
			else ''
		end
		||
		case
			when SPLIT_PART( route_type, '.', 1 ) IN ( 'I', 'II' ) then
				' '
				|| case
					when match_type = 'B' then '+'
					else ''
				end
				|| LOWER( z2.arrival_city_name1 )
			else ''
		end
	) as keyword,
	departure_position_id1,
	arrival_position_id1,
	--keyword_variation,
	campaign_found_in_adwords,
	adgroup_found_in_adwords,
	combination_found_in_adwords
from (
	select generated_campaign_name in (
		select
			campaign.name
		from campaign
		where true
			and campaign.account_id in (
				select account.account_id
				from account
				where true
					and account.name like '%-SEM-%'
					and account.state = 1
			)
			and campaign.state = 1
	) as campaign_found_in_adwords,
	generated_adgroup_name in (
		select
			adgroup.name
		from adgroup
		where true
			and adgroup.account_id in (
				select account.account_id
				from account
				where true
					and account.name like '%-SEM-%'
					and account.state = 1
			)
			and adgroup.state = 1
	) as adgroup_found_in_adwords,
	( generated_campaign_name, generated_adgroup_name ) in (
		select
			campaign.name,
			adgroup.name
		from campaign
		join adgroup on campaign.account_id = adgroup.account_id and campaign.campaign_id = adgroup.campaign_id
		where true
			and campaign.account_id in (
				select account.account_id
				from account
				where true
					and account.name like '%-SEM-%'
					and account.state = 1
			)
			and campaign.state = 1
			and adgroup.state = 1
	) as combination_found_in_adwords,
	*
	from (
		select
			'DT_' || targeting || '|' || route_type || '[' || keyword_variation_code || '_Rou]' || departure_city_population_bucket
			 || '|' || arrival_city_population_bucket || '|' || z.lang || '_' || "domain" || ':' || keyword_variation as generated_campaign_name,
			 'DT_' || targeting || '|' || keyword_variation_code || '_Rou|__|' || 
			 case when SPLIT_PART( route_type, '.', 1 ) IN ( 'I', '0' ) then departure_city_and_id else '' end || '|' ||
			 case when SPLIT_PART( route_type, '.', 1 ) IN ( 'I', 'II' ) then arrival_city_and_id else '' end ||
			 '|' || distance_km || '|' || z.lang || '_' || "domain" || '|' || match_type || '|' as generated_adgroup_name,
			route_type,
			sum_clickout_value,
			sum_clickouts,
			--z.departure_city_name1,
			--z.arrival_city_name1,
			departure_location_names.city_name as departure_city_name1,
			arrival_location_names.city_name as arrival_city_name1,
			departure_position_id1,
			arrival_position_id1,
			match_type,
			keyword_variations.keyword_variation,
			vertical,
			"domain"
			 --,*
		from (
			select
				departure_city_name as departure_city_name1,
				arrival_city_name as arrival_city_name1,
				departure_position_id as departure_position_id1,
				arrival_position_id as arrival_position_id1,
				departure_city_name || '_' || departure_position_id || '_' || departure_country_code as departure_city_and_id,
				arrival_city_name || '_' || arrival_position_id || '_' || arrival_country_code as arrival_city_and_id,
				case
					when departure_city_population <= 50000 then '50'
					when departure_city_population > 50000 AND departure_city_population <= 100000  then '50-100'
					when departure_city_population > 100000 AND departure_city_population <= 500000  then '100-500'
					when departure_city_population > 500000 then '500'
				end as departure_city_population_bucket,
				case
					when arrival_city_population <= 50000 then '50'
					when arrival_city_population > 50000 AND arrival_city_population <= 100000  then '50-100'
					when arrival_city_population > 100000 AND arrival_city_population <= 500000  then '100-500'
					when arrival_city_population > 500000 then '500'
				end as arrival_city_population_bucket,
				mode as mode1,
				INITCAP( travel_mode ) as vertical,
				case
					when mode = 'both' AND departure_domestic AND arrival_domestic THEN 'I.0'
					when mode = 'both' AND departure_domestic AND NOT arrival_domestic THEN 'I.I'
					when mode = 'both' AND NOT departure_domestic AND arrival_domestic THEN 'I.II'
					when mode = 'both' AND NOT departure_domestic AND NOT arrival_domestic THEN 'I.III'
					when mode = 'departure' AND departure_domestic THEN '0.0'
					when mode = 'departure' AND NOT departure_domestic THEN '0.I'
					when mode = 'arrival' AND arrival_domestic THEN 'II.0'
					when mode = 'arrival' AND NOT arrival_domestic THEN 'II.I'
				end as route_type,
				*
			from (
				select
					"domain" = departure_country_code as departure_domestic,
					"domain" = arrival_country_code as arrival_domestic,
					--'DT_RLSA|' || "domain" as campaign_name,
					*
				from (
					select
						UPPER( SUBSTRING( frontend_domain, instr( frontend_domain, '-', -1 ) + 1 ) ) as domain,
						*
					from goeuro_routes3
					where true
						AND sum_clickouts > 50
				) as x
			) as y
			JOIN ( select 'both' as mode union all select 'departure' union all select 'arrival' ) as mode ON TRUE
			LEFT JOIN ( SELECT 'ES' as lang UNION ALL SELECT 'DE' UNION ALL SELECT 'FR' UNION ALL SELECT 'IT' UNION ALL SELECT 'PL' ) as lang
				ON TRUE
				AND (
					false
					OR "domain" = lang
					OR ( "domain" = 'AR' AND lang = 'ES' )
					OR ( "domain" = 'AT' AND lang = 'DE' )
					OR ( "domain" = 'CH' AND lang = 'DE' )
					OR ( "domain" = 'CH' AND lang = 'FR' )
					OR ( "domain" = 'CH' AND lang = 'IT' )
				)
			JOIN ( select '' as targeting ) as targeting ON TRUE --select 'RLSA' UNION ALL
		) as z
		LEFT JOIN biddy2.goeuro_location_names2 as departure_location_names
			ON departure_location_names.position_id = z.departure_position_id1
			AND departure_location_names.lang = LOWER( z.lang )
		LEFT JOIN biddy2.goeuro_location_names2 as arrival_location_names
			ON arrival_location_names.position_id = z.arrival_position_id1
			AND arrival_location_names.lang = LOWER( z.lang )
		JOIN (
			select
				account_name,
				"language",
				keyword_variation_code,
				keyword_variation
			from (
				select
					account_name,
					--campaign_name,
					keyword_variation_code,
					keyword_variation,
					"language",
					count(*)
				from (
				select
					*
				from (
						select
							(select name from account where account.account_id = campaign.account_id) as account_name,
							name as campaign_name,
							campaign_id,
							--account_id,
							SPLIT_PART( SPLIT_PART( name, '|', 1 ), '_', 1 ) as devices,
							SPLIT_PART( SPLIT_PART( name, '|', 1 ), '_', 2 ) as targeting,
							SPLIT_PART( SPLIT_PART( SPLIT_PART( name, '|', 2 ), '_', 1 ), '[', 1 ) as type_of_route,
							SPLIT_PART( SPLIT_PART( SPLIT_PART( name, '|', 2 ), '_', 1 ), '[', 2 ) as vertical,
							SPLIT_PART( SPLIT_PART( SPLIT_PART( name, '|', 2 ), '_', 1 ), '[', 2 ) || '_' || SPLIT_PART( SPLIT_PART( name, '|', 2 ), '_', 2 ) as keyword_variation_code,
							SPLIT_PART( SPLIT_PART( SPLIT_PART( name, '|', 2 ), '_', 3 ), ']', 1 ) as route,
							SPLIT_PART( SPLIT_PART( SPLIT_PART( name, '|', 2 ), '_', 3 ), ']', 2 ) as departure_population,
							SPLIT_PART( name, '|', 3 ) as arrival_population,
							SPLIT_PART( SPLIT_PART( name, '|', 4 ), '_', 1 ) as "language",
							SPLIT_PART( SPLIT_PART( SPLIT_PART( name, '|', 4 ), '_', 2 ), ':', 1 ) as "domain",
							SPLIT_PART( SPLIT_PART( SPLIT_PART( name, '|', 4 ), '_', 2 ), ':', 2 ) as keyword_variation
						from campaign
						where true
							and account_id in (
								select account_id
								from account
								where name like '%-SEM-%'
									and state = 1
							)
							and state = 1
							--and SPLIT_PART( SPLIT_PART( SPLIT_PART( name, '|', 2 ), '_', 3 ), ']', 1 ) not in ( 'Brand', 'Gen' )
							--and campaign_id = 1068042463
						order by account_name, campaign_name, keyword_variation_code
				) as y
				where true
				) x
				group by
					account_name,
					--campaign_name,
					keyword_variation_code,
					"language",
					keyword_variation
				having true
					--and account_name = 'CH-SEM-Bus'
					-- and account_name = 'CH-SEM-Generic'
					--and keyword_variation_code = 'InterRLSA'
					--and (account_name, "language", keyword_variation_code ) = ( 'FR-SEM-Train', 'FR', 'Train03' ) 
				order by
					account_name,
					--campaign_name,
					"language",
					keyword_variation_code,
					keyword_variation
			) as x
			group by
				account_name,
				"language",
				keyword_variation_code,
				keyword_variation
			having true
				and count(*) = 1
		) as keyword_variations
		ON true
			AND keyword_variations.account_name = "domain" || '-SEM-' || vertical
			AND keyword_variations."language" = z.lang
		JOIN ( SELECT 'E' as match_type UNION ALL SELECT 'P' UNION ALL SELECT 'B' ) as match_type ON TRUE
	) as asdf
) as z2
WHERE TRUE
group by generated_campaign_name, generated_adgroup_name,campaign_found_in_adwords, adgroup_found_in_adwords, combination_found_in_adwords, z2.departure_city_name1, z2.arrival_city_name1, keyword_variation, match_type, route_type, departure_position_id1, arrival_position_id1, vertical, "domain"
order by count1 desc --, generated_campaign_name, generated_adgroup_name

) as sdffw
group by 
	departure_position_id1,
	arrival_position_id1


