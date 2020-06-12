
// -------- SETTINGS -------------------------------
var LABEL_NAME = 'CREATED_BY_CREATOR_SCRIPT';
var EMAILS = ['a.tissen@pa.ag' ];
var SHEET_URL = 'https://docs.google.com/spreadsheets/d/16LAFj3to1wGZ_rCYyly_RzZbduJs6xBtx5EKkjK4Os0/edit#gid=0';
var WAITING_INTERVAL = 10; // in seconds

var RECHERCHE_SHEET_NAME = 'Recherche';
var ETAS_SHEET_NAME = 'ETAs';
var FUNCTIONAL_WORDS_SHEET_NAME = 'Füllwörter';
var SETTINGS_SHEET_NAME = 'Settings';

var CAMPAIGN = 'Campaign';
var KEYWORD = 'Keyword';
var FINAL_URL = 'Final URL';
var AD_VARIANT = 'Ad Varainte';
var BUY_KEYWORDS = 'kaufen-keywords';

var DUPLICATE_LABEL_NAME = 'DUPLICATE_AD_GROUP';
var PATH_MISSING_LABEL_NAME = 'PATH_MISSING';

var HEADER_PREFIX = 'Anzeigen Kampagnen Variante ';

// -------- CONSTANTS ------------------------------
// One currency unit is one million micro amount.
var MICRO_AMOUNT_MULTIPLIER = 1000000;
var BROAD_SUFFIX = '(broad)';
var EXACT_SUFFIX = '(exact)';
var NEW_LINE = '<br>';
var MAX_HEADER_LENGTH = 30;
var MAX_DESCRIPTION_LENGTH = 80;
var MAX_PATH_LENGTH = 15;
var H1 = 'h1';
var H2 = 'h2';
var MAX_IN_SELECTOR = 10000; // IN clause in awql allows 10000 items at max


Object.values = Object.values || ( function( obj ){
	return Object.keys( obj ).map( function( key ){
		return obj[key]
	} )
} );
String.trim = function( value ){
	return value.trim();
};


function clone( obj ){
	if ( obj === null || typeof( obj ) !== 'object' || 'isActiveClone' in obj ){
		return obj;
	}

	var temp;
	if ( obj instanceof Date ){
		temp = new obj.constructor(); //or new Date( obj );
	} else {
		temp = obj.constructor();
	}

	for ( var key in obj ){
		if ( Object.prototype.hasOwnProperty.call( obj, key ) ){
			obj[ 'isActiveClone' ] = null;
			temp[ key ] = clone( obj[ key ] );
			delete obj[ 'isActiveClone' ];
		}
	}
	return temp;
}

function partition( arr ){
	return {
		by: function( keyName ){
			var res = {};

			for ( var i = 0; i < arr.length; i++ ){
				var obj = clone( arr[i] );
				var key;
				if ( typeof keyName == 'function' ){
					key = keyName( obj );
				} else {
					key = obj[ keyName ];
				}

				// init
				res[ key ] = ( res[ key ] || [] );
				if( typeof keyName != 'function' ){
					delete obj[ keyName ];
				}
				res[ key ].push( obj );
			}
			return res;
		}
	};
}

