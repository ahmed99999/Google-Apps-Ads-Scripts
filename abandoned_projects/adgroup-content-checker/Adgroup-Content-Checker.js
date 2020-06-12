var MCC_NAME = 'Airbnb';

//var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1IYqSmorG9WTZfr07Dc9ChUIEkab5Sg0zFyOFDBwcPpo/edit#gid=0';
//var SETTINGS_SHEET = 'settings';
var EMAILS = ['a.tissen@pa.ag'];

var LIMIT_RESULTS_IN_EMAIL = 5;
var REPORTING_HOUR = 13;
var ACCOUNT_LIMIT = 50;
var NAME_OF_SCRIPT = 'Adgroup Content Checker';
var ADMIN_EMAIL = 'at@peakace.de';

var BIGQUERY_PROJECT_ID = 'biddy-io';
var BIGQUERY_DATASET_ID = 'pitfalls_2_' + MCC_NAME.toLowerCase();
var BIGQUERY_BACKUP_DATASET_ID = 'pitfalls_2_backup_' + MCC_NAME.toLowerCase();
var BIGQUERY_TABLE_PREFIX = 'adgroups';

var COMMON_PITFALLS_LABEL = 'PA_common_pitfalls_2_checker';

var ID_COLUMN = 1; // 0-based
var EMAIL_COLUMN = 5; // 0-based


//var IGNORE_PAUSED_CAMPAIGNS = true;

var CAMPAIGN_STATUS_PREDICATE = '[ENABLED]';
var ADGROUP_STATUS_PREDICATE = '[ENABLED]';
var CRITERIA_STATUS_PREDICATE = '[ENABLED, PAUSED]';
var AD_STATUS_PREDICATE = '[ENABLED, PAUSED]';

var DATABASE_FIELDS = {
	'campaign_name'			: 'STRING',
	'adgroup_name'			: 'STRING',
	'criteria'				: 'INTEGER',
	'keywords'				: 'INTEGER',
	'exact'					: 'INTEGER',
	'phrase'				: 'INTEGER',
	'broad'					: 'INTEGER',
	'bmm'					: 'INTEGER',
	'negative_keywords'		: 'INTEGER',
	'ads'					: 'INTEGER',
	'text_ads'				: 'INTEGER',
	'etas'					: 'INTEGER',
	'product_ads'			: 'INTEGER',
	'dsa'					: 'INTEGER',
	'enabled_dsa'			: 'INTEGER',
	'disapproved_ads'		: 'INTEGER',
};

var DELIMITER = '_^_';
// how many keywords (or ads) should be processed in one iteration:
var CHUNK_SIZE = 10000;
var CHUNK_SIZE_SCALING = 1.5;
// if "empty response" occours, then BIGQUERY_CHUNK_SIZE should be reduced
var BIGQUERY_CHUNK_SIZE = 30000;


function main(){
	log('start');
	
	createDataset( BIGQUERY_DATASET_ID );
	
	 MccApp
		.accounts()
		//.withIds( ['3519998675'] ) // DEMAND:GER
		//.withIds( ['8377951937'] ) // small account
		.withLimit( ACCOUNT_LIMIT )
		.executeInParallel(
			'processAccount',
			'finalProcessing'
		);
	
}

function processAccount(){
	var account = AdWordsApp.currentAccount();
	if( account.getName() ){
		log( 'account ' +  account.getName() );
	} else {
		debug( 'ignore empty account: ' + account.getCustomerId() );
		return;
	}
	
	var tableName = BIGQUERY_TABLE_PREFIX 
		+ '_' + account.getName().replace(/\W+/g, "_") 
		+ '_' + account.getCustomerId().replace(/\W+/g, "");
	createTable( tableName, DATABASE_FIELDS );
	
	var json = processCampaigns( tableName );
	
	return JSON.stringify( json );
}

function putIntoBigQuery( result, tableName ){
	// ---------- Put new data into BigQuery ------------
	
	//Logger.log('compute csv');
	var csvData = toCSV( result );
	//Logger.log( csvData );
	var jobIds = [];
	
	//Logger.log('load into BigQuery');
	for( var index in csvData ){
		var jobId = loadDataToBigquery( tableName , csvData[ index ] );
		jobIds.push( jobId );
	}
	
	// --------------------------------------------------
	return jobIds;
}


