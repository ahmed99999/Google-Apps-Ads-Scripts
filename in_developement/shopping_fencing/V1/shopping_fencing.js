
var SOURCE_ACCOUNT_IDS = [ 1182117027 ]; // die Kartenmacherei
var TARGET_ACCOUNT_ID = 9031124505; // Script-Account #4
var SEPARATOR = " ";
var ID_SEPARATOR = '_';

var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1jsGNA9Po-CYf3_GvHNPj2luMyPfSpsUQlTN45-4a7cc/edit#gid=0';
var SS = SpreadsheetApp.openByUrl( SPREADSHEET_URL );
var SHEET = SS.getSheetByName( 'Settings' );

var PROFITABILY_GROUP1 = parseInt( SHEET.getRange('G2').getValue() );
var PROFITABILY_GROUP2 = parseInt( SHEET.getRange('H2').getValue() );

var HIGHT_CAMPAIGN_NAME_CONTAINS = 'high';
var MIDDLE_CAMPAIGN_NAME_CONTAINS = 'middle';
var LOW_CAMPAIGN_NAME_CONTAINS = 'low';
var MODE = 1;

var IGNORE_SHORT_WORDS = 3;
var ID_COLUMNS = [ 'Query', 'CampaignId', 'AdGroupId', 'KeywordId' ]; 
var METRICS = [ 'Clicks', 'Cost', 'Conversions', 'ConversionValue' ];
var LAST_N_DAYS = 15;

var CONDITIONS = {
	CAMPAIGN : {
		NAME_CONTAINS: [],
		NAME_DOES_NOT_CONTAIN : [],
		STATUS_IN : [],
	},
	AD_GROUP : {
		NAME_CONTAINS:[],
		NAME_DOES_NOT_CONTAIN:[],
		STATUS_IN : [],
	}
};

function apply( item, arg ){
	if( typeof arg == 'function' ){
		return arg( item );
	}
	if( typeof item[ arg ] == 'function' ){
		return item[ arg ]();
	}
	if( typeof item[ arg ] != 'undefined' ){
		return item[ arg ];
	}
	if( typeof arg[ item ] != 'undefined' ){
		return arg[ item ];
	}
	throw new Error( 'apply() can\'t determine what to do with ' + item + ' and ' + arg );
}

function property(){
	var args = Array.prototype.slice.call( arguments );
	var f = function( item ){
		// do NOT use reduce here, because apply will interpret the third argument :(
		var res = item;
		args.forEach( function( arg ){ res = apply( res, arg ) } );
		return res;
	};
	f.name1 = args.join( '_' ); // this improves groupBy() output
	f.equals = function( value ){
		return function( item ){
			return f( item ) == value;
		}
	};
	f.eq = f.equals;
	f.lt = function( value ){
		return function( item ){
			return f( item ) < value;
		}
	};
	f.le = function( value ){
		return function( item ){
			return f( item ) <= value;
		}
	};
	f.gt = function( value ){
		return function( item ){
			return f( item ) > value;
		}
	};
	f.endsWith = function( value ){
		return function( item ){
			var x = f( item );
			return x.indexOf( value ) == x.length - value.length;
		}
	};
	f.isEmpty = function(){
		return function( item ){
			var x = f( item );
			return x == '';
		}
	};
	f.isNotEmpty = function(){
		return function( item ){
			var x = f( item );
			return x != '';
		}
	};
	f.isDefined = function(){
		return function( item ){
			var x = f( item );
			return typeof x != 'undefined';
		}
	}
	return f;
}

function profitPerClick ( row ) {
	return ( row.ConversionValue - row.Cost ) / row.Clicks;
}

// function profitPerClick2( row ){
// 	return ( row.Conversion * CPO - row.Cost ) / row.Clicks;
// }

function flatten( acc, val ){
	return acc.concat( val );
}

function splitBy( separator ){
	return function( str ){ return str.split( separator ) };
}

function skipFirst(){
	return function( arr ){ return arr.slice( 1 ) };
}

function endsWith( pattern ){
	return function( str ){
		var index = str.indexOf( pattern );
		return index >= 0 && index == str.length - pattern.length
	};
}

function startsWith( pattern ){
	return function( str ){ return str.indexOf( pattern ) == 0 };
}

function equals( other ){
	return function( item ){ return item == other };
}

function not( predicate ){
	return function( item ){ return ! predicate( item ) };
}

function toList( iterator ){
	var list = [];
	while( iterator.hasNext() ){
		list.push( iterator.next() );
	}
	return list;
}

function surround( prefix, postfix ){
	return function( str ){ return prefix + str + postfix };
}

