
var SS = SpreadsheetApp.getActive();

var SHEET_NAME = 'GA_Audience_Sheet';
var DATA_SHEET_NAME = 'Account_Data';
var OTHER_SHEET_NAME = 'Other_Audiences';
var DIMENTIONS_SHEET_NAME = 'Custom_Dimensions';
var METRICS_SHEET_NAME = 'Custom_Metrics';
var GOALD_SHEET_NAME = 'Destination Goals + Funnel';

var DIMENTIONS_SHEET = SS.getSheetByName( DIMENTIONS_SHEET_NAME );
var METRICS_SHEET = SS.getSheetByName( METRICS_SHEET_NAME );
var SHEET = SS.getSheetByName( SHEET_NAME );
var DATA_SHEET = SS.getSheetByName( DATA_SHEET_NAME ) || SS.insertSheet( DATA_SHEET_NAME );
var OTHER_SHEET = SS.getSheetByName( OTHER_SHEET_NAME );
var GOALD_SHEET = SS.getSheetByName( GOALD_SHEET_NAME );

var COMBINING_CONDITIONS = {
    'AND'   : ';',
    'OR'    : ','
};

var OPERATORS_NUMBER = {
    'Equal'         : '==',
    'Not equal'     : '!=',
    'Less than'     : '<',
    'Greater than'  : '>',
    'Less than or equal to'     : '<=',
    'Greater than or equal to'  : '>='
};

var OPERATORS_STRING = {
    'Equal'         : '==',
    'Not equal'     : '!=',
    'Match regex'               : '=~',
    'Does not match regex'      : '!~',
    'Contains substring'        : '=@',
    'Does not contain substring':'!@'
};

var CONDITIONS = {
    // 'Days Since Last Session'  : 'ga:daysSinceLastSession',
    'Page Path'            : 'ga:pagePath',
    'Medium'               : 'ga:medium',
    'Source'               : 'ga:source',
    'Count of Sessions'    : 'ga:sessionCount',
    'Bounces'              : 'ga:bounces',
    'Session Duration'     : 'ga:sessionDuration',
    'Transactions'         : 'ga:transactions',
    'Product Adds To Cart' : 'ga:productAddsToCart',
    'Revenue Per User'     : 'ga:transactionRevenue',
    'Goal XX Completions'  : 'ga:goalXXCompletions'
};

var CONDITIONS_TYPES = {
    'Days Since Last Session'  : 'string',
    'Page Path'            : 'string',
    'Medium'               : 'string',
    'Source'               : 'string',
    'Count of Sessions'    : 'number',
    'Bounces'              : 'number',
    'Session Duration'     : 'number',
    'Transactions'         : 'number',
    'Product Adds To Cart' : 'number',
    'Revenue Per User'     : 'number',
    'Goal XX Completions'  : 'number'
};

var CONDITIONS_NOTES = {
    'Days Since Last Session'  : 'The number of days elapsed since users last visited the property, used to calculate user loyalty.',
    'Page Path'            : 'A page on the website specified by path and/or query parameters. Use this with hostname to get the page\'s full URL',
    'Medium'               : 'The type of referrals. For manual campaign tracking, it is the value of the utm_medium campaign tracking parameter. For AdWords autotagging, it is cpc. If users came from a search engine detected by Google Analytics, it is organic. If the referrer is not a search engine, it is referral. If users came directly to the property and document.referrer is empty, its value is (none)',
    'Source'               : 'The source of referrals. For manual campaign tracking, it is the value of the utm_source campaign tracking parameter. For AdWords autotagging, it is google. If you use neither, it is the domain of the source (e.g., document.referrer) referring the users. It may also contain a port address. If users arrived without a referrer, its value is (direct)',
    'Count of Sessions'    : 'The session index for a user. Each session from a unique user will get its own incremental index starting from 1 for the first session. Subsequent sessions do not change previous session indices. For example, if a user has 4 sessions to the website, sessionCount for that user will have 4 distinct values of \'1\' through \'4\'',
    'Bounces'              : 'The total number of single page (or single interaction hit) sessions for the property',
    'Session Duration'     : 'Total duration (in seconds) of users\' sessions',
    'Transactions'         : 'The total number of transactions',
    'Product Adds To Cart' : 'Number of times the product was added to the shopping cart (Enhanced Ecommerce)',
    'Revenue Per User'     : 'The total sale revenue (excluding shipping and tax) of the transaction divided by the total number of users',
    'Goal XX Completions'  : 'The total number of completions for the requested goal number'
};