function campaignSelector( callback1 ){
	var chunkSize = CHUNK_SIZE;
	var sumKeywords = 0;
	var sumAds = 0;
	var campaignSelection = [];
	var callback = callback1;
	var accountName = AdWordsApp.currentAccount().getName();
	
	return function( campaign, isLast ){
		sumKeywords += campaign.keywords().get().totalNumEntities();
		sumAds += campaign.ads().get().totalNumEntities();
		campaignSelection.push( campaign );
		
		if( isLast || sumKeywords > chunkSize || sumAds > chunkSize ){
			chunkSize = chunkSize * CHUNK_SIZE_SCALING;
			callback( campaignSelection	);
			Logger.log(
				accountName + ': '
				+ ( isLast ? 'this was last chunk. ' : 'New chunkSize: ' + chunkSize + '. ' )
				+ sumKeywords + ' keywords, '
				+ sumAds + ' ads. '
				+ campaignSelection.length + ' campaigns. '
			);
			// debug( 'adjust label-marker' );
			adjustLabelMarker( campaignSelection[ campaignSelection.length -1 ] );
			sumKeywords = 0;
			sumAds = 0;
			campaignSelection = [];
		}
	}
}

function concat( f1, f2 ){
	return function(){
		return f2( f1.apply( this, arguments ) );
	}
}

function callBoth( f1, f2 ){
	return function(){
		f1.apply( this, arguments );
		f2.apply( this, arguments );
	}
}

function methodCall( functionName ){
	return function( x ){ return x[ functionName ](); };
}

function processCampaigns( tableName ){
	var allJobIds = [];
	
	var handleResults = function( rows ){
		if( rows.length ){
			debug( 'put ' + rows.length + ' adgroups into ' + tableName );
			var jobIds = putIntoBigQuery( rows, tableName );
			allJobIds = allJobIds.concat( jobIds );
		} else {
			debug( 'dont upload 0 rows to BigQuery' );
		}
	};
	
	forAllCampaigns(
		campaignSelector( concat( checkAdgroups, handleResults ) )
	);

	//debug( 'check jobs' );
	//checkJobs( allJobIds );
	
	return processResults( tableName );
}

function queryBQ( fieldNames, tableName, conditions, limit ){
	
    var query =   'SELECT ' + fieldNames.join(',') + ' '
				+ 'FROM [' 	+ 
					BIGQUERY_PROJECT_ID + ':' +
					BIGQUERY_DATASET_ID + '.' + 
					tableName + '] '
				+ ( conditions.length > 0 ? 'WHERE ' : '')	+ conditions.join(' AND ') + ' '
				+ ( limit ? 'LIMIT ' + limit : '')
	;
	return queryDataTable( query );
}


function prepareQuery( json, tableName, limitResults ){
	return function( name, condition ){
		json[ name ].result =
			SELECT( 'campaign_name', 'adgroup_name' )
			.FROM( tableName )
			.WHERE( condition )
			.LIMIT( limitResults )
			.queryBQ();
		
		var matrix =
			json[ name ].result.length < limitResults ? 
			json[ name ].result.length :
			SELECT( 'count(*)' )
			.FROM( tableName )
			.WHERE( condition )
			.queryBQ();
		json[ name ].totalCount = null;
		if( matrix && matrix.length && matrix[0].length ){
			// otherwise we could get TypeError: Cannot read property "0" from undefined.
			json[ name ].totalCount = matrix[0][0];
		}
	}
}


function processResults( tableName ){
	var json = {
		accountName : AdWordsApp.currentAccount().getName(),
		disapprovedAds : {},
		adsWithoutETAs : {},
		bmmAdgroupWithNonBmmKeywords : {},
		adgroupsWithoutCriteria : {},
		adgroupsWithoutNegativeKeywords : {},
		noDSA : false,
		waitingForReportingHour : true
	};
	
	if( now().getHours() == REPORTING_HOUR ){
		debug('reporting hour - start reporting');
		json.waitingForReportingHour = false;
		
		var queryAction = prepareQuery( json, tableName, LIMIT_RESULTS_IN_EMAIL );
	
		queryAction( 'disapprovedAds', 'disapproved_ads > 0' );
		queryAction( 'adsWithoutETAs', 'etas = 0' );
		queryAction( 'bmmAdgroupWithNonBmmKeywords',
			"( adgroup_name like '%BMM%' OR campaign_name like '%BMM%' ) AND keywords - bmm > 0" );
		queryAction( 'adgroupsWithoutCriteria', 'criteria = 0' );
		queryAction( 'adgroupsWithoutNegativeKeywords', 'negative_keywords = 0' );
	
		json.noDSA =
			SELECT( 'count(*)' )
			.FROM( tableName )
			.WHERE( 'enabled_dsa > 0' )
			.queryBQ()[0][0] == 0;
		
		// drop big-query-table
		createDataset( BIGQUERY_BACKUP_DATASET_ID );
		copyTable( BIGQUERY_DATASET_ID, tableName, BIGQUERY_BACKUP_DATASET_ID, tableName );
		dropTable( tableName );
		// drop label-marker
		dropLabel( COMMON_PITFALLS_LABEL );
	}else{
		debug( ' waiting for reporting hour' );
	}
	
	return json;
}


