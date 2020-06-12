
var SHEETURL = 'https://docs.google.com/spreadsheets/d/12pjsdsp8rrZxpSSuaXip1DG-nH9KP2k6eWv2xithZro/edit#gid=2112824187';
var SHEET_NAME = 'Land + Stadt 90 Tage';

var SS = SpreadsheetApp.openByUrl( SHEETURL );
var SHEET = SS.getSheetByName( SHEET_NAME );

var API_EMD_POINT = "https://www.googleapis.com/analytics/v3";
var ACCOUNTS = ['peakace.de'];

function listAccounts() {
    var data = Analytics.Management.Accounts.list();
    var accounts = [];
    if (data.items && data.items.length) {
        accounts = data.items.filter( function ( account ){
            return ACCOUNTS.indexOf( account.name ) >= 0 ;
        });
    } else {
        Logger.log('No accounts found.');
    }
    return accounts;
}

// function listWebProperties( accountId ) {
//    return Analytics.Management.Webproperties.list( accountId )['items'];
    // if (webProperties.items && webProperties.items.length) {
    //     for (var i = 0; i < webProperties.items.length; i++) {
    //         var webProperty = webProperties.items[i];
    //         // Logger.log('\tWeb Property: name "%s", id "%s".', webProperty.name,
    //         // webProperty.id);

    //         // List profiles in the web property.
    //         listAudiances( accountId, webProperty.id );
    //     }
    // } else {
    //     Logger.log('\tNo web properties found.');
    // }
// }

function getAudiancesPerWebProperty( webPropertyId, accountId ){
    var url = API_EMD_POINT+'/management/accounts/'+accountId+'/webproperties/'+webPropertyId+'/remarketingAudiences';
    var accessToken = ScriptApp.getOAuthToken();
    var options = {
        'headers': {
            'Authorization': "Bearer " + accessToken
        }
    }
    var data = UrlFetchApp.fetch( url, options ).getContentText( 'UTF-8' );
    return JSON.parse ( data )['items'];
}

function listAudiances(){
    var accounts = listAccounts();
    var audiances = [];
    accounts.forEach( function( account ){
        var webProperties = Analytics.Management.Webproperties.list( account.id )['items'];
        webProperties.forEach( function ( webProperty ){
            audiances = audiances.concat( getAudiancesPerWebProperty(webProperty.id, account.id) );
        });
    });
    return audiances;
}

function addAudiance ( audu ){
    var accountId = '39598427';
    var webPropertyId = "UA-39598427-1";
    // var auds = Analytics.Management.RemarketingAudience.insert( audu, accountId, webPropertyId );
    // Logger.log( auds );
    var d = JSON.stringify ( audu );
    var url = API_EMD_POINT+'/management/accounts/'+accountId+'/webproperties/'+webPropertyId+'/remarketingAudiences';
    var accessToken = ScriptApp.getOAuthToken();
    var options = {
        'method' : 'post',
        'contentType':'application/json',
        'headers': {
            'Authorization': "Bearer " + accessToken
        },
        'payload' : d,
        // 'muteHttpExceptions': true 
    }
    var data = UrlFetchApp.fetch( url, options ).getContentText( 'UTF-8' );
    Logger.log( data );
}

function buildAudiance ( sheetRow ){

    return {
        "accountId" : "",
        "webPropertyId" :"",
        "recource" : {
            "name" : "",
            
        }
    };
}

function Main(){
    var audu = {
        "description": "new Testing the API 88",
        "audienceDefinition": {
          "includeConditions": {
            "kind": "analytics#includeConditions",
            "segment": "sessions::condition::ga:pagePath=~.*job.*;ga:pagePath=~.*seo.*|.*content.*;perHit::ga:goal14Completions<1",
            "membershipDurationDays": 180,
            "isSmartList": false
          }
        },
        "linkedViews": [
          "70594610"
        ],
        "audienceType": "SIMPLE",
        "webPropertyId": "UA-39598427-1",
        "accountId": "39598427",
        "name": "new api test Ahmed 88",
        "linkedAdAccounts": [
          {
              "type": "ADWORDS_LINKS",
              "id": "47Esejn8S-uUt3BPsTos9A",
              "linkedAccountId": "369-406-6974"
          },
          {
            "type": "ANALYTICS",
            "kind": "analytics#linkedForeignAccount",
            "webPropertyId": "UA-39598427-1",
            "accountId": "39598427"
          }
        ]
    }
    var audiances = listAudiances();
    Logger.log( audiances.length );
    addAudiance( audu );
    // var audiance = audiances.filter( function ( aud ){
    //     return aud["name"] === "All SEO & Content Job User non Online Bewerbung - 6 Monate";
    // })[0];

    // Logger.log( '\n' + JSON.stringify( audiance, null, 2 ) );
}