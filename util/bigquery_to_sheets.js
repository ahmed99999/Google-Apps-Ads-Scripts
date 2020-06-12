/**
 * Runs a BigQuery query and logs the results in a spreadsheet.
 */
function runQuery() {
  // Replace this value with the project ID listed in the Google
  // Cloud Platform project.
  var projectId = 'biddy-io';

  var request = {
    query: 'SELECT * ' +
      'FROM `biddy-io.anomaly_detector.conversion_lag_last_month`;',
  };
  var queryResults = BigQuery.Jobs.query( request, projectId );
  var jobId = queryResults.jobReference.jobId;

  // Check on status of the Query Job.
  var sleepTimeMs = 500;
  while (!queryResults.jobComplete) {
    Utilities.sleep(sleepTimeMs);
    sleepTimeMs *= 2;
    queryResults = BigQuery.Jobs.getQueryResults(projectId, jobId);
  }

  // Get all the rows of results.
  var rows = queryResults.rows;
  while (queryResults.pageToken) {
    queryResults = BigQuery.Jobs.getQueryResults(projectId, jobId, {
      pageToken: queryResults.pageToken,
    });
    rows = rows.concat(queryResults.rows);
  }

  if (rows) {
    var spreadsheet = SpreadsheetApp.openByUrl( 'https://docs.google.com/spreadsheets/d/1GMPxYthbmvMVsPNSfJOBlR3xba7jBxlnQyR40-4mPRg/edit#gid=1282972077' )
    var sheet = spreadsheet.getSheetByName( 'lag_data' );
    if( ! sheet ){
      sheet = spreadsheet.insertSheet( 'lag_data' );
    }
    sheet.clear();
    
    // Append the headers.
    var headers = queryResults.schema.fields.map(function(field) {
      return field.name;
    });
    sheet.appendRow(headers);

    // Append the results.
    var data = new Array(rows.length);
    for (var i = 0; i < rows.length; i++) {
      var cols = rows[i].f;
      data[i] = new Array(cols.length);
      for (var j = 0; j < cols.length; j++) {
        data[i][j] = cols[j].v;
      }
    }
    sheet.getRange(2, 1, rows.length, headers.length).setValues(data);

    Logger.log('Results spreadsheet created: %s',
        spreadsheet.getUrl());
  } else {
    Logger.log('No rows returned.');
  }
}