function checkAdgroups( campaigns ){
	var campaignIds = campaigns.map( methodCall('getId') );
	
	var res = {};
	
	SELECT( 'CampaignName', 'AdGroupName' )
	.FROM( 'ADGROUP_PERFORMANCE_REPORT' )
	.WHERE( 'CampaignStatus IN ' + CAMPAIGN_STATUS_PREDICATE,
			'AdGroupStatus IN ' + ADGROUP_STATUS_PREDICATE,
			'CampaignId IN [' + campaignIds + ']')
	.FOR_EACH( function( row ){
			var key = row[ 'CampaignName' ] + DELIMITER + row[ 'AdGroupName' ];
			res[ key ] = {
				campaignName : row[ 'CampaignName' ],
				adgroupName : row[ 'AdGroupName' ],
				countCriteria : 0,
				countKeywords : 0,
				countExactKeywords : 0,
				countPhraseKeywords : 0,
				countBroadKeywords : 0,
				countBMMKeyword : 0,
				countNegativeKeywords : 0,
				countAds : 0,
				countTextAds : 0,
				countETAs : 0,
				countProductAds : 0,
				countDSA : 0,
				countEnabledDSA : 0,
				disapprovedAds : 0,
			};
		}
	);

	SELECT( 'CampaignName', 'AdGroupName' )
	.FROM( 'CRITERIA_PERFORMANCE_REPORT' )
	.WHERE( 'CampaignStatus IN ' + CAMPAIGN_STATUS_PREDICATE,
			'AdGroupStatus IN ' + ADGROUP_STATUS_PREDICATE,
			'Status in ' + CRITERIA_STATUS_PREDICATE,
			'CampaignId IN [' + campaignIds + ']')
	.FOR_EACH( function( row ){
			var key = row[ 'CampaignName' ] + DELIMITER + row[ 'AdGroupName' ];
			
			res[ key ].countCriteria++;
		}
	);
	
	SELECT( 'CampaignName', 'AdGroupName', 'IsNegative', 'KeywordMatchType', 'Criteria' )
	.FROM( 'KEYWORDS_PERFORMANCE_REPORT' )
	.WHERE( 'CampaignStatus IN ' + CAMPAIGN_STATUS_PREDICATE,
			'AdGroupStatus IN ' + ADGROUP_STATUS_PREDICATE,
			'Status in ' + CRITERIA_STATUS_PREDICATE,
			'CampaignId IN [' + campaignIds + ']')
	.FOR_EACH( function( row ){
			var key = row[ 'CampaignName' ] + DELIMITER + row[ 'AdGroupName' ];
			
			if( row['IsNegative'] == 'true' ){
				res[ key ].countNegativeKeywords++;
			} else {
				res[ key ].countKeywords++;
				
				if( row['KeywordMatchType'] == 'Exact' ){
					res[ key ].countExactKeywords++;
				}
				if( row['KeywordMatchType'] == 'Phrase' ){
					res[ key ].countPhraseKeywords++;
				}
				if( row['KeywordMatchType'] == 'Broad' ){
					if( isBMM( row['Criteria'] ) ){
						res[ key ].countBMMKeyword++;
					} else {
						res[ key ].countBroadKeywords++;
					}
				}
			}
			
		}
	);
	
	SELECT( 'CampaignName', 'AdGroupName', 'AdType', 'Status', 'CombinedApprovalStatus' )
	.FROM( 'AD_PERFORMANCE_REPORT' )
	.WHERE( 'CampaignStatus in ' + CAMPAIGN_STATUS_PREDICATE,
			'AdGroupStatus in ' + ADGROUP_STATUS_PREDICATE,
			'Status in ' + AD_STATUS_PREDICATE,
			'CampaignId in [' + campaignIds + ']'
		)
	.FOR_EACH(
		function( row ){
			var key = row[ 'CampaignName' ] + DELIMITER + row[ 'AdGroupName' ];
			
			res[ key ].countAds++;
			
			if( row['AdType'] == 'Text ad' ){
				res[ key ].countTextAds++;
			}
			if( row['AdType'] == 'Expanded text ad' ){
				res[ key ].countETAs++;
			}
			if( row['AdType'] == 'Shopping ad' ){
				res[ key ].countProductAds++;
			}
			if( row['AdType'] == 'Dynamic search ad' ){
				res[ key ].countDSA++;
			}
			if( row['AdType'] == 'Dynamic search ad' && row['Status'] == 'enabled' ){
				res[ key ].countEnabledDSA++;
			}
			if( row['CombinedApprovalStatus'].toLowerCase() == 'disapproved' ){
				res[ key ].disapprovedAds++;
			}
		}
	);
	
	return objectToArray( res ).map( objectToArray );
}

