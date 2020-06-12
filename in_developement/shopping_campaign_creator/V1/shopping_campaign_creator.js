/*
	campaign naming
		category first
		priority second
	refactoring
		keep upload related stuff together
		roas not empty
		check for non-empty roas
		extract deleting campaigns into its own function
			make a user setting for deleting/pausing campaigns (yes/no)
			rename deleteCampaigns to pauseCampaigns
	roas is not budget
		make a setting for budgets (for each category)

*/

var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1jsGNA9Po-CYf3_GvHNPj2luMyPfSpsUQlTN45-4a7cc/edit#gid=0';
var SS = SpreadsheetApp.openByUrl( SPREADSHEET_URL );
var SHEET = SS.getSheetByName( 'Settings' );
var MERCHANT_ID = 102438479;
var ACCOUNT_ID = 6805418012;
// 118-211-7027
// 680-541-8012

// Automate campaign creation / deletion
// ▪ Reading the settings from the Google Sheets
// o Categories + ROAS goals per category
// ▪ Creation of 3 campaigns (one per priority) for each category : done
// ▪ Creation of Adgroups for Ngrame
// Creation of adgroups depending on the shopping content
// ▪ Properties of the products
// ▪ Eg: design or size

var PAUSE_CAMPAIGNS = 'yes';
var CATEGORY_PRIORITIES = [ 'HIGHT, "MIDDLE', 'LOW' ];
var COLUMNS = [
	'Campaign',
	'Budget',
	'Bid Strategy type',
	'Campaign type',
	'Merchant',
	'Country of Sale',
	'AdGroup',
	'Bid',
	'Product Group',
	'Product Group Type',
	'StartDate',
	'AdGroup type',
	'Campaign subtype',
	'Campaign status',
	'Campaign priority'
];

var ATTRIBUTES = [
	'Query', 'CampaignName', 'AdGroupName'
];

var CAMPAIGN_PRIORITIES = [
	'Hight', 'Middle', 'Low'
];

var CREATED_BY_SCRIPT_LABEL = 'CREATED_BY_SQ_SCRIPT';
var MANAGED_BY_SCRIPT_LABEL = 'MANAGED_BY_SCRIPT';

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
};

function onlyUnique( value, index, self ){
    return self.indexOf( value ) === index;
}

function equals( value ){
	return function( item ){
		return item == value;
	}
};

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

function call( obj, method ){
	return function( parameter ){
		return obj[ method ]( parameter );
	}
}

function containsCategory ( categories ){
	return function ( camp ){
		var name = camp.getName();
		for( var index = 0; index < categories.length; index++ ){
			if ( name.toLowerCase().indexOf( categories[ index ].toLowerCase() ) >= 0 ){
				return false; // TODO: this should be true, right?
			}
		}
		return true;
	}
}

function getReport( report, fields, conditions ){
	if( fields && Array.isArray( fields ) ){
		fields = fields.map( property( 'trim' ) ).join( ', ' );
	}
	conditions = conditions || [];
	conditions.push( 'ExternalCustomerId = ' + ACCOUNT_ID );
	conditions = ' WHERE ' + conditions.join( ' AND ' );
	
	var query = 'SELECT ' + fields + ' FROM ' + report + conditions;
	Logger.log( query );
	return toList( AdWordsApp.report( query ).rows() );
}

function getShoppingCampaigns( conditions ){
	var campaignSelector = AdsApp.shoppingCampaigns();
	( conditions || [] ).forEach( call( campaignSelector, 'withCondition' ) );
	return toList( campaignSelector.get() );
}

function getCreatedButNotManagedCampaigns(){
	var conditions = [
		'LabelNames CONTAINS_ANY [\'' + CREATED_BY_SCRIPT_LABEL + '\']',
		'LabelNames CONTAINS_NONE [\'' + MANAGED_BY_SCRIPT_LABEL + '\']'
	];
	return getShoppingCampaigns( conditions );
}

function getManagedButNotCreatedCampaings(){
	var conditions = [
		'LabelNames CONTAINS_NONE [\'' + CREATED_BY_SCRIPT_LABEL + '\']',
		'LabelNames CONTAINS_ANY [\'' + MANAGED_BY_SCRIPT_LABEL + '\']'
	];
	return getShoppingCampaigns( conditions );
}