var START_ROW = 3;
var HEADERS_ROW = 2;
var LAST_COLUMN = 42;
var DEFAULT_VALUES = [ 'Accounts', 'Properties', 'Views', 'Name', 'Membership Duration Days', 'Days To Look Back' ];
var CONDITIONS_START_COLUMN = 7;

var ON_EDIT_ELIGIBLE_COLUMNS = [ 1, 2, 42 ];
var API_EMD_POINT = "https://www.googleapis.com/analytics/v3";

function request( url ){ 
    var accessToken = ScriptApp.getOAuthToken();
    return {
        get :function(){
            var options = {
                'headers': {
                    'Authorization': "Bearer " + accessToken
                }
            }
            var data = UrlFetchApp.fetch( url, options ).getContentText( 'UTF-8' );
            return JSON.parse( data )['items'];
        },
        send :function( data, type ){
            if ( [ 'post', 'put' ].indexOf( type ) < 0 ) throw new Error( 'send request type must be post or put' );
            var options = {
                'method'      : type,
                'contentType' : 'application/json',
                'payload'     : JSON.stringify( data ),
                'headers'     : {
                    'Authorization' : "Bearer " + accessToken
                }
            }
            return UrlFetchApp.fetch( url, options ).getContentText( 'UTF-8' );
        }
    };
} 

function getAccounts () {
    var url = API_EMD_POINT+'/management/accounts/';
    return request( url ).get();
}

function getWebProperties ( accountId ){
    if (typeof accountId == 'undefined') return null;
    var url = API_EMD_POINT+'/management/accounts/'+accountId+'/webproperties';
    return request( url ).get();
}

function getViews ( accountId, webpropertyId ){
    if ( typeof accountId == 'undefined' || typeof webpropertyId == 'undefined' ) return null ;
    var url = API_EMD_POINT+'/management/accounts/'+accountId+'/webproperties/'+webpropertyId+'/profiles';
    return request( url ).get();
}

function getAudiences( accountId, webpropertyId ){
    if ( typeof accountId == 'undefined' || typeof webpropertyId == 'undefined' ) return null ;
    var url = API_EMD_POINT+'/management/accounts/'+accountId+'/webproperties/'+webpropertyId+'/remarketingAudiences';
    return request( url ).get();
}

function getAdwardsAccounts( accountId, webpropertyId ){
    if ( typeof accountId == 'undefined' || typeof webpropertyId == 'undefined' ) return null ;
    var url = API_EMD_POINT+'/management/accounts/'+accountId+'/webproperties/'+webpropertyId+'/entityAdWordsLinks';
    return request( url ).get();
}

function toCellValues( list ){
    return list.map( function( item ){
        return item.name + '\n' + item.id;
    });
}

function onEdit( evt ){
    var activeCell = evt.range;
    var sheet = activeCell.getSheet();
    var sheetName = activeCell.getSheet().getName();
    var column = activeCell.getColumn();
    var row = activeCell.getRow();
    var value = activeCell.getValue();

    if ( 
        ( sheetName !== SHEET_NAME &&
        sheetName !== DIMENTIONS_SHEET_NAME &&
        sheetName !== METRICS_SHEET_NAME &&
        sheetName !== GOALD_SHEET_NAME ) ||
        column < 1 ||
        column > 2 ||
        value === '' 
    ) return;

    var options = DATA_SHEET.getRange( 1, 1, DATA_SHEET.getLastRow(), 4 ).getValues();
    var filteredList = options.filter( function( list ){
        return list[ column - 1 ] === value;
    });

    polulateAccountsDataIntoTomplate( sheet, column, row, filteredList );
}

function polulateAccountsDataIntoTomplate( sheet, column, row ,list ){
    var respose = {
        1 : function(){
            var propertiesList = list.map( function( item ){ return item[1]; });
            var viewsList = list.map( function( item ){ return item[2]; });
            buildDropDownList( propertiesList, sheet.getRange( row, column+1 ) );
            buildDropDownList( viewsList, sheet.getRange( row, column+2 ) );
        },
        2 : function(){
            var viewsList = list.map( function( item ){ return item[2]; });
            buildDropDownList( viewsList, sheet.getRange( row, column+1 ) );
            
            if( sheet.getName() == SHEET_NAME ){
                var analyticsColumn = column + 4 + ( Object.keys( CONDITIONS ).length * 3 ) + 3;
                var adwardsColumn   = column + 4 + ( Object.keys( CONDITIONS ).length * 3 ) + 2;

                var propertiesList = [''].concat( list.map( function( item ){ return item[1]; }) );
                var adwardsList = [''].concat( list.filter( function( item ){ return item[3] !== '';} ).map( function( item ){ return item[3];} ) );
                
                buildDropDownList( propertiesList, sheet.getRange( row, analyticsColumn ));
                buildDropDownList( adwardsList, sheet.getRange( row, adwardsColumn ) );
            }
        }
    }
    respose[column]();
}

