
// Google sheet for output of results.
// Example: https://docs.google.com/spreadsheets/d/afagar561a6we5w165ef1s_asf32/edit?usp=sharing
var OUTPUT_SHEET_URL = '';
// If no tab exists with this name then it will be created.
// Otherwise the contents of this tab will be replaced.
var SHEET_NAME = 'output';

// Target cpo for profit computation.
var CPO = 20;
// Time frame used for downloading AdWords reports.
var TIME = '20180101,20180314';

// Use search queries with enough data (>= 25 clicks) for training of the model.
var MIN_CLICKS_FOR_TRAINING = 25;

// Take search queries with few clicks to predict profit/click.
var MAX_CLICKS_FOR_PREDICTION = 2;

// To get your project ID, open the Advanced APIs dialog, click the
// "Google Developers Console" and select the project number from the
// Overview page.
var PREDICTION_PROJECT_ID = '';

// If a model already exists then this settings can be set to false to use the existing model.
// If no model is trained yet then CREATED_MODEL should be set to true. 
// If a model is already trained and CREATED_MODEL is set to true then it will be replaced with a new model.
var CREATE_MODEL = false;
// Choose a model name. If CREATE_MODEL == true then a new model will be created (or replaced) with this name.
var PREDICTION_MODEL_NAME = 'sqr_regression';

// Use only this campaign id's for training and prediction.
// Let this list empty to apply this script to the whole account.
var CAMPAIGN_IDS = [
	// Enter a list of campaign_id here
	// Example: 123456789,
];

// -- CONSTANTS ---------------------------------------------------------
// Don't change them.
var SEPARATOR = " ";
var ID_SEPARATOR = '_';
var ID_COLUMNS = [ 'CampaignId', 'AdGroupId', 'KeywordId' ];
var CNKPR_ID_COLUMNS = [ 'CampaignId', 'Id' ];
var METRICS = [ 'Clicks', 'Cost', 'Conversions', 'ConversionValue' ];
var KPR_IDS = [ 'CampaignId', 'AdGroupId', 'Id' ];
var KPR_METRICS = [ 'Clicks', 'Cost', 'Conversions', 'ConversionValue', 'AveragePageviews', 'AverageTimeOnSite', 'BounceRate' ];
// ----------------------------------------------------------------------

function getReport( query ){
	try{
		var rows = AdWordsApp.report( query ).rows();
		var res = [];
		while( rows.hasNext() ){
			res.push( rows.next() );
		}
		return res;
	}catch( e ){
		Logger.log( 'Query: ' + query + ' -> ' + e + ' \n ' + e.stack );
		throw e;
	}
}

function clone( obj ){
	if ( obj === null || typeof( obj ) !== 'object' || 'isActiveClone' in obj ){
		return obj;
	}

	var temp;
	if ( obj instanceof Date ){
		temp = new obj.constructor(); //or new Date( obj );
	} else {
		temp = obj.constructor();
	}

	for ( var key in obj ){
		if ( Object.prototype.hasOwnProperty.call( obj, key ) ){
			obj['isActiveClone'] = null;
			temp[key] = clone( obj[key] );
			delete obj['isActiveClone'];
		}
	}
	return temp;
}

function partition( arr ){
	return partition1( arr, false );
}

function partitionToLists( arr ){
	return partition1( arr, true );
}

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

function partition1( arr, toLists ){
	return {
		by: function( keyName ){
			var res = {};

			for ( var i = 0; i < arr.length; i++ ){
				var obj = clone( arr[i] );
				var key;
				if( Array.isArray( keyName ) ){
					key = [];
					keyName.forEach( function( keyName2 ){
						if ( typeof keyName2 == 'function' ){
							key.push( keyName2( obj ) );
						} else {
							key.push( obj[ keyName2 ] );
							delete obj[ keyName2 ];
						}
					});
					key = key.join( ID_SEPARATOR );
				}else{
					if ( typeof keyName == 'function' ){
						key = keyName( obj );
					} else {
						key =  obj[ keyName ];
						delete obj[ keyName ];
					}
				}
				// init
				if( toLists ){
					res[ key ] = ( res[ key ] || [] );
					res[ key ].push( obj );
				}else{
					res[ key ] = obj;
				}
			}
			return res;
		}
	};
}

