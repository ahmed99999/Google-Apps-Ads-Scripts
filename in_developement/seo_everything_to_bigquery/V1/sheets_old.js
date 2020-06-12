function createTable() { 
  
    var projectId = 'biddy-io';  
    var datasetId = 'bqml_tutorial';
    var sheet = SpreadsheetApp.getActiveSpreadsheet();
    
    var data1 =  sheet.getSheets()[1];
    var data5 =  sheet.getSheets()[5];
    
    var tableId1 = data1.getSheetName();
    var tableId5 = data5.getSheetName();
  
    Logger.log(tableId1);
    Logger.log(tableId5);   
    
    var table1 = {
      tableReference: {
        projectId: projectId,
        datasetId: datasetId,
        tableId: 'KAMSearchAnalytics'
      },
      schema: {
        fields: [
          {name: 'query', type: 'STRING'},
          {name: 'url', type: 'STRING'},
          {name: 'device', type: 'STRING'},
          {name: 'clicks', type: 'INTEGER'},
          {name: 'impressions', type: 'INTEGER'},
          {name: 'ctr', type: 'FLOAT'},
          {name: 'averagePosition', type: 'FLOAT'},
          {name: 'roundedPosition', type: 'FLOAT'}
        ]
      }
    };
    table = BigQuery.Tables.insert(table1, projectId, datasetId);
    Logger.log('Table created: %s', table1.id);
    
  /*  var table5 = {
      tableReference: {
        projectId: projectId,
        datasetId: datasetId,
        tableId: 'KAMCrawlSamples'
      },
      schema: {
        fields: [
          {name: 'pageUrl', type: 'STRING'},
          {name: 'lastCrawled', type: 'TIMESTAMP'},
          {name: 'firstCrawled', type: 'TIMESTAMP'},
          {name: 'responseCode', type: 'STRING'}
        ]
      }
    };
    table = BigQuery.Tables.insert(table5, projectId, datasetId);
    Logger.log('Table created: %s', table5.id);
    */
    
  }
  
  var TRUNCATE_EXISTING_DATASETS = false;
  var TRUNCATE_EXISTING_TABLES = false;
  var PARTITION_EXPIRATION = true;
  var CHUNK_SIZE = 30000;
    
  
  function logProductInfo() {
    
    var projectId = 'biddy-io';  
    var datasetId = 'bqml_tutorial';
    var sheet = SpreadsheetApp.getActiveSpreadsheet();
    
    var data1 =  sheet.getSheets()[1].getRange(2,1,sheet.getSheets()[1].getLastRow(),8).getValues();
    var data5 =  sheet.getSheets()[5].getRange(2,1,sheet.getSheets()[5].getLastRow(),4).getValues();
    
    var tableId1 = sheet.getSheets()[1].getSheetName();
    var tableId5 = sheet.getSheets()[5].getSheetName();
    
    Logger.log(data1);
    loadIntoBigquery( projectId, datasetId, 'KAMSearchAnalytics', data1 );
    //loadIntoBigquery( projectId, datasetId, 'KAMCrawlSamples', data5 ); 

}
  
  function loadIntoBigquery( projectId, datasetId, tableName, matrix ){
          // dropTable( tableName );
          // createTable( tableName, FIELDS );
          if( ! matrix.length ){
              matrix = toMatrix( matrix );
          }
          var uploader = loadIntoBigqueryTable( projectId, datasetId, tableName );
          var bigQueryJobIds = toCsvChunks( matrix ).map( uploader );
          return bigQueryJobIds;
      }
  
  function loadIntoBigqueryTable( projectId, datasetId, tableName ){
          return function( data ){
              // Convert to Blob format.
              var blobData = Utilities.newBlob( data, 'application/octet-stream' );
              // Create the data upload job.
              var job = {
                  configuration: {
                      load: {
                          destinationTable: {
                              projectId: projectId,
                              datasetId: datasetId,
                              tableId: tableName
                          },
                          skipLeadingRows: 0, // We have no a header row, so nothing to skip.
                          writeDisposition	: 'WRITE_APPEND', // Since we load chunks it must be append! Do not use 'WRITE_TRUNCATE' here!
                      }
                  }
              };
              try{
                  var insertJob = BigQuery.Jobs.insert( job, projectId, blobData );
                  //Logger.log('Load job started for %s. Check on the status of it here: ' +
                  //   'https://bigquery.cloud.google.com/jobs/%s', tableName,
                  //   projectId);
                  return insertJob.jobReference.jobId;
              }catch( error ){
                  // sometimes we get "No schema specified on job or table." here. Not recently..
                  Logger.log( error + ' - ' + tableName );
                  return 'error';
              }
          };
      }
  
  function toCsvChunks( matrix ){
          function splitArray( arr, chunkSize ){
              var i, res = [];
              for( i = 0; i < arr.length; i += chunkSize ){
                  res.push( arr.slice( i, i + chunkSize ) );
              }
              return res;
          }
          var rows = matrix.map( function( row ){
              return row.map( prepareForBigQuery ).join( ',' );
          });
          return splitArray( rows, CHUNK_SIZE ).map( function( rows ){ return rows.join( '\n' ) } );
      }
  
  function prepareForBigQuery( value ){
          function isNumeric( n ){
              return ! isNaN( parseFloat( n ) ) && isFinite( n );
          }
          if( typeof value == 'string' ){
              // remove thousand separator
              var num = value.split( ',' ).join( '' );
              if( isNumeric( num ) ){
                  return num;
              }
              if( value.indexOf( '%' ) == value.length - 1 ){
                  return value.substring( 0, value.length - 1 ) / 100;
              }
              if( value.indexOf( '"' ) >= 0 ){
                  value = value.replace( new RegExp( '"', 'g' ), '""' );
              }
              value = '"' + value + '"';
              return value;
          }
          value = value + '';
          
          if( value.indexOf(',') >= 0 ){
              value = value.replace( new RegExp( ',', 'g' ), '' );
          }
          return value;
      }
  
  
  
  
  
  function checkJob( projectId, jobId ){
    do{
      var job = BigQuery.Jobs.get( projectId, jobId );
      Logger.log( JSON.stringify( job, null, 2 ) + ' Sleep 10 sec' );
      
      Utilities.sleep(1000 * 10 );
      
    }while( job.status && job.status.state == 'RUNNING' );
    Logger.log( 'final job: ' + JSON.stringify( job, null, 2 ) );
  }