function buildDropDownList( list, range ){
    var rule = SpreadsheetApp
        .newDataValidation()
        .requireValueInList( list )
        .setAllowInvalid( false )
        .build();

    range.setDataValidation( rule ); 
}

function clearSheet( sheet, startRow, endColumn ){
    var lastRow = ( sheet.getMaxRows() == 0 ) ? 1 : sheet.getMaxRows();
    var lastColumn = ( sheet.getMaxColumns() == 0 ) ? 1 : LAST_COLUMN;
    var range = sheet.getRange( startRow, 1, lastRow, endColumn || lastColumn );
    range.clearDataValidations();
    range.clear();
    range.clearFormat();
    range.clearContent();
    range.clearNote();
}

function isNotEmpty( value ){
    return function( item ){
        return ( 
            typeof item[ value ] !== 'undefined' &&
            item[ value ] !== '' &&
            item [ value ] !== "''''" 
        );
    };
}

function getRowObject( attribute ){
    return function( item, index ){
        var obj = {};
        obj[ attribute ] = item[0];
        obj[ 'row' ]     = index+3;
        return obj;
    };
}

function getDeletedAudience( sheet ){
    return function( audience ){
        var row = audience['row'];
        return {
            id              :audience['id'],
            accountId       :sheet.getRange( row, 1 ).getValue().split('\n')[1],
            webPropertyId   :sheet.getRange( row, 2 ).getValue().split('\n')[1],
            // viewId          :sheet.getRange( row, 3 ).getValue().split('\n')[1],
            row             :row
        };
    };
}

function deleteRemarketingAudience( idColumn, deleteColumn, sheet, lastColumn, deleted ){
    var sheet = ( typeof sheet !== 'undefined' ) ? sheet : SHEET;
    var idsColumn = ( typeof idsColumn !== 'undefined' ) ? idColumn+'3:'+idColumn : 'AO3:AO';
    var deletesColumn = ( typeof deletesColumn !== 'undefined') ? deleteColumn+'3:'+deleteColumn : 'AP3:AP';
    var lastColumn = ( typeof lastColumn !== 'undefined') ? lastColumn : LAST_COLUMN;

    var deleteRows = sheet.getRange( deletesColumn ).getValues()
    .map( getRowObject( 'value' ) )
    .filter( isNotEmpty( 'value' ) )
    .map( function ( item ){ return item['row']});

    var deleteAudiences = sheet.getRange( idsColumn ).getValues()
    .map( getRowObject( 'id' ) )
    .filter( isNotEmpty( 'id' ) )
    .filter( function( audience ){ return deleteRows.indexOf( audience['row'] ) >= 0; })
    .map( getDeletedAudience( sheet ) );

    deleteAudiences.forEach( function( audienceToBeDeleted ){
        Analytics.Management.RemarketingAudience.remove( audienceToBeDeleted.accountId, audienceToBeDeleted.webPropertyId, audienceToBeDeleted.id );
        sheet.getRange( audienceToBeDeleted.row, 1, 1, lastColumn ).setBackground("#bf8080");
        sheet.getRange( ( ( typeof deleted !== 'undefined' ) ? deleted : 'AN' ) + audienceToBeDeleted.row ).setValue ('Deleted');
        sheet.getRange( ( (typeof idColumn !== 'undefined') ? idColumn : 'AO') + audienceToBeDeleted.row ).setValue('');
    });
}


