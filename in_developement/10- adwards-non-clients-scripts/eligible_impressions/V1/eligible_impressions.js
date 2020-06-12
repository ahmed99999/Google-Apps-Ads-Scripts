var accountId = '7056468392';

function property( prop ){
 return function( item ){ return item[ prop ] };
}

function toList( iter ){
  var res = [];
  while( iter.hasNext() ){
    res.push( iter.next() );
  }
  return res;
}

/*
var target = {
  "Criteria": "+nachprüfung",
  "TopImpressionPercentage": "0.75",
  "AbsoluteTopImpressionPercentage": "0.5"
};
*/

//var old = { "Impressions": "813", "TopImpressionPercentage": "0.73", "Criteria": "+nachprüfung", "CpcBid": "1.52", "AbsoluteTopImpressionPercentage": "0.61" };

function toNumber( value ){
 if( value.charAt( value.length - 1 ) == '%' ){
   value = value.substring( 0, value.length - 1 );
   if( value.substring( 0, 2 ) == '< ' ){
     value = value.substring( 2, value.length );
   }
   if( value.substring( 0, 2 ) == '> ' ){
     value = value.substring( 2, value.length );
   }
   value = value / 100;
   return value;
 }
  return value / 1;
}

function main(){
  Logger.log( 'start' );
  MccApp.select(MccApp.accounts().withIds( [ accountId ] ).get().next() );
  
  
  var iter = AdWordsApp.labels().get();
  var list = [];
  while( iter.hasNext() ){
    list.push( iter.next() );
  }
  list.forEach( function( label ){ label.remove(); } );
  
  
  
  var query = 'SELECT CampaignName, Impressions, TopImpressionPercentage, AbsoluteTopImpressionPercentage, SearchAbsoluteTopImpressionShare, SearchTopImpressionShare, SearchImpressionShare ' +
	  'FROM CAMPAIGN_PERFORMANCE_REPORT ' +
      'WHERE CampaignStatus = "ENABLED" ' +
      //'AND CampaignName = "02 - Generic - Mathekurs [Städte][Übersichten] - BMM" ' + 
      //'AND AdGroupStatus = "ENABLED" ' +
      //'AND Status = "ENABLED" ' +
      //'AND IsNegative = false ' +
      //'AND Criteria = "+nachprüfung" ' +
      'AND Impressions > 0 ' +
      'AND SearchAbsoluteTopImpressionShare > .1 ' +
      /*
      'AND SearchAbsoluteTopImpressionShare < .09990000001 ' +
      'AND SearchTopImpressionShare > .09989999999 ' +
      'AND SearchTopImpressionShare < .09990000001 ' +
      'AND TopImpressionPercentage > .1999999 ' +
      'AND TopImpressionPercentage < .2000001 ' +
      */
  	  'DURING 20190625,20190625';
  
  var items = toList( AdWordsApp.report( query ).rows() )
  	.map( function( row1 ){
      var row = {};
      row.CampaignName = row1.CampaignName;
	  row.Impressions = row1.Impressions;
      row.TopImpressionPercentage = row1.TopImpressionPercentage;
      row.AbsoluteTopImpressionPercentage = row1.AbsoluteTopImpressionPercentage;
      row.SearchImpressionShare = row1.SearchImpressionShare;
      row.SearchTopImpressionShare = row1.SearchTopImpressionShare;
      row.SearchAbsoluteTopImpressionShare = row1.SearchAbsoluteTopImpressionShare;

      row.TopImpressions    = row.Impressions * toNumber( row.TopImpressionPercentage );
      row.AbsTopImpressions = row.Impressions * toNumber( row.AbsoluteTopImpressionPercentage );
      
      row.EligibleImpressions 			= Math.round( row.Impressions / toNumber( row.SearchImpressionShare ) );
      row.EligibleTopImpressions 		= Math.round( row.TopImpressions / toNumber( row.SearchTopImpressionShare ) );
      row.EligibleAbsoluteTopImpressions 	= Math.round( row.AbsTopImpressions / toNumber( row.SearchAbsoluteTopImpressionShare ) );
      row.EligiblePercentage = ( Math.round( row.EligibleTopImpressions / row.EligibleImpressions * 1000 ) / 10 ) + '%';
      row.Error 			 = ( Math.round( Math.abs( row.EligibleTopImpressions - row.EligibleAbsoluteTopImpressions ) / row.Impressions * 1000 ) / 10 ) + '%';
      
      return row;
      
    });
  
 Logger.log( 'Results: ' + JSON.stringify( items, null, 2 ) );
 // Logger.log( 'Results: ' + items );
  

}