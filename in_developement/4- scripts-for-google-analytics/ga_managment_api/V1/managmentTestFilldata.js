
var SS = SpreadsheetApp.getActive();

var SHEET_NAME = 'Sheet1';
var DATA_SHEET_NAME = 'Account Data';

var SHEET = SS.getSheetByName( SHEET_NAME );
var DATA_SHEET = SS.getSheetByName( DATA_SHEET_NAME ) || SS.insertSheet( DATA_SHEET_NAME );

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
    var sheetName = activeCell.getSheet().getName();
    var column = activeCell.getColumn();
    var row = activeCell.getRow();
    var value = activeCell.getValue();
    if ( sheetName !== SHEET_NAME || column < 1 || column > 2 || value === '' ) return;

    var options = DATA_SHEET.getRange( 1, 1, DATA_SHEET.getLastRow(), 4 ).getValues();
    var filteredList = options.filter( function( list ){
        return list[ column - 1 ] === value;
    });

    polulateAccountsDataIntoTomplate( column, row, filteredList );
}

function polulateAccountsDataIntoTomplate( column, row ,list ){
    var respose = {
        1 : function(){
            var propertiesList = list.map( function( item ){ return item[1]; });
            var viewsList = list.map( function( item ){ return item[2]; });
            buildDropDownList( propertiesList, SHEET.getRange( row, column+1 ) );
            buildDropDownList( viewsList, SHEET.getRange( row, column+2 ) );
        },
        2 : function(){
            var viewsList = list.map( function( item ){ return item[2]; });
            // var propertiesList = [''].concat( list.map( function( item ){ return item[1]; }) );
            var adwardsList = [''].concat( list.filter( function( item ){ return item[3] !== '';} ).map( function( item ){ return item[3];} ) );
            
            // var analyticsColumn = column + 4 + ( Object.keys( CONDITIONS ).length * 3 ) + 2;
            var adwardsColumn   = column + 4 + ( Object.keys( CONDITIONS ).length * 3 ) + 2;

            buildDropDownList( viewsList, SHEET.getRange( row, column+1 ) );
            buildDropDownList( adwardsList, SHEET.getRange( row, adwardsColumn ) );
            // buildDropDownList( propertiesList, SHEET.getRange( row, analyticsColumn ));
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

function setTheDataSheet( accounts, webproperties, views, adwardsLinks ){
    clearSheet( DATA_SHEET );
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
    SHEET.getRange('A1:F1').setValues([DEFAULT_VALUES]);
    var column = CONDITIONS_START_COLUMN; // start column of the conditions headers

    Object.keys( CONDITIONS ).forEach( function( condition ){
        SHEET.getRange( 1, column ).setValue( condition );
        SHEET.getRange( 1, column+2 ).setValue( '' );
        var mergeColumns = ( condition === "Goal XX Completions" ) ? 4 : 3;
        SHEET.getRange( 1, column, 1, mergeColumns ).merge().setNote( CONDITIONS_NOTES[ condition ] );
        SHEET.getRange( 2, column, SHEET.getMaxRows(), mergeColumns )
             .setBorder( null, true, null, true, false, false, "black", null );
        column+=3;
    });
    column++;
    SHEET.getRange( 1, column, 1, 3 ).setValues([['Adwards Link', 'Status', 'Audiance Id']]);
    SHEET.getRange( 1, 1, 1, SHEET.getLastColumn() )
         .setHorizontalAlignment("center")
         .setBorder( true, true, true, true, true, true, "black", null );
    SHEET.setFrozenRows(1);
}

function initialazeConditionsBodies(){
    var column = CONDITIONS_START_COLUMN;
    Object.keys( CONDITIONS ).forEach( function( condition ){
        buildDropDownList( Object.keys( COMBINING_CONDITIONS ), SHEET.getRange( 2, column, SHEET.getMaxRows(), 1 ) );
        var OPERATORS = ( CONDITIONS_TYPES[ condition ] === "string" ) ? OPERATORS_STRING : OPERATORS_NUMBER ;
        buildDropDownList( Object.keys( OPERATORS ), SHEET.getRange( 2, column+1, SHEET.getMaxRows(), 1 ) );
        if ( condition === "Goal XX Completions" ){
            var goalList = Array.apply( null, Array(21) ).map( Number.call, Number );
            goalList.shift();
            buildDropDownList( goalList.map( surround( "ga:goal", "Completions" ) ), SHEET.getRange( 2, column+3, SHEET.getMaxRows(), 1 ) );
            column++;
        }
        column+=3;
    });

    buildDropDownList( [], SHEET.getRange( 2, column, SHEET.getMaxRows(), 1 ) );
    // buildDropDownList( [], SHEET.getRange( 2, column+1, SHEET.getMaxRows(), 1 ) );
}

function initialazeTemplate(){
    clearSheet( SHEET );
    initialazeHeaders();
    initialazeConditionsBodies();
    var accountsList = DATA_SHEET.getRange( 1, 1, DATA_SHEET.getLastRow() ).getValues();
    var lists = accountsList.map( function( list ){ return list[0]; });
    var accounts = [];
    lists.forEach( function( item ){
        if ( accounts.indexOf( item ) < 0 ) {
            accounts.push( item );
        }
    });

    buildDropDownList( [ 7, 14, 30 ], SHEET.getRange( 2, 6, SHEET.getMaxRows(), 1 ) );
    buildDropDownList( accounts, SHEET.getRange('A2:A') );
    buildDropDownList( [], SHEET.getRange('B2:B') );
    buildDropDownList( [], SHEET.getRange('C2:C') );
}

function sendRemarketingAudiance ( audiance, index, status ){
    var lastColumn = SHEET.getLastColumn();
    var audianceId = SHEET.getRange( index+2, status+2).getValue();
    var url = API_EMD_POINT+'/management/accounts/'+audiance["accountId"]+'/webproperties/'+audiance["webPropertyId"]+'/remarketingAudiences/'+audianceId;
    Logger.log( url );
    try {
        var type = ( audianceId !== '') ? 'put' : 'post';
        var data = JSON.parse ( request( url ).send( audiance, type ) );
        SHEET.getRange( index+2, 1, 1, lastColumn ).setBackground("#abcca1");
        SHEET.getRange( index+2, status+1).setValue( "Created" );
        SHEET.getRange( index+2, status+2).setValue( data["id"] );
    } catch ( error ) {
        SHEET.getRange( index+2, 1, 1, lastColumn ).setBackground("#bf8080");
        SHEET.getRange( index+2, status+1).setValue("Not Created");
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

function getAccountsLinkSheet ( row, adwardsLinkIndex ){
    var linkedAdAccounts = [];
    if ( row[ adwardsLinkIndex ] !== "" ) {
        linkedAdAccounts.push({
            "type" : "ADWORDS_LINKS",
            "linkedAccountId" : row[ adwardsLinkIndex ].split('\n')[1]
        });
    }
    // if ( row[ analyticsLinkIndex ] !== "" ) {
    //     linkedAdAccounts.push({
    //         "type": "ANALYTICS",
    //         "kind": "analytics#linkedForeignAccount",
    //         "webPropertyId": row[1].split('\n')[1],
    //         "accountId": row[0].split('\n')[1]
    //     });
    // }
    return linkedAdAccounts;
}

function createRemarketingAudiances(){
    var lastRow = SHEET.getLastRow();
    var lastColumn = SHEET.getLastColumn();
    var data = SHEET.getRange( 2, 1, lastRow, lastColumn ).getValues();

    data.forEach( function ( row, index ){
        var adwardsLinkIndex = 5 + ( Object.keys( CONDITIONS ).length * 3 ) + 2;
        // var analyticsLinkIndex = 5 + ( Object.keys( CONDITIONS ).length * 3 ) + 2;
        var status = 5 + ( Object.keys( CONDITIONS ).length * 3 ) + 3;
        if ( row[status] === "Created" || row[0]==="" ) return;
        Logger.log('time : ' + index);
        if (
            row[ adwardsLinkIndex ] == "" //&&
            // row[ analyticsLinkIndex ] == ""
            ){
                SHEET.getRange( index+2, 1, 1, lastColumn ).setBackground("#ed7e7e");
                SHEET.getRange( index+2, status+1).setValue("Not Created");
                return;
        }
        var segment = makeSegment( row );
        var linkedAdAccounts = getAccountsLinkSheet( row, adwardsLinkIndex );
        
        var audiance = {
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
        Logger.log( JSON.stringify( audiance, null, 2) );
        sendRemarketingAudiance( audiance, index, status );
    });
}

function Main (){
    var accounts = getAccounts();

    var webproperties = {};
    var views = {};
    var adwardsLinks = {};
    accounts.forEach(function ( account ) {
        webproperties[ account.id ] = getWebProperties( account.id );
        webproperties[ account.id ].forEach( function( webproperty ){
            views[ webproperty.id ] = getViews( account.id, webproperty.id );
            adwardsLinks[ webproperty.id ] = getAdwardsAccounts( account.id, webproperty.id );
        });
    });

    setTheDataSheet( accounts, webproperties, views, adwardsLinks );
    initialazeTemplate();

    // Analytics.Management.Accounts.list();
    // Analytics.Management.Webproperties.list();
    // Analytics.Management.RemarketingAudience.list();
    // Analytics.Management.RemarketingAudience.insert();
    
    // var accessToken = ScriptApp.getOAuthToken();
}