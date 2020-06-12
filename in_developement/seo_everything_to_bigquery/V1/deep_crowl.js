// ----------------------------------------------- SETTINGS ------------------------------------------------

var DEEP_CRAWL_PROJECT_ID = '83902';
var DEEP_CRAWL_ACCOUNT_ID = 33;  
var DEEP_CRAWL_API_KEY = "830:CYdSP5Bp05-4teTRATq14Piw1mqdUixv9IX-qp7jH1W2r8nJqQVGETTzddBu8KmZcDaDYbR4qT4evKI4VeKtMw";
var DEEP_CRAWL_URL_ENDPOINT = 'https://api.deepcrawl.com/';


var BIGQUERY_PROJECT_ID = 'biddy-io';
var BIGQUERY_DATASET_ID = 'deep_crawl_Ahmed_testing';


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

function getDataFromDeepCrawl2( apiKey, reportDefinition ){
	
	var url = DEEP_CRAWL_URL_ENDPOINT + Object.keys( reportDefinition ).map( function( key ){
		var value = reportDefinition[ key ];
		return key + ( !value ? '' : '/' + value );
	}).join( '/' );
	
	var get_options = {
		method	: 'GET',
		headers	: {
			'X-Auth-Token' : getTokenToAccessDeepCrawl( apiKey ),
		}
	};
	var getResponce = UrlFetchApp.fetch( url, get_options );
	return JSON.parse( getResponce.getContentText() );
}

function main (){
	var testUrl = 'https://www.kartenmacherei.de/';
	
	var pageId = Utilities.base64Encode( '/faq/' );

	Logger.log( 'pageId: ' + pageId );

	var data = getDataFromDeepCrawl2( DEEP_CRAWL_API_KEY,
		{
			accounts	: DEEP_CRAWL_ACCOUNT_ID,
			projects	: DEEP_CRAWL_PROJECT_ID,
			crawls		: 1604320,
			pages		: pageId,
		}
	);

	Logger.log( 'data: ' + JSON.stringify( data, null, 2 ) );

	return;

	// ----------------------------------------------- GET THE LAST CRAWL OF A PROJECT -----------------------------------------------
	var get_result = getDataFromDeepCrawl( DEEP_CRAWL_API_KEY, DEEP_CRAWL_PROJECT_ID );
	createDataset();

	var lastCrawl = get_result
			.map(function( o ) {
				o.date = new Date (o.crawling_at) ; 
				return o ;
			})
			.reduce(function ( o , y ) {
				o = ( ! o.isPresent() || y.date > o.get().date ) ? optional( y, 'invalid crawl found' ) : o ;
				return o;
			} , optional( null, 'no crawl found' ) )
			.get() ;
	
	// ----------------------------------------------------- GETTING REPORTS DATA  ---------------------------------------------------------

	Logger.log( 'Last Crawl date : ' + lastCrawl.date ); 

	var get_all_reports	= getDataFromDeepCrawl( DEEP_CRAWL_API_KEY, DEEP_CRAWL_PROJECT_ID, lastCrawl.id );
	var reportIds = get_all_reports.map( function( x ) {
										return x ;
									} );
	
	reportIds.forEach( function ( reportId ) {
		var get_rows = getDataFromDeepCrawl( DEEP_CRAWL_API_KEY, DEEP_CRAWL_PROJECT_ID, lastCrawl.id, reportId.id );
		Logger.log ('report Type ===================== : ' + reportId.report_template);
		
		if (typeof( get_rows[0] ) == 'undefined') {
			//Logger.log('no data for ' + reportId.report_template + ' report'); 
			return ;
		}
		var keys = Object.keys( get_rows[0].data ) ;
		var fields = {} ;

		keys.forEach( function ( key ) {
			fields[key] = 'STRING' ;
		});

		Logger.log( JSON.stringify( fields , null, 2 ) );

		var tableName = lastCrawl.id + '_' + reportId.id + '_report_' + reportId.report_template ;

		createTable( tableName , fields );

		var report_rows = get_rows.map(function ( row ) {
			var x = Object.values(row.data) ;
          
			x = x.map( function( y ) { 
				if( ( typeof y == 'number' || typeof y == 'boolean' || typeof y == 'object') && y !== null ){                  
					y = JSON.stringify(y);
                  //Logger.log('the oject thing' + JSON.stringify(y , null , 2))
				}
				if( [ 'string' ].indexOf( typeof y ) < 0 && y !== null){
 					Logger.log( ' unsupported type: ' + JSON.stringify( y , null , 2 ) + ' -> ' + (typeof y ) );
				}  
				return y ;
			});
			return x;
		});

		loadIntoBigquery( toCsvChunks( report_rows ) , tableName );
	});
}