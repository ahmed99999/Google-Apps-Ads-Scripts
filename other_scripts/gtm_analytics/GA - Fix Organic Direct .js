//GA - Fix Organic Direct 
//Folgenden Code bei Verwendung des Google Tag Managers als benutzerdefinierte JS-Variable anlegen und 
//als Feld customTask bei Hits in den festzulegenden Feldern nutzen 
function(){
	// Replace newTrackingId value with the UA property to which you want to duplicate this tag
	var newTrackingId = 'UA-39598427-3';  
	var globalSendTaskName = '_' + newTrackingId + '_originalSendTask';
	
	return function( model ){
		var r = {{Referrer}}; //Referrer als Integrierte Variable aktivieren und hier auslesen
		//Suchmuster für Suchmaschinen mit "versteckten" Suchparametern
		var srch = /(suche\.t-online\.de)|(qwant\.com)|(metager\.de)|(duckduckgo\.com)|(ecosia\.org)|(android\.googlequicksearchbox\.)|(search\.yahoo\.com)|(zapmeta\.)|(\.sosodesktop\.com)|(search\.mysearch\.com)|(search\.mail\.com)|(thesmartsearch\.net)|(zdsearch\.com)|(search\.easydialsearch\.com)|(safesearch\.hypersonica\.com)|(search\.v9\.com)|(search\.genieo\.com)|(search\.avast\.com)|(searches\.uninstallmaster\.com)|(search\.handycafe\.com)|(searches\.safehomepage\.com)|(search\.snapdo\.com)|(search\.selfbutler\.com)|(infospace\.com)|(search\.avira\.)/i;
		//Referrer mit Suchmuster vergleichen
		if( r.search( srch ) > 0 ){
			// passenden Parameter bestimmen
			var prm = ( r.search( 'yahoo' ) > 0 ) ? 'p=':'q=';
			// Konstanten Suchparameter anfügen, wenn kein Parameter vorhanden ist
			if( r.search( prm ) < 0 ){
				r += (r.split('?')[1] ? '&':'?') + prm + '(not provided)';
			}
			model.set( 'referrer', r );
			//Keine Kampagnenparameter (yahoo paid) gefunden? Dann setzen...
			if( r.indexOf( 'utm_source=' ) < 0 ){
				model.set( 'campaignSource', r.replace( 'http://','' ).replace( 'https://', '' ).replace( 'www.', '' ).split( /[/?#]/ )[ 0 ] );
				model.set( 'campaignMedium', 'organic' );
				var rgx = new RegExp( '[\\?&]' + prm + '([^&#]*)' );
				var q = rgx.exec( r );
				q = decodeURIComponent( q[ 1 ].replace( /\+/g, ' ' ) );
				model.set( 'campaignKeyword', q );
			}
		}
		
		window[ globalSendTaskName ] = window[ globalSendTaskName ] || model.get( 'sendHitTask' );
		model.set( 'sendHitTask', function( sendModel ){
			var hitPayload = sendModel.get( 'hitPayload' );
			var trackingId = new RegExp( sendModel.get( 'trackingId' ), 'gi' );
			window[ globalSendTaskName ]( sendModel );
			sendModel.set( 'hitPayload', hitPayload.replace( trackingId, newTrackingId ), true );
			window[ globalSendTaskName ]( sendModel );
		});
	}
}