function setTheDataSheet( accounts, webproperties, views, adwardsLinks ){
    clearSheet( DATA_SHEET, 1 );
    var size  = 1;
    var size2 = 1;
    accounts.forEach( function ( account ){
        var start = size;
        DATA_SHEET.getRange( size, 1 ).setValue( account.name+'\n'+account.id );      
        webproperties[ account.id ].forEach( function ( webproperty ){
            var start2 = size;
            DATA_SHEET.getRange( size, 2 ).setValue( webproperty.name+'\n'+webproperty.id );
            
            var maxSize = Math.max( views[ webproperty.id ].length, adwardsLinks[webproperty.id].length );
            views[ webproperty.id ].forEach( function( view ){
                DATA_SHEET.getRange( size, 1 ).setValue( account.name+'\n'+account.id );        
                DATA_SHEET.getRange( size, 2 ).setValue( webproperty.name+'\n'+webproperty.id );
                DATA_SHEET.getRange( size, 3 ).setValue( view.name+'\n'+view.id );
                size += 1;
            });
            adwardsLinks[ webproperty.id ].forEach( function ( adwardsLink ){
                // Logger.log( adwardsLink.name +'\n'+ adwardsLink.adWordsAccounts[0].customerId );
                DATA_SHEET.getRange( size2, 4 ).setValue( adwardsLink.name+'\n'+adwardsLink.adWordsAccounts[0].customerId );
                DATA_SHEET.getRange( size2, 5 ).setValue( account.id+'\n'+webproperty.id );
                size2 += 1;
            });
            size  = start2 + maxSize;
            size2 = start2 + maxSize;
            if ( start2 === size ) {
                size++;
                size2++;
            }
        });
        if ( start === size ) {
            size++;
            size2++;
        }
    });
}

function surround( prefix, postfix ){
    return function( str ){ return prefix + str + postfix };
}

function initialazeHeaders(){
    SHEET.getRange( HEADERS_ROW, 1, 1, 6  ).setValues([DEFAULT_VALUES]);
    var column = CONDITIONS_START_COLUMN; // start column of the conditions headers

    Object.keys( CONDITIONS ).forEach( function( condition ){
        SHEET.getRange( HEADERS_ROW, column ).setValue( condition );
        SHEET.getRange( HEADERS_ROW, column+2 ).setValue( '' );
        var mergeColumns = ( condition === "Goal XX Completions" ) ? 4 : 3;
        SHEET.getRange( HEADERS_ROW, column, 1, mergeColumns ).merge().setNote( CONDITIONS_NOTES[ condition ] );
        SHEET.getRange( 3, column, SHEET.getMaxRows(), mergeColumns )
             .setBorder( null, true, null, true, false, false, "black", null );
        column+=3;
    });
    column++;
    SHEET.getRange( HEADERS_ROW, column, 1, 5 ).setValues([['Adwards Link', 'Analytics Link' , 'Status', 'Audiance Id', 'Delete Audience']]);
    SHEET.getRange( HEADERS_ROW, 1, 1, SHEET.getLastColumn() )
         .setHorizontalAlignment("center")
         .setBorder( true, true, true, true, true, true, "black", null );
    SHEET.setFrozenRows(1);
}

function initialazeConditionsBodies(){
    var column = CONDITIONS_START_COLUMN;
    Object.keys( CONDITIONS ).forEach( function( condition ){
        buildDropDownList( Object.keys( COMBINING_CONDITIONS ), SHEET.getRange( START_ROW, column, SHEET.getMaxRows(), 1 ) );
        var OPERATORS = ( CONDITIONS_TYPES[ condition ] === "string" ) ? OPERATORS_STRING : OPERATORS_NUMBER ;
        buildDropDownList( Object.keys( OPERATORS ), SHEET.getRange( START_ROW, column+1, SHEET.getMaxRows(), 1 ) );
        if ( condition === "Goal XX Completions" ){
            var goalList = Array.apply( null, Array(21) ).map( Number.call, Number );
            goalList.shift();
            buildDropDownList( goalList.map( surround( "ga:goal", "Completions" ) ), SHEET.getRange( START_ROW, column+3, SHEET.getMaxRows(), 1 ) );
            column++;
        }
        column+=3;
    });

    buildDropDownList( [], SHEET.getRange( START_ROW, column, SHEET.getMaxRows(), 1 ) );
    buildDropDownList( [], SHEET.getRange( START_ROW, column+1, SHEET.getMaxRows(), 1 ) );
}

