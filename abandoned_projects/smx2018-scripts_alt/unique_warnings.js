
/*

unique Warnings

*/


var uniqueWarnings = {};
function uniqueWarning( warning ){
	if( !uniqueWarnings[ warning ] ){
		uniqueWarnings[ warning ] = 1;
		Logger.log( 'WARNING: ' + warning );
	}
}

function main() {
  var iter = AdWordsApp.adGroups().get();
  while( iter.hasNext() ){
    var adgroup = iter.next();
    var countKeywords = adgroup.keywords().get().totalNumEntities();
    if( countKeywords == 0 ){
      uniqueWarning( 'empty adgroups found. skip..' );
      continue;
    }
    // do something with adgroup..
  }
}