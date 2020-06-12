var SEPARATOR = " ";
var METRICS = [ 'Clicks', 'Cost', 'Conversions', 'ConversionValue' ];

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


function main() {
  var sqWords = {};
  var myProfiler = profiler( 'myProfiler', 1000 );
  sqrReport.forEach( function( row ){
	myProfiler.start();
	
    row.count = 1;
    explode( row.Query )
    .forEach( function( word ){
      sqWords[ word ] = sqWords[ word ] ? sqWords[ word ] : { count : 0 };
      sqWords[ word ] = sum( sqWords[ word ], row );
    });
	
	myProfiler.end();
  });
  
  myProfiler.log();
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
