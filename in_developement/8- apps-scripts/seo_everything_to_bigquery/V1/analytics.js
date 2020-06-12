
function analyticsIntoBigquery( profileId, tableName, schema, start, end ){ // , dimensions, metrics
	
	var bqSchema = {};
	
	Object.keys( schema ).forEach( function( field ){
		bqSchema[ _.camelToSnake( field ) ] = schema[ field ];
	});
	
	Logger.log( JSON.stringify( bqSchema, null, 2 ) );
	
	var dimensions = Object.keys( schema )
		.filter( function( field ){ return ANALYTICS_DIMENSION_TYPES.indexOf( schema[ field ] ) >= 0 } )
		//.map( _.snakeToCamel )
	;
	var metrics = Object.keys( schema )
		.filter( function( field ){ return dimensions.indexOf( field ) < 0 } )
		//.map( _.snakeToCamel )
	;
	
	Logger.log( 'dimensions: ' + dimensions );
	Logger.log( 'metrics: ' + metrics );
  
	var analyticsReport = requstAnalyticsReport( profileId, dimensions, metrics, start, end );
	
	Object.keys( bqSchema ).forEach( function( field, index ){
		if( bqSchema[ field ] == 'DATETIME' ){
			analyticsReport.forEach( function( row ){
				row[ index ] = row[ index ].substring( 0, 4 ) + '-' + row[ index ].substring( 4, 6 ) + '-' + row[ index ].substring( 6, 8 );
			});
		}
	});
	
    Logger.log( 'first item  :  ' + analyticsReport[ 0 ] );

	dropTable( tableName );	
	createTable( tableName, bqSchema );

	
	var jobIds = loadIntoBigquery( toCsvChunks( analyticsReport ), tableName );
	
	return jobIds;
}

/**
 * Runs a report of an Analytics profile ID. Creates a sheet with the report.
 * @param  {string} profileId The profile ID.
 */
function requstAnalyticsReport( profileId, dimensions, metrics, start, end ){
	//var today = new Date();
	//var oneWeekAgo = new Date( today.getTime() - 7 * 24 * 60 * 60 * 1000 );
	
	var startDate = Utilities.formatDate(
		new Date( start ),
		Session.getScriptTimeZone(),
		'yyyy-MM-dd'
	);
	var endDate = Utilities.formatDate(
		new Date( end ),
		Session.getScriptTimeZone(),
		'yyyy-MM-dd'
	);
	
	var tableId = 'ga:' + profileId;
	var dimensions = dimensions.map( function( x ){ return 'ga:' + x } ).join( ',' );
	var metrics =  metrics.map( function( x ){ return 'ga:' + x } ).join( ',' );
  
	var options = {
        'dimensions' : dimensions,
		//'sort': '-ga:pageviews,ga:source',
		'filters': 'ga:medium==organic',
		//'max-results': 25,
	};
	var report = Analytics.Data.Ga.get( tableId, startDate, endDate, metrics, options );
	if( report.rows ){
		Logger.log( JSON.stringify( report.columnHeaders, null, 2 ) );
		//Logger.log( JSON.stringify( report.rows, null, 2 ) );
		return report.rows;
	} else {
		Logger.log( 'No rows returned.' );
		return [[]];
	}
}

