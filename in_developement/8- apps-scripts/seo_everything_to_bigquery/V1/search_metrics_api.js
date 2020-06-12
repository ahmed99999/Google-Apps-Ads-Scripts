// ----------------------------------------------- SETTINGS ------------------------------------------------

var SEARCH_METRICS_API_KEY = "5c30e5103dec5bd6dadeb459758e0620a087aa6c:d6556e72bf11570a7d242ce0e33f88ffa56b3a89";
var SEARCH_METRICS_URL_ENDPOINT = 'http://api.searchmetrics.com/v3';


// var BIGQUERY_PROJECT_ID = 'biddy-io';
// var BIGQUERY_DATASET_ID = 'search_metrics_Ahmed_testing';
// var BIGQUERY_TABLE_NAME = 'search_metrics_api_data';

function getTokenToSearchMetrics( apiKey ){
	
    var decoded = Utilities.base64Encode( apiKey );
		
	var data  = {
        "Authorization" : "Basic " + decoded
    };
    
	var options = {
        'method' : 'POST',
        'payload' : 'grant_type=client_credentials',
		'headers' : data
	}; 

	var post_responce = UrlFetchApp.fetch( SEARCH_METRICS_URL_ENDPOINT + '/token' , options);
	return JSON.parse( post_responce.getContentText() ) ;
}

function getResearchOrganicSeoVisibility(){
    
    var token = getTokenToSearchMetrics( SEARCH_METRICS_API_KEY );
	var post_responce = UrlFetchApp.fetch( SEARCH_METRICS_URL_ENDPOINT + '/ResearchOrganicGetValueSeoVisibility.json?url=searchmetrics.com&countrycode=de&access_token=' + token.access_token , options);  
    var result = JSON.parse( post_responce.getContentText() ) ;
    // result is a list of objects
    Logger.log( JSON.stringify( result , null , 2 ) );    
}

function main (){
    getResearchOrganicSeoVisibility();
}