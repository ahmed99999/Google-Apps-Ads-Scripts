

// --------------------------------------------------- SETTINGD --------------------------------------------------------------

// WEEKS is where you put the first date of the week in the following format : 
//        month/day/year   : Example : 07/25/2019 = 25th of July. 2019
var WEEKS = [ '06/27/2019', '07/07/2019' ];
var SHEETURL = 'https://docs.google.com/spreadsheets/d/17hIPDeRPg98I7sYSiyMAGnFN1db_3h91yWcHmslTgOs/edit#gid=0';
var SHEET_NAME = 'Sheet1';
var FENCE_SOURCE_CAMPAIGN_NAMES_CONTAIN = [];
var FENCE_SOURCE_CAMPAIGN_NAMES_DO_NOT_CONTAIN = ['Testing' , 'Landing Page', 'Display', 'Nachhil', 'TrueView'];
var CAMPAIGN_STATUS_IN = [ 'ENABLED' ];



// ------------------------------------------------ END OF SETTINGS ----------------------------------------------------------

var ACCOUNTS = [];

// ------------------------------------------------ CONSTANTS ----------------------------------------------------------------

var ONE_DAY = 1000 * 60 * 60 * 24;
var ONE_WEEK = ONE_DAY * 7;
var METRICS = [ 'AveragePosition', 'Cost', 'Ctr', 'Clicks', 'AverageCpc', 'Impressions', 'Conversions', 'ConversionRate' ];

var SS = SpreadsheetApp.openByUrl( SHEETURL );
var SHEET = SS.getSheetByName( SHEET_NAME );

// ---------------------------------------------- END OF CONSTANTS -----------------------------------------------------------

if (!String.prototype.padStart) {
    String.prototype.padStart = function padStart(targetLength, padString) {
        targetLength = targetLength >> 0; //truncate if number, or convert non-number to 0;
        padString = String(typeof padString !== 'undefined' ? padString : ' ');
        if (this.length >= targetLength) {
            return String(this);
        } else {
            targetLength = targetLength - this.length;
            if (targetLength > padString.length) {
                padString += padString.repeat(targetLength / padString.length); //append to original to ensure we are longer than needed
            }
            return padString.slice(0, targetLength) + String(this);
        }
    };
}

function surround( prefix, postfix ){
	return function( str ){ return prefix + str + postfix };
}

function property( prop ){
	return function( item ){
		if( typeof item[ prop ] == 'function' ){
			return item[ prop ]();
		}
		return item[ prop ];
	};
}

function toList( iterator ){
	var list = [];
	while( iterator.hasNext() ){
		list.push( iterator.next() );
	}
	return list;
}

function formatDate( date, delimiter ){
	if( typeof delimiter === 'undefined' ){
		throw new Error( 'no delimiter supplied' );
	}
	
	var day = ( date.getDate() + '' ).padStart( 2, '0' );
	var month = ( ( date.getMonth() + 1 ) + '' ).padStart( 2, '0' );
	var year = date.getFullYear();

	return year + delimiter + month + delimiter + day;
}


var MccApp = MccApp || {
    select : function(){},
    accounts : function(){
        return {
            executeInParallel : function( processAccountFuncName, finalProcessingFunc, strParam ){
                var res = '' + this[ processAccountFuncName ]( strParam );
                // call processAccountFuncName - supply parameters based on strParam
                // use the return value from the processAccountFunc to build the argument for the finalProcessingFunc
                // call finalProcessingFunc
                var finalParam = {
                    getResults : function(){
                        return [ res ];
                    },
                }
                this[ finalProcessingFunc ]( finalParam );
            },
            withCondition : function( ignoreThisArg ){},
            get : function(){
                var accessed = false;
                return {
                    hasNext : function(){ return !accessed },
                    next 	: function(){ accessed = true; return AdWordsApp.currentAccount() },
                };
            },
        };
    },
};

function getSelectedAccounts() {
    var accountSelector = MccApp.accounts();
    
    if( ACCOUNTS.length !== 0 ) {
        accountSelector.withCondition( 'CustomerDescriptiveName IN [ "' + ACCOUNTS.join( '","' ) + '" ] ' );
    }

    return toList( accountSelector.get() );
}

function getWeekNumber( date ) {
    var newDate = new Date( date );
    var year = newDate.getFullYear();
    var firstDayOfYear = new Date ('01/01/' + year);
    return Math.ceil( ( newDate.getTime() - firstDayOfYear.getTime() ) / (ONE_DAY * 7) );
}

function toPersentage ( value1, value2){
    var newValue1 = Number( value1.replace('%','').replace(',','') );
    var newValue2 = Number( value2.replace('%','').replace(',','') );
    if ( newValue2 < 0.1  && newValue1 > 0.1 ) return '100%';
    var precentage = Math.max( newValue1, 0.00001) / Math.max(newValue2, 0.00001) * 100;
    return (precentage - 100).toFixed(2) + '%';
}

function diffrence ( value1, value2 ){
    var result = Number( value1.replace('%','').replace(',','')) - Number( value2.replace('%','').replace(',',''));
    return ( value1.indexOf('%') >= 0 ) ? result.toFixed(2)+' %' : result.toFixed(2)+'' ;
}