function containsOrIsContainedIn( query ){
	return function( keyword ){
		return keyword.Criteria.indexOf( query ) >= 0 || query.indexOf( keyword.Criteria ) >= 0;
	};
}

function emptyRow(){
	var res = { count : 0 };
	KPR_METRICS.forEach( function( kprMetric ){
		res[ kprMetric ] = 0;
	});
	return res;
}

var uniqueWarnings = {};
function uniqueWarning( warning, value ){
	if( !uniqueWarnings[ warning ] ){
		uniqueWarnings[ warning ] = 1;
		Logger.log( 'WARNING: ' + warning + ': ' + value );
	}
}

function createTrainingModel( matrix, output ){
  var insert = Prediction.newInsert();
  insert.id = PREDICTION_MODEL_NAME;
  
  insert.trainingInstances = matrix.map( function( row, index ){
	var trainingInstance = Prediction.newInsertTrainingInstances();
	trainingInstance.csvInstance = row;
	trainingInstance.output = output[ index ];
	return trainingInstance;
  });

  var insertReply = Prediction.Trainedmodels.insert( insert, PREDICTION_PROJECT_ID );
  Logger.log( 'Start model training.' + insertReply );
}

function makePrediction( input ){
	var request = Prediction.newInput();
	request.input = Prediction.newInputInput();
	request.input.csvInstance = input;

	var predictionResult = Prediction.Trainedmodels.predict( request, PREDICTION_PROJECT_ID, PREDICTION_MODEL_NAME );
	
	//Logger.log( 'result: ' + predictionResult.outputValue );
  
	return predictionResult.outputValue;
}

