var TIME = '20171201,20180308';
var CAMPAIGN_IDS = [ 131464086 ];
var SEPARATOR = " ";
var ID_SEPARATOR = '_';
var ID_COLUMNS = [ 'CampaignId', 'AdGroupId', 'KeywordId', 'Query' ];
var METRICS = [ 'Clicks', 'Cost', 'Conversions', 'ConversionValue' ];
var KPR_IDS = [ 'CampaignId', 'AdGroupId', 'Id' ];
var KPR_METRICS = [ 'Clicks', 'AveragePageviews', 'AverageTimeOnSite', 'BounceRate' ];

function getReport( query ){
  var rows = AdWordsApp.report( query ).rows();
  var res = [];
  while( rows.hasNext() ){
    res.push( rows.next() );
  }
  return res;
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


function main() {
  var sqWords = {};
  var sqr = getReport(
    'SELECT ' + ID_COLUMNS.join( ', ' ) + ', ' + METRICS.join( ', ' ) + ' ' +
    'FROM SEARCH_QUERY_PERFORMANCE_REPORT ' +
      'WHERE CampaignId IN [' + CAMPAIGN_IDS + '] ' +
        'DURING ' + TIME );
  var kpr = getReport(
    'SELECT ' + KPR_IDS.join( ', ' ) + ', ' + KPR_METRICS.join( ', ' ) + ' ' +
    'FROM KEYWORDS_PERFORMANCE_REPORT ' +
      'WHERE CampaignId IN [' + CAMPAIGN_IDS + '] ' +
        'DURING ' + TIME );
  var kpr2 = partition( kpr ).by( KPR_IDS );
	
  sqr.forEach( function( row ){
    row.count = 1;
	var kprRow = kpr2[ row.CampaignId + ID_SEPARATOR + row.AdGroupId + ID_SEPARATOR + row.KeywordId ];
	if( ! kprRow ){
		Logger.log( 'no kprRow found for ' + row.CampaignId + '|' + row.AdGroupId + '|' + row.KeywordId );
	}else{
		Logger.log( 'found' );
	}
	row.kprMetrics = {};
	KPR_METRICS.forEach( function( kprMetric ){
		row.kprMetrics[ kprMetric ] = kprRow[ kprMetric ];
	});
    explode( row.Query )
    .forEach( function( word ){
      sqWords[ word ] = sqWords[ word ] ? sqWords[ word ] : { count : 0, kprMetrics : {} };
      sqWords[ word ] = sum( sqWords[ word ], row );
    });
  });
  
  Logger.log( JSON.stringify( sqWords ) );
}

function sum( row1, row2 ){
  var res = {};
  METRICS.forEach( function( metric ){ res[ metric ] = parseFloat( row1[ metric ] || 0 ) + parseFloat( row2[ metric ] || 0 ); } );
  res.count = row1.count + row2.count;
  res.kprMetrics[ kprMetric ] = { Clicks : row1.kprMetrics.Clicks + row2.kprMetrics.Clicks };
	[ 'AveragePageviews', 'AverageTimeOnSite', 'BounceRate' ].forEach( function( kprMetric ){
		res.kprMetrics[ kprMetric ] = 
			( row1.kprMetrics[ kprMetric ] * row1.kprMetrics.Clicks 
			+ row2.kprMetrics[ kprMetric ] * row2.kprMetrics.Clicks )
			/ ( row1.kprMetrics.Clicks + row2.kprMetrics.Clicks );
	});
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