function pauseCampaigns( campaigns, categories ){
	var pausedCampaigns = campaigns.filter( containsCategory( categories ) );
	Logger.log( 'found ' + pausedCampaigns.length + ' campaigns to pause' );
	pausedCampaigns.forEach( function( cmp ){
		// Logger.log(' pausing ' + cmp.getName());
		cam.setName( 'todo' );
		cmp.pause();
	});
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

function surround( prefix, postfix ){
	return function( str ){ return prefix + str + postfix };
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

function property( prop ){
	return function( item ){
	if( typeof item[ prop ] == 'function' ){
		return item[ prop ]();
	}
		return item[ prop ];
	};
}

function doForAllProdcutsFromShoppingAPI( handler, limit ){
	var maxSaveInteger = 9007199254740991;
	limit = limit || maxSaveInteger;
	var largestAllowedValue = 1;
	var args = { maxResults: Math.max( 0, Math.min( largestAllowedValue, limit ) ) };
	var headers = Object.keys( HEADERS ).map( property( HEADERS ) );
	//function( header ){ return HEADERS[ header ] }
	
	var countCalls = 0;
	do {
		data = ShoppingContent.Products.list( MERCHANT_ID, args );
		args.pageToken = data.nextPageToken;

		var parsed = data.resources
			.filter( property( 'source' ).eq( 'feed' ) )
			.slice( 0, limit - countCalls * args.maxResults )
			//.map( function( x ){ Logger.log( JSON.stringify( x, null, 2 ) ); return x } )
			.map( buildRow( headers ) )
		;

		// if( countCalls == 0 ){
			Logger.log(
				'first product: '
				+ JSON.stringify( parsed[ 0 ], null, 2 )
			);
		// }

		// parsed.forEach( handler );
		// countCalls++;
		// if( countCalls % 40 == 0 ){
		// 	Logger.log( 'products proessed: ' + ( countCalls * args.maxResults ) );
		// }
	} while ( args.pageToken && countCalls * args.maxResults < limit ); // && false
}

function getCustomLables(){
	return [
		'karten > geburt > geburtskarten > danksagungskarten',
		'karten > geburt > geburtskarten > zwillingskarten',
		'karten > einschulung > einschulungskarten > einladungskarten',
		'karten > geburtstag > danksagungskarten',
		'karten > geburtstag > geburtstagseinladungen > 1.- 99. geburtstag',
		'karten > geburtstag > geburtstagseinladungen > 18. geburtstag',
		'karten > geburtstag > geburtstagseinladungen > 30. geburtstag',
		'karten > geburtstag > geburtstagseinladungen > 40. geburtstag',
		'karten > geburtstag > geburtstagseinladungen > 50. geburtstag',
		'karten > geburtstag > geburtstagseinladungen > 60. geburtstag',
		'karten > geburtstag > geburtstagseinladungen > 70. geburtstag',
		'karten > geburtstag > geburtstagseinladungen > 80. geburtstag',
		'karten > geburtstag > geburtstagskarten > kindergeburtstag',
		'karten > goldhochzeit > danksagungskarten',
		'karten > goldhochzeit > einladungskarten',
		'karten > hochzeit > hochzeitskarten > danksagungskarten',
		'karten > hochzeit > hochzeitskarten > hochzeitseinladungen',
		'karten > hochzeit > hochzeitskarten > save-the-date karten',
		'karten > kommunion > kommunionskarten > danksagungskarten',
		'karten > kommunion > kommunionskarten > einladungskarten',
		'karten > konfirmation > konfirmationskarten > danksagungskarten',
		'karten > konfirmation > konfirmationskarten > einladungskarten',
		'karten > party > partyeinladungen > einladungskarten',
		'karten > silberhochzeit > danksagungskarten',
		'karten > silberhochzeit > einladungskarten',
		'karten > taufe > taufkarten > danksagungskarten',
		'karten > taufe > taufkarten > einladungskarten',
		'karten > trauer > danksagungen',
		'karten > trauer > sterbebilder',
		'karten > umzug > umzugskarten'
	];
}

function getLargestCampaignIndex( campaigns ){
	var campaignNameIndexes = ( campaigns && campaigns.length > 0 ) ?
		campaigns
		.map( property( 'getName' ) )
		.map( function( campaignName ){ return parseInt( campaignName.match( /[0-9]+$/ ) || '0' ); })
		: [ 0 ];

	return Math.max.apply( Math, campaignNameIndexes );
}

function main(){
	// account ID 4753357988 , 1182117027
	// MccApp.select( MccApp.accounts().withIds( [ ACCOUNT_ID ] ).get().next() );
	var oldCategories = SHEET.getRange( 2, 9, SHEET.getLastRow(), 1 )
		.getValues()
		.map( property( 0 ) )
		.filter( not( equals( '' ) ) );
	
	var subCategories = SHEET.getRange( 2, 12, SHEET.getLastRow(), 1 )
		.getValues()
		.map( property( 0 ) )
		.filter( not( equals( '' ) ) );
	
	var categories = oldCategories;

	// subCategories.forEach( function( sub ){
	//	 oldCategories.forEach( function( category ){
	//		 CAMPAIGN_PRIORITIES.forEach( function( priority ){
	//			 categories.push( category + '-' + sub + '-' + priority );
	//		 });
	//	 });
	// });
	
	var createdCampaigns = getCreatedButNotManagedCampaigns();
	var managedCampaigns = getManagedButNotCreatedCampaings();
	var largestCampaignIndex = getLargestCampaignIndex( createdCampaigns );

	Logger.log( 'largestCampaignIndex : ' + largestCampaignIndex );
	// createdCampaigns.forEach( function(cmp){Logger.log( cmp.getName() );});
	// managedCampaigns.forEach( function(cmp){Logger.log( cmp.getName() );});
	// return;
	var campaigns = getShoppingCampaigns(); // get all campaigns ( with and without categories )
	var namedCampaigns = [];
	var shoppingAdGroups = [];
	categories.forEach( function( category, index ){
		if( typeof campaigns[ index ] === 'undefined' ){
			return;
		}
		campaigns[ index ].setName( category );
		Logger.log( ' creating campaign : ' + category );
		var currentAdGroups = toList( campaigns[ index ].adGroups().withLimit(1).get() );
		if ( currentAdGroups.length == 0 ){
			var newAdGroupOperation = campaigns[ index ].newAdGroupBuilder().withName( category + '-All' ).build();
			if ( newAdGroupOperation.isSuccessful() ) {
				shoppingAdGroups.push ( newAdGroupOperation.getResult() );
				namedCampaigns.push( campaigns[ index ] );
			} else {
				Logger.log( 'cannot create adgroup in campaign: ' + category );
			}
		} else {
			currentAdGroups[0].setName( category + '-All' );
			shoppingAdGroups.push( currentAdGroups[0] );
			namedCampaigns.push( campaigns[ index ] );
		}
	});
	pauseCampaigns( managedCampaigns, categories );
	var rootProductGroups = {};
	Logger.log( 'shoppingAdGroups length : ' + shoppingAdGroups.length );
	Logger.log( 'createdCampaigns length : ' + createdCampaigns.length );
	Logger.log( 'managedCampaigns length : ' + managedCampaigns.length );
	
	shoppingAdGroups.forEach( function( shoppingAdGroup ){
		var adGroupName = shoppingAdGroup.getName();
		
		var rootProductGroup = shoppingAdGroup.rootProductGroup();
		if( typeof rootProductGroup !== 'undefined' && rootProductGroup !== null ){
			rootProductGroups[ adGroupName ] = rootProductGroup;
			return;
		}
		var createNewRootProductGroupOperation = shoppingAdGroup.createRootProductGroup();
		if ( createNewRootProductGroupOperation.isSuccessful() ){
			rootProductGroups[ adGroupName ] = createNewRootProductGroupOperation.getResult();
		} else {
			Logger.log( 'cannot create root product group in the AdGroup : ' + adGroupName );
		}
	});

	var customLabels = getCustomLables();

	for ( var key in rootProductGroups ) {
		var category = categories.filter( function( cat ){return ( key.indexOf( cat ) >= 0 );})[0];
		var customLabel0s = customLabels.filter( function( cusLbl ){ return cusLbl.indexOf( 'karten > '+category+ ' >' ) == 0; });

		customLabel0s.forEach( function( customLabel0 ){
			var child = rootProductGroups[ key ].newChild().customLabelBuilder().withType( 'CUSTOM_LABEL_0' ).withValue( customLabel0 ).build().getResult();
			Logger.log( JSON.stringify( child.getValue(), null, 2 ) );
		});
	}
}