var _ = (function(){
	var uniqueWarnings = {};
	function uniqueWarning( key, value ){
		if( !uniqueWarnings[ key ] ){
			uniqueWarnings[ key ] = 1;
			log( 'WARNING: ' + key + ( value ? ': ' + value : '' ) );
		}else{
			uniqueWarnings[ key ]++;
		}
	}
	function printUniqueWarnings(){
		for( warning in uniqueWarnings ){
			log( warning + ': ' + uniqueWarnings[ warning ] );
		}
	}
	function addLeadingZeros( number, digits ){
		var res = '' + number;
		while ( res.length < digits ){
			res = '0' + res;
		}
		return res;
	}
	function dateToString( date, delimiter, withHours ){
		return addLeadingZeros( date.getFullYear(), 4 ) + delimiter +
			addLeadingZeros( date.getMonth() + 1, 2 ) + delimiter +
			addLeadingZeros( date.getDate(), 2 ) +
			( withHours ? ' ' + addLeadingZeros( date.getHours(), 2 ) + ':' + addLeadingZeros( date.getMinutes(), 2 ) : '' )
		;
	}
	function duringLastDays( days ){
		var today = new Date();
		var before = new Date( today.getTime() - 1000 * 60 * 60 * 24 * days );
		return ' DURING ' + dateToString( before, '' ) + ', ' + dateToString( today, '' );
	}
	function addToMultiMap( map, key, value ){
		if( ! map[ key ] ){
			map[ key ] = [];
		}
		map[ key ].push( value );
	}
	function iteratorToList( iter ){
		var list = [];
		while( iter.hasNext() ){
			list.push( iter.next() );
		}
		return list;
	}
	function iteratorToMap( iter, property ){
		var map = {};
		while( iter.hasNext() ){
			var item = iter.next();
			
			if( typeof property == 'function' ){
				map[ property( item ) ] = item;
			}else if( typeof item[ property ] == 'function' ){
				map[ item[ property ]() ] = item;
			}else{
				map[ item[ property ] ] = item;
			}
		}
		return map;
	}
	function listToMap( list, keySelector, valueSelector ){
		var map = {};
		
		if( ! valueSelector ){
			valueSelector = identity;
		}
		
		list.forEach( function( item ){
			if( typeof keySelector == 'function' ){
				if( typeof valueSelector == 'function' ){
					map[ keySelector( item ) ] = valueSelector( item );
				}else if( typeof item[ valueSelector ] == 'function' ){
					map[ keySelector( item ) ] = item[ valueSelector ]();
				}else{ 
					map[ keySelector( item ) ] = item[ valueSelector ];
				}
			}else if( typeof item[ keySelector ] == 'function' ){
				if( typeof valueSelector == 'function' ){
					map[ item[ keySelector ]() ] = valueSelector( item );
				}else if( typeof item[ valueSelector ] == 'function' ){
					map[ item[ keySelector ]() ] = item[ valueSelector ]();
				}else{ 
					map[ item[ keySelector ]() ] = item[ valueSelector ];
				}
			}else{
				if( typeof valueSelector == 'function' ){
					map[ item[ keySelector ] ] = valueSelector( item );
				}else if( typeof item[ valueSelector ] == 'function' ){
					map[ item[ keySelector ] ] = item[ valueSelector ]();
				}else{ 
					map[ item[ keySelector ] ] = item[ valueSelector ];
				}
			}
		});
		return map;
	}
	function stringListToMap( list, value ){
		var res = {};
		list.forEach( function( item ){ res[ item ] = value } );
		return res;
	}
	function properties(){
		var args = Array.prototype.slice.call( arguments );
		var f = function( item ){
			return args.map( function( arg ){
				if( typeof arg == 'function' ){
					return arg( item );
				}else if( typeof item[ arg ] == 'function' ){
					return item[ arg ]();
				}else{
					return item[ arg ];
				}
			});
		};
		f.name1 = args.join( '_' ); // this improves groupBy() output
		return f;
	}
	function property(){
		var args = Array.prototype.slice.call( arguments );
		var f = function( item ){
			var res = item;
			args.forEach( function( arg ){
				if( typeof arg == 'function' ){
					res = arg( res );
				}else if( typeof res[ arg ] == 'function' ){
					res = res[ arg ]();
				}else{
					res = res[ arg ];
				}
			});
			return res;
		};
		f.name1 = args.join( '_' ); // this improves groupBy() output
		f.equals = function( value ){
			return function( item ){
				return f( item ) == value;
			}
		};
		f.lt = function( value ){
			return function( item ){
				return f( item ) < value;
			}
		};
		f.le = function( value ){
			return function( item ){
				return f( item ) <= value;
			}
		};
		f.gt = function( value ){
			return function( item ){
				return f( item ) > value;
			}
		};
		f.endsWith = function( value ){
			return function( item ){
				var x = f( item );
				return x.indexOf( value ) == x.length - value.length;
			}
		};
		return f;
	}
	function not( predicate ){
		var res = function( x ){
			return false == predicate( x );
		};
		res.or = function( predicate ){
			return or( this, predicate );
		};
		res.and = function( predicate ){
			return and( this, predicate );
		};
		return res;
	}
	function or( predicate1, predicate2 ){
		return function( x ){
			return predicate1( x ) || predicate2( x );
		};
	}
	function or2( bool1, bool2 ){
		return bool1 || bool2;
	}
	function and( predicate1, predicate2 ){
		return function( x ){
			return predicate1( x ) && predicate2( x );
		};
	}
	function log( value ){
		Logger.log( value );
	}
	function onlyUnique( value, index, self ){
		return self.indexOf( value ) === index;
	}
	function findLabel( labelName ){
		var labelSelector = AdWordsApp.labels()
			.withCondition('Name = "' + labelName + '"');
		
		var labelIterator = labelSelector.get();
		if( labelIterator.hasNext() ){
			return labelIterator.next();
		}
	}
	function createLabel( labelName ){
		var label = findLabel( labelName );
		if( ! label ){
			AdWordsApp.createLabel( labelName );
			return findLabel( labelName );
		}else{
			return label;
		}
	}
	function flatten( matrix ){
		return [].concat.apply([], matrix );
	}
	function by( prop ){
		// ASCENDING ORDER
		return function( a, b ){
			return a[ prop ] - b[ prop ];
		};
	}
	function and2( a, b ){ return a && b }
	function identity( a ){ return a }
	function concat( list1, list2 ){
		return list1.concat( list2 );
	}
	function concat2( mapOfLists ){
		var list = [];
		
		for( key in mapOfLists ){
			list = list.concat( mapOfLists[ key ] );
		}
		return list;
	}
	function isContainedIn( truthMap ){
		return function( item ){
			return !! truthMap[ item ];
		}
	}
	function isContainedIn2( str ){
		return function( str2 ){ return str.indexOf( str2 ) >= 0 };
	}
	function SELECT( fields ){
		var query = '';
		function parseValue( value ){
			function isNumeric( n ){
				return !isNaN( parseFloat( n ) ) && isFinite( n );
			}
			if ( value === undefined ){
				return undefined;
			}
			if ( value === null || value.trim() == '--' ){
				return null;
			}
			if ( value.substring( value.length - 1 ) == '%' ){
				return value.substring( 0, value.length - 1 ) / 100;
			}
			if ( !isNumeric( value.toString().replace( /,/g, '' ) ) ){
				return value;
			}
			return value.toString().replace( /,/g, '' ) / 1;
		}
		function parse( report, fields ){
			var myRows = [];
			var iter = report.rows();
			
			iteratorToList( iter ).forEach( function( row ){
				var myRow = {};

				for ( index in fields ){
					var field = fields[ index ];
					myRow[ field ] = parseValue( row[ field ] );
				}
				myRows.push( myRow );
			})
			
			
			
			return myRows;
		}
		
		if( ! fields.join ){
			fields = [ fields ];
		}
		query = 'SELECT ' + fields.join( ',' );
		
		function parse1(){
			//return query + ' -> ' + fields;
			return parse( AdWordsApp.report( query ), fields );
		}
		function during( days ){
			query += ' DURING ' + duringLastDays( days );
			return {
				parse : parse1
			}
		}
		
		return {
			FROM : function( reportName ){
				query += ' FROM ' + reportName;
				return {
					WHERE : function( condition ){
						query += ' WHERE ' + condition
						return {
							AND : function( condition ){
								query += ' AND ' + condition;
								return this;
							},
							DURING : during,
							parse : parse1
						}
					},
					DURING : during,
					parse : parse1
				}
			}
		}
	}
	function pair( f1, f2 ){
		return function( item ){
			return [ f1( item ), f2( item ) ];
		}
	}
	function transpose( array ){
		if ( array.length == 0 ){
			return [];
		}
		if ( array.length == 1 && array[0].length == 0 ){
			// array is symmetric
			return array;
		}

		return array[0].map( function( col, i ){
			return array.map( function( row ){
				return row[i];
			} )
		} );
	}
	function nonEmpty( item ){ return item != '' }
	function sample( arr ){ return arr[ Math.floor( Math.random() * arr.length ) ] }
	function extractHostname( url ){
		var hostname;
		//find & remove protocol (http, ftp, etc.) and get hostname

		if( url.indexOf( "://" ) > -1 ){
			hostname = url.split( '/' )[ 2 ];
		}else {
			hostname = url.split( '/' )[ 0 ];
		}

		//find & remove port number
		hostname = hostname.split( ':' )[ 0 ];
		//find & remove "?"
		hostname = hostname.split( '?' )[ 0 ];

		return hostname;
	}
	function getMatches( string, regex ){
		if( Array.prototype.slice.call( regex.flags ).filter( function( a ){ return a == 'g' }).length == 0 ){
			throw new Error( 'Expected a global regex but got a non-global' );
		}
		var matches = [];
		var match;
		while( match = regex.exec( string ) ){
			matches.push( Array.prototype.slice.call( match ) );
		}
		return matches;
	}
	
	// ####################################################
	// ####################################################
	function mailGunHtml( to, subject, html ){
		return mailGunSender( to, subject, null, html );
	}
	function mailGun( to, subject, text ){
		return mailGunSender( to, subject, text );
	}
	function mailGunSender( to, subject, text, html ){
		if ( html ){
			if ( !text ){
				text = 'this is supposed to be a html email. Seems like your device doesn\'t support html emails.';
			}
			html = '<html><body>' + html + '</body></html>';
		} else {
			html = null;
		}
		Logger.log( 'fetch URL' );

		return UrlFetchApp.fetch( 
			'https://api.mailgun.net/v3/mg.peakace.de/messages',
			{
				"method": "post",
				"payload": {
					'from': "adwords_scripts@mg.peakace.de",
					'to': to,
					'subject': subject,
					'text': text,
					'html': html,
				},
				"headers": {
					"Authorization": "Basic YXBpOmtleS1hYWZmMmI2MGU4MmNkMWYwOTIwYWYxNDUzZWM0MDcyOA==",
				}
			}
		 );
	}
	// ####################################################
	// ####################################################
	return {
		dateToString 	: dateToString,
		duringLastDays 	: duringLastDays,
		addToMultiMap 	: addToMultiMap,
		iteratorToList	: iteratorToList,
		listToMap		: listToMap,
		property 		: property,
		properties		: properties,
		not				: not,
		and				: and,
		and2			: and2,
		or				: or,
		or2				: or2,
		log				: log,
		onlyUnique		: onlyUnique,
		iteratorToMap	: iteratorToMap,
		createLabel		: createLabel,
		flatten			: flatten,
		by				: by,
		mailGunHtml		: mailGunHtml,
		mailGun			: mailGun,
		identity		: identity,
		concat			: concat,
		concat2			: concat2,
		stringListToMap	: stringListToMap,
		isContainedIn	: isContainedIn,
		SELECT			: SELECT,
		pair			: pair,
		transpose		: transpose,
		nonEmpty		: nonEmpty,
		sample			: sample,
		isContainedIn2	: isContainedIn2,
		extractHostname	: extractHostname,
		uniqueWarning	: uniqueWarning,
		printUniqueWarnings : printUniqueWarnings,
		getMatches : getMatches,
	};
})();


