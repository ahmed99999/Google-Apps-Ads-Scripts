//---------------------- SETTINGS --------------------------

var INCLUDE_CAMPAIGNS = [ 'Brand-DE', 'Brand-Generic' ];
var EXCLUDE_CAMPAIGNS = [ 'Shopping-DE' ];

var CAMPAIGN_NAME_CONTAINS_ANY = [ 'Shopping' ];
var CAMPAIGN_NAME_CONTAINS_NONE = [ 'Generic' ];

// -------------------- Main Core --------------------------

function gettingAllCompaignNames() {
    var query = 'SELECT CampaignName FROM CAMPAIGN_PERFORMANCE_REPORT WHERE CampaignStatus IN [ "ENABLED", "PAUSED" ]';
    var iterator = AdWordsApp.report( query ).rows();
    var compaigns = [];
    while( iterator.hasNext() ){
        compaigns.push( iterator.next() );
    }
    compaignNames = compaigns.map( function ( compaign ){
        return compaign[ "CampaignName" ];
    });
    return compaignNames;
}

function filtterCompainNamesAccordingToSettings(
	INCLUDE_CAMPAIGNS,
	CAMPAIGN_NAME_CONTAINS_ANY,
	EXCLUDE_CAMPAIGNS,
	CAMPAIGN_NAME_CONTAINS_NONE
	){
	
    var compaignNames = gettingAllCompaignNames();
    
    var filteredCompaignNames = compaignNames.filter(function ( compaignName ){
		
        if ( EXCLUDE_CAMPAIGNS.length > 0 ){
            var res = EXCLUDE_CAMPAIGNS.indexOf( compaignName ) >= 0;
			if( res ){
				return false;
			}
        }
		
        if ( INCLUDE_CAMPAIGNS.length > 0 ){
			var res = INCLUDE_CAMPAIGNS.indexOf( compaignName ) >= 0;
			if( res ){
				return true;
			}
        }
		
        if ( CAMPAIGN_NAME_CONTAINS_NONE.length > 0 ){
            var test = false;
            CAMPAIGN_NAME_CONTAINS_NONE.forEach( function ( subName ){
                test = test || ( compaignName.indexOf( subName ) >= 0 );
            });
            if( test ){
				return false;
			}
        }
		
        if ( CAMPAIGN_NAME_CONTAINS_ANY.length > 0 ){
            var test = false;
            CAMPAIGN_NAME_CONTAINS_ANY.forEach( function ( subName ){
                test = test || ( compaignName.indexOf( subName ) >= 0 );
            });
            if( test ){
				return true;
			}
        }
		
		if ( INCLUDE_CAMPAIGNS.length > 0 ){
			return false;
		}
		
        return true;
    });

    return filteredCompaignNames;
}

function main (){
	
	
	INCLUDE_CAMPAIGNS.forEach( function( name ){
		if( EXCLUDE_CAMPAIGNS.indexOf( name ) >= 0 ){
			throw new Exception( 'Campaign ' + name + ' is included and excluded. Fix this setting.' );
		}
	});
	
	CAMPAIGN_NAME_CONTAINS_ANY.forEach( function( name ){
		if( CAMPAIGN_NAME_CONTAINS_NONE.indexOf( name ) >= 0 ){
			throw new Exception( 'Campaign-name-part ' + name + ' is included and excluded. Fix this setting.' );
		}
	});

	
    var compainNames = filtterCompainNamesAccordingToSettings(
		INCLUDE_CAMPAIGNS,
		CAMPAIGN_NAME_CONTAINS_ANY,
		EXCLUDE_CAMPAIGNS,
		CAMPAIGN_NAME_CONTAINS_NONE
	);
    var campaignIterator = AdWordsApp.campaigns()
		.withCondition('Name IN ["' + compainNames.join('","') + '"]')
		.get();
	
	while( campaignIterator.hasNext() ){
		var campaign = campaignIterator.next();
		Logger.log( campaign.getName() );
	}
}