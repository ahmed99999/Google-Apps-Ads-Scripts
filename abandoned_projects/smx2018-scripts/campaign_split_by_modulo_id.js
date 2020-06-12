function hash( value ){
	value = value + '';
	var hash = 0;
	for( i = 0; i < value.length; i++ ){
		var char1 = value.charCodeAt( i );
		hash = (( hash << 5 ) - hash ) + char1;
		hash = hash & hash; // Convert to 32bit integer
	}
	return Math.abs( hash );
}

function computeCampaignsForCurrentHourModuloMethod(){
  // About ( count Campaigns ) / NUM_PARTS campaigns will be returned by this function.
  // NUM_PARTS can be set to one of following values: 1,2,3,4,6,8,12,24
  const NUM_PARTS = 24;
  var hour = (new Date()).getHours();
  
  var campaigns = [];
  var iter = AdWordsApp.campaigns().get();
  while( iter.hasNext() ){
    var campaign = iter.next();
	// Use hash to remove possible patterns from campaign_id's and achieve a higher probability of uniform distribution
    if( hash( campaign.getId() ) % NUM_PARTS == hour % NUM_PARTS ){
      campaigns.push( campaign );
    }
  }
  
  return campaigns;
}



function main() {
  
  var campaigns = computeCampaignsForCurrentHourModuloMethod();
  
  campaigns.forEach( function( campaign, index ){
    // do something with campaign
    Logger.log( index + ': ' + campaign.getName() );
  });
}