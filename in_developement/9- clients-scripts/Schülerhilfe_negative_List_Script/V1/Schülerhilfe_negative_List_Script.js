
var ERROR_REPORTING_EMAIL = "a.bakhabou@pa.ag";
var SCRIPT_NAME = "";

var INCLUDE_CAMPAIGNS = [];
var EXCLUDE_CAMPAIGNS = [];
var CAMPAIGN_NAME_CONTAINS_ANY = [];
var CAMPAIGN_NAME_CONTAINS_NONE = [];

function filtterCompainNamesAccordingToSettings(){
	function gettingAllCompaignNames(){
        var accountId = AdWordsApp.currentAccount().getCustomerId();
		var query = 'SELECT CampaignName ' + 
					'FROM CAMPAIGN_PERFORMANCE_REPORT ' + 
                    'WHERE CampaignStatus IN [ "ENABLED", "PAUSED" ] ' +
                    'AND ExternalCustomerId = ' + accountId + ' ' ;

		var iterator = AdWordsApp.report( query ).rows();
		var campaignNames = [];
		while( iterator.hasNext() ){
			campaignNames.push( iterator.next().CampaignName );
		}
		return campaignNames;
	}
	var compaigns = gettingAllCompaignNames();

	var filteredCompaignNames = compaigns.filter(function ( compaignName ){
		
		if ( EXCLUDE_CAMPAIGNS.length > 0 ){
			var res = false;
			EXCLUDE_CAMPAIGNS.forEach(function(subName) {
				res = res || ( subName == compaignName ) ;
			});
			if( res ){
				return false;
			}
		}
		
		if ( INCLUDE_CAMPAIGNS.length > 0 ){
			var rest = false;
			INCLUDE_CAMPAIGNS.forEach(function(subName) {
				rest = rest || (subName == compaignName);
			});
			if( rest ){
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
			var test1 = false;
			CAMPAIGN_NAME_CONTAINS_ANY.forEach( function ( subName ){
				test1 = test1 || ( compaignName.indexOf( subName ) >= 0 );
			});
			if( test1 ){
				return true;
			}
		}
		
		if ( INCLUDE_CAMPAIGNS.length > 0 ){
			return false;
		}

		if ( CAMPAIGN_NAME_CONTAINS_ANY.length > 0 ){
			return false;
		}
		
		return true;
	});

	return filteredCompaignNames;
}

function processAccount(){

}

function main () {
	try{
        if( typeof (MccApp) != 'undefined' ){
            MccApp.accounts().executeInParallel( 'processAccount' );
        } else {
            processAccount();
        }
    }catch( error ){
		var accountName = AdWordsApp.currentAccount().getName();
		var subject = 'Error in ' + SCRIPT_NAME + ' ' + accountName;
		var message = error + '\n' + error.stack;
		Logger.log(  subject + ' -> ' + message );
		MAIL_APP.sendEmail( ERROR_REPORTING_EMAIL, subject, message );
		throw error;
	}
}