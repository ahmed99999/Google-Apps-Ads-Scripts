
var config = {
	"DESCRIPTION" : "" ,
	"INSTRUCTIONS": "",
	"VERSION" : 1,
	"VERSION_TAG" : "stable",
	"TYPE":"MCC",
	"settings" : {
		"TO" : [ "a.tissen@pa.ag" ],
		"EXECUTION_HOURS" : [ 12, 13 ],
		"TIMEZONE" : "Europe/Berlin",
		"STRIP_QUERY_STRING" : false,
		"REMOVE_VALUE_TRACK_PARAMETERS" : false,
		"DONT_CHECK_URLS" : [ "https://testforscript.ru" ],
		"SCRIPT_NAME" : "Pa-Airbnb-404-checker",
		"SEND_ERROR_MESSAGES_TO" : "a.tissen@pa.ag",
		"MAILGUN_URL" : "https://api.mailgun.net/v3/mg.peakace.de/messages",
		"MAILGUN_AUTH" : "Basic YXBpOmtleS1hYWZmMmI2MGU4MmNkMWYwOTIwYWYxNDUzZWM0MDcyOA==",
		"MAILGUN_FROM" : "adwords_scripts@mg.peakace.de"
	}
};

var config = JSON.parse( dataJSON.settings );
for( key in config ){
	this[ key ] = config[ key ];
}

// -- SETTINGS ------------------------------------

function main(){
	var accountName = AdWordsApp.currentAccount().getName();
	try{
		Logger.log( 'start' );
		var now = new Date( Utilities.formatDate( new Date(), TIMEZONE, 'MMM dd,yyyy HH:mm:ss' ) );
		
		if( EXECUTION_HOURS.indexOf( now.getHours() ) == -1 ){
			Logger.log( 'Current hour is not scheduled for script execution. Wait for execution hour.\nQuit' );
			return;
		}
		
		var badUrls = getAllUrls()
			.map( cleanUrl )
			.filter( function( url ){ return DONT_CHECK_URLS.indexOf( url ) < 0 })
			.map( check )
			.filter( function( obj ){
				return obj.error || ( obj.httpCode >= 400 && obj.httpCode < 500 );
			})
		;
		if( badUrls.length > 0 ){
			var text = badUrls.map( function( obj ){
				return ( obj.httpCode || obj.error ) + ' : ' + obj.url;
			}).join( '\n' );
			TO.forEach( function( email ){
				Logger.log( 'Send email to ' + email );
				sendEmail( email, '404 urls found in ' + accountName, text );
			});
		}else{
			Logger.log( 'No http-code errors found in urls' );
			Logger.log( 'Quit.');
		}
	}catch ( error ){
		sendEmail( SEND_ERROR_MESSAGES_TO, 'Error in ' + SCRIPT_NAME + ' ' + accountName, error + '\n' + error.stack );
		Logger.log( 'Error in ' + SCRIPT_NAME + ' ' + accountName + ' -> ' + error + '\n' + error.stack );
		throw error;
	}
}

function getAllUrls(){
	var urls = [ '' ]; // empty string for keywords without urls
	while( true ){
		var query = 'SELECT FinalUrls FROM KEYWORDS_PERFORMANCE_REPORT '
			+ 'WHERE CampaignStatus = "ENABLED" '
			+ 'AND AdGroupStatus = "ENABLED" '
			+ 'AND Status = "ENABLED" '
			+ 'AND IsNegative = FALSE '
			//+ 'AND FinalUrls != "" '
			+ 'AND FinalUrls NOT_IN [ "' + urls.join( '","' ) + '" ]'
		;
		
		var res = AdWordsApp.report( query );
		var rows = res.rows();
		
		if( rows.hasNext() ){
			var row = rows.next();
			var newUrls = JSON.parse( row[ 'FinalUrls' ] );
			urls = urls.concat( newUrls );
			Logger.log( ( urls.length - 1 ) + '. ' + newUrls );
		}else{
			// We found all URLs. stop here.
			break;
		}
	}
	Logger.log( 'found ' + ( urls.length - 1 ) + ' unique URLs' );
	Logger.log( urls );
	return urls.slice( 1 ); // remove empty string
}

function cleanUrl( url ){
	if( STRIP_QUERY_STRING ){
		if( url.indexOf( '?' ) >= 0 ){
			url = url.split( '?' )[ 0 ];
		}
	}
	if( REMOVE_VALUE_TRACK_PARAMETERS ){
		if( url.indexOf( '{' ) >= 0 ){
			//Let's remove the value track parameters
			url = url.replace( /\{[0-9a-zA-Z]+\}/g, '' );
		}
	}
	return url;
}

function check( url ){
	var res = {
		url : url,
	};
	try{
		response = UrlFetchApp.fetch( url, { muteHttpExceptions : true } );
		res.httpCode = response.getResponseCode();
	}catch( error ){
		Logger.log( 'Error during fetch of ' + url + ': ' + error );
		res.error = error;
	}
	return res;
}

// ####################################################
// ####################################################

function sendEmail( to, subject, text ){
	if( !text ){
		throw new Error( ' no text supplied for Email ' );
	}
	if( MAILGUN_AUTH && MAILGUN_AUTH.length > 0 ){
		return mailGunSender( to, subject, text );	
	}else{
		return MailApp.sendEmail( to, subject, text );
	}
}

function mailGunSender( to, subject, text, html ){
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
		MAILGUN_URL,
		{
			"method": "post",
			"payload": {
				'from': MAILGUN_FROM,
				'to': to,
				'subject': subject,
				'text': text,
				'html': html,
			},
			"headers": {
				"Authorization": MAILGUN_AUTH,
			}
		}
	 );
}

// ####################################################
// ####################################################
