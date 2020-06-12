
// ---- START OF SETTINGS -------

// the emails that the script send the report to.
var RECIPIENT_EMAILS = [  'a.tissen@pa.ag' ]; // [ 'a.bakhabou@pa.ag', 'a.tissen@pa.ag' , 'burak.hun@casumo.com' ];

// threshold for reporting in %
var BUDGET_SHIFT_REPORTING_THRESHOLD = 5;

// how many adgroups to report
var MAX_COUNT_AD_GROUPS_TO_REPORT = 5;

// only campaigns in this list will be processed by the script.
// if empty, all campaigns will be processed.
var INCLUDE_CAMPAIGNS = [ 'Games Full - All Devices - Exact' , 'Games Full - All Devices - BMM' ];

// the names of the campaigns that the script will not process
var EXCLUDE_CAMPAIGNS = [];

// campaigns will be processed by this script if they contain any of these strings in the name
var CAMPAIGN_NAME_CONTAINS_ANY = [];

// campaigns will be excluded from this script if they contain any of these strings in the name
var CAMPAIGN_NAME_CONTAINS_NONE = [];

// the status of the campaigns that the scripts will process e.g : "ENABLED" , "PAUSED", ...
var CHECK_CAMPAIGNS_WITH_STATUS = [ 'ENABLED' ]; //, 'PAUSED'

// the number of days in the past that the first range of dates starts e.g : 1 = yesterday, 2 = two days ago, .....
var DATE_RANGE_SHIFT = 1;

// the number of weeks that seperates the two date ranges
var DATE_RANGE_SPREAD_IN_WEEKS = 4;

var ERROR_REPORTING_EMAIL = "a.bakhabou@pa.ag";

// the length of the dates range to be compared e.g : 7 => comparing the cost of a week to an other week
var DATE_RANGE_LENGTH_IN_DAYS = 7;

// ---- END OF SETTINGS ---------


// ---- START OF CONSTANTS ------

var SCRIPT_NAME = "Budget Shift Script";
var ONE_DAY = 1000 * 60 * 60 * 24;
var ONE_WEK = ONE_DAY * 7;
var ETA = 0.00001;

// ---- END OF CONSTANTS --------

if (!String.prototype.padStart) {
    String.prototype.padStart = function padStart(targetLength, padString) {
        targetLength = targetLength >> 0; //truncate if number, or convert non-number to 0;
        padString = String(typeof padString !== 'undefined' ? padString : ' ');
        if (this.length >= targetLength) {
            return String(this);
        } else {
            targetLength = targetLength - this.length;
            if (targetLength > padString.length) {
                padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
            }
            return padString.slice(0, targetLength) + String(this);
        }
    };
}

var MAIL_APP = ( function (){
	var SEND_EMAILS_THROUGH_MAILGUN = true;
	var URL = 'https://api.mailgun.net/v3/mg.peakace.de/messages';
	var FROM = 'adwords_scripts@mg.peakace.de';
	var AUTHORISATION = 'Basic YXBpOmtleS1hYWZmMmI2MGU4MmNkMWYwOTIwYWYxNDUzZWM0MDcyOA==';

	function sendEmail( recipient, subject, text, html ){
		if( !text && !html ){
			throw new Error( 'Neither text-body nor html supplied for email.' );
		}
		if( SEND_EMAILS_THROUGH_MAILGUN ){
			return mailGunSender( recipient, subject, text, html );
		}
		mailAppSender( recipient, subject, text, html );
	}

	function mailAppSender( recipient, subject, text, html ){
		MailApp.sendEmail(
			recipient,
			subject,
			text,
			{
				name: subject,
				htmlBody : html
			}
		);
	}

	function mailGunSender( recipient, subject, text, html ){
		if ( html ){
			if ( !text ){
				text = 'this is supposed to be a html email. Seems like your device doesn\'t support html emails.';
			}
			html = '<html><body>' + html + '</body></html>';
		} else {
			html = null;
		}
		Logger.log( 'fetch URL' );

		return UrlFetchApp.fetch(
			URL,
			{
				method : 'post',
				payload : {
					from : FROM,
					to: recipient,
					subject : subject,
					text : text,
					html : html,
				},
				headers : {
					Authorization : AUTHORISATION,
				}
			}
		);
	}

	return {
		sendEmail	: sendEmail,
	}
})();

function group( rows ){
	return {
		by : function( keyAttribute ){
			return {
				sum : function( value ){
					var res = {};
					rows.forEach( function( row ){
						var key = row[ keyAttribute ];
						res[ key ] = ( res[ key ] || 0 ) + row[ value ];
					});
					return res;
				},
				unique : function(){
					var res = {};
					rows.forEach( function( row ){
						var key = row[ keyAttribute ];
						res[ key ] = row;
					});
					return res;
				},
			};
		}
	};
}