function computeItems( operator, operand ){
	
	var profilerSqr = profiler( 'sqr', 1 );
	
	profilerSqr.start();
	var sqr = getReport(
		'SELECT ' + ID_COLUMNS.join( ', ' ) + ', ' + METRICS.join( ', ' ) + ', Query, QueryMatchTypeWithVariant ' +
		'FROM SEARCH_QUERY_PERFORMANCE_REPORT ' +
		'WHERE Clicks > 0 ' +
			( CAMPAIGN_IDS.length > 0 ? ( 'AND CampaignId IN [' + CAMPAIGN_IDS.join( ',' ) + '] ' ) : '' ) +
			'AND Clicks ' + operator + ' ' + operand + ' ' +
		'DURING ' + TIME + ' '
	);
	Logger.log( sqr.length + ' queries found' );
	
	var sqWords = {};
	sqr.forEach( function( row ){
		explode( row.Query ).forEach( function( word ){
			sqWords[ word ] = sqWords[ word ] ? sqWords[ word ] : { count : 0 };
			sqWords[ word ] = sum( sqWords[ word ], row );
		});
	});

	sqr.forEach( function( row ){
		delete row.count;
		row.ngram = explode( row.Query ).map( function( word ){	sqWords[ word ].count = 1; return sqWords[ word ]; } ).reduce( sum, emptyRow() );
		minus( row.ngram, row, METRICS );
	});
	sqWords = null; // let gc do it's work
	profilerSqr.end();
	// +++++++++++++++++++++++++++++++++
	
	var profilerKpr = profiler( 'kpr', 1 );
	profilerKpr.start();
	var kpr = getReport(
		'SELECT ' + KPR_IDS.join( ', ' ) + ', ' + KPR_METRICS.join( ', ' ) + ', Criteria ' +
		'FROM KEYWORDS_PERFORMANCE_REPORT ' +
		'WHERE Clicks > 0 ' +
			( CAMPAIGN_IDS.length > 0 ? ( 'AND CampaignId IN [' + CAMPAIGN_IDS.join( ',' ) + '] ' ) : '' ) +
			'AND IsNegative = FALSE ' +
			'AND Status != REMOVED ' +
		'DURING ' + TIME
	);
	Logger.log( kpr.length + ' keywords found' );
	var kpr2 = partition( kpr ).by( KPR_IDS );
	kpr = null; // let gc do it's work
	sqr.forEach( function( row ){
		var kprRow = kpr2[ row.CampaignId + ID_SEPARATOR + row.AdGroupId + ID_SEPARATOR + row.KeywordId ];
		row.keywordMetrics = {};
		
		if( ! kprRow ){
			// it is possible that the criteria which triggered this search query was not a keyword (webpage, product, ...)
			// uniqueWarning( 'could not find keyword', row.CampaignId + ID_SEPARATOR + row.AdGroupId + ID_SEPARATOR + row.KeywordId );
		}
		KPR_METRICS.forEach( function( kprMetric ){
			row.keywordMetrics[ kprMetric ] = kprRow ? kprRow[ kprMetric ] : 0;
		});
		minus( row.keywordMetrics, row, METRICS );
	});
	kpr2 = null; // let gc do it's work
	
	profilerKpr.end();
	// +++++++++++++++++++++++++++++++++
	
	var profilerNegKpr = profiler( 'negKeyword', 1 );
	profilerNegKpr.start();
	
	var negativeKeywords = getReport(
		'SELECT ' + KPR_IDS.join( ', ' ) + ', Criteria ' +
		'FROM KEYWORDS_PERFORMANCE_REPORT ' +
		'WHERE IsNegative = TRUE ' +
			( CAMPAIGN_IDS.length > 0 ? ( 'AND CampaignId IN [' + CAMPAIGN_IDS.join( ',' ) + '] ' ) : '' ) +
			'AND Status != REMOVED '
	);
	
	var negKeywords = partitionToLists( negativeKeywords ).by( 'CampaignId' );
	Logger.log( negativeKeywords.length + ' negative keywords found' );
	negativeKeywords = null; // let gc do it's work
	
	sqr.forEach( function( row ){
		var negKeywordsList1 = ( negKeywords[ row.CampaignId ] || [] )
			.filter( containsOrIsContainedIn( row.Query ) );
		row.countNegativeAdgroupKeywords = negKeywordsList1.length;
	});
	negKeywords = null; // let gc do it's work
	profilerNegKpr.end();
	// +++++++++++++++++++++++++++++++++
	
	var profilerCnkpr = profiler( 'cnkpr', 1 );
	profilerCnkpr.start();
	
	var cnkpr = getReport(
		'SELECT ' + CNKPR_ID_COLUMNS.join( ', ' ) + ', Criteria ' +
		'FROM CAMPAIGN_NEGATIVE_KEYWORDS_PERFORMANCE_REPORT ' +
		( CAMPAIGN_IDS.length > 0 ? ( 'WHERE CampaignId IN [' + CAMPAIGN_IDS.join( ',' ) + '] ' ) : '' )
	);
	
	var cnkpr2 = partitionToLists( cnkpr ).by( 'CampaignId' );
	
	Logger.log( cnkpr.length + ' campaign negative keywords found' );
	
	cnkpr = null; // let gc do it's work
	
	sqr.forEach( function( row ){
		
		var negKeywordsList2 = ( cnkpr2[ row.CampaignId ] || [] )
			.filter( containsOrIsContainedIn( row.Query ) );
		
		row.countNegativeCampaignKeywords = negKeywordsList2.length;
	});
	cnkpr2 = null; // let gc do it's work
	profilerCnkpr.end();
	
	// +++++++++++++++++++++++++++++++++
	
	
	var adgroupStats = partitionToLists( sqr ).by( [ 'CampaignId', 'AdGroupId' ] );
	
	var countAdgroups = 0;
	for( key in adgroupStats ){
		countAdgroups++;
		adgroupStats[ key ] = adgroupStats[ key ].reduce( sum, emptyRow() );
	}
	sqr.forEach( function( row ){
		row.count = 1;
		row.adgroupStats = clone( adgroupStats[ row.CampaignId + ID_SEPARATOR + row.AdGroupId ] );
		minus( row.adgroupStats, row, METRICS );
	});
	
	adgroupStats = null; // let gc do it's work
	Logger.log( countAdgroups + ' adgroups found' );
	// +++++++++++++++++++++++++++++++++
	
	var campaignStats = partitionToLists( sqr ).by( 'CampaignId' );
	
	for( key in campaignStats ){
		campaignStats[ key ] = clone( campaignStats[ key ].reduce( sum, emptyRow() ) );
	}
	
	sqr.forEach( function( row ){
		row.campaignStats = clone( campaignStats[ row.CampaignId ] );
		minus( row.campaignStats, row, METRICS );
	});
	
	campaignStats = null; // let gc do it's work
	
	// +++++++++++++++++++++++++++++++++
	
	var sqr = partitionToLists( sqr ).by( [ 'Query', 'QueryMatchTypeWithVariant' ] );
	var sqr2 = [];
	for( var key in sqr ){
		[ query, matchType ] = key.split( ID_SEPARATOR );
		//sqr = sqr.map( function( item ){
		var item = {
			countNegativeAdgroupKeywords : 0,
			countNegativeCampaignKeywords : 0,
			Clicks : 0,
			Cost : 0,
			Conversions : 0,
			ConversionValue : 0,
			ngram : {
				Clicks : 0,
				Cost : 0,
				Conversions : 0,
				ConversionValue : 0
			},			
			keywordMetrics  : {
				AveragePageviews : 0,
				AverageTimeOnSite : 0,
				BounceRate : 0,
				Clicks : 0,
				Cost : 0,
				Conversions : 0,
				ConversionValue : 0,
			},
			adgroupStats : {
				Clicks : 0,
				Cost : 0,
				Conversions : 0,
				ConversionValue : 0
			},
			campaignStats : {
				Clicks : 0,
				Cost : 0,
				Conversions : 0,
				ConversionValue : 0
			}
		};
		for( var index in sqr[ key ] ){
			var next = sqr[ key ][ index ];
			
			if( next.keywordMetrics.Clicks == 0 ){
				// skip search queries which were not triggered by keywords
				continue;
			}
			
			item.countNegativeAdgroupKeywords += parseInt( next.countNegativeAdgroupKeywords );
			item.countNegativeCampaignKeywords += parseInt( next.countNegativeCampaignKeywords );
			item.Clicks += parseInt( next.Clicks );
			item.Cost += parseFloat( next.Cost );
			item.Conversions += parseFloat( next.Conversions );
			item.ConversionValue += parseFloat( next.ConversionValue );
			
			item.ngram.Clicks 			+= parseInt( next.ngram.Clicks );
			item.ngram.Cost 			+= parseFloat( next.ngram.Cost );
			item.ngram.Conversions 		+= parseFloat( next.ngram.Conversions );
			item.ngram.ConversionValue 	+= parseFloat( next.ngram.ConversionValue );
			
			item.keywordMetrics.AveragePageviews = ( item.keywordMetrics.AveragePageviews * item.keywordMetrics.Clicks + parseFloat( next.keywordMetrics.AveragePageviews ) * parseInt( next.keywordMetrics.Clicks ) ) /
				( item.keywordMetrics.Clicks + parseInt( next.keywordMetrics.Clicks ) );
			item.keywordMetrics.AverageTimeOnSite = ( item.keywordMetrics.AverageTimeOnSite * item.keywordMetrics.Clicks + parseFloat( next.keywordMetrics.AverageTimeOnSite ) * parseInt( next.keywordMetrics.Clicks ) ) /
				( item.keywordMetrics.Clicks + parseInt( next.keywordMetrics.Clicks ) );
			item.keywordMetrics.BounceRate = ( item.keywordMetrics.BounceRate * item.keywordMetrics.Clicks + parseFloat(  next.keywordMetrics.BounceRate ) * parseInt( next.keywordMetrics.Clicks ) ) /
				( item.keywordMetrics.Clicks + parseInt( next.keywordMetrics.Clicks ) );
			
			item.keywordMetrics.Clicks 			+= parseInt( next.keywordMetrics.Clicks );
			item.keywordMetrics.Cost 			+= parseFloat( next.keywordMetrics.Cost );
			item.keywordMetrics.Conversions 	+= parseFloat( next.keywordMetrics.Conversions );
			item.keywordMetrics.ConversionValue += parseFloat( next.keywordMetrics.ConversionValue );
			
			item.adgroupStats.Clicks 			+= parseInt( next.adgroupStats.Clicks );
			item.adgroupStats.Cost 				+= parseFloat( next.adgroupStats.Cost );
			item.adgroupStats.Conversions 		+= parseFloat( next.adgroupStats.Conversions );
			item.adgroupStats.ConversionValue 	+= parseFloat( next.adgroupStats.ConversionValue );
			
			item.campaignStats.Clicks 			+= parseInt( next.campaignStats.Clicks );
			item.campaignStats.Cost 			+= parseFloat( next.campaignStats.Cost );
			item.campaignStats.Conversions 		+= parseFloat( next.campaignStats.Conversions );
			item.campaignStats.ConversionValue 	+= parseFloat( next.campaignStats.ConversionValue );
		}
		
		if( item.keywordMetrics.Clicks == 0 ){
			// skip search queries which were not triggered by keywords
			continue;
		}

		sqr2.push(
			{
				query : query,
				count : sqr[ key ].length,
				phrase : matchType == 'phrase' ? 1 : 0,
				near_phrase : matchType == 'phrase (close variant)' ? 1 : 0,
				exact : matchType == 'exact' ? 1 : 0,
				near_exact : matchType == 'exact (close variant)' ? 1 : 0,
				broad : matchType == 'broad' ? 1 : 0,
				count_neg_adgroup_keywords : item.countNegativeAdgroupKeywords,
				count_neg_campaign_keywords : item.countNegativeCampaignKeywords,
				clicks : item.Clicks,
				cost : item.Cost,
				conversions : item.Conversions,
				ngram_clicks : item.ngram.Clicks,
				ngram_cost : item.ngram.Cost,
				ngram_conversions : item.ngram.Conversions,
				avg_page_views : item.keywordMetrics.AveragePageviews,
				avg_time_on_site : item.keywordMetrics.AverageTimeOnSite,
				bounce_rate : item.keywordMetrics.BounceRate,
				keyword_clicks : item.keywordMetrics.Clicks,
				keyword_cost : item.keywordMetrics.Cost,
				keyword_conversions : item.keywordMetrics.Conversions,
				adgroup_clicks : item.adgroupStats.Clicks,
				adgroup_cost : item.adgroupStats.Cost,
				adgroup_conversions : item.adgroupStats.Conversions,
				campaign_clicks : item.campaignStats.Clicks,
				campaign_cost : item.campaignStats.Cost,
				campaign_conversions : item.campaignStats.Conversions,
			}
		);
	}
	
	if( sqr2.length == 0 ){
		Logger.log( 'No data found. Are you sure the search queries are triggered by keywords?' );
		return sqr2;
	}
	
	return sqr2;
}

