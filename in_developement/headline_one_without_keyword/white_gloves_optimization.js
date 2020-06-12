var SHEET_URL = 'https://docs.google.com/spreadsheets/d/141IjrDEN3fdcLh-nO2IMsZthiJLVP0PPvsjo2Yf6lR8/edit#gid=0';
var DATE_RANGE = 'LAST_30_DAYS';
var REMOVE_BROAD_MATCH_MODIFIER = true;

var WEIGHTS = {
	IMPRESSIONS   : .05,
	CLICKS        : .4,
	BOUNCE_RATE   : .15,
	CONV_RATE     : .2,
	CTR           : .2,
};

function toList( iterator ){
	var result = [];
	while( iterator.hasNext() ){
		result.push( iterator.next() ); 
	}
	return result;
}

function adjustKeywordText( text ){
	if( REMOVE_BROAD_MATCH_MODIFIER ){
		return text.replace( /\+/g, '' );
	}
	return text
}

function main(){
	var sheet = SpreadsheetApp.openByUrl( SHEET_URL ).getActiveSheet();
	sheet.clear();
	
	sheet.appendRow(
		[
			'Campaign',
			'Ad Group',
			'keyword',
			'HeadlinePart1',
			'HeadlinePart2',
			'HeadlinePart3',
			'Description1',
			'Description2',
			'Path1',
			'Path2',
			'Impressions',
			'Clicks',
			'Cost',
			'Conversions',
			'AverageCpc',
			'AverageTimeOnSite',
			'BounceRate',
			'FinalUrl',
			'AdGroupImpressions',
			'AdGroupClicks',
			'PerformanceScore',
			'Classification',
		]
	);
	
	var adgroups = toList(
		AdsApp
			.adGroups()
			.withCondition( 'CampaignName DOES_NOT_CONTAIN "BRD"' )
			.withCondition( 'CampaignName DOES_NOT_CONTAIN "DSA"' )
			.withCondition( 'CampaignName DOES_NOT_CONTAIN "NearMe"' )
			.forDateRange( DATE_RANGE )
			.orderBy( 'Cost DESC' )
			.withLimit( 50 )
			.get()
	);
	
	adgroups.forEach( function( adgroup ){
		
		var adGroupStats = adgroup.getStatsFor( DATE_RANGE );
		
		var keywords = toList(
			adgroup
				.keywords()
				.forDateRange( DATE_RANGE )
				.orderBy( 'Clicks DESC' )
				.get()
		);
		if( keywords.length > 0 ){
			var keyword = keywords[ 0 ];
			;
  
			//Logger.log(
			//	adgroup.getName()
			//	+ ': '
			//	+ adjustKeywordText( keyword.getText() )
			//	+ ': '
			//	+ keyword.getStatsFor( DATE_RANGE ).getClicks()
			//);
			
			var ads = toList( adgroup.ads().get() );
			
			ads = ads.filter(
				function( ad ){ return typeof ad.getHeadlinePart1 != 'undefined' }
			);
			
			ads.forEach( function( ad ){
				var stats = ad.getStatsFor( DATE_RANGE );
				
				var impressionPercentage = stats.getImpressions() / 
					Math.max( adGroupStats.getImpressions(), 1 )
				;
				
				var clicksPercentage = stats.getClicks() / 
					Math.max( adGroupStats.getClicks(), 1 )
				;
				
				var ctr = stats.getClicks() / 
					Math.max( stats.getImpressions(), 1 )
				;
				
				var convRate = stats.getConversions() / 
					Math.max( stats.getClicks(), 1 )
				;
				
				var bounceRate = stats.getBounceRate();
				
				ad.performance = Math.floor( 1000 *
					(
					WEIGHTS[ 'IMPRESSIONS' ] * impressionPercentage +
					WEIGHTS[ 'CLICKS' ] * clicksPercentage +
					WEIGHTS[ 'BOUNCE_RATE' ] * bounceRate +
					WEIGHTS[ 'CONV_RATE' ] * convRate +
					WEIGHTS[ 'CTR' ] * ctr
					)
				) / 10
				;
			});
			
			ads = ads.sort( function( a, b ){
				// DESC
				return b.performance - a.performance;
			});
			var threshold = 1;
			if( ads.length >= 3 ){
				threshold = ads[ 2 ].performance;
			}
			
			ads.forEach( function( ad ){
				var stats = ad.getStatsFor( DATE_RANGE );
				sheet.appendRow(
					[
						adgroup.getCampaign().getName(),
						adgroup.getName(),
						adjustKeywordText( keyword.getText() ),
						ad.getHeadlinePart1(),
						ad.getHeadlinePart2(),
						ad.getHeadlinePart3(),
						ad.getDescription1(),
						ad.getDescription2(),
						ad.getPath1(),
						ad.getPath2(),
						stats.getImpressions(),
						stats.getClicks(),
						stats.getCost(),
						stats.getConversions(),
						stats.getAverageCpc(),
						stats.getAverageTimeOnSite(),
						stats.getBounceRate(),
						keyword.urls().getFinalUrl(),
						adGroupStats.getImpressions(),
						adGroupStats.getClicks(),
						ad.performance + '%',
						( ad.performance < threshold ? 'BAD' : 'GOOD' ),
					]
				);
			});
			
		}
	});
}