function initialazeTemplate( sheet ){
    var sheetName = sheet.getName();
    var lastColumn;

    if ( sheetName == DIMENTIONS_SHEET_NAME ) lastColumn = 6;
    else if ( sheetName == METRICS_SHEET_NAME || sheetName == GOALD_SHEET_NAME ) lastColumn = 11;
    else lastColumn = null;
    clearSheet( sheet, START_ROW, lastColumn );
    // initialazeHeaders();
    if( sheetName == SHEET_NAME ) initialazeConditionsBodies();
    var accountsList = DATA_SHEET.getRange( 1, 1, DATA_SHEET.getLastRow() ).getValues();
    var lists = accountsList.map( function( list ){ return list[0]; });
    var accounts = [];
    lists.forEach( function( item ){
        if ( accounts.indexOf( item ) < 0 ) {
            accounts.push( item );
        }
    });

    if ( sheetName == SHEET_NAME )
        buildDropDownList( [ 7, 14, 30 ], sheet.getRange( START_ROW, 6, sheet.getMaxRows(), 1 ) );
    if ( sheetName == DIMENTIONS_SHEET_NAME )
        buildDropDownList( [ "HIT", "SESSION", "USER", "PRODUCT" ], sheet.getRange( START_ROW, 5, sheet.getMaxRows(), 1 ) );
    if( sheetName == METRICS_SHEET_NAME ){
    }
    if( sheetName == GOALD_SHEET_NAME ){
        buildDropDownList( [ "Custom", "Contact Us", "Media play", "Signup", "Place an Order" ], sheet.getRange( START_ROW, 4, sheet.getMaxRows(), 1 ) );
        buildDropDownList( [ "URL_DESTINATION", "VISIT_TIME_ON_SITE", "VISIT_NUM_PAGES", "EVENT" ], sheet.getRange( START_ROW, 6, sheet.getMaxRows(), 1 ) );
        buildDropDownList( [ "Active", "Inactive", ], sheet.getRange( START_ROW, 9, sheet.getMaxRows(), 1 ) );
    }
    buildDropDownList( accounts, sheet.getRange('A3:A') );
    buildDropDownList( [], sheet.getRange('B3:B') );
    buildDropDownList( [], sheet.getRange('C3:C') );
}

function maptoDimentionObject( data ){
    var dimentions = [];
    data.forEach( function ( row, index ){
        if ( !itemNotEmpty( row[ 3 ]) || !itemNotEmpty( row [ 4]) || row [5] == "Created") return;
        dimentions.push({
            "id" : row[ 6 ],
            "kind": "analytics#customDimension",
            "accountId": row[0].split('\n')[1],
            "webPropertyId": row[1].split('\n')[1],
            "name" : row[ 3 ],
            "active": true,
            "scope": row[ 4 ],
            "row" : index+3
        })
    });
    return dimentions;
}

function postDimention( dimention, type ){
    var accountId = dimention["accountId"];
    var webpropertyId = dimention["webPropertyId"];
    var id = dimention["id"];
    var url = API_EMD_POINT+'/management/accounts/' + accountId+'/webproperties/' + webpropertyId+'/customDimensions/'+ id;
    Logger.log( url );
    var row = dimention["row"];
    delete dimention["row"];
    delete dimention["id"];
    try {
        var newDimention = request( url ).send( dimention, type );
        newDimention = JSON.parse( newDimention );
        DIMENTIONS_SHEET.getRange( row , 1, 1, 7 ).setBackground("#abcca1");
        DIMENTIONS_SHEET.getRange( row , 6).setValue( "Created" );
        DIMENTIONS_SHEET.getRange( row , 7).setValue( newDimention["id"] );
    } catch ( error ) {
        DIMENTIONS_SHEET.getRange( row , 1, 1, 7 ).setBackground("#bf8080");
        DIMENTIONS_SHEET.getRange( row , 6 ).setValue("Not Created");
    }
}

function updateDimentons(){
    var sheetData = DIMENTIONS_SHEET.getRange( 3, 1, DIMENTIONS_SHEET.getLastRow(), 7 ).getValues();
    var dimentions = maptoDimentionObject( sheetData );
    dimentions.forEach( function( dimention ){
       postDimention( dimention, "put" );        
    });
}

function createDimentions(){
    var sheetData = DIMENTIONS_SHEET.getRange( 3, 1, DIMENTIONS_SHEET.getLastRow(), 7 ).getValues();
    var dimentions = maptoDimentionObject( sheetData );
    dimentions.forEach( function( dimention ){
       postDimention( dimention, "post" );        
    });
}