// #######################

function initSheet( sheetUrl, sheetName ){
	//Logger.log( 'init sheet: ' + sheetUrl + ', ' + sheetName );
	var book = SpreadsheetApp.openByUrl( sheetUrl );
	if ( !sheetName ){
		// seems to be active sheet
		sheetName = book.getSheetName();
	}
	var sheet = book.getSheetByName( sheetName );

	if ( !sheet ){
		sheet = book.insertSheet( sheetName );

		if ( sheet.getMaxColumns() > 1 ){
			// delete unused columns to stay below
			// the 2 mio cells limit of google sheets
			sheet.deleteColumns( 2, sheet.getMaxColumns() - 1 );
		}

		if ( sheet.getMaxRows() > 1 ){
			// delete unused rows to stay below
			// the 2 mio cells limit of google sheets
			sheet.deleteRows( 2, sheet.getMaxRows() - 1 );
		}
	}

	return sheet;
}

function loadSheet2( sheet ){
	return sheet
		.getRange( 
			1,
			1,
			Math.max( 1, sheet.getLastRow() ),
			Math.max( 1, sheet.getLastColumn() )
		 )
		.getValues();
}

function loadSheet( sheetUrl, sheetName ){
	var sheet = initSheet( sheetUrl, sheetName );
	return loadSheet2( sheet );
}

