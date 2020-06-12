/*

	TODO
		✓ do only for
			- enabled adgroups
			- in enabled campaings
			- with enabled keywords > 0
			- with enabled ads > 0
			- and all enabled ads rejected

		✓ create a copy of adgroup
		✓ copy over
			- enabled ads
			- all keywords?
			- cpcs
			- urls
		✓ label new adgroup "next_try"
		
		✓ old ad_group:
			- pause
			- rename to old_name_date_month
			- label "paused_due_to_rejection"
		✓ variation of the new ad
			- add/remove dot at the end of the description

*/

// --------------------------------------
// ---- SETTINGS ------------------------

var ERROR_REPORTING_EMAIL = 'a.tissen@pa.ag';

var CAMPAIGN_STATUS_IN = [ 'ENABLED' ];
var AD_GROUP_STATUS_IN = [ 'ENABLED' ];
var STATUS_IN      = [ 'ENABLED' ];
var CMBINED_APPROVAL_STATUS_IN = [ 'DISAPPROVED' ];

var NEW_LABEL = 'next_try';
var OLD_LABEL = 'paused_due_to_rejection';

// ---- END OF SETTINGS -----------------

// ---- CONSTANTS -----------------------

var SCRIPT_NAME = 'ad_group_duplicator';

var DISAPPROVED = 'disapproved';

var KEYWORD_FIELDS = [
	'Id',
	'Criteria',
	'AdGroupId',
	'AdGroupName',
	'CampaignId',
	'Status',
	'CpcBid',
	'FinalUrls',
	'ApprovalStatus',
];

var AD_COPY_FIELDS = [
	'Id',
	'AdGroupId',
	'AdGroupName',
	'CampaignId',
	'Status',
	'CombinedApprovalStatus',
	'HeadlinePart1',
	'HeadlinePart2',
	'ExpandedTextAdHeadlinePart3',
	'Description',
	'Description1',
	'ExpandedTextAdDescription2',
	'CreativeFinalUrls',
	'Path1',
	'Path2',
];

// --------------------------------------

function log( text, obj ){
	Logger.log( text + JSON.stringify( obj, null, 2 ) );
}

Object.values = function( obj ){
	var vals = [];
	for( var key in obj ){
		vals.push( obj[ key ] );
	}
	return vals;
};

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

function toList( iterator ){
	var list = [];
	while( iterator.hasNext() ){
		list.push( iterator.next() );
	}
	return list;
}

function property( prop ){
	return function( item ){
		if( typeof item[ prop ] == 'function' ){
			return item[ prop ]();
		}
		return item[ prop ];
	};
}

function group( rows ){
	function extract( obj, selector ){
		if( typeof selector == 'undefined' ){
			return obj;
		}
		if( typeof selector == 'function' ){
			return selector( obj );
		}
		if( typeof obj[ selector ] == 'function' ){
			return obj[ selector ]();
		}
		if( typeof obj[ selector ] != 'undefined' ){
			return obj[ selector ];
		}
		throw new Error( 'Can\'t extract ' + selector + ' from ' + obj );
	}

	return {
		by : function( keyMapper ){
			return {
				sum : function( valueMapper ){
					var res = {};
					rows.forEach( function( row ){
						var key = extract( row, keyMapper );
						res[ key ] = ( res[ key ] || 0 ) + extract( row, valueMapper );
					});
					return res;
				},
				count : function(){
					var res = {};
					rows.forEach( function( row ){
						var key = extract( row, keyMapper );
						res[ key ] = ( res[ key ] || 0 ) + 1;
					});
					return res;
				},
				any : function( valueMapper ){
					var res = {};
					rows.forEach( function( row ){
						var key = extract( row, keyMapper );
						res[ key ] = extract( row, valueMapper );
					});
					return res;
				},
				all : function( valueMapper ){
					var res = {};
					rows.forEach( function( row ){
						var key = extract( row, keyMapper );
						res[ key ] = res[ key ] || [];
						res[ key ].push( extract( row, valueMapper ) );
					});
					return res;
				},
				keys : function(){
					var res = {};
					rows.forEach( function( row ){
						var key = extract( row, keyMapper );
						res[ key ] = 1
					});
					return Object.keys( res );
				}
			};
		}
	};
}