function maptoMetricObject( data ){
    var dimentions = [];
    data.forEach( function ( row, index ){
        if ( !itemNotEmpty( row[3]) || !itemNotEmpty( row [4]) || !itemNotEmpty( row[8] ) ||  row [10] == "Created") return;
        dimentions.push({
            "id" : row[ 9 ],
            "kind": "analytics#customMetric",
            "accountId": row[0].split('\n')[1],
            "webPropertyId": row[1].split('\n')[1],
            "name" : row[ 3 ],
            "active": row[8] == "Active",
            "min_value": row[6],
            "max_value": row[7],
            "type" : row[5] ,
            "scope": row[ 4 ],
            "row" : index+3
        })
    });
    return dimentions;
}

function postMetric( metric, type ){
    var accountId = metric["accountId"];
    var webpropertyId = metric["webPropertyId"];
    var id = metric["id"];
    var url = API_EMD_POINT+'/management/accounts/' + accountId+'/webproperties/' + webpropertyId+'/customMetrics/'+ id;
    var row = metric["row"];
    delete metric["row"];
    delete metric["id"];
    try {
        var newMetric = request( url ).send( metric, type );
        newMetric = JSON.parse( newMetric );
        METRICS_SHEET.getRange( row , 1, 1, 11 ).setBackground("#abcca1");
        METRICS_SHEET.getRange( row , 11).setValue( "Created" );
        METRICS_SHEET.getRange( row , 10).setValue( newMetric["id"] );
    } catch ( error ) {
        METRICS_SHEET.getRange( row , 1, 1, 11 ).setBackground("#bf8080");
        METRICS_SHEET.getRange( row , 11 ).setValue("Not Created");
    }
}

function createMetrics(){
    var sheetData = METRICS_SHEET.getRange( 3, 1, METRICS_SHEET.getLastRow(), 11 ).getValues();
    var metrics = maptoMetricObject( sheetData );
    Logger.log( metrics );
    metrics.forEach( function( metric ){
       postMetric( metric, "post" );        
    });
}

function updateMetrics(){
    var sheetData = METRICS_SHEET.getRange( 3, 1, METRICS_SHEET.getLastRow(), 11 ).getValues();
    var metrics = maptoMetricObject( sheetData );
    metrics.forEach( function( metric ){
       postMetric( metric, "put" );        
    });
}

function postGoal( goal, type ){
    var accountId = goal["accountId"];
    var webpropertyId = goal["webPropertyId"];
    var profileId = goal["profileId"];
    var id = goal["id"];
    var url = API_EMD_POINT+'/management/accounts/' + accountId+'/webproperties/' + webpropertyId+'/profiles/' + profileId + '/goals/'+  id;
    var row = goal["row"];
    delete goal["row"];
    delete goal["id"];
    try {
        var newGoal = request( url ).send( goal, type );
        newGoal = JSON.parse( newGoal );
        METRICS_SHEET.getRange( row , 1, 1, 11 ).setBackground("#abcca1");
        METRICS_SHEET.getRange( row , 11).setValue( "Created" );
        METRICS_SHEET.getRange( row , 10).setValue( newGoal["id"] );
    } catch ( error ) {
        METRICS_SHEET.getRange( row , 1, 1, 11 ).setBackground("#bf8080");
        METRICS_SHEET.getRange( row , 11 ).setValue("Not Created");
    }
}

function maptoGoalObject( data ){
    var goals = [];
    data.forEach( function ( row, index ){
        if ( !itemNotEmpty( row[3]) || !itemNotEmpty( row [4]) || !itemNotEmpty( row[8] ) || row [10] == "Created") return;
        var goal = {
            "id" : row[ 9 ],
            "kind": "analytics#customMetric",
            "accountId": row[0].split('\n')[1],
            "webPropertyId": row[1].split('\n')[1],
            "profileId": row[2].split('\n')[1] ,
            "name" : row[ 4 ],
            "active": row[8] == "Active",
            "visitTimeOnSiteDetails": {
                "comparisonType": row[6],
                "comparisonValue": row[7]
            },
            "visitNumPagesDetails": {
                "comparisonType": row[6],
                "comparisonValue": row[7]
            },
            "type" : row[5] ,
            "row" : index+3
        };
        if ( goal["type"] == "VISIT_TIME_ON_SITE" ) delete goal["visitNumPagesDetails"];
        else delete goal["visitTimeOnSiteDetails"];
        goals.push( goal );
    });
    return goals;
}