function parseSheet( matrix ){
	var headerRow = matrix.shift();
	//Logger.log( 'headers: ' + headerRow );
	
	var data = matrix.map( function( row ){
		var res = {};
		headerRow.forEach( function( header, index ){ res[ header ] = row[ index ] } );
		return res;
	});
	
	return data;
}

function parseBook(){

	var settings = parseSheet( loadSheet( SHEET_URL, SETTINGS_SHEET_NAME ) );
	settings = _.listToMap( settings, 'Setting', 'Value' );
	settings[ BUY_KEYWORDS ] = settings[ BUY_KEYWORDS ].split(',').map( _.property( 'trim' ) );
	//Logger.log( JSON.stringify( settings ) );
	
	var functionalWords = loadSheet( SHEET_URL, FUNCTIONAL_WORDS_SHEET_NAME );
	functionalWords.shift(); // remove headers
	functionalWords = functionalWords.map( _.property( 0 ) ); // take first column (index == 0)
	//Logger.log( JSON.stringify( functionalWords ) );
	
	
	var etaSettings = _.transpose( loadSheet( SHEET_URL, ETAS_SHEET_NAME ) );
	
	var etaSettings2 = [];
	
	etaSettings[ 0 ]
		.map( function( item, index ){
			var ret = {
				isHeader : item.indexOf( HEADER_PREFIX ) == 0,
				variant  : item.substring( HEADER_PREFIX.length ).match(/\d+/),
				index : index
			};
			// -----------------------------------
			// search for H1 header
			var delta = 1;
			while( index + delta < etaSettings[ 0 ].length
				&& etaSettings[ 0 ][ index + delta ] != 'H1'
				&& etaSettings[ 0 ][ index + delta ].indexOf( HEADER_PREFIX ) < 0
				){
				delta++;
			}
			if( index + delta < etaSettings[ 0 ].length
				&& etaSettings[ 0 ][ index + delta ].indexOf( HEADER_PREFIX ) >= 0 ){
				// no H1 header found => broken config :-/
				// Actually, the if-condition is not the only possibility of a broken cofing.
			}
			ret.index = index + delta;
			// -----------------------------------
			return ret;
		})
		.filter( _.property( 'isHeader' ) )
		.map( function( item ){
			return {
				variant : item.variant,
				h1 : etaSettings[ 0 ].slice( item.index + 1, item.index + 20 ).filter( _.nonEmpty ),
				h2 : etaSettings[ 2 ].slice( item.index + 1, item.index + 20 ).filter( _.nonEmpty ),
				desc : [
					etaSettings[ 4 ].slice( item.index + 1,  item.index + 5  ).filter( _.nonEmpty ),
					etaSettings[ 4 ].slice( item.index + 6,  item.index + 10 ).filter( _.nonEmpty ),
					etaSettings[ 4 ].slice( item.index + 11, item.index + 15 ).filter( _.nonEmpty ),
					etaSettings[ 4 ].slice( item.index + 16, item.index + 20 ).filter( _.nonEmpty )
				]
			}
		})
		.forEach( function( setting ){
			etaSettings2[ setting.variant ] = setting;
		})
	;
	
	//_.log( JSON.stringify( etaSettings2, null, '\t' ) );
	
	var data = parseSheet( loadSheet( SHEET_URL, RECHERCHE_SHEET_NAME ) );
	
	data = partition( data ).by( CAMPAIGN );
	
	for( var campaignName in data ){
		data[ campaignName ].forEach( function( row ){
			if( ! etaSettings2[ row[ AD_VARIANT ] ] ){
				_.uniqueWarning( 'no ad variant ' + row[ AD_VARIANT ] + ' fond' );
			}
			row[ AD_VARIANT ] = etaSettings2[ row[ AD_VARIANT ] ];
		});
	}
	
	//Logger.log( JSON.stringify( data ) );
	var res = {};
	res[ SETTINGS_SHEET_NAME ] = settings;
	res[ RECHERCHE_SHEET_NAME ]  = data;
	res[ FUNCTIONAL_WORDS_SHEET_NAME ] = { list : functionalWords, map : _.listToMap( functionalWords, _.identity, function(){ return true } ) };
	
	return res;
}

