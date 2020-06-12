
var ACCOUNT_ID = 1182117027;
var TIME = '20190101,20190730';
var CAMPAIGN_IDS = []; // 131464086
var SEPARATOR = " ";
var ID_SEPARATOR = '_';
var ID_COLUMNS = [ 'CampaignId', 'AdGroupId', 'KeywordId', 'Query' ];
var METRICS = [ 'Clicks', 'Cost', 'Conversions', 'ConversionValue' ];
//var KPR_IDS = [ 'CampaignId', 'AdGroupId', 'Id' ];
//var KPR_METRICS = [ 'Clicks', 'AveragePageviews', 'AverageTimeOnSite', 'BounceRate' ];
var EXCEL_SEPARATOR = '\t';
var LINE_SEPARATOR = '\n';

function profiler( name, logInterval ){
	var count = 0;
	var skippedLogs = 0;
	var sumMillis = 0;
	var l = null;
	return {
		start : function(){
			l = (new Date() ).getTime();
		},
		end : function(){
			sumMillis += (new Date() ).getTime() - l;
			count++;
			if( ++skippedLogs >= logInterval ){
				skippedLogs = 0;
				this.log();
			}
		},
		log : function(){
			Logger.log( name + ': iterations: ' + count + ', duration: ' + sumMillis + ', avg duration: ' + Math.floor( sumMillis / count ) );
		}
	};
}

function getReport( query ){
	var rows = AdWordsApp.report( query ).rows();
	var res = [];
	while( rows.hasNext() ){
		res.push( rows.next() );
	}
	return res;
}

// ####################################################
function mailGun( to, subject, text, attachment ){
	Logger.log( 'fetch URL' );

	return UrlFetchApp.fetch(
		'https://api.mailgun.net/v3/mg.peakace.de/messages',
		{
			//contentType : 'multipart/form-data',
			method : 'post',
			payload : {
				from : 'adwords_scripts@mg.peakace.de',
				to : to,
				subject : subject,
				text : text,
				attachment :  Utilities.newBlob( attachment, 'text/plain', 'attachment.txt' ),
			},
			headers : {
				Authorization : 'Basic YXBpOmtleS1hYWZmMmI2MGU4MmNkMWYwOTIwYWYxNDUzZWM0MDcyOA==',
			}
		}
	 );
}
// ####################################################

function main() {
	Logger.log( 'start' );
	AdsManagerApp.select( AdsManagerApp.accounts().withIds( [ ACCOUNT_ID ] ).get().next() );
	run();
}

function run(){
	var sqWords = {};
	var conditions = [];
	if( CAMPAIGN_IDS.length > 0 ){
		conditions.push( ' CampaignId IN [' + CAMPAIGN_IDS + '] ' );
	}
	var query = 'SELECT ' + ID_COLUMNS.join( ', ' ) + ', ' + METRICS.join( ', ' ) + ' ' +
		'FROM SEARCH_QUERY_PERFORMANCE_REPORT ' +
		( conditions.length > 0 ? 'WHERE ' + conditions.join( ' AND ' ) : '') +
		'DURING ' + TIME;
	
	var sqr = getReport( query );
	
	var myProfiler = profiler( 'myProfiler', 10000 );
	
	sqr.forEach( function( row ){
		myProfiler.start();
		row.Count = 1;
		
		explode( row.Query ).forEach( function( word ){
			sqWords[ word ] = sqWords[ word ] ? sqWords[ word ] : { Count : 0 };
			sqWords[ word ] = sum( sqWords[ word ], row );
		});
		myProfiler.end();
	});
	
	var result = Object.keys( sqWords ).filter( function( word ){
		return sqWords[ word ].Count + sqWords[ word ].Clicks >= 10;
	}).map( function( word ){
		var x = sqWords[ word ];
		var res = word
			+ EXCEL_SEPARATOR + x.Count
			+ EXCEL_SEPARATOR + x.Clicks
			+ EXCEL_SEPARATOR + Math.round( x.Conversions * 100 )
			+ EXCEL_SEPARATOR + Math.round( x.ConversionValue * 100 )
			+ EXCEL_SEPARATOR + Math.round( x.Cost * 100 )
			+ EXCEL_SEPARATOR + ( Math.round( ( x.ConversionValue - x.Cost ) / x.Clicks * 100 ) )
		;
		
		return res;
	});
	
	myProfiler.log();
	Logger.log( 'done' );
	mailGun( 'a.tissen@pa.ag', AdsApp.currentAccount().getName(), 'search queries ngrams', result.join( LINE_SEPARATOR ) );
	
}

function sum( row1, row2 ){
	var res = {};
	METRICS.forEach( function( metric ){ res[ metric ] = parseFloat( row1[ metric ] || 0 ) + parseFloat( row2[ metric ] || 0 ); } );
	res.Count = row1.Count + row2.Count;
	return res;
}

function explode( query ){
	var split = query.split( SEPARATOR );
	var res = [];
	
	for( var tupelSize = 1; tupelSize <= split.length; tupelSize++ ){
		for( var i = 0; i + tupelSize <= split.length; i++ ){
			res.push( split.slice( i, i + tupelSize ).join( SEPARATOR ) );
		}
	}
	return res;
}