function createGoals(){
    var sheetData = GOALD_SHEET.getRange( 3, 1, GOALD_SHEET.getLastRow(), 11 ).getValues();
    var goals = maptoGoalObject( sheetData );
    goals.forEach( function( goal ){
        postGoal( goal, "post" );        
    });
    
}

function sendRemarketingAudiance ( audiance, index, status ){

    var audianceId = SHEET.getRange( index+3, status+2).getValue();
    var url = API_EMD_POINT+'/management/accounts/'+audiance["accountId"]+'/webproperties/'+audiance["webPropertyId"]+'/remarketingAudiences/'+audianceId;
    Logger.log( url );
    try {
        var type = ( audianceId !== '') ? 'put' : 'post';
        var data = JSON.parse ( request( url ).send( audiance, type ) );
        SHEET.getRange( index+3, 1, 1, LAST_COLUMN ).setBackground("#abcca1");
        SHEET.getRange( index+3, status+1).setValue( "Created" );
        SHEET.getRange( index+3, status+2).setValue( data["id"] );
    } catch ( error ) {
        SHEET.getRange( index+3, 1, 1, LAST_COLUMN ).setBackground("#bf8080");
        SHEET.getRange( index+3, status+1).setValue("Not Created");
        Logger.log( error );
    }
}

function makeSegment( row ){
    var first = 0;
    return Object.keys( CONDITIONS ).reduce( function ( acc, condition, index ){
        var valueIndex = (CONDITIONS_START_COLUMN - 2) + ( (index+1) * 3 ) ;
        if ( row[ valueIndex ] === "" ) return acc + '';
        var OPERATORS = ( CONDITIONS_TYPES[ condition ] === "string" ) ? OPERATORS_STRING : OPERATORS_NUMBER ;
        first++;
        return acc +
            (( index !== 0 && first !== 1 ) ? COMBINING_CONDITIONS[ row[valueIndex-2]] : '') +
            (( condition.indexOf("Completions") >= 0 ) ? row[ valueIndex + 1 ] : CONDITIONS[ condition ]) +
            OPERATORS [ row[ valueIndex-1 ] ] +
            row[ valueIndex ] ;
    }, 'users::condition::');
}

function getAccountsLinkSheet ( row, adwardsLinkIndex, analyticsLinkIndex ){
    var linkedAdAccounts = [];
    if ( row[ adwardsLinkIndex ] !== "" ) {
        linkedAdAccounts.push({
            "type" : "ADWORDS_LINKS",
            "linkedAccountId" : row[ adwardsLinkIndex ].split('\n')[1]
        });
    }
    if ( row[ analyticsLinkIndex ] !== "" ) {
        linkedAdAccounts.push({
            "type": "ANALYTICS",
            "kind": "analytics#linkedForeignAccount",
            "webPropertyId": row[1].split('\n')[1],
            "accountId": row[0].split('\n')[1]
        });
    }
    return linkedAdAccounts;
}

function createRemarketingAudiances(){
    var lastRow = SHEET.getLastRow();
    var lastColumn = SHEET.getLastColumn();
    var data = SHEET.getRange( 3, 1, lastRow, lastColumn ).getValues();

    data.forEach( function ( row, index ){
        var adwardsLinkIndex = 5 + ( Object.keys( CONDITIONS ).length * 3 ) + 2;
        var analyticsLinkIndex = 5 + ( Object.keys( CONDITIONS ).length * 3 ) + 3;
        var status = 5 + ( Object.keys( CONDITIONS ).length * 3 ) + 4;
        if ( row[status] === "Created" || row[0]==="" ) return;
        Logger.log('time : ' + index);
        if (
            row[ adwardsLinkIndex ] == "" &&
            row[ analyticsLinkIndex ] == ""
        ){
            SHEET.getRange( index+2, 1, 1, lastColumn ).setBackground("#ed7e7e");
            SHEET.getRange( index+2, status+1).setValue("Not Created");
            return;
        }
        var segment = makeSegment( row );
        var linkedAdAccounts = getAccountsLinkSheet( row, adwardsLinkIndex, analyticsLinkIndex );
        var audiance = buildAudiance( row, linkedAdAccounts, segment );

        Logger.log( JSON.stringify( audiance, null, 2) );
        sendRemarketingAudiance( audiance, index, status );
    });
}

