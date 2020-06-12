var ACCOUNT_ID = 1182117027;
var TIME = '20190701,20190730';
var CAMPAIGN_IDS = []; // 131464086
var SEPARATOR = " ";
var ID_SEPARATOR = '_';
var ID_COLUMNS = [ 'Query' ]; //'CampaignId', 'AdGroupId', 'KeywordId', 
var METRICS = [ 'Clicks', 'Cost', 'Conversions', 'ConversionValue' ];
var EXCEL_SEPARATOR = '\t';
var LINE_SEPARATOR = '\n';

function getReport( query ){
	var rows = AdWordsApp.report( query ).rows();
	var res = [];
	while( rows.hasNext() ){
		res.push( rows.next() );
	}
	return res;
}

// ####################################################
function mailGun( to, subject, text, attachment ){
	Logger.log( 'fetch URL' );

	return UrlFetchApp.fetch(
		'https://api.mailgun.net/v3/mg.peakace.de/messages',
		{
			//contentType : 'multipart/form-data',
			method : 'post',
			payload : {
				from : 'adwords_scripts@mg.peakace.de',
				to : to,
				subject : subject,
				text : text,
				attachment :  Utilities.newBlob( attachment, 'text/plain', 'attachment.txt' ),
			},
			headers : {
				Authorization : 'Basic YXBpOmtleS1hYWZmMmI2MGU4MmNkMWYwOTIwYWYxNDUzZWM0MDcyOA==',
			}
		}
	 );
}
// ####################################################

function levenshtein( a, b ){
  if(a.length == 0) return b.length; 
  if(b.length == 0) return a.length; 

  var matrix = [];

  // increment along the first column of each row
  var i;
  for(i = 0; i <= b.length; i++){
    matrix[i] = [i];
  }

  // increment each column in the first row
  var j;
  for(j = 0; j <= a.length; j++){
    matrix[0][j] = j;
  }

  // Fill in the rest of the matrix
  for(i = 1; i <= b.length; i++){
    for(j = 1; j <= a.length; j++){
      if(b.charAt(i-1) == a.charAt(j-1)){
        matrix[i][j] = matrix[i-1][j-1];
      } else {
        matrix[i][j] = Math.min(matrix[i-1][j-1] + 1, // substitution
                                Math.min(matrix[i][j-1] + 1, // insertion
                                         matrix[i-1][j] + 1)); // deletion
      }
    }
  }
  return matrix[b.length][a.length];
};

Number.prototype.times = function( callback ){
	for( var i = 1; i <= Number( this.valueOf() ); i++ ){
		callback( i );
	};
}

function property( prop ){
	return function( item ){
		if( typeof item[ prop ] == 'function' ){
			return item[ prop ]();
		}
		return item[ prop ];
	};
}

function onlyUnique( value, index, self ){
    return self.indexOf( value ) === index;
}

function flatten( arr ){
	if( arr.flat ){
		return arr.flat( 1 );
	}
	return [].concat.apply([], arr );
}

function main3(){
  Logger.log( 'start' );
  var l = new Date().getTime();
	
	var items = keywords.map( function( keyword ){
		var res = {
			keyword : keyword,
			encoded : encodeAsIntArr( keyword ),
      cluster : 0,
		};
		return res;
	});
  
  var threshold = 12;
  var cluster = [];
  
  var clusterIndex = 1;
  
  // nimm ein item, das noch zu keinem Cluster gehört.
  // finde den nächsten Nachbarn
  // falls der nächste Nachbar in einem Cluster ist, füge das Item zu diesem Cluster hinzu
  // sonst erstelle ein neues Cluster und füge Item und Nachbar hinzu
  
  function nextNeighbour( x, items ){
    return items.filter( function( item ){ return item != x } )
      .map( function( item ){
        item.dist = ngramDist( x, item );
        return item;
    }).reduce(
        function( resultSoFar, item ){
          if( item.dist < resultSoFar.dist ){
            return item;
          }
          return resultSoFar;
        },
                          {
                           dist : threshold,
                          }
      );
  }
  
  for( var i = 0; i < items.length; i++ ){
    if( items[ i ].cluster ){
     continue; 
    }
    var nextN = nextNeighbour( items[ i ], items );
    if( !nextN.keyword ){
      // neighbours are too far away
      continue;
    }
    
    if( nextN.cluster ){
     items[ i ].cluster = nextN.cluster; 
    }else{
      items[ i ].cluster = clusterIndex++;
      nextN.cluster = items[ i ].cluster;
    }
  }
  
  items.forEach( function( item ){ delete item.dist; delete item.encoded } );
  
  //Logger.log( JSON.stringify( items, null, 2 ) );
  //Logger.log( items );
  
  for( var i = 1; i < clusterIndex; i++ ){
    Logger.log( 'Cluster ' + i );
    Logger.log( JSON.stringify( items.filter( function( x ){ return x.cluster == i } ).map( function( x ){ return x.keyword } ), null, 2 ) );
    
  }
  
  
  Logger.log( 'Duration: ' + ( new Date().getTime() - l ) );
  
}

