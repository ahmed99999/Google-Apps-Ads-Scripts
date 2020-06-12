
var LABEL_NAME = 'PA - Headline 1 without KW';
var STOP_WORDS = [ 'à','®','le','la','de' ];
var SHEET_URL = 'https://docs.google.com/spreadsheets/d/1_HBj6r19HP8vQQX1bkSSX4CsIv-5n-OwI-5jUS4_T6w/edit?usp=sharing';

function toList( iterator ){
	var result = [];
	while( iterator.hasNext() ){
		result.push( iterator.next() ); 
	}
	return result;
}

function property( prop ){
	return function( item ){
		if( typeof item[ prop ] == 'function' ){
			return item[ prop ]();
		}
		return item[ prop ];
	};
}

function replaceStopWords( str ){
	STOP_WORDS.forEach( function( stopWord ){
		str = str.replace( stopWord, '' );
	});
	str = str.replace( /\s+/g, ' ' );
	return str;
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
			'Path2'
		]
	);
	
	AdsApp.createLabel( LABEL_NAME );
	
	var adgroups = toList(
		AdsApp
			.adGroups()
			.withCondition( 'Clicks > 100' )
			.forDateRange( '20191120,20191120' )
			.withLimit( 5000 )
			.get()
	);
	
	adgroups.forEach( function( adgroup ){
		var keywords = toList(
			adgroup
				.keywords()
				.forDateRange( 'TODAY' )
				.orderBy( 'Clicks DESC' )
				.get()
		);
		if( keywords.length > 0 ){
			var keyword = keywords[ 0 ];
			var keywordText = keyword
				.getText()
				.replace( /^\[/, '' )
				.replace( /\]$/, '' )
				.replace( /^\"/, '' )
				.replace( /\"$/, '' )
				.replace( /\+/g, '' )
				.toLowerCase()
			;
			keywordText = replaceStopWords( keywordText );
			
			Logger.log(
				adgroup.getName()
				+ ': '
				+ keywordText
				+ ': '
				+ keyword.getStatsFor( 'TODAY' ).getClicks()
			);
			
			var ads = toList( adgroup.ads().get() );
			
			ads.forEach( function( ad ){
				if( ad.getHeadlinePart1 ){
					var headline = ad.getHeadlinePart1().toLowerCase();
					
					headline = replaceStopWords( headline );
			
					if( headline.indexOf( keywordText ) == -1 ){
						sheet.appendRow(
							[
								adgroup.getCampaign().getName(),
								adgroup.getName(),
								keyword.getText(),
								ad.getHeadlinePart1(),
								ad.getHeadlinePart2(),
								ad.getHeadlinePart3(),
								ad.getDescription1(),
								ad.getDescription2(),
								ad.getPath1(),
								ad.getPath2()
							]
						);
						Logger.log(
							'headline: '
							+ ad.getHeadlinePart1()
							+ ' ----> '
							+ headline
						);
						ad.applyLabel( LABEL_NAME );
					}
				}
			});
		}
	});
}