function main(){
	
	var rowToArray = function( row ){
		return [
			row.phrase,
			row.near_phrase,
			row.exact,
			row.near_exact,
			row.broad,
			row.count_neg_adgroup_keywords,
			row.count_neg_campaign_keywords,
			row.avg_page_views, 
			row.avg_time_on_site,
			row.bounce_rate, 
			row.ngram_clicks, 
			row.ngram_cost, 
			row.ngram_conversions,
			fixNaN( ( row.ngram_conversions * CPO - row.ngram_cost ) / row.ngram_clicks ),
			row.keyword_clicks,
			row.keyword_cost,
			row.keyword_conversions,
			fixNaN( ( row.keyword_conversions * CPO - row.keyword_cost ) / row.keyword_clicks),
			row.adgroup_clicks,
			row.adgroup_cost,
			row.adgroup_conversions,
			fixNaN( ( row.adgroup_conversions * CPO - row.adgroup_cost ) / row.adgroup_clicks ),
			row.campaign_clicks,
			row.campaign_cost,
			row.campaign_conversions,
			fixNaN( ( row.campaign_conversions * CPO - row.campaign_cost ) / row.campaign_clicks ),
		];
	};
	
	var trainingData = computeItems( '>=', MIN_CLICKS_FOR_TRAINING );
	var predictionData = computeItems( '<=', MAX_CLICKS_FOR_PREDICTION );
	
	var metricsForTraining = trainingData.map(
		function( row ){
			return [
				row.query,
				row.clicks,
				row.cost,
				row.conversions
			];
		}
	);
	var metricsForPrediction = predictionData.map(
		function( row ){
			return [
				row.query,
				row.clicks,
				row.cost,
				row.conversions
			];
		}
	);
	var allMetrics = metricsForTraining.concat( metricsForPrediction );
	
	var queriesForTraining = trainingData.map( rowToArray );
	var queriesForPrediction = predictionData.map( rowToArray );
	var allQueries = queriesForTraining.concat( queriesForPrediction );
	
	// ------------------------------------------------
	// ------------ Train model ----------------------
	if( CREATE_MODEL ){
		var profitPerClick = trainingData.map(
			function( row ){
				return fixNaN( ( row.conversions * CPO - row.cost ) / row.clicks );
			}
		);
		createTrainingModel( queries, profitPerClick );
		
		var done = false;
		
		while( ! done ){
			var trainingStatus = Prediction.Trainedmodels.get( PREDICTION_PROJECT_ID, PREDICTION_MODEL_NAME ).trainingStatus;
			Logger.log( 'Wait for the model to be trained. Current status is: ' + trainingStatus );
			Utilities.sleep( 1000 );
			done = trainingStatus == 'DONE';
		}
	}
	// ------------------------------------------------
	
	// ----------- Make predictions -------------------
	var myModel = Prediction.Trainedmodels.get( PREDICTION_PROJECT_ID, PREDICTION_MODEL_NAME );
	Logger.log( 'MSE: ' + myModel.modelInfo.meanSquaredError );
	
	var prediction = allQueries
		.map( makePrediction )
		.map( function( x ){ return x/1 } ); // convert string to number
	
	
	// ------------------------------------------------
	// write into google sheets -----------------------
	
	var values = prediction.map(
		function( row, index ){
			var res = allMetrics[ index ]
				.concat( allQueries[ index ] )
				.concat(
					( profitPerClick[ index ] || '-' )
					,
					prediction[ index ]
				)
			;
			return res;
		}
	);
	
	var headers = [
		'sq',
		'clicks',
		'Cost',
		'Conversions',
		'phrase',
		'phrase (close variant)',
		'exact',
		'exact (close variant)',
		'broad',
		'count negative in adgroups',
		'count negative in campaigns',
		'avgPageViews',
		'avgTimeOnSite',
		'bounce-rate',
		'ngram_clicks',
		'ngram_cost',
		'ngram_conversions',
		'ngram_profit/click',
		'keyword_clicks',
		'keyword_cost',
		'keyword_conversions',
		'keyword_profit/click',
		'adgroup_clicks',
		'adgroup_cost',
		'adgroup_conversions',
		'adgroup_profit/click',
		'campaign_clicks',
		'campaign_cost',
		'campaign_conversions',
		'campaign_profit/click',
		'profit/click',
		'prediction' ];
	values.unshift( headers );
	
	var sheet = initSheet( OUTPUT_SHEET_URL, SHEET_NAME );
	sheet.clear();
	Logger.log( 'write into google sheet' );
	sheet.getRange( 1, 1, values.length, values[ 0 ].length ).setValues( values );
}

