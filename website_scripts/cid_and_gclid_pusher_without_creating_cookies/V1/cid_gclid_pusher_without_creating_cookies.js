<script>
  (function(){
    // Variables
    
    // Input name for cid. Can be used by client on server to extract cid.
    var INPUT_CID_NAME = '_cid';
    
     // Input name for gclid. Can be used by client on server to extract gclid.
    var INPUT_GCLID_NAME = 'pa_aw_gclid';
    
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
            if( '' + form1 == '[object HTMLFormElement]' ){
                var elem = form1.querySelector( 'input[name=' + name + ']' );
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
	
	var gclid = readCookie( '_gcl_aw'	);
	if( gclid.indexOf( '.' ) >= 0 ){
		gclid = gclid.split( /\./g );
		gclid = gclid[ gclid.length - 1 ];
	}

    addOrReplaceHiddenFieldInAllForms( INPUT_CID_NAME, readCookie( '_ga' ) );
    addOrReplaceHiddenFieldInAllForms( INPUT_GCLID_NAME, gclid );
})();
</script>