function removePhraseDuplicates( list ){
	list.sort( _.by( 'length' ) );
	
	var phraseDuplicates = [];
	
	for( var i = 0; i < list.length; i++ ){
		for( var j = i + 1; j < list.length; j++ ){
			var shortWord = list[ i ];
			var longWord = list[ j ];
			if( ( ' ' + longWord + ' ' ).indexOf( ' ' + shortWord + ' ' ) >= 0 ){
				//_.log( longWord + '|' + shortWord );
				phraseDuplicates.push( longWord );
			}
		}
	}
	
	return list.filter( function( word ){ return phraseDuplicates.indexOf( word ) < 0 } );
}

function computeNegativeKeywords( keywords, functionalWords ){
	var splitted = {};
	keywords.forEach( function( keyword ){ splitted[ keyword ] = keyword.split( ' ' ) } );
	
	var res = {};
	
	for( var i = 0; i < keywords.length; i++ ){
		var keyword = keywords[ i ];
		var bmmKeyword = splitted[ keyword ];
		for( var j = 0; j < keywords.length; j++ ){
			if( i == j ){
				continue;
			}
			var targetKeyword = keywords[ j ];
			
			var compatible = bmmKeyword.map( function( word ){ return targetKeyword.indexOf( word ) >= 0 } ).reduce( _.and2, true );
			if( compatible ){
				var found = targetKeyword;
				bmmKeyword.forEach( function( word ){
					found = found.split( word ).join( '|' );
				});
				found = found
					.split( '|' )
					.map( _.property( 'trim' ) )
					// we do not want negative keywords of 2 or less characters
					.filter( _.property( 'length' ).gt( 2 ) )
					// we do not want to create negative keywords conflicting the actual bmm keyword
					.filter( function( word ){ return keyword.indexOf( word ) == -1 } )
					;
				
				if( found.length > 0 ){
					res[ keyword ] = ( res[ keyword ] || [] ).concat( found );
				}
			}
		}
	}
	
	for( var word in res ){
		res[ word ] = removePhraseDuplicates( res[ word ].filter( _.onlyUnique ) )
			// don't use functional words as negative-keywords
			.filter( function( word ){ return !functionalWords[ word ] } );
		//_.log( word + ':' + res[ word ].join(',') );
	}
	return res;
}

