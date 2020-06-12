
function isPluralSingularRelationship2( keyword1, keyword2 ){
	return isPluralSingularRelationship( keyword1, keyword2 ) || isPluralSingularRelationship( keyword2, keyword1 );
}

function isPluralSingularRelationship( keywordToCompareTo, keyword ){
	// assume the plusses already removed
	var suffixes = [ 'es', 's' ];
	var prefixes = [ 'the greater ' ];

	var words = keyword.split( ' ' );
	
	for( index in words ){
		var word = words[ index ];
		for( index2 in prefixes ){
			var beginning = prefixes[ index2 ];
			var word2 = beginning + word; 
			if( keywordToCompareTo == keyword.replace( word, word2 ) ){
				return true;
			}
		}
		for( index2 in suffixes ){
			var ending = suffixes[ index2 ];
			var word2 = word + ending;
			console.log( word2 );
			if( keywordToCompareTo == keyword.replace( word, word2 ) ){
				return true;
			}
		}
	}
	return false;
}