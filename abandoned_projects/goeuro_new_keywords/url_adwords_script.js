var SCRIPT_NAME = 'GoEuro_Url_Creator';
var SEND_ERROR_MESSAGES_TO = 'a.tissen@pa.ag';
var SEND_RESULTS_TO = [
	//'a.shebukova@pa.ag',
  	'a.tissen@pa.ag'
];
var SECOND_LEVEL_DOMAIN = 'https://www.goeuro.';
var KEYWORD_LABEL = 'pa_new_keyword';

var ACCOUNT_IDS = [
  '246-452-9522',
  '932-358-6522',
  '962-787-0287',
  '442-232-6271',
  '297-020-9767',
  '292-905-3840',
  '733-532-8773',
  '166-531-8985',
  '191-274-6062',
  '147-334-6440',
  '562-182-9161',
  '308-197-8340',
  '118-835-1153',
  '769-128-0040',
  '617-890-2483',
  '916-798-1920',
  '871-821-7163',
  '856-826-9657',
  '626-898-4310',
  '112-999-7571',
  '575-016-8285',
  '960-141-5375',
  '788-547-4910',
  '985-061-6600',
  '398-732-1075',
  '496-158-6385',
  '159-578-9334',
  '833-618-5467',
  '391-862-9102',
  '546-252-7902',
  '454-254-4704',
  '483-612-3214',
  '634-735-0728',
];

var SEND_RESULTS = true;
var SET_FINAL_URLS = false;

// --- CONSTANTS -------------------
var DOMAIN_INDEX = 0;
var ACCOUNT_TYPE_INDEX = 2;

// ####################################################
// ####################################################

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

// ####################################################
// ####################################################

function computeURL( keyword, isBrandOrGeneric ){
	var accountNameArr = AdWordsApp.currentAccount().getName().split( '-' );
	var res = SECOND_LEVEL_DOMAIN;
	var domain = accountNameArr[ DOMAIN_INDEX ].toLowerCase();
	
	res += domain == 'ar' ? 'com.ar' : domain;
	
	if( [ 'Brand', 'Generic' ].indexOf( accountNameArr[ ACCOUNT_TYPE_INDEX ] ) >= 0 ){
		Logger.log( res );
		return res;
	}
	res += '/';
	
	var language = domain == 'ar' ? 'es' : domain;
	var campaignName = keyword.getCampaign().getName();
	var adgroupName = keyword.getAdGroup().getName();
	var campaignId = keyword.getCampaign().getId();
	var adgroupId = keyword.getAdGroup().getId();
	var keywordId = keyword.getId();
	var keyword_ = keyword.getText().split( '+' ).join( '' ).split( '"' ).join( '' ).split( '[' ).join( '' ).split( ']' ).join( '' );
	var routeType = campaignName.split( '|' )[ 1 ].split( '.' )[ 0 ]; // I, 0, or II
	var departureCityCode = adgroupName.split( '|' )[ 3 ].split( '_' )[ 1 ];
	var arrivalCityCode = adgroupName.split( '|' )[ 4 ].split( '_' )[ 1 ];
	//var keywordVariation = campaignName.split( '|' )[ 3 ].split( ':' )[ 1 ];
	
	var x = campaignName.split( '|' )[ 1 ].split( '_' );
	
	var keywordVariationCoide = x[ 0 ].substring( 1 ) + '_' + x[ 1 ];
	
	var vertical = campaignName.split( '|' )[ 1 ].split( '[' )[ 1 ].split( '_' )[ 0 ].toLowerCase();
	
	var wv = vertical == 'wv';
	
	if( routeType == '0' ){
		res += '?departure_fk=' + departureCityCode;
	}else{
		res += 'lps/' + ( wv ? 'wv_' : '' ) + keyword_.split( ' ' ).join( '_' );
		res += '?id=';
		
		var pageType = '';
		if( routeType == 'I' ){
			if( wv ){
				pageType = 'connection_page_nt'
			}else{
				pageType = 'connection_page'
			}
		}else{ // routeType == 'II'
			if( wv ){
				pageType = 'to_location_page'
			}else{
				pageType = 'mode_to_position_page'
			}
		}
		var id = pageType + '.' + language
			+ ( wv ? '' : '.' + vertical )
			+ ( routeType == 'I' ? '.' + departureCityCode : '' )
			+ '.' + arrivalCityCode;
		
		res += Utilities.base64Encode( id );
	}
	
	res += '&utm_source=google';
	res += '&utm_medium=cpc';
	res += '&utm_campaign=' + encodeURIComponent( campaignName );
	res += '&utm_term=' + encodeURIComponent( keyword_ ).replace( '%20', '+' );
	res += '&adgroup=' + encodeURIComponent( adgroupName );
	res += '&campaignid=' + campaignId;
	res += '&adgroupid=' + adgroupId;
	res += '&keywordid=' + keywordId;
	res += '&content=basic';
	
	if( routeType != '0' ){
		var h = 'lps.h.sem.' + routeType + keywordVariationCoide + '_rou.__.';
		res += '&h=' + Utilities.base64Encode( h );
	}
	Logger.log( res );
	return res;
}