function fixNaN( value ){
	if( value != value ){
		return 0;
	}
	return value;
}

function initSheet( sheetUrl, sheetName ){
	var book = SpreadsheetApp.openByUrl( sheetUrl );
	if ( !sheetName ){
		sheetName = book.getSheetName();
	}
	var sheet = book.getSheetByName( sheetName );

	if ( !sheet ){
		sheet = book.insertSheet( sheetName );

		if ( sheet.getMaxColumns() > 1 ){
			// delete unused columns to stay below
			// the 2 mio cells limit of google sheets
			sheet.deleteColumns( 2, sheet.getMaxColumns() - 1 );
		}

		if ( sheet.getMaxRows() > 1 ){
			// delete unused rows to stay below
			// the 2 mio cells limit of google sheets
			sheet.deleteRows( 2, sheet.getMaxRows() - 1 );
		}
	}
	return sheet;
}


function sum( row1, row2 ){
  var res = {};
  METRICS.forEach( function( metric ){ res[ metric ] = parseFloat( row1[ metric ] || 0 ) + parseFloat( row2[ metric ] || 0 ); } );
  res.count = row1.count + row2.count;
  return res;
}

function minus( a, b, metrics ){
	metrics.forEach( function( metric ){
		var aOld = a[ metric ];
		if( typeof a[ metric ] == 'string' ){
			a[ metric ] = parseFloat( a[ metric ].replace( /,/g, '' ) );
		}
		if( typeof b[ metric ] == 'string' ){
			b[ metric ] = parseFloat( b[ metric ].replace( /,/g, '' ) );
		}
		a[ metric ] = a[ metric ] - b[ metric ];
		if( a[ metric ] != a[ metric ] ){
			Logger.log( '------------- NaN detected: ' + b + ' ---- ' + b[ metric ] + ' ------ ' + metric  + ' ---- ' + aOld );
		}
	});
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

