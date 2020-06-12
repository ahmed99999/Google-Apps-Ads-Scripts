var TIME = '20180313,20180314';
var CAMPAIGN_IDS = []; // 131464086
var SEPARATOR = " ";
var ID_SEPARATOR = '_';
var ID_COLUMNS = [ 'CampaignId', 'AdGroupId', 'KeywordId', 'Query' ];
var METRICS = [ 'Clicks', 'Cost', 'Conversions', 'ConversionValue' ];
var KPR_IDS = [ 'CampaignId', 'AdGroupId', 'Id' ];
var KPR_METRICS = [ 'Clicks', 'AveragePageviews', 'AverageTimeOnSite', 'BounceRate' ];

var Logger = {
	log : function( value ){ document.writeln( value + '<br>' ); }
}

function profiler( name, logInterval ){
  var count = 0;
  var skippedLogs = 0;
  var sumMillis = 0;
  var l = null;
  return {
    start : function(){
      l = (new Date() ).getTime();
    },
    end : function(){
      sumMillis += (new Date() ).getTime() - l;
      count++;
      if( ++skippedLogs >= logInterval ){
        skippedLogs = 0;
        this.log();
      }
    },
    log : function(){
      Logger.log( name + ': iterations: ' + count + ', duration: ' + sumMillis + ', avg duration: ' + Math.floor( sumMillis / count ) );
    }
  };
}


function getReport( query ){
  var rows = AdWordsApp.report( query ).rows();
  var res = [];
  while( rows.hasNext() ){
    res.push( rows.next() );
  }
  return res;
}

function log( value ){
	Logger.log( value );
}

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
			obj['isActiveClone'] = null;
			temp[key] = clone( obj[key] );
			delete obj['isActiveClone'];
		}
	}
	return temp;
}

function partition( arr ){
	return partition1( arr, false );
}

function partitionToLists( arr ){
	return partition1( arr, true );
}

function partition1( arr, toLists ){
	return {
		by: function( keyName ){
			var res = {};

			for ( var i = 0; i < arr.length; i++ ){
				var obj = clone( arr[i] );
				var key;
				if( Array.isArray( keyName ) ){
					key = [];
					keyName.forEach( function( keyName2 ){
						if ( typeof keyName2 == 'function' ){
							key.push( keyName2( obj ) );
						} else {
							key.push( obj[ keyName2 ] );
							delete obj[ keyName2 ];
						}
					});
					key = key.join( ID_SEPARATOR );
				}else{
					if ( typeof keyName == 'function' ){
						key = keyName( obj );
					} else {
						key =  obj[ keyName ];
						delete obj[ keyName ];
					}
				}
				// init
				if( toLists ){
					res[ key ] = ( res[ key ] || [] );
					res[ key ].push( obj );
				}else{
					res[ key ] = obj;
				}
			}
			return res;
		}
	};
}


// ####################################################
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
	log( 'fetch URL' );

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


function main() {
  
  //Logger.log( JSON.stringify( sqWords ) );
}

function sum( row1, row2 ){
  var res = {};
  METRICS.forEach( function( metric ){ res[ metric ] = parseFloat( row1[ metric ] || 0 ) + parseFloat( row2[ metric ] || 0 ); } );
  res.count = row1.count + row2.count;
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