function uploadTool(){
	var budget = 2;
	var adgroupCPCBid = 1;
	var keywordCPCBid = 1;
	
	var headers = [
		'Campaign', 
		'Budget',
		'Bid Strategy type',
		'Campaign type',
		'Ad Group',
		'Max CPC',
		'Final URL',
		'Keyword',
		'Criterion Type',
		'Headline 1',
		'Headline 2',
		'Description',
		'Path 1',
		'Path 2',
		'Ad Type'
	];
	
	// See https://developers.google.com/adwords/scripts/docs/features/bulk-upload
	var upload = AdWordsApp.bulkUploads().newCsvUpload(	headers, { moneyInMicros: false } );
	upload.forCampaignManagement();
	
	return {
		addCampaign 	: function( campaignName ){
			upload.append({
				'Campaign': campaignName + EXACT_SUFFIX,
				'Budget': budget,
				'Bid Strategy type': 'cpc',
				'Campaign type': 'Search Only'
			});
			upload.append({
				'Campaign': campaignName + BROAD_SUFFIX,
				'Budget': budget,
				'Bid Strategy type': 'cpc',
				'Campaign type': 'Search Only'
			});
		},
		addAdgroups		: function( campaignName, keywords ){
			keywords.forEach( function( keyword ){
				upload.append({
					'Campaign': campaignName + EXACT_SUFFIX,
					'Ad Group': keyword[ KEYWORD ].toLowerCase(),
					'Max CPC' : adgroupCPCBid
				});
				upload.append({
					'Campaign': campaignName + BROAD_SUFFIX,
					'Ad Group': keyword[ KEYWORD ].toLowerCase(),
					'Max CPC' : adgroupCPCBid
				});
			});
		},
		addAds			: function( campaignName, keywords, buyKeywords ){
			var hostNames = {};
			keywords.forEach( function( keyword ){
				if( ! hostNames[ keyword[ FINAL_URL ] ] ){
					hostNames[ keyword[ FINAL_URL ] ] = _.extractHostname( keyword[ FINAL_URL ] );
				}
				var hostName = hostNames[ keyword[ FINAL_URL ] ];
				
				var adgroupName = keyword[ KEYWORD ].toLowerCase();
				var path1 = '';
				var path2 = '';
				var words = adgroupName.split( ' ' )
					.filter( _.property( 'length' ).lt( MAX_PATH_LENGTH ) )
					.filter( _.not( _.isContainedIn2( hostName ) ) )
					.filter( _.not( _.isContainedIn2( buyKeywords ) ) )
					;
				if( words.length > 0 ){
					path1 = words[ 0 ];
					if( words.length > 1 ){
						path2 = words[ 1 ];
					}
				}				
				if( keyword[ AD_VARIANT ] ){
					
					upload.append({
						'Campaign': campaignName + EXACT_SUFFIX,
						'Ad Group': adgroupName,
						'Final URL' : keyword[ FINAL_URL ],
						'Description' : computeDescription( keyword, 0, buyKeywords ),
						'Headline 1' : computeHeader( keyword, H1, buyKeywords, 1 ),
						'Headline 2' : computeHeader( keyword, H2, buyKeywords, 1 ),
						'Path 1' : path1,
						'Path 2' : path2,
						'Ad Type' : 'Expanded text ad'
					});
					upload.append({
						'Campaign': campaignName + BROAD_SUFFIX,
						'Ad Group': adgroupName,
						'Final URL' : keyword[ FINAL_URL ],
						'Description' : computeDescription( keyword, 0, buyKeywords ),
						'Headline 1' : computeHeader( keyword, H1, buyKeywords, 1 ),
						'Headline 2' : computeHeader( keyword, H2, buyKeywords, 1 ),
						'Path 1' : path1,
						'Path 2' : path2,
						'Ad Type' : 'Expanded text ad'
					});
					upload.append({
						'Campaign': campaignName + EXACT_SUFFIX,
						'Ad Group': adgroupName,
						'Final URL' : keyword[ FINAL_URL ],
						'Description' : computeDescription( keyword, 1, buyKeywords ),
						'Headline 1' : computeHeader( keyword, H1, buyKeywords, 2 ),
						'Headline 2' : computeHeader( keyword, H2, buyKeywords, 2 ),
						'Path 1' : path1,
						'Path 2' : path2,
						'Ad Type' : 'Expanded text ad'
					});
					upload.append({
						'Campaign': campaignName + BROAD_SUFFIX,
						'Ad Group': adgroupName,
						'Final URL' : keyword[ FINAL_URL ],
						'Description' : computeDescription( keyword, 1, buyKeywords ),
						'Headline 1' : computeHeader( keyword, H1, buyKeywords, 2 ),
						'Headline 2' : computeHeader( keyword, H2, buyKeywords, 2 ),
						'Path 1' : path1,
						'Path 2' : path2,
						'Ad Type' : 'Expanded text ad'
					});
					upload.append({
						'Campaign': campaignName + EXACT_SUFFIX,
						'Ad Group': adgroupName,
						'Final URL' : keyword[ FINAL_URL ],
						'Description' : computeDescription( keyword, 2, buyKeywords ),
						'Headline 1' : computeHeader( keyword, H1, buyKeywords, 3 ),
						'Headline 2' : computeHeader( keyword, H2, buyKeywords, 3 ),
						'Path 1' : path1,
						'Path 2' : path2,
						'Ad Type' : 'Expanded text ad'
					});
					upload.append({
						'Campaign': campaignName + BROAD_SUFFIX,
						'Ad Group': adgroupName,
						'Final URL' : keyword[ FINAL_URL ],
						'Description' : computeDescription( keyword, 2, buyKeywords ),
						'Headline 1' : computeHeader( keyword, H1, buyKeywords, 3 ),
						'Headline 2' : computeHeader( keyword, H2, buyKeywords, 3 ),
						'Path 1' : path1,
						'Path 2' : path2,
						'Ad Type' : 'Expanded text ad'
					});
					upload.append({
						'Campaign': campaignName + EXACT_SUFFIX,
						'Ad Group': adgroupName,
						'Final URL' : keyword[ FINAL_URL ],
						'Description' : computeDescription( keyword, 3, buyKeywords ),
						'Headline 1' : computeHeader( keyword, H1, buyKeywords, 4 ),
						'Headline 2' : computeHeader( keyword, H2, buyKeywords, 4 ),
						'Path 1' : path1,
						'Path 2' : path2,
						'Ad Type' : 'Expanded text ad'
					});
					upload.append({
						'Campaign': campaignName + BROAD_SUFFIX,
						'Ad Group': adgroupName,
						'Final URL' : keyword[ FINAL_URL ],
						'Description' : computeDescription( keyword, 3, buyKeywords ),
						'Headline 1' : computeHeader( keyword, H1, buyKeywords, 4 ),
						'Headline 2' : computeHeader( keyword, H2, buyKeywords, 4 ),
						'Path 1' : path1,
						'Path 2' : path2,
						'Ad Type' : 'Expanded text ad'
					});
				}
			});
		},
		addKeywords		: function( campaignName, keywords, functionalKeywords ){
			keywords.forEach( function( keyword ){
				var adgroupName = keyword[ KEYWORD ].toLowerCase();
				var keyword1 = adgroupName;
				upload.append({
					'Campaign': campaignName + EXACT_SUFFIX,
					'Ad Group': adgroupName,
					'Keyword' : keyword1,
					'Criterion Type' : 'Exact',
					'Max CPC' : keywordCPCBid,
					'Final URL' : keyword[ FINAL_URL ]
				});
				
				keyword1 = keyword1.split( ' ' ).filter( _.not( _.isContainedIn2( functionalKeywords ) ) ).join( ' ' );
				
				upload.append({
					'Campaign': campaignName + BROAD_SUFFIX,
					'Ad Group': adgroupName,
					'Keyword' : '+' + keyword1.replace( /\s/g, ' +' ),
					'Criterion Type' : 'Broad',
					'Max CPC' : keywordCPCBid,
					'Final URL' : keyword[ FINAL_URL ]
				});
			});
		},
		upload 			: function(){
			upload.apply();
		}
	};
}

