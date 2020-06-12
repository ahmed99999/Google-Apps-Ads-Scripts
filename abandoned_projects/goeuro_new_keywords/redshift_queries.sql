select
	route,
	device_type_name,
	trip_type,
	is_user_local,
	page_url_host,
	user_location_country_name,
	sum( search_count ) as sum_searches,
	sum( clickout_count ) as sum_clickouts,
	sum( clickout_value) as sum_clickout_value,
	count(*) as count
from reporting.agg_routes
WHERE TRUE
	AND "date" = '2018-07-31'
	AND frontend_domain = 'goeuro-de'
group by
	route,
	device_type_name,
	trip_type,
	is_user_local,
	page_url_host,
	user_location_country_name
order by
	count desc,
	route,
	device_type_name,
	trip_type,
	is_user_local,
	page_url_host,
	user_location_country_name
limit 1000








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
	tripy_type,
	travel_mode,
	sum( search_count ) as sum_searches,
	sum( clickout_count ) as sum_clickouts,
	sum( clickout_value) as sum_clickout_value,
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
	tripy_type,
	travel_mode
HAVING TRUE
	AND sum_searches > 1
	AND sum_clickouts > 0
order by
	count desc
limit 40000