function isBMM( keyword ){
	return keyword
		.split(' ')
		.filter( function( word ){ return word.indexOf('+') != 0 } ).length == 0;
}

function objectToArray( obj ){
	return Object.keys( obj ).map( function( x ){ return obj[x] } );
}




/*
 * Remove the label from all campaigns and adgroups. Then add it to the arguments.
 * "selector" argument takes a label and returns a selector of items
 * from which the label should be removed.
 * Finally the label will be applied to the item argument.
*/
function adjustLabelMarker( item ){
	// create label if needed
	createLabel( COMMON_PITFALLS_LABEL );
	
	findLabel( COMMON_PITFALLS_LABEL )
		.call( 'campaigns' )
		.call( 'get' )
		.forEach(
			function( campaign  ){ campaign.removeLabel( COMMON_PITFALLS_LABEL ) }
		);
	
	item.applyLabel( COMMON_PITFALLS_LABEL );
}


function findLabel( labelName ){
	var iter = AdWordsApp
			.labels()
			.withCondition('Name = "' + labelName + '"')
			.get();
	if( iter.hasNext() ){
		return optional( iter.next() );
	}
	return optional( null, 'Iterator has no items.' );
}

function createLabel( labelName ){
	if( !findLabel( labelName ).isPresent() ){
		AdWordsApp.createLabel( labelName );
	}
}

function dropLabel( labelName ){
	findLabel( labelName ).call('remove');
}





// forEach2 calls consumer(item) for all items returned by iterator starting with the item which fullfills the startCondition
function forEach2( iterator, consumer, startCondition ){
	var found = false;
	while( iterator.hasNext() ){
		var item = iterator.next();
		
		if( !found && startCondition && startCondition.isPresent() ){
			if( startCondition.get()( item.getId() ) ){
				found = true;
			}
			continue;
		}
		consumer( item, !iterator.hasNext() );
	}
}

function equalityPredicate( val ){
	return function( otherVal ){ return val == otherVal };
}

function forAllCampaigns( callBack ){
	var startCondition =
		findLabel( COMMON_PITFALLS_LABEL )
		.call( 'campaigns' )
		.call( 'get' )
		.onlyIf( 'hasNext' )
		.call( 'next' )
		.call( 'getId' )
		.map( equalityPredicate );
	
	var iterator = AdWordsApp.campaigns();
	
	//if( IGNORE_PAUSED_CAMPAIGNS ){
	//	iterator = iterator.withCondition("Status != PAUSED");
	//}

	iterator = iterator.orderBy('Name').get();
	
	forEach2(
		iterator,
		callBack,
		startCondition
	);
}

function concatIterators( iter1, iter2 ){
	var firstHas = true;
	return {
		hasNext : function(){
			if( firstHas ){
				return (firstHas = iter1.hasNext());
			}
			return iter2.hasNext();
		},
		next : function(){
			return firstHas ? iter1.next() : iter2.next();
		}
	};
}


function getDateInTimeZone( timeZone ){ // 'Europe/Berlin'
	var now = new Date( 
		Utilities.formatDate( 
		new Date(),
		timeZone,
		'MMM dd,yyyy HH:mm:ss'
		)
	);
	return now;
}

function now(){
	return getDateInTimeZone( 'Europe/Berlin' );
}


var COLUMN_DELIMITER = '</td><td>';
var ROW_DELIMITER = '</td></tr><tr><td>';

function joiner( delimiter ){
	return function( str ){ return str.join( delimiter ) };
}

function formatResults( json ){
	if( json.waitingForReportingHour ){
		return '';
	}
	var res = '<table>';
	
	res += '<tr><td colspan="2"><h1>' + json.accountName + '</h1></td></tr>';
	res += formatPart( json, 'disapprovedAds' );
	res += formatPart( json, 'adsWithoutETAs' );
	res += formatPart( json, 'bmmAdgroupWithNonBmmKeywords' );
	res += formatPart( json, 'adgroupsWithoutCriteria' );
	res += formatPart( json, 'adgroupsWithoutNegativeKeywords' );
	if( json.noDSA ){
		res += '<tr><td colspan="2"><h2>No DSA found in ' + json.accountName + '</h2></td></tr>';
	}
	return res + '</table>';
}