function main(){
	Logger.log( 'start' );
	AdsManagerApp.select( AdsManagerApp.accounts().withIds( [ ACCOUNT_ID ] ).get().next() );
	run();
	//extractCategoriesFromCampaignNames();
}

function extractCategoriesFromCampaignNames(){
	
	var query = 'SELECT CampaignName ' +
		'FROM CAMPAIGN_PERFORMANCE_REPORT ' +
		'WHERE CampaignStatus IN [ ENABLED, PAUSED ] ' +
		//'DURING ' + TIME +
		''
	;
	
	var balast = [
		'DE',
		'-SE-',
		'neu-',
		'-YT-',
		'-CPA',
		'_NOJUMP_URL',
		'eCPC-',
		'-Shopping-',
		'-GDN-',
		'SU-',
		'tCPA - ',
		'-RLSA-',
		'DSA-',
		'_OM',
		'_OM2',
		'-TopKWs',
		'-Longtail',
		'tCPA-',
		'-all',
		'-Other',
		'-Einzel',
		'-All',
		'Allgemein-',
		'ShowcaseAds',
		'Smart-Displaygemein',
		'Bumper Test (Tobias)',
		'Placeholder - Custom Affinity',
		'Bumper',
		'Breites Targeting',
		'Custom Affinity',
		'Recruiting',
		'Recruiting2',
		'_Entrepreneur',
		'Wettbewerb',
		'Suchverhalten-Weihnachten-SW',
		'Similar-User-',
		'Catch',
		'Extras',
		'adferencebasis-',
		'dyn-Remarketinggemein',
		'Remarketing-',
		'Allgemein',
		'Display-',
		'Brand',
		'2',
		'-2',
		'DK-Topseller',
		'-Muenchen',
		'-Hamburg',
		'BreakOut',
		'SB',
		'SW',
		'Topseller',
		'Dynamic',
		'Remarketinggemein',
		'',
		'',
		'',
		'',
		'',
		'',
		'',
		'',
		'',
		''
	];
	
	var campaigns = getReport( query );
	
	var res = campaigns
		.map( property( 'CampaignName' ) )
		.map( function( name ){
			balast.forEach( function( part ){ name = name.replace( part, '' ) } );
			return name;
		})
		.filter( onlyUnique )
		.filter( function( name ){ return name != '' } )
		.map( function( name ){
			name = name.replace( 'EK', ' Einladungskarten' );
			name = name.replace( 'DK', ' Dankeskarten' );
			name = name.replace( /\-/g, ' ' );
			name = name.replace( /\s+/g, ' ' );
			name = name.toLowerCase();
			
			return name.trim();
		})
		.filter( onlyUnique )
		//.join( '",\n\t"' )
	;
	Logger.log( '[\n\t"' + res.join( '",\n\t"' ) + '"\n];' );
	
	return res;
}

function bitCount( n ){
	n = n - ( ( n >> 1 ) & ( 0x55555555 ) );
	n = ( n & 0x33333333 ) + ( ( n >> 2 ) & 0x33333333 );
	return ( ( n + ( n >> 4 ) & 0xF0F0F0F ) * 0x1010101 ) >> 24;
}

function categoryDist( category, item ){
	var difference = 0;
	var similarity = 0;
	var maxLength = Math.max( item.encoded.length, category.encoded.length );
	var count = 0;
	for( var i = 0; i < maxLength; i++ ){
		var itemEncoded = item.encoded[ i ] || 0;
		var categoryEncoded = category.encoded[ i ] || 0;
		difference += bitCount( itemEncoded ^ categoryEncoded );
		similarity += bitCount( itemEncoded & categoryEncoded );
		count += bitCount( categoryEncoded );
	}
	return 1 - similarity / count;
}

function encodeCorpus( corpus, ngramSizes, keywordProp ){
	function splitIntoNGrams( keyword, n ){
		var ngrams = [];
		for( var i = 0; i < keyword.length - n + 1; i++ ){
			var ngram = keyword.substring( i, i + n );
			if( ngram.indexOf( ' ' ) == -1 ){
				ngrams.push( ngram );
			}
		}
		return ngrams.filter( onlyUnique );
	}

	var bitsInAnInteger = 32;
	var alphabet = {};
	var map = {};
	ngramSizes.forEach( function( n ){
		flatten( corpus.map( function( item ){
			return splitIntoNGrams( item[ keywordProp ], n ).filter( onlyUnique );
		})).forEach( function( x ){ map[ x ] = ( map[ x ] || 0 ) + 1 } );
	});
	var ngrams = Object.keys( map );
	ngrams.sort( function( a, b ){ return map[ b ] - map[ a ] } );
	ngrams.forEach( function( ngram, index ){ alphabet[ ngram ] = index } );
	
	var countIntegers = Math.ceil( ngrams.length / bitsInAnInteger );
	
	function encode( str ){
		var res = [];
		ngramSizes.forEach( function( n ){
			splitIntoNGrams( str, n ).forEach( function( ngram ){
				var index = alphabet[ ngram ];
				var resIndex = Math.floor( index / bitsInAnInteger );
				res[ resIndex ] = ( res[ resIndex ] || 0 ) | ( 1 << ( index % bitsInAnInteger ) );
			});
		});
		return res;
	}
	corpus.forEach( function( item ){
		item.encoded = encode( item[ keywordProp ] );
	});
	
	//Logger.log( 'alphabet: ' + JSON.stringify( alphabet, null, 2 ) );
	return corpus;
}