function getFromReport( report, selectFields ){
	var conditions = [].concat( [
			'CampaignStatus IN [ ' + CAMPAIGN_STATUS_IN.join( ', ' ) + ' ] ',
			'AdGroupStatus IN [ ' + AD_GROUP_STATUS_IN.join( ', ' ) + ' ] ',
			'Status IN [ ' + STATUS_IN.join( ', ' ) + ' ] '
		] )
	;
	var query = 'SELECT ' + selectFields.join( ',' ) + ' ' +
				'FROM ' + report + ' ' +
				'WHERE '+ conditions.join( ' AND ' );
	Logger.log( 'query: ' + query );
	return toList( AdWordsApp.report( query ).rows() );
}

function onlyUnique( value, index, self ){
    return self.indexOf( value ) === index;
}

function intersectionOf( arrays ){
	var map = {};
	arrays.forEach( function( array ){
		// if it can't be assumed that the array doesn't contain duplicates than we need: .filter( onlyUnique )
		array.forEach( function( item ){
			map[ item ] = ( map[ item ] || 0 ) + 1;
		});
	});
	return Object.keys( map ).filter( function( key ){ return map[ key ] == arrays.length } );
}

function main(){
	try {
		Logger.log( 'start' );
		
		[ NEW_LABEL, OLD_LABEL ].forEach( function( label ){
			if( ! AdWordsApp.labels().withCondition( 'Name = "' + label + '"' ).get().hasNext() ){
				AdWordsApp.createLabel( label );
			}
		});
		
		var ads      = getFromReport( 'AD_PERFORMANCE_REPORT',       AD_COPY_FIELDS );
		var keywords = getFromReport( 'KEYWORDS_PERFORMANCE_REPORT', KEYWORD_FIELDS );
		
		var groupedAds = group( ads ).by( 'AdGroupId' ).all();
		var groupedKeywords = group( keywords ).by( 'AdGroupId' ).all();
		
		var adGroupIds = intersectionOf( [ groupedAds, groupedKeywords ].map( Object.keys ) );
		
		var adGroupIdsWithRejectedAdsOnly = adGroupIds.filter( function( adGoupId ){
			return groupedAds[ adGoupId ].reduce( function ( condition, ad ){
				return condition && ad[ 'CombinedApprovalStatus' ].toLowerCase() == DISAPPROVED;
			}, true );
		});

		var adGroupsWithRejectedAdsOnly = toList( AdWordsApp.adGroups().withIds( adGroupIdsWithRejectedAdsOnly ).get() );

		var date = new Date();

		Logger.log( 'Found ' + adGroupsWithRejectedAdsOnly.length + ' ad groups with rejected ads only' );

		adGroupsWithRejectedAdsOnly.forEach( function( rejectedAdGroup ){

			var oldAdgroupName = rejectedAdGroup.getName();
			var campaign = rejectedAdGroup.getCampaign();
			var oldAdgroupsNames = toList( campaign.adGroups().get() ).map( property( 'getName' ) );
			var adsForAdgroup      = groupedAds[      rejectedAdGroup.getId() ];
			var keywordsForAdgroup = groupedKeywords[ rejectedAdGroup.getId() ];
			var rejectedAdGroupLabels = toList ( rejectedAdGroup.labels().get() );

			var adGroupDuplicatAlreadyExists = oldAdgroupsNames.filter( function ( adName ){
				return adName.search( new RegExp (oldAdgroupName + '_[0-9]+_[0-9]+$') ) >= 0
			}).length > 0 ;

			if ( 
				oldAdgroupName.search(/_[0-9]+_[0-9]+$/) >= 0 	||
				rejectedAdGroupLabels.indexOf( NEW_LABEL ) >= 0 ||
				adGroupDuplicatAlreadyExists 					||
				keywordsForAdgroup.length === 0 				||
				adsForAdgroup.length === 0
			){
				return;
			}

			rejectedAdGroup.setName( oldAdgroupName + '_' + date.getDate() + '_' + (date.getMonth() + 1) );

			var op = campaign.newAdGroupBuilder().withName( oldAdgroupName ).build();

			if( op.isSuccessful() ){
				var newAdGroup = op.getResult();
				Logger.log( 'new ad-group created: ' + newAdGroup.getName() );

				newAdGroup.applyLabel( NEW_LABEL );
				rejectedAdGroup.pause();
				rejectedAdGroup.applyLabel( OLD_LABEL );
				
				adsForAdgroup.forEach( function( ad ){
					var description2 = ad[ 'ExpandedTextAdDescription2' ];
					if( description2.charAt( description2.length - 1 ) == '.' ){
						description2 = description2.substring( 0, description2.length - 1 );
					}else{
						description2 = description2 + '.';
					}
					
					var builder = newAdGroup.newAd().expandedTextAdBuilder();
					if ( ad[ 'HeadlinePart1' ] !== '' && ad[ 'HeadlinePart1' ] !=='--' ) {
						builder.withHeadlinePart1( ad[ 'HeadlinePart1' ] );
					} else {
						return;
					}
					
					if ( ad[ 'HeadlinePart2' ] !== '' && ad[ 'HeadlinePart2' ] !=='--' ) {
						builder.withHeadlinePart2( ad[ 'HeadlinePart2' ] )
					}
					if ( ad[ 'ExpandedTextAdHeadlinePart3' ] !== '' && ad[ 'ExpandedTextAdHeadlinePart3' ] !=='--' ) {
						builder.withHeadlinePart3( ad[ 'ExpandedTextAdHeadlinePart3'] );
					}
					if ( ad[ 'Description' ] !== '' && ad[ 'Description' ] !=='--' ) {
						builder.withDescription( 	ad[ 'Description' ] );
					}
					if ( ad[ 'Description1' ] !== '' && ad[ 'Description1' ] !=='--' ) {
						builder.withDescription1( 	ad[ 'Description1' ] );
					}
					if ( description2 !== '' && description2 !=='--' ) {
						builder.withDescription2( description2 );
					}
					if ( ad[ 'Path1' ] !== '' && ad[ 'Path1' ] !=='--' ) {
						builder.withPath1( ad[ 'Path1' ] );
					}
					if ( ad[ 'Path2' ] !== '' && ad[ 'Path2' ] !=='--' ) {
						builder.withPath2( ad[ 'Path2' ] );
					}

					var urls = JSON.parse( ad[ 'CreativeFinalUrls' ] );
					if( urls && urls.length ){
						builder.withFinalUrl( urls[ 0 ] ) //.replace( '[', '' ).replace( ']','' ).replace( /\"/g, '' )
					}

					var newAdOp = builder.build();

					if( ! newAdOp.isSuccessful() ){
						throw new Error( 'ad build was not successful !' );
					}
				});
				
				keywordsForAdgroup.forEach( function( keyword ){
					var newKeywordBuilder = newAdGroup.newKeywordBuilder().withText( keyword[ 'Criteria' ] );
					
					var cpc = keyword[ 'CpcBid' ];
					if( cpc != 'auto' && cpc != '--' ){
						cpc = cpc.replace( 'auto: ' , '' );
						newKeywordBuilder.withCpc( cpc );
					}

					if( keyword[ 'FinalUrls' ] !== '' &&  keyword[ 'FinalUrls' ] !== '--'){
						// Logger.log( 'final Urls :' + keyword[ 'FinalUrls' ]);
						newKeywordBuilder.withFinalUrl( keyword[ 'FinalUrls' ] );
					}
					
					var newKeywordOperation = newKeywordBuilder.build();

					if( ! newKeywordOperation.isSuccessful() ){
						throw new Error( 'ad build was not successful !' );
					}
					//  else{
					// 	log('newKeyword', newKeywordOperation.getResult().getText());
					// }
				});
				
			}else{
				throw new Error( 'ad group build was not successful !' );
			}
		});
		Logger.log( 'end' );
	} catch( error ){
		var accountName = AdWordsApp.currentAccount().getName();
		var subject = 'Error in ' + SCRIPT_NAME + ' ' + accountName;
		var message = error + '\n' + error.stack;
		Logger.log(  subject + ' -> ' + message );
		if( ! AdWordsApp.getExecutionInfo().isPreview() ){
			MAIL_APP.sendEmail( ERROR_REPORTING_EMAIL, subject, message );
		}else{
			Logger.log( 'don\'t send error-emails in preview-mode' )
		}
		throw error;
	}
}