function formatPart( json, name ){
	var part = json[ name ];
	var res = '';
	if( part.result && part.result.length > 0 ){
		res += '<tr><td colspan="2"><h2>found ' + name + ' in:</h2></td></tr>';
		res += '<tr><td>';
		res += part.result
			.map( joiner( COLUMN_DELIMITER ) )
			.join( ROW_DELIMITER );
		res += '</td></tr>';
		if( part.totalCount ){
			var dif = part.totalCount - part.result.length;
			if( dif > 0 ){
				res += '<tr><td colspan="2">... and ' + dif + ' other </td></tr>';
			}	
		}else{
			res += '<tr><td colspan="2">... and unknown many others </td></tr>';
		}
	}
	return res;
}


function finalProcessing( results ){
	var results2 = parseResults( results );
	
	//var emails = getEmails();
	
	var emailMap = {};
	for ( var accountId in results2 ) {
		var resultX = results2[ accountId ];
		// its an [] of strings
		var emailsForThisAccount = EMAILS; //emails[ accountId ];
		
		if( ! emailsForThisAccount ){
			log( 'seems like there are no recipients for account ' + accountId );
			continue;
		}
		var formatted = formatResults( resultX );
		
		emailsForThisAccount.forEach( function( email ){
			emailMap[ email ] = emailMap[ email ] ? emailMap[ email ] : '';
			emailMap[ email ] += formatted;
		});
	}
	
	for( email in emailMap ){
		var html = emailMap[ email ];
		if( html ){
			log('sending emails to ' + email);
			//html += '<br>' + SPREADSHEET_URL + '<br>';
			mailGunHtml( email, NAME_OF_SCRIPT + ' - ' + MCC_NAME, html );
		}
	}
	
}


function parseResults( results ){
	var res = {};
	
	var errors = {};
	
	for( var i = 0; i < results.length; i++ ){
		
		var status = results[i].getStatus();
		var error = results[i].getError();
		if( error ){
			errors[ error ] = ( errors[ error ] ? errors[ error ] : 0 ) + 1;
		}
		
		if( results[i].getReturnValue() == 'undefined' ){
			// yes, adwords scripts really returns a string 'undefined'
			// thread returned nothing. E.g. "return;"
			continue;
		}
		
		
		var resultX = JSON.parse( results[i].getReturnValue() );
		
		if( null == resultX ){
			// error in thread
			continue;
		}
		// getCustomerId() gives strings a la '123-456-7890'
		res[ results[i].getCustomerId() ] = resultX;
	}
	
	if( errors['Exceeded maximum execution time'] ){
		// its normal that script hits maximum execution time
		// dont send emails for this issue
		delete errors['Exceeded maximum execution time'];
	}
	var keys = Object.keys( errors );
	if( keys.length > 0 ){
		mailGun( ADMIN_EMAIL, 'errors in ' + NAME_OF_SCRIPT + ' - ' + MCC_NAME, keys.join('\n') );
	}
	
	return res;
}





function log( value ){
	Logger.log( value );
}

function debug( value ){
	Logger.log( value );
}


// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\

function SELECT(){
	var fields = Array.prototype.slice.call( arguments );
	return {
		FROM : function( report ){
			return {
				DURING : function( from, to ){
					return {
						FOR_EACH : function( callback ){
							retrieveAdwordsReport( fields, report, [], from + ',' + to, callback );
						}
					};
				},
				WHERE : function(){
					var conditions = Array.prototype.slice.call( arguments );
					return {
						DURING : function( from, to ){
							return {
								FOR_EACH : function( callback ){
									retrieveAdwordsReport( fields, report, conditions, from + ',' + to, callback );
								}
							};
						},
						FOR_EACH : function( callback ){
							retrieveAdwordsReport( fields, report, conditions, '', callback );
						},
						queryBQ : function(){
							return queryBQ( fields, report, conditions, null );
						},
						LIMIT : function( limit ){
							return {
								queryBQ : function(){
									return queryBQ( fields, report, conditions, limit );
								}
							};
						}
					};
				},
				FOR_EACH : function( callback ){
					retrieveAdwordsReport( fields, report, [], '', callback );
				},
				queryBQ : function(){
					return queryBQ( fields, report, [], null );
				},
				LIMIT : function( limit ){
					return {
						queryBQ : function(){
							return queryBQ( fields, report, [], limit );
						}
					};
				}
			};
		}
	};
}