function computeDescription( row, adIndex, buyKeywords ){
	var keyword = row[ KEYWORD ];
	
	var containsBuyWords = buyKeywords.map( _.isContainedIn2( keyword.toLowerCase() ) ).reduce( _.or2, false );
	
	return row[ AD_VARIANT ].desc[ adIndex ]
		.filter( function( desc ){ return containsBuyWords ? !buyKeywords.map( _.isContainedIn2( desc.toLowerCase() ) ).reduce( _.or2, false ) : true } )
		.map( function( desc ){
			var desc2 = desc + '';
			for( key in row ){
				desc2 = desc2.replace( new RegExp( '{' + key + '}', 'ig' ), row[ key ] );
			}
			return desc2;
		})
		.filter( _.property( 'length' ).le( MAX_DESCRIPTION_LENGTH ) )
		.reduce( function( a, b ){ return a.length > b.length ? a : b }, 'no valid description found' );
}

function computeHeader( row, headerSelector, buyKeywords, index ){
	var containsBuyWords = headerSelector == H2 ? false : buyKeywords.map( _.isContainedIn2( row[ KEYWORD ].toLowerCase() ) ).reduce( _.or2, false );
	
	var validHeaders = row[ AD_VARIANT ][ headerSelector ]
		.filter( function( head ){ 
			var headerContainsBuyWords = buyKeywords.map( _.isContainedIn2( head.toLowerCase() ) ).reduce( _.or2, false );
			return containsBuyWords ? ! headerContainsBuyWords : true 
		})
		.map( function( head ){
			var head2 = head + '';
			for( key in row ){
				head2 = head2.replace( new RegExp( '{' + key + '}', 'ig' ), row[ key ] );
			}
			return head2;
		})
		.filter( _.property( 'length' ).le( MAX_HEADER_LENGTH ) )
		;
	if( validHeaders.length == 0 ){
		return 'no header1 could be computed';
	}
	return validHeaders[ ( index - 1 ) % validHeaders.length ];
}

function developement(){
	var row = {};
	row[ KEYWORD ] = 'Kalender Kaufen';
	row[ AD_VARIANT ] = {
		h1 : [ '{keyword} jetzt kaufen', 'generischer Header' ]
	};
	
	var res = computeHeader( row, H1, ['kaufen','bestellen'], 1 );
	
	var row = { keyword : 'Toaster', region : 'Berlin', T : 'y' };
	var desc = 'Tolle {keyword} bei uns. Jetzt {keyworD} in {region} kaufen!';
	//var x = _.getMatches( desc , /\{(\w+)\}/g ).map( _.property( 1 ) );
	
	for( key in row ){
		desc = desc.replace( new RegExp( '{' + key + '}', 'ig' ), row[ key ] );
	}
	alert( desc );
	
	//alert( JSON.stringify( x, null, '\t' ) );
	
	
}

function findMissingCampaigns( campaignNames ){
	var campaignsInAccount = _.SELECT( 'CampaignName' )
		.FROM( 'CAMPAIGN_PERFORMANCE_REPORT' )
		.WHERE( 'CampaignName CONTAINS_IGNORE_CASE "' + BROAD_SUFFIX + '"' )
		.parse()
		.map( _.property( 'CampaignName' ) )
		.map( function( campaignName ){ return campaignName.split( BROAD_SUFFIX )[0] } );

	//_.log( 'campaigns in account: ' + campaignsInAccount );
	
	var missingCampaignNames = campaignNames.filter( function( name ){ return campaignsInAccount.indexOf( name ) < 0 } );
	
	if( missingCampaignNames.length > 0 ){
		_.log( 'Missing campaigns: ' + missingCampaignNames );
	}
	
	return missingCampaignNames.length;
	
}