function findNearestNeighbour( categories, queryRow ){
	var minDist = .3;
	var res = null;
	categories.forEach( function( category ){
		var distance = Math.min( categoryDist( category, queryRow ), minDist );
		if( distance < minDist ){
			minDist = distance;
			res = category.Query;
		}
	});
	if( null == res ){
		res = 'NO_CATEGORY';
	}
	return res;
}

var CATEGORIES = [
	'geburt',
	'baby',
	'hochzeit',
	'taufe',
	'konfirmation',
	'kommunion',
	'geburtstag',
	'weihnachten',
	'party',
	'einschulung',
	'umzug',
	'trauer',
	'firmung',
	'jubiläum',
	'beerdigung',
	'sommerfest',
	'ruhestand',
	//'einladung',
	//'danke',
	'danksagung',
	'kalender',
	'foto',
	'etiketten',
	'kartenmacherei',
];

function run(){
	var conditions = [];
	if( CAMPAIGN_IDS.length > 0 ){
		conditions.push( ' CampaignId IN [' + CAMPAIGN_IDS + '] ' );
	}
	var query = 'SELECT ' + ID_COLUMNS.join( ', ' ) + ', ' + METRICS.join( ', ' ) + ' ' +
		'FROM SEARCH_QUERY_PERFORMANCE_REPORT ' +
		( conditions.length > 0 ? 'WHERE ' + conditions.join( ' AND ' ) : '') +
		'DURING ' + TIME;
	
	var sqr = getReport( query );
	
	var categories = CATEGORIES;//extractCategoriesFromCampaignNames();
	var corpus = categories.map( function( x ){ return { Query : x } } ).concat( sqr );
	corpus = encodeCorpus( corpus, [ 1, 2 ], 'Query' );
	categories = corpus.slice( 0, categories.length );
	corpus = corpus.slice( categories.length );
	
	sqr.forEach( function( row ){
		row.Category = CATEGORIES.filter( function( cat ){
			return row.Query.indexOf( cat ) >= 0;
		});
		if( row.Category.length == 0 ){
			row.Category = [ 'NO_CATEGORY' ];
		}
		//row.Category = findNearestNeighbour( categories, row );
	});
	
	Logger.log( sqr.slice( 0, 300 ).map( function( x ){ return 'Category: ' + x.Category + ' - Query: ' + x.Query } ).join( '\n\t' ) );
	
	Logger.log( '' + sqr.length + ' sqrs found' );
	
	var ngrams = {};
	sqr.forEach( function( row ){
		row.Count = 1;
		//explode( row.Query )
		row.Query.split( ' ' )
			.filter( onlyUnique ).forEach( function( word ){
				if( word.length <= 3 ){
					return;
				}
				ngrams[ row.Category ] = ngrams[ row.Category ] || {};
				ngrams[ row.Category ][ word ] = ngrams[ row.Category ][ word ] ? ngrams[ row.Category ][ word ] : { Count : 0 };
				ngrams[ row.Category ][ word ] = sum( ngrams[ row.Category ][ word ], row );
			})
		;
	});
	
	var result = Object.keys( ngrams )
		.map(
			function( category ){
				return Object.keys( ngrams[ category ] ).map( function( word ){
					var x = ngrams[ category ][ word ];
					
					var res = category
						+ EXCEL_SEPARATOR + word
						+ EXCEL_SEPARATOR + x.Count
						+ EXCEL_SEPARATOR + x.Clicks
						+ EXCEL_SEPARATOR + Math.round( x.Conversions * 100 )
						+ EXCEL_SEPARATOR + Math.round( x.ConversionValue * 100 )
						+ EXCEL_SEPARATOR + Math.round( x.Cost * 100 )
						+ EXCEL_SEPARATOR + ( Math.round( ( x.ConversionValue - x.Cost  ) / x.Clicks * 100 ) )
					;
					return res;
				}).join( LINE_SEPARATOR );
			}
		)
	;
	
	Logger.log( 'done' );
	mailGun( 'a.tissen@pa.ag', AdsApp.currentAccount().getName(), 'search queries ngrams', result.join( LINE_SEPARATOR ) );
}

function sum( row1, row2 ){
	var res = METRICS.reduce( function( prev, metric ){ prev[ metric ] = parseFloat( row1[ metric ] || 0 ) + parseFloat( row2[ metric ] || 0 ); return prev }, {} );
	res.Count = row1.Count + row2.Count;
	return res;
}

function explode( query ){
	var split = query.split( SEPARATOR );
	var res = [];
	
	for( var tupelSize = 1; tupelSize <= split.length; tupelSize++ ){
		for( var i = 0; i + tupelSize <= split.length; i++ ){
			res.push( split.slice( i, i + tupelSize ).join( SEPARATOR ) );
		}
	}
	return res;
}