function main(){
	try {
		Logger.log( 'Start' );
		var accountId = AdWordsApp.currentAccount().getCustomerId();
		
		if( typeof MccApp == 'undefined' ){
			var result = processAccount( accountId );
			finalProcessing(
				[
					{
						getReturnValue : function(){ return result },
						getCustomerId : function(){ return accountId }
					}
				]
			);
		} else {
			var app = MccApp
				.accounts()
				.withIds( ACCOUNT_IDS )
				.executeInParallel( 'processAccount', 'finalProcessing', '' + accountId );
		}
	} catch ( error ){
		var header = 'Error in ' + SCRIPT_NAME + ' ' + AdWordsApp.currentAccount().getName() + ' [' + AdWordsApp.currentAccount().getCustomerId() + ']';
		var message = error + '\n' + error.stack;
		Logger.log( header + ' -> ' +  message );
		MAIL_APP.sendEmail( SEND_ERROR_MESSAGES_TO, header, message );
		throw error;
	}
}

function processAccount(){
	var accountName = AdWordsApp.currentAccount().getName();
	Logger.log( 'Start ' + accountName );
	var iter = AdWordsApp.labels().withCondition( 'Name IN ["' + KEYWORD_LABEL + '"]' ).get();
	
	if( iter.totalNumEntities() != 1 ){
		Logger.log( 'Expected to find exactly one label, but found: ' + iter.totalNumEntities() + '. Terminating..' );
		return;
	}
	var label = iter.next();
	
	var iter = label.keywords().get();
	Logger.log( 'Found ' + iter.totalNumEntities() + ' labeled keywords' );
	
	var output = '';
	var i = 0;
	while( iter.hasNext() ){
		i++;
		if( i % 20 == 0 ){
			Logger.log( i );
		}
		var keyword = iter.next();
		var url = computeURL( keyword );
		if( SET_FINAL_URLS ){
			keyword.urls().setFinalUrl( url );
		}
		output += accountName
			+ '\t' + keyword.getCampaign().getName()
			+ '\t' + keyword.getAdGroup().getName()
			+ '\t' + keyword.getText()
			+ '\t' + url + '\n';
	}
	
	Logger.log( 'End ' + AdWordsApp.currentAccount().getName() );
	return output;
}

function finalProcessing( results ){
	if( !SEND_RESULTS ){
		Logger.log( 'don\'t send email with results' );
		return;
	}
	
	try {
		var allOutput = '';
		results.forEach( function( result ){
			if ( result.getReturnValue() === 'undefined' ){
				// yes, adwords scripts really returns a string 'undefined'
				// processAccount() returned nothing. ( return; )
				return;
			}

			var resultX = result.getReturnValue();
			
			if ( null == resultX ){
				// seems like this is possible if a thread had an error
				return;
			}
			var accountId = result.getCustomerId();
			allOutput += resultX;
		
		});
		var blob = Utilities.newBlob( allOutput, 'text/csv', 'urls.csv');
		for( var index in SEND_RESULTS_TO ){
			var email = SEND_RESULTS_TO[ index ];
			MailApp.sendEmail( email, SCRIPT_NAME, 'csv attached', {
				attachments: [ blob ]
			});
		}
		Logger.log( 'End' );
	} catch ( error ){
		var header = 'Error in ' + SCRIPT_NAME + ' ' + AdWordsApp.currentAccount().getName() + ' [' + AdWordsApp.currentAccount().getCustomerId() + ']';
		var message = error + '\n' + error.stack;
		Logger.log( header + ' -> ' +  message );
		MAIL_APP.sendEmail( SEND_ERROR_MESSAGES_TO, header, message );
		throw error;
	}
}