function fillUpTheTitelsInSheet(){

    SHEET.getRange( 1, 1 ).setValue( 'CampaignName' );
    SHEET.getRange( 1, 2 ).setValue( 'Week' );
    SHEET.getRange( 1, 3 ).setValue( 'Week Number' );
    
    var index = 4;
    METRICS.forEach( function ( metric ){
        SHEET.getRange( 1, index ).setValue( metric );
        SHEET.getRange( 1, index + 1 ).setValue( metric +' 2018' );
        SHEET.getRange( 1, index + 2 ).setValue( metric +' (change)' );
        SHEET.getRange( 1, index + 3 ).setValue( metric +' (change %)' );
        index += 4;
    });
}

function clearSheet (){
    var range = SHEET.getRange( 1, 1, SHEET.getLastRow(), SHEET.getLastColumn() );
    range.clearContent();
}

function fillUpTheSheetWithData ( campaingsOfCurrentYear, campaingsOfLastYear ) {
    
    clearSheet();
    fillUpTheTitelsInSheet();

    var index = 2;
    WEEKS.forEach( function ( week ){
        var from = new Date( week );
        var key = week.replace( from.getFullYear(), '' );
        campaingsOfCurrentYear [ key ].forEach( function( campaing ){

            var campaingOfLastYear = campaingsOfLastYear[ key ].filter( function ( cmp ){
                return cmp['CampaignName'] === campaing['CampaignName'];
            })[0];

            SHEET.getRange( index, 1  ).setValue( campaing['CampaignName'] );
            SHEET.getRange( index, 2  ).setValue( week );
            SHEET.getRange( index, 3  ).setValue( getWeekNumber( week ) );

            var index2 = 4;
            METRICS.forEach( function ( metric ){
                SHEET.getRange( index, index2  ).setValue( campaing[ metric ] );
                SHEET.getRange( index, index2 + 1 ).setValue( campaingOfLastYear[ metric ] );               
                SHEET.getRange( index, index2 + 2 ).setValue( diffrence (campaing[ metric ], campaingOfLastYear[ metric ]) );
                SHEET.getRange( index, index2 + 3 ).setValue( toPersentage ( campaing[ metric ] ,campaingOfLastYear[ metric ] ) );
                index2 +=4;
            });
            index ++;
        });
    });
}

function sortSheet() {
    var range = SHEET.getRange( 2, 1, SHEET.getLastRow(), SHEET.getLastColumn() );
    var sortByRange = SHEET.getRange( 1, 1, 1, SHEET.getMaxColumns()).getValues()[0] ;
    return {
        by: function (){
            var sortList = [];
            for ( var index = 0; index < arguments.length; index++ ) {
                sortList.push(
                    {
                        column : sortByRange.indexOf( arguments[ index ]) + 1,
                        ascending: true
                    }
                );
            }
            range.sort(sortList);
        }
    };
}

function getCampaignNames( contains, doNotconatain, from, mccAccount ){
    var to = new Date ( from.getTime() + ONE_WEEK );
    var accounts = getSelectedAccounts();
    campaings = [];
    accounts.forEach( function( account ){
        MccApp.select( account );
        var conditions = contains.map( surround( 'CampaignName CONTAINS "', '"' ) )
        .concat( doNotconatain.map( surround( 'CampaignName DOES_NOT_CONTAIN "', '"' ) ) );

        var query = 'SELECT CampaignName, ' + METRICS.join(',') + ' ' +
                    'FROM CAMPAIGN_PERFORMANCE_REPORT ';

        query += ( conditions.length > 0 ) ? 'WHERE '+ conditions.join( ' AND ' ) : '';
        query += ( CAMPAIGN_STATUS_IN.length > 0 ) ? ' AND CampaignStatus IN [ ' + CAMPAIGN_STATUS_IN.join( ', ' ) + ' ] ' : '';
        query += ' DURING ' + formatDate( from, '' ) + ',' + formatDate( to, '' );
        Logger.log( query );
       
        campaings = campaings.concat( toList( AdWordsApp.report( query ).rows() ) );
    });
    MccApp.select( mccAccount );
    return campaings;
}

function main (){

    var mccAccount = AdWordsApp.currentAccount();

    var accounts = getSelectedAccounts();
    Logger.log( 'Accounts: ' + accounts.map( property( 'getName' ) ).join( ', ' ) );

    var campaingsPerWeek = {};
    var campaingsPerWeekLastYear = {};
    var weeksOfLastYear = WEEKS.map( function( date ){
        var dateList = date.split('/');
        var lastYear = Number( dateList[2] ) - 1 ; 
        dateList[2] = lastYear + ''; 
        return dateList.join('/');
    });

    WEEKS.forEach( function( startOfTheWeek ){
        var from = new Date ( startOfTheWeek );
        campaingsPerWeek[ startOfTheWeek.replace(from.getFullYear(), '') ] = getCampaignNames( FENCE_SOURCE_CAMPAIGN_NAMES_CONTAIN, FENCE_SOURCE_CAMPAIGN_NAMES_DO_NOT_CONTAIN, from, mccAccount );
    });

    weeksOfLastYear.forEach( function( startOfTheWeek ){
        var from = new Date ( startOfTheWeek );
        campaingsPerWeekLastYear[ startOfTheWeek.replace(from.getFullYear(), '') ] = getCampaignNames( FENCE_SOURCE_CAMPAIGN_NAMES_CONTAIN, FENCE_SOURCE_CAMPAIGN_NAMES_DO_NOT_CONTAIN, from, mccAccount );
    });

    fillUpTheSheetWithData( campaingsPerWeek, campaingsPerWeekLastYear );
    sortSheet().by( 'CampaignName', 'Week' );
}

