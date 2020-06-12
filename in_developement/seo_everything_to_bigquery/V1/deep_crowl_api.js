// ----------------------------------------------- SETTINGS ------------------------------------------------



// Inspired by java.util.Optional
// returns an object which either has a value (which can be retrieved by .get() )
// or has an error-message. 'optional' can be used to represent missing values (instead of returning null).

function optional( value, message ){
	var error = message ? new Error( message ) : new Error('No such value!');
	var isNull = ( value === undefined || value === null );
	return {
	  get : 			function()						{ if( isNull ){ throw error; } return value; },
	  ifPresent : 	function( consumer )			{ if( !isNull ){ consumer( value ) } },
	  peek : 			function( consumer )			{ if( !isNull ){ consumer( value ) } return this },
	  map : 			function(){
		var args = Array.prototype.slice.call( arguments );
		// first argument is the method to call
		var method = args.splice( 0, 1 );
		// all other arguments are arguments of the method
		if( isNull ){
		  return this;
		}
		if( typeof method == 'function' ){
		  return optional( method.apply( value, args ) );
		}else if( typeof value[ method ] == 'function' ){
		  return optional( value[ method ].apply( value, args ) );
		}else{
		  return optional( value[ method ] );
		}
	  },
	  call : function(){ 
		var args = Array.prototype.slice.call( arguments );
		// first argument is the method to call
		var method = args.splice( 0, 1 );
		// all other arguments are arguments of the method
		if( !isNull ){
		  value[ method ].apply( value, args );
		}
		return this;
	  },
	  filter : 		function( predicate )			{ return isNull || predicate( value ) ? this : optional() },
	  onlyIf : 		function( method )				{ return isNull || value[ method ]() ? this : optional() },
	  isPresent : 	function()						{ return !isNull },
	  hasFailed :		function()						{ return isNull },
	  isEmpty :		function()						{ return isNull },
	  orElse : 		function( other )				{ return isNull ? other : value },
	  orElseGet : 	function( supplier )			{ return isNull ? supplier.get() : value },
	  orElseThrow : 	function( exceptionSupplier )	{ if( isNull ) throw exceptionSupplier(); return value; },
	  equals : 		function( otherValue )			{ return !isNull && value == otherValue },
	  forEach :	 	function( consumer )			{
		if( this.isPresent() ){
		  var iterator = this.get();
		  while( iterator.hasNext() ){
			consumer( iterator.next() );
		  }
		}
	  },
	  toString : 		function()						{ return isNull ? 'Empty' : 'Optional< ' + value + ' >' },
	};
}
  // -----------------------------------------------
  
function getTokenToAccessDeepCrawl( apiKey ){
	
	var decoded = Utilities.base64Encode( apiKey );
		
	var data  = {
		"Authorization" : "Basic " + decoded
	};

	var options = {
		'method' : 'POST',
		'headers' : data
	}; 

	var post_responce = UrlFetchApp.fetch('https://api.deepcrawl.com/sessions', options);
	var result = JSON.parse( post_responce.getContentText() ) ;
	return result.token ;  
}

function getLastCrawl(){
  
	var reportDefinition = {
		accounts		: DEEP_CRAWL_ACCOUNT_ID,
		projects		: DEEP_CRAWL_PROJECT_ID,
		crawls			: null
		//pages			: pageId,
	};

	var allCrawls = getAllpagesFromDeepCrawl( reportDefinition );

	var lastCrawl = allCrawls
									.map(function( o ) {
										o.date = new Date ( o.crawling_at ) ; 
										return o ;
									})
									.reduce(function ( o , y ) {
										o = ( ! o.isPresent() || y.date > o.get().date ) ? optional( y, 'invalid crawl found' ) : o ;
										return o ;
									} , optional( null, 'no crawl found' ) )
									.get() ;
	
	return  lastCrawl ;
}

function getAllpagesFromDeepCrawl( reportDefinition ){

	var firstPage	= getDataFromDeepCrawl2( DEEP_CRAWL_API_KEY, reportDefinition );
	var allReports = JSON.parse( firstPage.getContentText() );

	var linkHeaderOfFirstPage =  firstPage.getAllHeaders().Link;
	var countReportPages = textParsing( linkHeaderOfFirstPage );
	Logger.log( countReportPages );
	
	for( var pageIndex = 2; pageIndex <= countReportPages; pageIndex++ ){
		var pageRows = JSON.parse( getDataFromDeepCrawl2( DEEP_CRAWL_API_KEY, reportDefinition , pageIndex ).getContentText() );
		allReports = allReports.concat( pageRows );		
	}
	
	return allReports ;
}

