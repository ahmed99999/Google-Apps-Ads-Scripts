
MailApp = {
	originalMailApp        : MailApp,
	createMessage          : MailApp.createMessage,
	getRemainingDailyQuota : MailApp.getRemainingDailyQuota,
	sendEmailInPreview     : function(){
		this.sendEmailInternal.apply( this, arguments );
	},
	sendEmail              : function(){
		if( AdWordsApp.getExecutionInfo().isPreview() ){
			Logger.log( 'don\'t send emails in preview mode' );
			return;
		}
		this.sendEmailInternal.apply( this, arguments );
	},
	sendEmailInternal      : function(){
		var options = ( function checkArguments( arguments ){
			if( arguments.length == 0 ){
				throw new Error( 'No arguments supplied. Expected at least one argument' ); 
			}
			Logger.log( 'sendEmail' );
			var options = {};
			if( arguments.length == 1 && typeof arguments[ 0 ] == 'object' ){
				options = arguments[ 0 ]; 
			}else if( arguments.length == 3
				&& typeof arguments[ 0 ] == 'string'
				&& typeof arguments[ 1 ] == 'string'
				&& typeof arguments[ 2 ] == 'string'
				){
					options.to      = arguments[ 0 ];
					options.subject = arguments[ 1 ];
					options.body    = arguments[ 2 ];
			}else if( arguments.length == 4
				&& typeof arguments[ 0 ] == 'string'
				&& typeof arguments[ 1 ] == 'string'
				&& typeof arguments[ 2 ] == 'string' ){
				if( typeof arguments[ 3 ] == 'string' ){
					
					options.to      = arguments[ 0 ];
					options.replyTo = arguments[ 1 ];
					options.subject = arguments[ 2 ];
					options.body    = arguments[ 3 ];
				}else if( typeof arguments[ 3 ] == 'object' ){
					options         = arguments[ 3 ];
					options.to      = arguments[ 0 ];
					options.subject = arguments[ 1 ];
					options.body    = arguments[ 2 ];
				}else{
					throw new Error( 'Unexpected argument types: ' + [].slice.call( arguments ) );
				}
			}else{
				throw new Error( 'Unexpected arguments: ' + [].slice.call( arguments ) ); 
			}
			return options;
		})( arguments );
		
		var scriptName  = ( typeof SCRIPT_NAME == 'string' ? SCRIPT_NAME : '' );
		var accountName = AdWordsApp.currentAccount().getName();
		var accountId   = AdWordsApp.currentAccount().getCustomerId();
		
		var feedbackUrl = 'https://us-central1-biddy-io.cloudfunctions.net/script_checker';
		if( options.htmlBody ){
			options.htmlBody += ''
				+ '<h2>Got feedback?</h2> post it here: <a href="'
				+ feedbackUrl
				+ '?script_name='  + encodeURIComponent( scriptName )
				+ '&account_name=' + encodeURIComponent( accountName )
				+ '&account_id='   + encodeURIComponent( accountId )
				+ '">feedback</a><br><br>-----------<br><br>'
			;
		}
		if( options.body ){
			options.body += ''
				+ '\n\n-----------\n\n'
				+ 'Got feedback? post it here: '
				+ feedbackUrl
				+ '?script_name='  + encodeURIComponent( scriptName )
				+ '&account_name=' + encodeURIComponent( accountName )
				+ '&account_id='   + encodeURIComponent( accountId )
			;
		}
		// Logger.log( 'all good: ' + JSON.stringify( options, null, 2 ) );
		
		var fetchResult = UrlFetchApp.fetch(
			'https://api.mailgun.net/v3/mg.peakace.de/messages',
			{
				method             : 'post',
				payload            : {
					from           : 'adwords_scripts@mg.peakace.de',
					to             : options.to,
					subject        : options.subject,
					text           : options.body,
					html           : options.htmlBody,
				},
				headers            : {
					Authorization  : 'Basic YXBpOmtleS1hYWZmMmI2MGU4MmNkMWYwOTIwYWYxNDUzZWM0MDcyOA==',
				},
				muteHttpExceptions : true,
			}
		);
		Logger.log( 'fetchResult: ' + fetchResult );
		
		if( fetchResult == 'Forbidden' ){
			fetchResult = { message : fetchResult };
		}else{
			fetchResult = JSON.parse( fetchResult );
		}
		var success = fetchResult.message == 'Queued. Thank you.';
		var invalidToParameter =
			fetchResult.message
			== 
			'\'to\' parameter is not a valid address. please check documentation'
		;
		if( invalidToParameter ){
			throw new Error( options.to + ' - ' + fetchResult.message );
		}
		if( !success ){
			options.body = ''
				+ '\n Error in Mailgun: '
				+ fetchResult.message
				+ '. Fallback to MailApp.'
				+ '\n\n-----------\n\n'
				+ options.body
			;
			this.originalMailApp.sendEmail(	options	);
		}
		/*
		Logger.log(
			'fetchResult: '
			+ JSON.stringify( fetchResult, null, 2 )
			+ ' - ' +
			success
			+ ' - ' +
			invalidToParameter
		);
		*/
	},
};