function retrieveAdwordsReport( fieldNames, reportName, conditions, during, callback ){
	
    var query =   'SELECT ' + fieldNames.join(',') + ' '
				+ 'FROM ' 	+ reportName + ' '
				+ ( conditions.length > 0 ? 'WHERE ' : '')	+ conditions.join(' AND ') + ' '
				+ ( during && during.length > 0 ? 'DURING ' : '' ) + ( during ? during : '' )
	;
	
	var rows = AdWordsApp.report( query ).rows();
	
	while( rows.hasNext() ){
		callback( rows.next() );
	}
}


// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\
// \\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\\


// ####################################################
// ####################################################

function mailGunHtml( to, subject, html ){
  return mailGunSender( to, subject, null, html );
}

function mailGun( to, subject, text ){
  return mailGunSender( to, subject, text );
}

function mailGunSender( to, subject, text, html ){
	if( html ){
		if( ! text ){
			text = 'this is supposed to be a html email. Seems like your device doesn\'t support html emails.';
		}
		html = '<html><body>' + html + '</body></html>';
	}else{
		html = null;
	}
	
	return UrlFetchApp.fetch(
		'https://api.mailgun.net/v3/mg.peakace.de/messages',
		{
			"method" : "post",
			"payload" : {
				'from' 		: "adwords_scripts@mg.peakace.de",
				'to' 		: to,
				'subject' 	: subject,
				'text'		: text,
				'html'		: html,
			},
			"headers": {
				"Authorization" : "Basic YXBpOmtleS1hYWZmMmI2MGU4MmNkMWYwOTIwYWYxNDUzZWM0MDcyOA==",
			}
		}
	);
}

// ####################################################
// ####################################################

function mailToAdmin( text ){
	mailGun( ADMIN_EMAIL, NAME_OF_SCRIPT + ' ' + MCC_NAME, text );
}

