function computeCampaignsForCurrentHour(){
  const HOURS_PER_DAY = 24;
  var hour = new Date().getHours();
  
  var campaigns = [];
  var iter = AdWordsApp.campaigns().get();
  while( iter.hasNext() ){
    campaigns.push( iter.next() );
  }
  
  campaigns.sort( function( a, b ){ return a.getId() - b.getId() });
  
  var countCampaigns = campaigns.length;
  
  var result = campaigns.filter( function( campaign, index ){
    return index >= Math.ceil( hour / HOURS_PER_DAY * countCampaigns ) && index < ( hour + 1 ) / HOURS_PER_DAY * countCampaigns;
  });

  return result;
}


function main() {
  
  var campaigns = computeCampaignsForCurrentHour();
  
  campaigns.forEach( function( campaign ){
    Logger.log( ' do something with campaign: ' + campaign.getName() );
  });
}