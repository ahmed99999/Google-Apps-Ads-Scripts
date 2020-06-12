
var MERCHANT_ID = '8308173';

var CONDITIONS = {
	CAMPAIGN : {
		NAME_CONTAINS: [],
		NAME_DOES_NOT_CONTAIN : [],
		STATUS_IN : [ 'ENABLED'  ],
	},
	AD_GROUP : {
		NAME_CONTAINS:[],
		NAME_DOES_NOT_CONTAIN:[],
		STATUS_IN : [ 'ENABLED' ],
	}
};

function property( prop ){
	return function( item ){
	if( typeof item[ prop ] == 'function' ){
		return item[ prop ]();
	}
		return item[ prop ];
	};
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

function buildConditions() {
	return []
	.concat( CONDITIONS.CAMPAIGN.NAME_CONTAINS.map( surround(' CampaignName CONTAINS "', '" ')) )
	.concat( CONDITIONS.CAMPAIGN.NAME_DOES_NOT_CONTAIN.map( surround(' CampaignName DOES_NOT_CONTAIN "', '" ')) )
	.concat( CONDITIONS.AD_GROUP.NAME_CONTAINS.map( surround( ' AdGroupName CONTAINS "' ,'" ' )) )
	.concat( CONDITIONS.AD_GROUP.NAME_DOES_NOT_CONTAIN.map( surround(' AdGroupName DOES_NOT_CONTAIN "', '" ')) )
	.concat( CONDITIONS.CAMPAIGN.STATUS_IN.map( surround( ' CampaignStatus IN [ "', '"]' ) ))
	.concat( CONDITIONS.AD_GROUP.STATUS_IN.map( surround( ' AdGroupStatus IN ["' , '"] ' )) );
}

function getShoppingAdgroups(){
	var conditions = buildConditions();
	var adGroupSelector = AdsApp.shoppingAdGroups();
	conditions.forEach( function ( condition ){
		adGroupSelector = adGroupSelector.withCondition( condition );
	});
	return toList( adGroupSelector.get() );
}

function getReport( report, fields, conditions ){
	if( fields && Array.isArray( fields ) ){
		fields = fields.map( function( str ){ return str.trim() } ).join( ', ' );
	}
	if( conditions && conditions.length > 0 ){
		conditions = ' WHERE ' + conditions.join( ' AND ' );
	}else{
		conditions = '';
	}

	var query = 'SELECT ' + fields + ' FROM ' + report + conditions;
	
	return toList( AdWordsApp.report( query ).rows() );
}

function group( rows ){
	var list = {};
	return {
		by : function( criteria ){
			rows.forEach( function ( item ){
				var key = item[ criteria ];
				list[ key ] = list[ key ] || [];
				list[ key ].push( item );
			});
			return list;
		}
	}
}

function processProductGroup( productGroup ){
	var obj = {};
	obj[ productGroup.getValue() ] =
		toList( productGroup.children().get() ).map( processProductGroup )
	;
	return obj;
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

function parsePath( item ){
	var path = item[ 'ProductGroup' ];
	if( path.charAt( path.length - 1 ) == '/' ){
		// Subdivisions have a slash at the end. remove it
		path = path.substring( 0, path.length - 2 );
	}
	var res = path.split( ' / ' )
		/*.map( function( keyValue ){
			var ar = keyValue.split( ' = ' );
			var res1 = {};
			res1[ ar[ 0 ] ] = ar[ 1 ];
			return res1;
		})
		*/
		.slice( 1 )
	;
	return res;
}

function logList( name, list, count ){
	var count = typeof count == 'undefined' ? 3 : count;
	Logger.log( name + ' has ' + list.length + ' items. First items are: '
		+ JSON.stringify( list.slice( 0, count ), null, 2 ) );
}


var HEADERS = {
	'category' 			: 'googleProductCategory',
	'brand' 			: 'brand',
	'item id' 			: 'offerId',
	'condition' 		: 'condition',
	'product type' 		: 'productType',
	'channel' 			: 'channel',
	// 'channel exclusivity' : '????',
	'custom label 0' 	: 'customLabel0',
	'custom label 1' 	: 'customLabel1',
	'custom label 2' 	: 'customLabel2',
	'custom label 3' 	: 'customLabel3',
	// 'custom label 4' : 'customLabel4',
}

function doForAllProdcutsFromShoppingAPI( handler ){
	var args = { maxResults: 1 };
	do{
		data = ShoppingContent.Products.list( MERCHANT_ID, args );
		args.pageToken = data.nextPageToken;
		
		var products = data.resources
			.filter( function( product ){ return product.source === 'feed'; } )
			.map( buildRow( Object.keys( HEADERS ) ) )
			.forEach( handler )
		;
		Logger.log( 'obj: ' + JSON.stringify( products, null, 2 ) );
	} while ( args.pageToken && false );
}

function main(){
	//, Id, AdGroupName, CampaignName
	var headers = 'ProductGroup'.split( ', ' );
	
	var paths = getReport(
		'PRODUCT_PARTITION_REPORT',
		headers,
		buildConditions().concat(
			[
				'AdGroupId = 80678452467',
				'PartitionType = "UNIT"',
			]
		)
	)
	.map( buildRow( headers ) )
	.map( parsePath )
	;
	
	var everythingElsePaths = paths.filter( function( path ){
		return path[ path.length - 1 ] == 'item id = *';
	})
	.map( function( ar ){ return ar.slice( 0, ar.length - 1 ) } )
	;
	
	everythingElsePaths
	.map( function( everythingElsePath ){
		var productIds = paths.filter( function( path ){
			if( path.length != everythingElsePath.length + 1 ){
				return false;
			}
			if( path[ path.length - 1 ] == 'item id = *' ){
				return false;
			}
			var elsePath = everythingElsePath.join( ' / ' );
			var otherPath = path.slice( 0, path.length - 1 ).join( ' / ' );
			return elsePath == otherPath;
		})
		.map( function( path ){
			return path[ path.length - 1 ].split( ' = ' )[ 1 ];
		})
		;
		return {
			elsePath : everythingElsePath,
			productIds : productIds,
		};
	})
	.forEach( function( x ){ Logger.log( JSON.stringify( x, null, 2 ) ) } );
	
	
	return;
	
	
	
	
	
	
	
	
	
	return;
	
/*	var productGroupsPerAdGroup = {};
	getShoppingAdgroups()
	.map( property( 'rootProductGroup' ) )
	.forEach( function( productGroup ){
		var key =  productGroup.getCampaign().getName()
			+ '-' + productGroup.getAdGroup().getName()
		productGroupsPerAdGroup[ key ] = processProductGroup( productGroup );
		
		Logger.log( 'key: ' + key );
		//Logger.log( 'value: ' + JSON.stringify( productGroupsPerAdGroup[ key ], null, 2 ) );
		
	});

	//logList( 'productGroupsPerAdGroup', productGroupsPerAdGroup, 3 );
*/

	getReport(
		'PRODUCT_PARTITION_REPORT',
		'Id, PartitionType, ProductGroup, AdGroupName, CampaignName',
		buildConditions()
	)
	.filter( function( productGroupFromReport ){
		Logger.log( productGroupFromReport[ 'ProductGroup' ] 
			+ ' -> ' + productGroupFromReport[ 'PartitionType' ] );
		return productGroupFromReport[ 'ProductGroup' ].indexOf( 'item id' ) < 0;
	})
	.forEach( function ( elseProductGroupFromReport ){
		var adGroupName = elseProductGroupFromReport[ 'AdGroupName' ];
		var campaignName = elseProductGroupFromReport[ 'CampaignName' ];
		var productGroupKey = campaignName + '-' + adGroupName;
		return;
		var productGroup = productGroupsPerAdGroup[ productGroupKey ];
		var typeProduct = 'root';
		
		elseProductGroupFromReport[ 'ProductGroup' ]
			.split( '/' )
			.filter( function( x ){ return x.indexOf( 'custom label' ) >= 0 } )
			.map( function( label ){
				var productsGr = label.match( new RegExp('\\\".*\\\"') );
				if ( productsGr !== null && productsGr.length > 0 ){
					return productsGr[ 0 ].replace( /\\/g, '' ).replace( /\"/g, '' );
				}
				return [];
			})
			.forEach( function( newProductGroupName, index ){
				Logger.log( 'newProductGroupName: ' + newProductGroupName );
				Logger.log( 'productGroup: ' + productGroup );
				
				productGroup = ( index === 0 )
					? productGroup[ newProductGroupName ]
					: productGroup.children[ newProductGroupName ] ;
				typeProduct = 'new';
				Logger.log ( index );
			})
		;
		/*var finalProductGroup = ( typeProduct === 'root' )
			? productGroup 
			: productGroup[ 'productGroup' ].children;
		Logger.log( JSON.stringify( finalProductGroup , null, 2 ) );
		finalProductGroup.newChild().itemIdBuilder().withValue(
			elseProductGroupFromReport[ 'Id' ]
		).build().getResult();
		*/
		
		
	});
}

// var pageObj = {};
// var products = [];
// var index = 1;
// do {
//     data = ShoppingContent.Products.list( MERCHANT_ID, pageObj );
//     pageObj = {
//         pageToken: data["nextPageToken"]
//     };
//     products = products.concat( data.resources.filter( function( product ){ return product.source === "feed"; }) );
//     index++;
// } while ( typeof pageObj.pageToken !== 'undefined' && index < 10 );
// Logger.log( products.length );