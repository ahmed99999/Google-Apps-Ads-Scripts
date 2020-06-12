

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
  var iter = AdWordsApp.campaigns().get();
  var campaignProfiler = profiler( 'campaignProfiler', 10 );
  while( iter.hasNext() ){
    campaignProfiler.start();
    var campaign = iter.next();
    var countAdgroups = campaign.adGroups().get().totalNumEntities();
    campaignProfiler.end();
  }
  campaignProfiler.log();
}