function findDuplicateKeywords( recherche ){
	function normalize( keyword ){
		var list = keyword.split( ' ' );
		list.sort();
		return list.join( ' ' );
	}	
	var duplicates = {};
	
	for( var campaignName in recherche ){
		var list = recherche[ campaignName ]
			.map( _.property( KEYWORD ) )
			.map( _.pair( _.identity, normalize ) );
		list.sort( function( a, b ){ return a[ 1 ] < b[ 1 ] } );
		
		duplicates[ campaignName ] = duplicates[ campaignName ] || [];
		
		for( var i = 0; i < list.length - 1; i++ ){
			if( list[ i ][ 1 ] == list[ i + 1 ][ 1 ] ){
				duplicates[ campaignName ].push( list[ i ][ 0 ] );
				duplicates[ campaignName ].push( list[ i + 1 ][ 0 ] );
			}
		}
		duplicates[ campaignName ] = duplicates[ campaignName ]
			.filter( _.onlyUnique )
			.map( _.property( 'toLowerCase' ) )
			;
	}
	return duplicates;
}

function main(){
	
	_.createLabel( PATH_MISSING_LABEL_NAME );
	_.createLabel( DUPLICATE_LABEL_NAME );
	
	_.log( 'parse sheets' );
	var input = parseBook();
	var recherche = input[ RECHERCHE_SHEET_NAME ];
	var campaignNames = Object.keys( recherche );
	var functionalKeywords = input[ FUNCTIONAL_WORDS_SHEET_NAME ];
	var settings = input[ SETTINGS_SHEET_NAME ];
	
	//Logger.log( JSON.stringify( recherche, null, '\t' ) );
	
	var bulk = uploadTool();
	
	_.log( 'create campaign structure' );
	campaignNames.forEach( bulk.addCampaign );
	campaignNames.forEach( function( campaignName ){ bulk.addAdgroups( campaignName, recherche[ campaignName ] ) } );
	campaignNames.forEach( function( campaignName ){ bulk.addKeywords( campaignName, recherche[ campaignName ], functionalKeywords.list ) } );
	campaignNames.forEach( function( campaignName ){ bulk.addAds( campaignName, recherche[ campaignName ], settings[ BUY_KEYWORDS ] ) } );
	bulk.upload();
	
	//_.log( 'STOP here. Dont do negative keywords.......' );
	//return;
	
	var countMissingCampaigns = campaignNames.length;
	while( countMissingCampaigns ){
		_.log( 'sleep ' + WAITING_INTERVAL + ' seconds and wait for bulk-upload to finish' );
		Utilities.sleep( WAITING_INTERVAL * 1000 );
		countMissingCampaigns = findMissingCampaigns( campaignNames );
	}
	
	_.log( 'get bmm keywords as basis for negative keywords' );
	var keywordList = _.SELECT( 'Criteria' )
		.FROM( 'KEYWORDS_PERFORMANCE_REPORT' )
		.WHERE( 'CampaignName CONTAINS_IGNORE_CASE "' + BROAD_SUFFIX + '"' )
		.parse()
		.map( _.property( 'Criteria' ) )
		// remove plus signs in bmm keywords
		.map( function( keyword ){ return keyword.replace( /\+/g, '' ) } )
	;
	_.log( 'compute negative keywords' );
	var negativeKeywords = computeNegativeKeywords( keywordList, functionalKeywords.map );
	
	
	var adgroups = _.iteratorToList(
		AdWordsApp.adGroups()
		.withCondition( 'CampaignName CONTAINS_IGNORE_CASE "' + BROAD_SUFFIX + '"' )
		.withCondition( 'CampaignStatus IN [ENABLED, PAUSED]' )
		.withCondition( 'AdGroupStatus IN [ENABLED, PAUSED]' )
		.get()
	);
	
	var duplicateAdgroups = findDuplicateKeywords( recherche );
	
	adgroups.forEach( function( adgroup ){
		var baseCampaignName = adgroup.getCampaign().getName().split( BROAD_SUFFIX )[0];
		
		var duplicates = duplicateAdgroups[ baseCampaignName ];
		
		if( duplicates && duplicates.length && duplicates.indexOf( adgroup.getName() ) >= 0 ){
			adgroup.applyLabel( DUPLICATE_LABEL_NAME );
		}
		
		// exclude the main adgroup keyword as exact match in the bmm-adgroup
		adgroup.createNegativeKeyword( '[' + adgroup.getName() + ']' );
		
		var neg = negativeKeywords[ adgroup.getName() ];
		if( neg && neg.length > 0 ){
			neg.map( function( neg1 ){ return '"' + neg1 + '"' } )
				.forEach( function( neg1 ){ adgroup.createNegativeKeyword( neg1 ) } )
				;
		}
	});
	
	// +++++++++++++++++++++++++++++++++++
	
	_.iteratorToList(
		AdWordsApp.ads()
		.withCondition( 'Path1 = ""' )
		.withCondition( 'Path2 = ""' )
		.get()
	)
	.forEach( function( ad ){ ad.applyLabel( PATH_MISSING_LABEL_NAME ) } )
	;
	
	
	
	
}






