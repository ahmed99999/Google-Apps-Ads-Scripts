
var config = {
	"DESCRIPTION" : "",
	"INSTRUCTIONS":"",
	"VERSION" : 1,
	"VERSION_TAG" : "stable",
	"NAME": "Bid Change Anomaly Reporter",
	"settings" : {
		"SITE_NAME" : "https://www.kartenmacherei.de/",
		"SERVER_LOGS_FOLDER_NAME" : "TODO",
		"BIGQUERY_PROJECT_ID" : "biddy-io",
		"BIGQUERY_DATASET_ID" : "seo_project_everyting_into_bigquery",
		"CLIENT_ID" : "1036644356409-226k7h47j90o6rp8qrg04gurjcg195of.apps.googleusercontent.com",
		"CLIENT_SECRET" : "Ibz5LAvswTugvS7gqNPk5x3U",
		"DEEP_CRAWL_PROJECT_ID" : "83902",
		"DEEP_CRAWL_ACCOUNT_ID" : 33,  
		"DEEP_CRAWL_API_KEY" : "830:CYdSP5Bp05-4teTRATq14Piw1mqdUixv9IX-qp7jH1W2r8nJqQVGETTzddBu8KmZcDaDYbR4qT4evKI4VeKtMw",
		"DEEP_CRAWL_URL_ENDPOINT" : "https://api.deepcrawl.com/",
		"BIGQUERY_DEEP_CRAWL_TABLE_NAME" : "deep_crawl_api_data",
		"ANALYTICS_PROFILE_ID" : 183603248,
		"START_DATE" : "2018-10-30",
		"END_DATE" : "2018-10-31",
		"CRAWL_ERROR_CATEGORIES" : [ {"notFound":"notFound"}, {"serverError": "serverError"}, {"soft404": "soft404"}, {"authPermissions": "soft404"}, {"other": "soft404"} ],
		"CRAWL_ERROR_PLATFORMS" : [ {"web": "web"}, {"smartphoneOnly": "smartphoneOnly"} ],
		"SEARCH_ANALYTICS_DIMENSIONS" : [ {"page": "page"}, {"device": "device"} ]
	}		
};

for( key in config.settings ){
	this[ key ] = config.settings[ key ];
}

// ------ ARGUMENTS ----------------
/*SITE_NAME = "https://www.pa.ag/";
var SERVER_LOGS_FOLDER_NAME = 'TODO';
var BIGQUERY_PROJECT_ID = 'biddy-io';
var BIGQUERY_DATASET_ID = 'seo_project_everyting_into_bigquery';
var CLIENT_ID = '1036644356409-226k7h47j90o6rp8qrg04gurjcg195of.apps.googleusercontent.com';
var CLIENT_SECRET = 'Ibz5LAvswTugvS7gqNPk5x3U';

var ANALYTICS_PROFILE_ID = 174251254; // Account: name "H42",
var START_DATE = '2018-10-01';
var END_DATE = '2018-10-31';

var CRAWL_ERROR_CATEGORIES = [ 'notFound', 'serverError', 'soft404', 'authPermissions', 'other' ];
var CRAWL_ERROR_PLATFORMS = [ 'web', 'smartphoneOnly' ];
var SEARCH_ANALYTICS_DIMENSIONS = [ 'page', 'device' ];
*/

// ------- CONSTANTS -----------
var CRAWL_ERRORS_TABLE_NAME = 'crawl_errors';
var SEARCH_ANALYTICS_TABLE_NAME = 'search_analytics';
var BIGQUERY_TABLE_NAME_SERVER_LOGS = 'server_logs';
var BIGQUERY_TABLE_NAME_ANALYTICS1 = 'google_analytics1';
var BIGQUERY_TABLE_NAME_ANALYTICS2 = 'google_analytics2';
var ANALYTICS_DIMENSION_TYPES = [ 'STRING', 'DATETIME' ];
var BIGQUERY_CHUNK_SIZE = 30000;
var MUTE_HTTP_EXCEPTIONS = false;
var SEARCH_ANALYTICS_ROW_LIMIT = 25000; // values > 25k don't work

// -----------------------------

var BIGQUERY_SCHEMA_LOGS = {
	ip					: 'STRING',
	datetime			: 'STRING',
	request_type		: 'STRING',
	resource 			: 'STRING',
	protocol 			: 'STRING',
	http_code 			: 'INTEGER',
	some_number 		: 'INTEGER',
	client 				: 'STRING',
	domain 				: 'STRING',
};
/*
var BIGQUERY_SCHEMA_ANALYTICS1 = {
	date 			    : 'DATETIME',
	sessions			: 'INTEGER',
    users      			: 'INTEGER',
	avg_page_load_time	: 'FLOAT',
    avg_server_response_time: 'FLOAT',
    page_load_sample    : 'INTEGER',
};
var BIGQUERY_SCHEMA_ANALYTICS2 = {
	landing_page_path	: 'STRING',
	sessions			: 'INTEGER',
    users				: 'INTEGER',
    unique_pageviews    : 'INTEGER',
    bounce_rate			: 'FLOAT',
    avg_time_on_page	: 'FLOAT',
};
*/
var BIGQUERY_SCHEMA_ANALYTICS1 = {
	date 			    		: 'DATETIME',
	sessions					: 'INTEGER',
    users      					: 'INTEGER',
	avgPageLoadTime				: 'FLOAT',
    avgServerResponseTime		: 'FLOAT',
    pageLoadSample		   		: 'INTEGER',
};
var BIGQUERY_SCHEMA_ANALYTICS2 = {
	landingPagePath				: 'STRING',
	sessions					: 'INTEGER',
    users						: 'INTEGER',
    uniquePageviews				: 'INTEGER',
    bounceRate					: 'FLOAT',
    avgTimeOnPage				: 'FLOAT',
};

// ---------------------------------

function main(){
	Logger.log( 'start' );
	createDataset();

	// -------- Search Console --------
	 crawlErrorsIntoBigquery();
	 searchAnalyticsIntoBigquery();
	 
	// --------deep crawl api---------- 
	 deepCrawlApiMainFunction();
	 
	// --------------------------------
	
	// -------- Server Logs -----------
	// serverLogsIntoBigquery( SERVER_LOGS_FOLDER_NAME );
	// --------------------------------
	
	// -------- Google Analytics ------
	
	analyticsIntoBigquery(
		ANALYTICS_PROFILE_ID,
		BIGQUERY_TABLE_NAME_ANALYTICS1,
		BIGQUERY_SCHEMA_ANALYTICS1,
		START_DATE,
		END_DATE
	);
	analyticsIntoBigquery(
		ANALYTICS_PROFILE_ID,
		BIGQUERY_TABLE_NAME_ANALYTICS2,
		BIGQUERY_SCHEMA_ANALYTICS2,
		START_DATE,
		END_DATE
	);
    
	// --------------------------------
}