function getAdgroupReport( campaignNames, from, to ){
	var query = 'SELECT AdGroupId , AdGroupName , Cost , CampaignId , CampaignName , Clicks ' +
				'FROM ADGROUP_PERFORMANCE_REPORT ' +
				'WHERE CampaignName IN ["' + campaignNames.join('","') + '"] ' +
				'AND CampaignStatus IN [ ' + CHECK_CAMPAIGNS_WITH_STATUS.join( ', ' ) + ' ] ' +
				'DURING '+ formatDate( from, '' ) + ',' + formatDate( to, '' );

	Logger.log( query );

	var iterator = AdWordsApp.report( query ).rows();
	var rows = [];
	while( iterator.hasNext() ){
		var row = iterator.next();
		rows.push({
			AdGroupId		: row.AdGroupId,
			AdGroupName 	: row.AdGroupName,
			CampaignId 		: row.CampaignId,
			CampaignName	: row.CampaignName,
			Clicks			: row.Clicks,
			Cost		 	: parseFloat( row.Cost.replace( /,/, '' ) )
		});
	}
	return rows;
}

function filtterCompainNamesAccordingToSettings(){
	function gettingAllCompaignNames(){
		var query = 'SELECT CampaignName ' + 
					'FROM CAMPAIGN_PERFORMANCE_REPORT ' + 
					'WHERE CampaignStatus IN [ "ENABLED", "PAUSED" ] ';

		var iterator = AdWordsApp.report( query ).rows();
		var campaignNames = [];
		while( iterator.hasNext() ){
			campaignNames.push( iterator.next().CampaignName );
		}
		return campaignNames;
	}
	var compaigns = gettingAllCompaignNames();

	var filteredCompaignNames = compaigns.filter( function ( compaignName ){
		
		if ( EXCLUDE_CAMPAIGNS.length > 0 ){
			var res = false;
			EXCLUDE_CAMPAIGNS.forEach( function( subName ){
				res = res || ( subName == compaignName );
			});
			if( res ){
				return false;
			}
		}
		
		if ( INCLUDE_CAMPAIGNS.length > 0 ){
			var rest = false;
			INCLUDE_CAMPAIGNS.forEach( function( subName ){
				rest = rest || ( subName == compaignName );
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

function formatDate( date, delimiter ){
	if( typeof delimiter === 'undefined' ){
		throw new Error( 'no delimiter supplied' );
	}
	
	var day = ( date.getDate() + '' ).padStart( 2, '0' );
	var month = ( ( date.getMonth() + 1 ) + '' ).padStart( 2, '0' );
	var year = date.getFullYear();

	return year + delimiter + month + delimiter + day;
}

function processAccount(){
	try{
		var account = AdWordsApp.currentAccount();
		var acountId = account.getCustomerId().replace( /-/g, '' );
		Logger.log( account.getName() );
		
		var campaignNames = filtterCompainNamesAccordingToSettings();

		var today = new Date();
		
		var from = new Date( today.getTime() - DATE_RANGE_SHIFT * ONE_DAY - ( DATE_RANGE_LENGTH_IN_DAYS - 1 ) * ONE_DAY - DATE_RANGE_SPREAD_IN_WEEKS * ONE_WEK );
		var to = new Date( today.getTime() - DATE_RANGE_SHIFT * ONE_DAY - DATE_RANGE_SPREAD_IN_WEEKS * ONE_WEK );
		var rows = getAdgroupReport( campaignNames, from, to );
		
		var previousCampaignCosts = group( rows ).by( 'CampaignId' ).sum( 'Cost' );
		var previousAdGroups = group( rows ).by( 'AdGroupId' ).unique();

		// ------------
		
		var from2 = new Date( today.getTime() - DATE_RANGE_SHIFT * ONE_DAY - ( DATE_RANGE_LENGTH_IN_DAYS - 1 ) * ONE_DAY );
		var to2 = new Date( today.getTime() - DATE_RANGE_SHIFT * ONE_DAY );
		var rows = getAdgroupReport( campaignNames, from2, to2 );
		
		var currentCampaignCosts = group( rows ).by( 'CampaignId' ).sum( 'Cost' );
		var currentAdGroups = rows;
		
		var ratios = [];
		
		currentAdGroups.forEach( function( adGroupObj ){
			var adGroupId = adGroupObj.AdGroupId;
			// check for undefined in case the current adGroup didn't exist previously (newly added adGroup)
			// if so we don't need to compare and we don't need to have it in the final result.
			if ( typeof ( previousAdGroups[ adGroupId ] ) == 'undefined' ){
				return;
			}
			var currentAdGroupCost = adGroupObj.Cost;
			var currentCampaignCost = currentCampaignCosts[ adGroupObj.CampaignId ];
			
			var previousAdGroupCost = previousAdGroups[ adGroupId ].Cost ;
			var previousCampaignCost = previousCampaignCosts[ adGroupObj.CampaignId ];
			
			var currentRatio  = currentAdGroupCost  / Math.max( currentCampaignCost, ETA );
			var previousRatio = previousAdGroupCost / Math.max( previousCampaignCost, ETA );
			var currentClicks = adGroupObj.Clicks;
			var campaignCostsChangePercentage = Math.abs( ( currentCampaignCost / previousCampaignCost * 100 ) - 100 );
			var adGroupCostsChangePercentage = Math.abs( ( currentAdGroupCost / previousAdGroupCost * 100 ) - 100 );

			var diff = currentRatio - previousRatio;
			
			ratios.push({
				adGroupId 						: adGroupId,
				currentAdGroupCost 				: currentAdGroupCost,
				currentCampaignCost 			: currentCampaignCost,
				previousAdGroupCost 			: previousAdGroupCost,
				previousCampaignCost 			: previousCampaignCost,
				currentRatio 					: currentRatio,
				previousRatio 					: previousRatio,
		        currentClicks					: currentClicks,
				adGroupName 					: adGroupObj.AdGroupName,
				campaignName 					: adGroupObj.CampaignName,
				campaignId 						: adGroupObj.CampaignId,
				campaignCostsChangePercentage	: campaignCostsChangePercentage,
				adGroupCostsChangePercentage	: adGroupCostsChangePercentage,
				diff 							: diff,
			});

		});
		
		ratios.sort( function( a, b ){
			return Math.abs( b.diff ) - Math.abs( a.diff );
		});
		
		Logger.log( 'some items: ' );
		ratios.slice( 0, MAX_COUNT_AD_GROUPS_TO_REPORT ).forEach( function( x ){ Logger.log( JSON.stringify( x, null, 2 ) ) } );
		
		ratios = ratios.filter( function( adGroup ){
			return 	(
				adGroup.currentAdGroupCost		> 0 &&
				adGroup.currentCampaignCost 	> 0 &&
				adGroup.previousAdGroupCost 	> 0 &&
				adGroup.previousCampaignCost	> 0 &&
				Math.abs( adGroup.diff )		> BUDGET_SHIFT_REPORTING_THRESHOLD / 100
			);
		});
		
		var finalAdGroupsToSend = ratios.slice( 0, MAX_COUNT_AD_GROUPS_TO_REPORT );

		Logger.log( 'final items: ' + JSON.stringify( finalAdGroupsToSend, null, 2 ) );

		var text = '';
		if ( finalAdGroupsToSend.length == 0 ){
			text += 'No dramatic changes in the AdGroups cost\'s detected';
		} else {
			text += 'Recently, ';
			finalAdGroupsToSend.forEach( function ( adGoup ){
				var direction = adGoup.diff >= 0 ? 'to' : 'away from';
				text += '\n'
					+ Math.abs( Math.round( adGoup.diff * 100 ) )
					+ '% of the Cost of the Campaign "'
					+ adGoup.campaignName
					+ '" has shifted '
					+ direction
					+ ' the Ad Group "'
					+ adGoup.adGroupName
					+'"'
				;
			});
		}
		text += '\ncomparing the date range ['
			+ formatDate( from ,'-' )
			+ ' - '
			+ formatDate( to , '-' )
			+ '] to the date range ['
			+ formatDate( from2 , '-' )
			+ ' - '
			+ formatDate( to2, '-' )
			+ ']'
		;
		
		Logger.log( text );
		
		if( ! AdWordsApp.getExecutionInfo().isPreview() ){
			var emailHeader = SCRIPT_NAME + ' - ' + account.getName();
			RECIPIENT_EMAILS.forEach( function( email ){
				MAIL_APP.sendEmail( email, emailHeader, text );
			});
		}else{
			Logger.log( 'don\'t send emails in preview mode' );
		}
		Logger.log( "done" );
	} catch ( error ){
		var accountName = AdWordsApp.currentAccount().getName();
		var subject = 'Error in ' + SCRIPT_NAME + ' ' + accountName;
		var message = error + '\n' + error.stack;
		Logger.log(  subject + ' -> ' + message );
		MAIL_APP.sendEmail( ERROR_REPORTING_EMAIL, subject, message );
		throw error;
	}
}

function main(){
	try{
		processAccount();
	}catch( error ){
		var accountName = AdWordsApp.currentAccount().getName();
		var subject = 'Error in ' + SCRIPT_NAME + ' ' + accountName;
		var message = error + '\n' + error.stack;
		Logger.log(  subject + ' -> ' + message );
		MAIL_APP.sendEmail( ERROR_REPORTING_EMAIL, subject, message );
		throw error;
	}
}