function getDataFromDeepCrawl2( apiKey, reportDefinition , reportPageNumber ){
	var PER_PAGE = 200 ;
	
	var url = DEEP_CRAWL_URL_ENDPOINT + Object.keys( reportDefinition ).map( function( key ){
		var value = reportDefinition[ key ];
		return key + ( !value ? '' : '/' + value );
	}).join( '/' );
    
  reportPageNumber = ( typeof( reportPageNumber )  == 'undefined') ? 1 : reportPageNumber ;
	url = url + '?page=' + reportPageNumber + '&per_page=' + PER_PAGE;

	var get_options = {
		method	: 'GET',
		headers	: {
			'X-Auth-Token' : getTokenToAccessDeepCrawl( apiKey ),
		}
	};
	var response = UrlFetchApp.fetch( url, get_options );
    //Logger.log('RESPONCE' + JSON.stringify(response.getAllHeaders()));
	return response;
}

function textParsing( text ) {
	if ( typeof(text) == 'undefined' || text == null ) {
		return 1 ;
	}

	return  parseInt( text
		.split(',')
		.filter(function ( page ) {
				return page.indexOf("rel='last'") >= 0 ;
			})[0]
		.split('?')
		.filter(function ( part ) {
				return part.indexOf("per_page") >= 0 ;
			})[0]
		.split("&")[0]
		.split('=')[1]
	);					
}

function deepCrawlApiMainFunction (){

	createDataset();
	
	// ----------------------------------------------------- GETTING REPORTS DATA  ---------------------------------------------------------
	
	var lastCrawl = getLastCrawl();

	var reportDefinition = {
		accounts		: DEEP_CRAWL_ACCOUNT_ID,
		projects		: DEEP_CRAWL_PROJECT_ID,
		crawls			: lastCrawl.id,
		reports : null
	};

	var reports = getAllpagesFromDeepCrawl( reportDefinition );

	var reportsNeeded = reports.filter(function ( report ) {

		var value = ( (
							report.report_template == '200_pages'									  ||
							report.report_template == '301_redirects' 							||
							report.report_template == '4xx_errors'									||
							report.report_template == '5xx_errors' 									||
							report.report_template == 'non_200_separate_mobile_amp' ||
							report.report_template == 'non_301_redirects'
						) && report.report_type == 'basic' );
						
		return value ;
	});

	var TABLE_FIELDS = {
		'url'								: 'STRING',
		'deeprank' 					: 'STRING',
		'http_status_code'	: 'STRING',
		'indexable' 				: 'STRING',
		'level' 						: 'STRING',
		'links_in_count' 		: 'STRING'
	}
	dropTable( BIGQUERY_DEEP_CRAWL_TABLE_NAME ) ;
	createTable( BIGQUERY_DEEP_CRAWL_TABLE_NAME , TABLE_FIELDS );
	var pages = [];

	reportsNeeded.forEach( function ( report ){
		var reportDefinition = {
			accounts		: DEEP_CRAWL_ACCOUNT_ID,
			projects		: DEEP_CRAWL_PROJECT_ID,
			crawls			: lastCrawl.id,
			reports     : report.id,
			report_rows	: null
		};

		var reportRows = getAllpagesFromDeepCrawl( reportDefinition );

		Logger.log( 'row numberfor the report : ' + report.report_template + 'is : ' + reportRows.length );

		function undefinedToNull( value ){
			if( typeof value == 'undefined' ){
				return null;
			}
			return value;
		}

		reportRows.forEach(function ( page ) {
			
			var url = undefinedToNull( page.data.url );
			var deeprank = undefinedToNull( page.data.deeprank );
			var http_status_code = undefinedToNull( page.data.http_status_code );
			var indexable = undefinedToNull( page.data.indexable );
			var level = undefinedToNull( page.data.level );
			var links_in_count = undefinedToNull( page.data.links_in_count );

			pages.push ([url , deeprank , http_status_code , indexable , level , links_in_count] );

		});
	});

	loadIntoBigquery( toCsvChunks( pages ) , BIGQUERY_DEEP_CRAWL_TABLE_NAME );	

}