function quote( str ){
	return '"' + str.replace(/"/g, '\\"' ) + '"';
}




// ++++++++++++++++++++++++++++++++++++++++++
// ++++++++++++++++++++++++++++++++++++++++++


// assume that data is [][]
function toCSV( data ){
	var chunks = [];
	var csvRows = [];
	var count = 0;
	
	for( var rowIndex in data ){
		var row = [];
		
		for( var colIndex in data[ rowIndex ] ){
			var value = normalizeValueForBQ( data[ rowIndex ][ colIndex ] );
			row.push( value );
		}
		csvRows.push( row.join(',') );
		
		count++;
		
		if( count % BIGQUERY_CHUNK_SIZE == 0 ){
			chunks.push( csvRows.join('\n') );
			csvRows = [];
		}
	}
	chunks.push( csvRows.join('\n') );
	
	return chunks;
	
}

function checkJobs( jobIds ){
	var states = {};
	for( var i in jobIds ){
		var jobId = jobIds[i];
		if( jobId == 'error' ){
			// ignore
			continue;
		}
		var job = BigQuery.Jobs.get( BIGQUERY_PROJECT_ID, jobId );
		var state = job.status.state;
		states[ state ] = ( states[ state ] || 0 ) + 1;
		
		if( job.status.errorResult ){
			log( 'message : ' + job.status.errorResult.message ); //  "Too many errors encountered."
			log( 'location : ' + job.status.errorResult.location ); // undefined
			log( 'Debug-info: ' + job.status.errorResult.debugInfo ); // undefined	
		}
	}
	// log( JSON.stringify( states ) );
	
	if( states[ 'RUNNING' ] ){
		Utilities.sleep(5000);
		checkJobs( jobIds );
	}
}

/**
 * Polls until all jobs are 'DONE'.
 *
 * @param {Array.<string>} jobIds The list of all job ids.
 */
function waitTillJobsComplete( jobIds ) {
  var complete = false;
  var remainingJobs = jobIds;
  while (!complete) {
    if (AdWordsApp.getExecutionInfo().getRemainingTime() < 5){
      log('Script is about to timeout, jobs ' + remainingJobs.join(',') +
        ' are still incomplete.');
    }
    remainingJobs = getIncompleteJobs(remainingJobs);
    if (remainingJobs.length == 0) {
      complete = true;
    }
    if (!complete) {
      //Logger.log(remainingJobs.length + ' jobs still being processed.');
      // Wait 5 seconds before checking status again.
      Utilities.sleep(5000);
    }
  }
 //Logger.log('All jobs processed.');
}

/**
 * Iterates through jobs and returns the ids for those jobs
 * that are not 'DONE'.
 *
 * @param {Array.<string>} jobIds The list of job ids.
 *
 * @return {Array.<string>} remainingJobIds The list of remaining job ids.
 */
function getIncompleteJobs( jobIds ){
  var remainingJobIds = [];
  for (var i = 0; i < jobIds.length; i++){
    var jobId = jobIds[i];
    var getJob = BigQuery.Jobs.get( BIGQUERY_PROJECT_ID, jobId );
    if( getJob.status.state != 'DONE' ){
      remainingJobIds.push(jobId);
    }
	/*
	else{
      log( 'Job-State: ' + getJob.status.state );
      log( 'message : ' + getJob.status.errorResult.message );
      log( 'location : ' + getJob.status.errorResult.location );
      log( 'Debug-info: ' + getJob.status.errorResult.debugInfo );
	}
	*/
  }
  return remainingJobIds;
}



/**
 * Creates a BigQuery insertJob to load csv data.
 *
 */
function loadDataToBigquery( tableName, data ) {
	// Convert to Blob format.
	var blobData = Utilities.newBlob( data, 'application/octet-stream' );
	// Create the data upload job.
	var job = {
		configuration : {
			load : {
				destinationTable: {
					projectId		: BIGQUERY_PROJECT_ID,
					datasetId		: BIGQUERY_DATASET_ID,
					tableId			: tableName
				},
				skipLeadingRows		: 0, // no header row
				writeDisposition	: 'WRITE_APPEND', //'WRITE_TRUNCATE',
			}
		}
	};

	try{
		var insertJob = BigQuery.Jobs.insert( job, BIGQUERY_PROJECT_ID, blobData );
		//Logger.log('Load job started for %s. Check on the status of it here: ' +
		//   'https://bigquery.cloud.google.com/jobs/%s', tableName,
		//   BIGQUERY_PROJECT_ID);
		return insertJob.jobReference.jobId;
	}catch( error ){
		Logger.log( error + ' - ' + tableName );
		mailToAdmin( error + ' - ' + tableName );
		return 'error';
	}
}


function normalizeValueForBQ( value ){
	value = value + '';
	var hasQuotes = value.indexOf('"') >= 0;
	if( value.indexOf(',') >= 0 || hasQuotes || value.indexOf('\n') >= 0  ){
		if( hasQuotes ){
			value = value.replace(new RegExp( '"', 'g'), '""');
		}
		value = '"' + value + '"';
	}
	return value;	
}


function createDataset( datasetId ){
	if( datasetExists( datasetId ) ){
		return;
	}

	var dataSet = BigQuery.newDataset();
	dataSet.friendlyName = datasetId;
	dataSet.datasetReference = BigQuery.newDatasetReference();
	dataSet.datasetReference.projectId = BIGQUERY_PROJECT_ID;
	dataSet.datasetReference.datasetId = datasetId;

	dataSet = BigQuery.Datasets.insert( dataSet, BIGQUERY_PROJECT_ID );
	Logger.log( 'Created dataset with id %s.', dataSet.id ); 
}

function datasetExists( datasetId ) {
	var datasets = BigQuery.Datasets.list( BIGQUERY_PROJECT_ID );

	// Iterate through each dataset and check for an id match.
	if( datasets.datasets != null ){
		for( var i = 0; i < datasets.datasets.length; i++ ){
			var dataset = datasets.datasets[i];
			if( dataset.datasetReference.datasetId == datasetId ){
				return true;
			}
		}
	}
	return false;
}


function dropTable( tableName ){
	if( tableExists( tableName ) ){
		BigQuery.Tables.remove( BIGQUERY_PROJECT_ID, BIGQUERY_DATASET_ID, tableName );
		//Logger.log('Table %s dropped.', tableName );
	}
}


/**
 * Creates a new table.
 *
 * If a table with the same id already exists - do nothing.
 *
 * @param {String} name of table
 * @param {String->String} map from field-names to field-types
 */
function createTable( tableName, fields ){
	if( tableExists( tableName ) ){
		return;
	}

	var table = BigQuery.newTable();
	var schema = BigQuery.newTableSchema();
	var bigQueryFields = [];

	for( fieldName in fields ) {
		var bigQueryFieldSchema = BigQuery.newTableFieldSchema();
		bigQueryFieldSchema.description = fieldName;
		bigQueryFieldSchema.name = fieldName;
		bigQueryFieldSchema.type = fields[ fieldName ];
		bigQueryFields.push( bigQueryFieldSchema );
	}

	schema.fields = bigQueryFields;
	table.schema = schema;
	table.friendlyName = tableName;

	table.tableReference = BigQuery.newTableReference();
	table.tableReference.projectId = BIGQUERY_PROJECT_ID;
	table.tableReference.datasetId = BIGQUERY_DATASET_ID;
	table.tableReference.tableId = tableName;

	try{
		table = BigQuery.Tables.insert(
			table,
			BIGQUERY_PROJECT_ID,
			BIGQUERY_DATASET_ID
		);
	}catch( error ){
		// table already exists
		//Logger.log( '----------------------> ' + error + ' - ' + tableName );
		//mailToAdmin( error + ' - ' + tableName );
	}
}



/**
 * Checks if table already exists in dataset.
 *
 * @param {string} tableId The table id to check existence.
 *
 * @return {boolean}  Returns true if table already exists.
 */
function tableExists( tableId ){
	var pageToken = ''; // start with empty pageToken
	var resultsPerPage = 150;
	var finished = false;
	
	while( ! finished ){
		// Get a list of a part of the tables in the dataset.
		var tables = BigQuery.Tables.list(
			BIGQUERY_PROJECT_ID,
			BIGQUERY_DATASET_ID,
			{
				pageToken  : pageToken,
				maxResults : resultsPerPage
			}
		);
		pageToken = tables.nextPageToken;
      
		if( ! pageToken ){
			finished = true;
		}
		// Iterate through each table and check for an id match.
		if ( tables.tables != null ){
			for( var i = 0; i < tables.tables.length; i++ ){
				var table = tables.tables[i];
				if ( table.tableReference.tableId == tableId ) {
					return true;
				}
			}
		}
	}
	return false;
}


function copyTable( srcDataset, srcTableId, destDataset, destTableId ){
	var job = {
		configuration: {
			copy: {
				sourceTable : {
					projectId	: BIGQUERY_PROJECT_ID,
					datasetId	: srcDataset,
					tableId		: srcTableId
				},
				destinationTable: {
					projectId	: BIGQUERY_PROJECT_ID,
					datasetId	: destDataset,
					tableId  	: destTableId
				},
				createDisposition	: 'CREATE_IF_NEEDED',
				writeDisposition	: 'WRITE_TRUNCATE',
			}
		}
	};
	BigQuery.Jobs.insert( job, BIGQUERY_PROJECT_ID );
}


function queryDataTable( query ){
	var queryRequest = BigQuery.newQueryRequest();
	queryRequest.query = query;
	var job = BigQuery.Jobs.query( queryRequest, BIGQUERY_PROJECT_ID );

	if( job.jobComplete ){
		if( job.rows ){
			// make a [][] from the strange shit bigquery api gives us
			return job.rows.map( function( row ){ return row.f.map( attribute('v') ) } );
		} else {
			return [];
		}
	} else {
		return [];
		// is this possible?
		// and what to do about it?
		// wait? or return [] ?
		// ???
	}
}

// ++++++++++++++++++++++++++++++++++++++++++
// ++++++++++++++++++++++++++++++++++++++++++

function attribute( name ){
	return function( x ){ return x[ name ] };
}


function getEmails(){
	//var values = readFromSheet();
	/*
	var res = {};
	// find emails
	for( var row = 1; row < values.length; row++ ){
		var accountId = values[ row ][ ID_COLUMN ];
		var emails = values[ row ][ EMAIL_COLUMN ];
		if( emails ){
			res[ accountId ] = emails.split(',').map( function( x ){ return x.trim(); } );
		}
	}
	*/
	
	return res;
}

/*
function readFromSheet(){
	var book = SpreadsheetApp.openByUrl( SPREADSHEET_URL );
	var sheet = book.getSheetByName( SETTINGS_SHEET );
	
	if( ! sheet ){
		throw new Error('no sheet "' + SETTINGS_SHEET + '" found!');
	}
  
	var values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
	return values;
}
*/

// -----------------------------------------------
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
		map : 			function( mapper )				{ return isNull ? this : optional( mapper( value ) ) },
		call : 			function( method )				{ return isNull ? this : optional( value[ method ]() ) },
		filter : 		function( predicate )			{ return isNull || predicate( value ) ? this : optional() },
		onlyIf : 		function( method )				{ return isNull || value[ method ]() ? this : optional() },
		isPresent : 	function()						{ return !isNull },
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