// ----------------------------------------------- SETTINGS ------------------------------------------------
var config = {
	"DESCRIPTION" : "" ,
	"INSTRUCTIONS": "",
	"VERSION" : 2,
	"VERSION_TAG" : "stable",
	"settings" : {
		"DEEP_CRAWL_PROJECT_ID" : "83902",  
 		"API_KEY" : "830:CYdSP5Bp05-4teTRATq14Piw1mqdUixv9IX-qp7jH1W2r8nJqQVGETTzddBu8KmZcDaDYbR4qT4evKI4VeKtMw",
 		"BIGQUERY_PROJECT_ID" : "biddy-io",
 		"BIGQUERY_DATASET_ID" : "deep_crawl_Ahmed_testing"
	}		
};

for( key in config.settings ){
	this[ key ] = config.settings[ key ];
}

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
  
function getTokenToAccessDeepCrawl( apiKey ) {
	
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

function getDataFromDeepCrawl( apiKey, projectId , crawlId , reportId ) {

	if ( typeof(apiKey) == "undefined" ) {
		throw new Error( 'specify the API KEY to get the DATA you want form DeepCrawl' );
	}

	var get_data  = {
		"X-Auth-Token" : getTokenToAccessDeepCrawl( apiKey )
		};

	var get_options = {
		'method' : 'GET',
		'headers' : get_data
		}; 

	if (projectId == null || typeof(projectId) == 'undefined' ) {
		throw new Error( 'Project ID not indicated' ) ;
	}

	var url = 'https://api.deepcrawl.com/accounts/33/projects/' + projectId + '/crawls' ;

	if ( typeof(crawlId) != 'undefined' ) {
		url = url + '/' + crawlId + '/reports' ;
	}

	if ( typeof(reportId) != 'undefined' && typeof(crawlId) != 'undefined' ) {
		url = url + '/' + reportId + '/report_rows' ;		
	}

	var get_responce = UrlFetchApp.fetch( url, get_options );
	return JSON.parse(get_responce.getContentText()) ;	
}

function main (){
	
	// ----------------------------------------------- GET THE LAST CRAWL OF A PROJECT -----------------------------------------------
	var get_result = getDataFromDeepCrawl( API_KEY, DEEP_CRAWL_PROJECT_ID );
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

	Logger.log('Last Crawl datae : ' + lastCrawl.date); 

	var get_all_reports	= getDataFromDeepCrawl( API_KEY, DEEP_CRAWL_PROJECT_ID, lastCrawl.id );
	var reportIds = get_all_reports.map( function( x ) {
										return x ;
									} );
	
	reportIds.forEach( function ( reportId ) {
		var get_rows = getDataFromDeepCrawl( API_KEY, DEEP_CRAWL_PROJECT_ID, lastCrawl.id, reportId.id);
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