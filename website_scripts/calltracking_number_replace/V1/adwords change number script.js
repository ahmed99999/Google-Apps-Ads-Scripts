<script type="text/javascript" id="adwords_google_forwarding_num">

// replace all occurences of from-argument with to-argument
function replaceTextOnPage( from, to ){
	
	// find all text-nodes and replace all occurences of ´from´ in each text-node with ´to´
	getAllTextNodes().forEach(
		function( node ){
			node.nodeValue = node.nodeValue.replace( new RegExp( quote( from ), 'g' ), to );
		}
	);

	// find all text-nodes in document
	function getAllTextNodes(){
		var result = [];

		(function scanSubTree( node ){
			if( node.childNodes.length ){
				for( var i = 0; i < node.childNodes.length; i++){
					scanSubTree( node.childNodes[i] );
				}
			} else if(node.nodeType == Node.TEXT_NODE){
				result.push( node );
			}
		})( document );

		return result;
	}

	// escape all regex-reserved characters
	function quote(str){
		return ( str + '' ).replace( /([.?*+^$[\]\\(){}|-])/g, "\\$1" );
	}
}
  
  
(function() {
	// Enter all variations of the phone number you want to be replaced here.
	var allToReplace = [ 'xxx-xxxxxxx', 'xxx - xxxxxxxx', 'xxx – xxxxxxxxxx' ];

	// This function is called by google and gets a phone number (supplied by google) as argument.
	function callback( formattedNumber ){
		// console.log( 'replace( ' + all_to_replace[0] + ' with ' + formattedNumber );
		for( var i = 0; i < allToReplace.length; i++ ){
          	console.log('replace \"' + allToReplace[i] + '\" by \"' + formattedNumber + '\"');
			replaceTextOnPage( allToReplace[i], formattedNumber );
		}
	};
	
	//callback( '[TEST]' );
	
	// Call the google function with two arguments.
	// The first argument is our callback function, which is called by google later and gets the google-phone number as argument.
	// The second argument is our default phone-number which serves as a fallback in case google can't supply a callback-number.
	// One of the values from allToReplace array should be supplied here as second argument.
	_googWcmGet( callback, 'xxx-xxxxxxxxx' );
})();

</script>