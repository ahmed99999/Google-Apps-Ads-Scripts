<script>
  (function(){
	// Variables
	
	// Input name for cid. Can be used by client on server to extract cid.
	var INPUT_CID_NAME = 'pa_ga_cid';
	
	 // Input name for gclid. Can be used by client on server to extract gclid.
	var INPUT_GCLID_NAME = 'pa_aw_gclid';
	
	 // GCLID is temporary saved in a cookie. Cookie name can be customized here.
	var GCLID_COOKIE_NAME = 'gclid';
	
	 // Duration in days before the cookie is deleted by browser.
	var COOKIE_LIFETIME = 90; 
		
	// constants
	// Google Analytics cookie name. It is created by Analytics. Hence, we cannot change it.
	var GA_COOKIE_NAME = '_ga'; // Google Analytics cookie name. It is created by Analytics. Hence, we cannot change it.
	
	// Count of milliseconds in 24 hours.
	var MILLIS_IN_DAY = 24 * 60 * 60 * 1000; 



	function setCookie( name, value, days ){
		var date = new Date();
		date.setTime( date.getTime() + days * MILLIS_IN_DAY );
		document.cookie = name + "=" + value + "; expires=" + date.toGMTString() + ";path=/";
	}

	function getParam( p ){
		var match = RegExp('[?&]' + p + '=([^&]*)').exec( window.location.search );
		return match && decodeURIComponent(match[1].replace(/\+/g, ' '));
	}

	function readCookie( name ){
		var n = name + "="; 
		var cookie = document.cookie.split(';');
		for( var i = 0; i < cookie.length; i++ ){
			var c = cookie[i];
			while( c.charAt(0) == ' ' ){
				c = c.substring( 1, c.length );
			}
			if( c.indexOf( n ) == 0 ){
				return c.substring( n.length, c.length );
			}
		}
		return '';
	}

	function addOrReplaceHiddenFieldInAllForms( name, value ){
		var forms = document.querySelectorAll("form");
		for( index in forms ){
			var form1 = forms[ index ];
			if( '' + form1 == '[object HTMLFormElement]'){
				var elem = form1.querySelector('input[name=' + name + ']');
				if( !elem ){
					elem = document.createElement('input');
					elem.type = 'hidden';
					elem.name = name;
					form1.appendChild( elem );
				}
				elem.value = value;
			}
		}
	}


	var gclid = getParam('gclid');

	if( gclid ){
		var gclsrc = getParam( 'gclsrc' );
		if( !gclsrc || gclsrc.indexOf( 'aw' ) !== -1 ){
			setCookie( GCLID_COOKIE_NAME, gclid, COOKIE_LIFETIME );
		}
	}

	addOrReplaceHiddenFieldInAllForms( INPUT_CID_NAME, readCookie( GA_COOKIE_NAME ) );
	addOrReplaceHiddenFieldInAllForms( INPUT_GCLID_NAME, readCookie( GCLID_COOKIE_NAME ) );	
})();
</script>