function buildAudiance( row, linkedAdAccounts, segment ){
    return {
        "accountId" : row[0].split('\n')[1],
        "webPropertyId": row[1].split('\n')[1],
        "name" : row[3],
        "audienceType" : 'SIMPLE',
        "linkedAdAccounts" : linkedAdAccounts,
        "linkedViews" : [
            row[2].split('\n')[1]
        ],
        "audienceDefinition" : {
            "includeConditions" : {
                "kind" : "analytics#includeConditions",
                "membershipDurationDays" : row[4],
                "daysToLookBack" : row[5],
                "segment" : segment,
                "isSmartList" : false
            }
        }
    };
}

function itemNotEmpty( item ){
    return (
        typeof item !== 'undefined' &&
        item !== '' &&
        item !== "''''" &&
        item !== null &&
        item != ','
    );
}

function include( subStr ){
    return function( str ){ return str.indexOf( subStr ) >= 0 };
}

function setUpTheOtherAudiencesSheet(){
    clearSheet( OTHER_SHEET, 3 );
    OTHER_SHEET.getRange( 3 , 1, OTHER_SHEET.getMaxRows(), OTHER_SHEET.getMaxColumns() ).setHorizontalAlignment("center");
    var accounts = getAccounts();

    var sheetAudiences = SHEET.getRange('AO3:AO').getValues()
    .map( function( item ){ return item[0].toString().trim(); })
    .filter( itemNotEmpty );

    var data = getAccountsSetup( accounts );
    var allAudiences = data['audiances'];
    var audiences = [];
    Object.keys( allAudiences ).forEach( function( webPropertyId ){
        var newAduences = allAudiences[ webPropertyId ].filter( function( audiance ){ return ( sheetAudiences.indexOf( audiance.id ) < 0 ); });
        audiences = audiences.concat( newAduences );
    });
    audiences.forEach( function( audiance, index ){
        var accountName = DATA_SHEET.getRange('A1:A').getValues()
        .map( function( item ){ return item[ 0 ]; })
        .filter( include( audiance.accountId ) )[ 0 ]
        .split('\n')[ 0 ];
        
        var webPropertyName = DATA_SHEET.getRange('B1:B').getValues()
        .map( function( item ){ return item[ 0 ]; })
        .filter( include( audiance.webPropertyId ) )[ 0 ]
        .split('\n')[ 0 ];

        OTHER_SHEET.getRange( index + 3, 1 ).setValue( accountName + '\n' +  audiance.accountId );
        OTHER_SHEET.getRange( index + 3, 2 ).setValue( webPropertyName + '\n' + audiance.webPropertyId );
        OTHER_SHEET.getRange( index + 3, 4 ).setValue( audiance.id );
        OTHER_SHEET.getRange( index + 3, 5 ).setValue( audiance.name );
        OTHER_SHEET.getRange( index + 3, 6 ).setValue( audiance['audienceDefinition']['includeConditions']['membershipDurationDays'] || 'Not Set' );
        OTHER_SHEET.getRange( index + 3, 7 ).setValue( audiance['audienceDefinition']['includeConditions']['daysToLookBack'] || 'Not Set' );
    });
}

function deleteOtherSheetAudiences(){
    var idsColumn = 'D';
    var deleteColumn = 'H';
    deleteRemarketingAudience( idsColumn, deleteColumn, OTHER_SHEET, 9, 'I' );
}

function getAccountsSetup( accounts ){
    var webproperties = {};
    var views = {};
    var adwardsLinks = {};
    var audiances = {};
    accounts.forEach(function ( account ) {
        webproperties[ account.id ] = getWebProperties( account.id );
        webproperties[ account.id ].forEach( function( webproperty ){
            views[ webproperty.id ] = getViews( account.id, webproperty.id );
            adwardsLinks[ webproperty.id ] = getAdwardsAccounts( account.id, webproperty.id );
            audiances[ webproperty.id ] = getAudiences( account.id, webproperty.id );
        });
    });
    return {
        webproperties : webproperties,
        views         : views,
        adwardsLinks  : adwardsLinks,
        audiances     : audiances
    };
}

function Main (){
    // var accounts = getAccounts();
    // var data = getAccountsSetup( accounts );

    // var webproperties = data[ "webproperties" ];
    // var views         = data[ "views" ];
    // var adwardsLinks  = data[ "adwardsLinks" ];
    var currentSheet = SS.getActiveSheet();
    // setTheDataSheet( accounts, webproperties, views, adwardsLinks );
    initialazeTemplate( currentSheet );
}