function initiazeConditions(){
	var conditions = SHEET.getRange( 2, 1, SHEET.getLastRow(), 6 ).getValues();
	conditions.forEach( function ( row ){
	 	if( row[0] != '' ) CONDITIONS.CAMPAIGN.NAME_CONTAINS.push( row[0] );
	 	if( row[1] != '' ) CONDITIONS.CAMPAIGN.NAME_DOES_NOT_CONTAIN.push( row[1]);
	 	if( row[2] != '' ) CONDITIONS.CAMPAIGN.STATUS_IN.push( row[2] );

	 	if( row[3] != '' ) CONDITIONS.AD_GROUP.NAME_CONTAINS.push( row[3] );
	 	if( row[4] != '' ) CONDITIONS.AD_GROUP.NAME_DOES_NOT_CONTAIN.push( row[4] );
	 	if( row[5] != '' ) CONDITIONS.AD_GROUP.STATUS_IN.push( row[5] );
	});
}

function buildConditions() {
	initiazeConditions();
	return []
	.concat( CONDITIONS.CAMPAIGN.NAME_CONTAINS.map( surround(' CampaignName CONTAINS "', '" ')) )
	.concat( CONDITIONS.CAMPAIGN.NAME_DOES_NOT_CONTAIN.map( surround(' CampaignName DOES_NOT_CONTAIN "', '" ')) )
	.concat( CONDITIONS.AD_GROUP.NAME_CONTAINS.map( surround( ' AdGroupName CONTAINS "' ,'" ' )) )
	.concat( CONDITIONS.AD_GROUP.NAME_DOES_NOT_CONTAIN.map( surround(' AdGroupName DOES_NOT_CONTAIN "', '" ')) )
	.concat( CONDITIONS.CAMPAIGN.STATUS_IN.map( surround( ' CampaignStatus IN [ "', '"]' ) ))
	.concat( CONDITIONS.AD_GROUP.STATUS_IN.map( surround( ' AdGroupStatus IN ["' , '"] ' )) );
}

function getReport( report, fields, conditions, during ){
	if( fields && Array.isArray( fields ) ){
		fields = fields.map( function( str ){ return str.trim() } ).join( ', ' );
	}
	if( conditions && conditions.length > 0 ){
		conditions = ' WHERE ' + conditions.join( ' AND ' );
	}else{
		conditions = '';
	}
	if( during ){
		during = ' DURING ' + during;
	}else{
		during = '';
	}
	var query = 'SELECT ' + fields + ' FROM ' + report + conditions + during;

	Logger.log( 'query: ' + query );

	return toList( AdsApp.report( query ).rows() );
}

function group( rows ){
	return {
		by : function( keyAttribute ){
			return {
				sum : function( value ){
					var res = {};
					rows.forEach( function( row ){
						var key = apply( row, keyAttribute );
						res[ key ] = ( res[ key ] || 0 ) + row[ value ];
					});
					return res;
				},
				count : function(){
					var res = {};
					rows.forEach( function( row ){
						var key = apply( row, keyAttribute );
						res[ key ] = ( res[ key ] || 0 ) + 1;
					});
					return res;
				},
				any : function(){
					var res = {};
					rows.forEach( function( row ){
						var key = apply( row, keyAttribute );
						res[ key ] = row;
					});
					return res;
				},
				all : function(){
					var res = {};
					rows.forEach( function( row ){
						var key = apply( row, keyAttribute );
						res[ key ] = res[ key ] || [];
						res[ key ].push( row );
					});
					return res;
				}
			};
		}
	};
}

function buildRow( headers ){
	return function( row ){
		var res = {};
		headers.forEach( function( header ){
			res[ header ] = row[ header ];
		});
		return res;
	};
}

function sum( row1, row2 ){
	var res = [ 'Count' ].concat( METRICS ).reduce(
		function( prev, metric ){
			prev[ metric ] = 
				  parseFloat( row1[ metric ] || 0 )
				+ parseFloat( row2[ metric ] || 0 )
			;
			return prev;
		},
		{}
	);
	return res;
}

