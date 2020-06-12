
var CAMPAIGN_NAME_CONTAINS = [];
var CAMPAIGN_NAME_DOES_NOT_CONTAIN = [];

var CAMPAIGN_STATUS_IN= [];
var ADGROUP_STATUS_IN = [];

function toList( iterator ){
	var list = [];
	while( iterator.hasNext() ){
		list.push( iterator.next() );
	}
	return list;
}

function fromReport( report, fields ,conditions ){
    var query = 'SELECT ' + fields.join( ', ' ) +
                ' FROM ' + report;
    query = query + (( conditions.length > 0 ) ? ' WHERE '+ conditions.join( ' AND ' ) : '');
    Logger.log( query );
    return toList( AdWordsApp.report( query ).rows() );
}

function surround( prefix, postfix ){
	return function( str ){ return prefix + str + postfix };
}

function getConditions( level ){
    var conditions = []
    .concat( CAMPAIGN_NAME_CONTAINS.map( surround( 'CampaignName CONTAINS "', '"' ) ) )
    .concat( CAMPAIGN_NAME_DOES_NOT_CONTAIN.map( surround( 'CampaignName DOES_NOT_CONTAIN "', '"') ) );
    
    if( CAMPAIGN_STATUS_IN.length > 0 ) conditions.push( 'CampaignStatus IN [ ' + CAMPAIGN_STATUS_IN.join( ', ' ) + ' ] ' );
    if( ADGROUP_STATUS_IN.length > 0 && level == "adgroup") conditions.push( 'AdGroupStatus IN  [ ' + ADGROUP_STATUS_IN.join(  ', ' ) + ' ] ' );
    return conditions;
}

function group( rows ){
    return {
        by: function( keyAttribute ){
            var res = {};
            rows.forEach( function( row ){
                var key = property( keyAttribute )( row );
                res[ key ] = res[ key ] || [];
                res[ key ].push( row );
            });
            return res;
        }
    };
}

function property( prop ){
	return function( item ){
        if ( typeof prop == 'function' ) return prop( item );
		if( typeof item[ prop ] == 'function' ){
			return item[ prop ]();
		}
		return item[ prop ];
	};
}

function isNotEmpty( attribute ){
    return function( item ) {
        return (
            typeof item[ attribute ] !== 'undefined' &&
            item[ attribute] !== '' &&
            item[ attribute ] !== '--'
        );
    };
}

function hashCode( str ){
    var hash = 0; 
    if ( str.length == 0) { 
        return hash; 
    } 
    for (var i = 0; i < str.length; i++) { 
        var char = str.charCodeAt(i);
        hash = ((hash<<5)-hash)+char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return hash;
}

function main(){
    var now = new Date().getHours();
    var adGroupsFields = [ 'AdGroupId', 'AdGroupName', 'CampaignId', 'CampaignName', 'Labels' ];
    var adsFields = [ 'Id', 'AdGroupId', 'AdGroupName' ];
    var conditions = getConditions( 'campaign' );
    var adGroupConditions = getConditions( 'adgroup' );

    var campaignIds = fromReport( 'CAMPAIGN_PERFORMANCE_REPORT', [ 'CampaignId' ], conditions )
    .map( function( campaign ){ 
        return {
            'CampaignId': campaign['CampaignId'],
            'hour': hashCode( campaign['CampaignId'] + '' ) % 24 
        };
    });

    var campaignIdsPerHour = group( campaignIds ).by( 'hour' );
    var campaignIdsCondition = 'CampaignId in [ ' + campaignIdsPerHour[ now ].map( function( cmp ){ return cmp['CampaignId']}).join( ',') + ' ]';
    adGroupConditions.push( campaignIdsCondition );

    var AdGroups = fromReport( 'ADGROUP_PERFORMANCE_REPORT', adGroupsFields, adGroupConditions )
    .filter( isNotEmpty( 'Labels' ) )
    .map( function( AdGroup ){
        return {
            'AdGroupId' : AdGroup['AdGroupId'],
            // 'AdGroupName': AdGroup['AdGroupName'],
            // 'CampaignId' : AdGroup['CampaignId'],
            // 'CampaignName' : AdGroup['CampaignName'],
            'Labels' : JSON.parse( AdGroup['Labels'] )
        };
    });

    var AdsFromReport = fromReport( 'AD_PERFORMANCE_REPORT', adsFields, adGroupConditions );
    var AdGroupToAd = group( AdsFromReport ).by( 'AdGroupId' );

    var adsIds = AdsFromReport.map( function( ad ){ return [ ad['AdGroupId'], ad['Id'] ];});
    var withIdsList = [];
    adsIds.forEach( function( conbination, index ){
        var modulo = index % 25 ;
        withIdsList[ modulo ] = ( withIdsList[ modulo ] || [] ).concat( [ conbination ] );
    });

    var idsSelector = AdsApp.ads();
    withIdsList.forEach( function( conbinations ) {
        idsSelector.withIds( conbinations );
    });
    var ads = toList( idsSelector.get() );
    // var ads = toList( AdsApp.ads().withIds( adsIds ).get() );
    var adsPerId = group( ads ).by( function( ad ){ return ad.getAdGroup().getId() + ',' + ad.getId();} );

    AdGroups.forEach( function( AdGroup ){

        var AdsToBeLabeled = AdGroupToAd[ AdGroup['AdGroupId'] ];
        if ( typeof AdsToBeLabeled == 'undefined' ) return;
        var Labels = AdGroup['Labels'];

        AdsToBeLabeled.forEach( function( ad ){
            Labels.forEach( function( Label ){
                var key = AdGroup[ 'AdGroupId' ] + ',' + ad[ 'Id' ];
                if( typeof adsPerId[ key ] == 'undefined' ) return;
                adsPerId[ key ][ 0 ].applyLabel( Label );
                Logger.log( 'applying label = "' + Label + '" to ad "' + key + '"' );
            });
        });

    });

    Logger.log( 'Done' );
}
