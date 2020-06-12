
var SPREADSHEET_URL = 'https://docs.google.com/spreadsheets/d/1gAgdBRWLHNdmntu4sJZ0299o30yqNaq94_yDxdyacQI/edit#gid=0';
var SHEET_NAME = 'Sheet1';
var CONDITION_SHEET_NAME = 'Sheet2'

var SS = SpreadsheetApp.openByUrl( SPREADSHEET_URL );
var SHEET = SS.getSheetByName( SHEET_NAME );
var CONDITION_SHEET = SS.getSheetByName( CONDITION_SHEET_NAME );
var API_EMD_POINT = 'https://googleads.googleapis.com/v2';
var CONDITIONS = [ 'URL', 'Referrer URL' ];
var HEADERS = [ 'Name', 'Membership Duration Days', 'Initial List Size', 'Grouped By', 'Action', 'Combined List Names' ];
var INITIAL_LIST_SIZE = [ 0, 30 ];

var ACCESS_TOKEN = '4/pAEl6mAgAKEfrNkaaPkDqBs6eC8EMtvBBP8eEWGSt3u3pzrHYUyXRfU';

var CLIENT_ID = '133318782811-uoprvdv7nkvii2qelcm4srkmqjtphuld.apps.googleusercontent.com';
var CLIENT_SECRET = 'U8L_V-DVbJ9mWaXXBMvKeMOY';

var COMBINING_CONDITIONS = [ 'AND', 'OR' ];
var OPERATORS = [
  'contains',
  'equals',
  'starts with',
  'ends with',
  'does not contain',
  'does not equal',
  'does not start with',
  'does not end with'
];

var ACTIONS = [ 'include', 'exclude' ];

function toListOneMetric( iterator, metric ){
	var list = [];
	while( iterator.hasNext() ){
		list.push( iterator.next()[ metric ] );
	}
	return list;
}

function getCampaignNames() {
  var query = 'SELECT CampaignName ' + 
              'FROM CAMPAIGN_PERFORMANCE_REPORT ' + 
              'WHERE CampaignStatus IN [ "ENABLED" ] ';
  Logger.log( query );
  return toListOneMetric( AdWordsApp.report( query ).rows(), 'CampaignName' );
}

function getAdGroupsNames() {
  var query = 'SELECT AdGroupName ' + 
              'FROM ADGROUP_PERFORMANCE_REPORT ' + 
              'WHERE CampaignStatus IN [ "ENABLED" ] ';
  Logger.log( query );
  return toListOneMetric( AdWordsApp.report( query ).rows(), 'AdGroupName' );
}

function buildDropDownList( list, range ){
  var rule = SpreadsheetApp
      .newDataValidation()
      .requireValueInList( list )
      .setAllowInvalid( false )
      .build();

  range.setDataValidation( rule ); 
}

function clearSheet( sheet ){
  var lastRow = ( sheet.getMaxRows() == 0 ) ? 1 : sheet.getMaxRows();
  var lastColumn = ( sheet.getMaxColumns() == 0 ) ? 1 : sheet.getMaxColumns();
  var range = sheet.getRange( 1, 1, lastRow, lastColumn );
  range.clearDataValidations();
  range.clear();
  range.clearFormat();
  range.clearContent();
  range.clearNote();
}

function initialazeHeaders(){
  SHEET.getRange('A1:F1').setValues( [ HEADERS ] );
  var column = 7;

   CONDITIONS.forEach( function( condition ){
      SHEET.getRange( 1, column ).setValue( condition );
      SHEET.getRange( 1, column+2 ).setValue( '' );

      SHEET.getRange( 1, column, 1, 3 ).merge();
      SHEET.getRange( 2, column, SHEET.getMaxRows(), 3 )
           .setBorder( null, true, null, true, false, false, "black", null );
      column+=3;
  });
  var campaignAdGroupHeader = Array.apply( null, Array(4) ).map( function(){ return 'Campaign'; } ).concat(
                              Array.apply( null, Array(4) ).map( function(){ return 'Adgroup'; } ) );

  SHEET.getRange( 1, column, 1, campaignAdGroupHeader.length ).setValues( [ campaignAdGroupHeader ] );
  SHEET.getRange( 1, 1, 1, SHEET.getLastColumn() )
       .setHorizontalAlignment("center")
       .setBorder( true, true, true, true, true, true, "black", null );

  SHEET.setFrozenRows(1);
}

function initialazeConditionsBodies(){
  var campaignNames = getCampaignNames();
  var adGroupsNames = getAdGroupsNames();

  var column = 7;
  CONDITIONS.forEach( function( condition ){
      buildDropDownList( COMBINING_CONDITIONS, SHEET.getRange( 2, column, SHEET.getMaxRows(), 1 ) );
      buildDropDownList( OPERATORS , SHEET.getRange( 2, column+1, SHEET.getMaxRows(), 1 ) );
      column+=3;
  });

  buildDropDownList( ACTIONS, SHEET.getRange('E2:E') );
  buildDropDownList( INITIAL_LIST_SIZE, SHEET.getRange('C2:C') );
  buildDropDownList( campaignNames, SHEET.getRange( 2, column, SHEET.getMaxRows(), 4 ) );
  buildDropDownList( adGroupsNames, SHEET.getRange( 2, column+4, SHEET.getMaxRows(), 4 ) );
}

function initialazeTemplate(){
  clearSheet( SHEET );
  initialazeHeaders();
  initialazeConditionsBodies();
}

function request( url ){
  return {
    get :function(){
      var options = {
        'headers': {
            'Authorization': 'Bearer '+ACCESS_TOKEN
          },
        'muteHttpExceptions': true
      }
      return UrlFetchApp.fetch( url, options ).getContentText( 'UTF-8' );
    },
    send :function( data, type ){
      if ( [ 'post', 'put' ].indexOf( type ) < 0 ) throw new Error( 'send request type must be post or put' );
      var options = {
        'method'      : type,
        'contentType' : 'application/json',
        'payload'     : JSON.stringify( data ),
        'muteHttpExceptions': true,
        'headers'     : {
          'Authorization' : 'Bearer '+ACCESS_TOKEN
        }
      }
      return UrlFetchApp.fetch( url, options ).getContentText( 'UTF-8' );
    }
  };
}

function toList( iterator ){
	var list = [];
	while( iterator.hasNext() ){
		list.push( iterator.next() );
	}
	return list;
}

function getData (){
  var query = 'SELECT Criteria, CampaignName ' +
              'FROM KEYWORDS_PERFORMANCE_REPORT ' +
              'WHERE CampaignName CONTAINS "Exact" ' +
              'OR CampaignName CONTAINS "broad" ';

  return toList( AdWordsApp.report( query ).rows() );
}

function main(){
  var data = getData();
  Logger.log( JSON.stringify( data, null, 2 ) );
}

function main() {
  var condition = CONDITION_SHEET.getRange('A1').getValue();
  Logger.log( typeof( condition ) );
  var url = API_EMD_POINT + '/customers/4753357988';
  var data = request( url ).get();
  Logger.log( data );
}