function stringifyNumber ( num ){
	if ( typeof num !== 'number' ) throw new Error('stringifyNumber takes only numbers');
	return ( num > 9 ) ? ''+num : '0'+num; 
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

function negativeKeywordExist( word, negativeKeyword ){
	return ( 
		( word === negativeKeyword ) || 
		( negativeKeywordText.indexOf( word ) >= 0 ) || 
		( word.indexOf( negativeKeywordText ) >= 0 )
	);
}

function fenceInCategory( gramsGroups, campaigns, category ){
	if( campaigns.length < 3 ) {
		Logger.log( 'we have too few campaigns to fence in "'+category+'" category');
		return;
	}
	var highCampaign = campaigns.filter( function( camp ){ return camp.getName().toLowerCase().indexOf( HIGHT_CAMPAIGN_NAME_CONTAINS.toLowerCase()) >= 0})[0];
	var middleCampaign = campaigns.filter( function( camp ){ return camp.getName().toLowerCase().indexOf( MIDDLE_CAMPAIGN_NAME_CONTAINS.toLowerCase()) >= 0})[0];
	var lowCampaign = campaigns.filter( function( camp ){ return camp.getName().toLowerCase().indexOf( LOW_CAMPAIGN_NAME_CONTAINS.toLowerCase()) >= 0})[0];
	
	if ( typeof highCampaign === 'undefined' || typeof middleCampaign === 'undefined' || typeof lowCampaign === 'undefined'){
		Logger.log(
			'The account does not have a unique structure when it comes to campaigns naming.' + 
			'Please check the campaigns names, specificly : "'+category+'" category'
		);
		return;
	}

	var highGroupWords = Object.keys( gramsGroups['highProfitility'] );
	var middleGroupWords = Object.keys( gramsGroups['middleProfitility'] );
	var lowGroupWords = Object.keys( gramsGroups['lowProfitility'] );

	var highNegativeKeywords = toList( highCampaign.negativeKeywords().get() ).map( function( keyword ){ return keyword.getText();} );
	var middleNegativeKeywords = toList( middleCampaign.negativeKeywords().get() ).map( function( keyword ){ return keyword.getText();} );
	var lowNegativeKeywords = toList( lowCampaign.negativeKeywords().get() ).map( function( keyword ){ return keyword.getText();} );
	// MODE 1
	if ( typeof MODE === 'undefined' ) throw new Error( 'set ' );

	Logger.log( 'fencing inside : "' + category + '" category');
	if ( MODE === 1 ){
		highGroupWords.forEach( function( word ){
			if ( middleNegativeKeywords.indexOf( word ) < 0 ) {
				middleCampaign.createNegativeKeyword( word );
				Logger.log ( '    inside category create Negative Keyword :'+ word );
			}
			if( lowNegativeKeywords.indexOf( word ) < 0 ){
				lowCampaign.createNegativeKeyword( word );
				Logger.log ( '    inside category create Negative Keyword :'+ word );
			}
		});
		middleGroupWords.forEach( function( word ){
			if ( lowNegativeKeywords.indexOf( word ) < 0 ){
				Logger.log ( '    inside category create Negative Keyword :'+ word );
				lowCampaign.createNegativeKeyword( word );
			}
		});
	// MODE 2
	} else {
		middleGroupWords.forEach( function( word ){
			if ( highNegativeKeywords.indexOf( word ) < 0 ){
				highCampaign.createNegativeKeyword( word );
			}
		});
		lowGroupWords.forEach( function( word ){
			if ( highNegativeKeywords.indexOf( word ) < 0 ){
				highCampaign.createNegativeKeyword( word );
			}
			if ( middleNegativeKeywords.indexOf( word ) < 0 ){
				middleCampaign.createNegativeKeyword( word );
			}
		});
	}
}

function main(){
	// get sqr

	var oldCategories = SHEET.getRange( 2, 9, SHEET.getLastRow(), 1 )
		.getValues()
		.map( function( cat ){ return cat[0]; })
		.filter( function( cat ){ return cat!=='';});

	var subCategories = SHEET.getRange( 2, 12, SHEET.getLastRow(), 1)
		.getValues()
		.map( function( cat ){ return cat[0]; })
		.filter( function( cat ){ return cat!=='';});
	
	// subCategories.forEach( function( sub ){
	// 	oldCategories.forEach( function( category ){
	// 		categories.push( category + '-' + sub );
	// 	});
	// });
	var categories = oldCategories;

	var headers = ID_COLUMNS.concat( METRICS );
	var today = new Date();
	var month1 = stringifyNumber( (today.getMonth()+1) );
	var date1 = stringifyNumber( today.getDate() );
	var year1 = today.getFullYear();
	var time1 = year1 + '' + month1 + '' + date1;
	var date = ( (today.getDate() - LAST_N_DAYS) > 0 ) ? (today.getDate() - LAST_N_DAYS) : 30 + (today.getDate() - LAST_N_DAYS);
	var month =( (today.getDate() - LAST_N_DAYS) > 0 ) ? ( today.getMonth() +1 ) : ( today.getMonth() == 0 ) ? 12 : today.getMonth();
	var year = ( (today.getDate() - LAST_N_DAYS) > 0 ) ? ( today.getFullYear() ) : ( today.getMonth() == 0 ) ? today.getFullYear() - 1 : today.getFullYear();
	var time = year + '' + stringifyNumber( month ) + '' + stringifyNumber( date ) + ',' + time1;

	// get search queries from all r=the source accounts

	var sqr = [];
	if ( SOURCE_ACCOUNT_IDS.length === 0 ) SOURCE_ACCOUNT_IDS.push( AdsApp.currentAccount().getCustomerId().replace( /-/g, '' ) );
	
	SOURCE_ACCOUNT_IDS.forEach( function( accountId ){
		MccApp.select( MccApp.accounts().withIds( [ accountId ] ).get().next() );
		sqr = sqr.concat( getReport( 'SEARCH_QUERY_PERFORMANCE_REPORT', headers, buildConditions(),	time ).map( buildRow( headers ) ) );
	});

	Logger.log( sqr.length );

	// return;
	sqr.forEach( function( row ){
		row.Category = categories.filter( function( cat ){
			return row.Query.indexOf( cat ) >= 0;
		});
		if( row.Category.length == 0 ){
			row.Category = [ 'NO_CATEGORY' ];
		}
	});
	// 903-112-4505
	// 475-335-7988
	MccApp.select( MccApp.accounts().withIds( [ TARGET_ACCOUNT_ID ] ).get().next() );

	var ngrams = {};
	sqr.forEach( function( row ){
		row.Count = 1;
		//explode( row.Query )
		row.Query.split( ' ' )
			// .filter( onlyUnique )
			.forEach( function( word ){
				if( word.length <= IGNORE_SHORT_WORDS ){
					return;
				}
				// if( row.Category.indexOf(',') > 0 || row.Category.indexOf(' ') > 0 ){
				// 	return;
				// }
				ngrams[ row.Category ] = ngrams[ row.Category ] || {};
				ngrams[ row.Category ][ word ] = ngrams[ row.Category ][ word ] ? ngrams[ row.Category ][ word ] : { Count : 0 };
				ngrams[ row.Category ][ word ] = sum( ngrams[ row.Category ][ word ], row );
			})
		;
	});
	var thresholdsNgrams = {};
	Object.keys( ngrams ).forEach( function( category ){
		thresholdsNgrams[ category ] = {};
		thresholdsNgrams[ category ][ 'highProfitility' ] = {};
		thresholdsNgrams[ category ][ 'middleProfitility' ] = {};
		thresholdsNgrams[ category ][ 'lowProfitility' ] = {};

		Object.keys( ngrams[ category ] ).forEach( function( word ){
			var gram = ngrams[ category ][ word ];
			var determineGroup = profitPerClick( gram );
			gram[ 'profitPerClick' ] = determineGroup;

			if ( determineGroup < PROFITABILY_GROUP1 ) { thresholdsNgrams[ category ][ 'lowProfitility' ][ word ] = gram; }
			else if ( determineGroup < PROFITABILY_GROUP2 ) { thresholdsNgrams[ category ][ 'middleProfitility' ][ word ] = gram; }
			else { thresholdsNgrams[ category ][ 'highProfitility' ][ word ] = gram; }
		});
	});
	// FENCING

	var shoppingCampaigns = toList( AdsApp.shoppingCampaigns().get() );
	Logger.log ( 'FENCING BETWEEN CATEGORIES');
	shoppingCampaigns.forEach( function( shoppingCampaign ){
		var shoppingCampaignName = shoppingCampaign.getName();
		var fencedCategories = categories.filter( function( cat ){ return ( shoppingCampaignName.indexOf( cat ) < 0 ); });
		var category = categories.filter( function( cat ){ return ( shoppingCampaignName.indexOf( cat ) >= 0 ); })[0];
	// CATEGORY FENCING

		fencedCategories.forEach( function( cat ){
			shoppingCampaign.createNegativeKeyword( cat );
			Logger.log ( 'create Negative Keyword : "' + cat + '" in campaign : "' + shoppingCampaign.getName() + '"');
		});

		var catNegativekeyword = toList( shoppingCampaign.negativeKeywords().withCondition( 'Criteria = "'+category+'"' ).get() );
		catNegativekeyword.forEach( function( catNegKeyw ){ catNegKeyw.remove(); });
	});
	// FENCIN INSIDE CATEGORY

	categories.forEach( function( cat ){
		var relativeShoppingCampaigns = shoppingCampaigns.filter(function( camp ){ return camp.getName().toLowerCase().indexOf( cat.toLowerCase() ) >= 0; });
		if ( typeof thresholdsNgrams[ cat ] === 'undefined' ){
			Logger.log( 'no negative keywords for "'+cat+'" category to create' );
			return;
		}
		fenceInCategory( thresholdsNgrams[ cat ], relativeShoppingCampaigns, cat );
	});

	Logger.log( 'end' );
}
