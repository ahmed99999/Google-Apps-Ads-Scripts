//---------- Basic Settings ------------
 
 
// Includes campaigns which contain these terms in their name. Please separate them with a comma.
var CAMPAIGN_NAME_CONTAINS = [];
 
 
// Name of the Account
var ACCOUNT_NAME = 'Galperino';
 
 
//URL-Level for check
var URL_LEVEL = 'Keyword'; // ads or keyword
 
 
// This is the specific text (or texts) to search for
// on the page that indicates the item
// is out of stock. If ANY of these match the html
// on the page, the item is considered "out of stock"
 
var OUT_OF_STOCK_TRIGGER = [  ];
var IN_STOCK_TRIGGER = [ 'Artikel auf Lager' ];
var IGNORE_TRIGGER = [];
 
 
//E-Mail to send & E-Mail Name
var TO = [ 'c.wiemer@pa.ag' , 'stefan.hahn@galperino.de'];
var SUBJECT = 'Nicht auf Lager Check';
 
 
//Label Name
var OUT_OF_STOCK_LABEL = 'Nicht auf Lager';
var HTTP_4XX_LABEL = 'HTTP_4XX';
 
 
//--------- Advanced Settings -----------
 
var SEPARATOR = ';';
var STRIP_QUERY_STRING = false; // set this to false if the stuff that comes after the question mark is important
var WRAPPED_URLS = false; // set this to true if you use a 3rd party like Marin or Kenshoo for managing you account
 
// maps findings to actions
var LOGIC = {
    IN_STOCK        : 'ENABLE',
    OUT_OF_STOCK    : 'PAUSE',
    IGNORE          : 'IGNORE',
    ERROR           : 'IGNORE',
    HTTP_4XX        : 'LABEL_4XX',
    BOTH            : 'IGNORE',
    NOTHING         : 'IGNORE',
};
 
var ACTIONS = {
    ENABLE : { // remove bad labels and enable keyword
        labelConditions : [ OUT_OF_STOCK_LABEL, HTTP_4XX_LABEL ],
        applyLabel  : [],
        removeLabel : [ OUT_OF_STOCK_LABEL, HTTP_4XX_LABEL ],
        status      : 'enable',
    },
    PAUSE           : {
        applyLabel  : [ OUT_OF_STOCK_LABEL ],
        removeLabel : [ HTTP_4XX_LABEL ],
        status      : 'pause',
    },
    IGNORE          : { // do nothing
        applyLabel  : [],
        removeLabel : [ HTTP_4XX_LABEL ],
    },
    LABEL_4XX       : {
        applyLabel  : [ HTTP_4XX_LABEL ],
        removeLabel : [ OUT_OF_STOCK_LABEL ],
        status      : 'pause'
    }
};
 
// ------------ CONSTANTS ---------------------
var FOUND = {
    IN_STOCK        : 'IN_STOCK', // Only In-Stock-Trigger found on website
    OUT_OF_STOCK    : 'OUT_OF_STOCK', // Only Out-Of-Stock-Trigger found on website
    IGNORE          : 'IGNORE', // An Ignore-Trigger found on website
    ERROR           : 'ERROR', // Error occoured during fetch
    HTTP_4XX        : 'HTTP_4XX', // 404
    BOTH            : 'BOTH', // Both Trigger-Types (in- and out-of-stock) found on website
    NOTHING         : 'NOTHING', // No Trigger found
};
 
 
function or( bool1, bool2 ){
    return bool1 || bool2;
}
 
function check( url ){
    var response;
    try{
        response = UrlFetchApp.fetch( url, { muteHttpExceptions : true } );
    }catch( error ){
        Logger.log( 'Error during fetch: ' + error );
        return FOUND.ERROR;
    }
    var responseCode = response.getResponseCode();
    var html = response.getContentText();
    if( responseCode >= 400 && responseCode < 500 ){
        return FOUND.HTTP_4XX;
    }
    if( responseCode < 200 || responseCode >= 500 ){
        return FOUND.ERROR;
    }
    //html = html.split( /<[^>]*>/ ).join( ' ' );
    //Logger.log( url + ': ' + html );
    //throw new Error( 'stop' );
     
    var foundIgnore = IGNORE_TRIGGER.map( function( text ){
        return html.indexOf( text ) >= 0;
    }).reduce( or, false );
     
    if( foundIgnore ){
        return FOUND.IGNORE;
    }
     
    var foundOutOfStock = OUT_OF_STOCK_TRIGGER.map( function( text ){
        return html.indexOf( text ) >= 0;
    }).reduce( or, false );
     
    var foundInStock = IN_STOCK_TRIGGER.map( function( text ){
        return html.indexOf( text ) >= 0;
    }).reduce( or, false );
     
    if( foundOutOfStock && foundInStock ){
        return FOUND.BOTH;
    }
    if( foundOutOfStock ){
        return FOUND.OUT_OF_STOCK;
    }
    if( foundInStock ){
        return FOUND.IN_STOCK;
    }
    return FOUND.NOTHING;
}
 
function findLabel( labelName ){
    var labelSelector = AdWordsApp.labels()
        .withCondition('Name = "' + labelName + '"');
     
    var labelIterator = labelSelector.get();
    if( labelIterator.hasNext() ){
        return labelIterator.next();
    }
}
 
function createLabel( labelName ){
    var label = findLabel( labelName );
    if( ! label ){
        AdWordsApp.createLabel( labelName );
        return findLabel( labelName );
    }else{
        return label;
    }
}
 
function iteratorToList( iter ){
    var list = [];
    while( iter.hasNext() ){
        list.push( iter.next() );
    }
    return list;
}
 
function apply( item, arg, arg2 ){
    if( Array.isArray( arg ) ){
        return deepApply( arg )( item );
    }
    if( typeof arg == 'function' ){
        if( typeof arg2 != 'undefined' ){
            return arg( item, arg2 );
        }
        return arg( item );
    }
    if( typeof item[ arg ] == 'function' ){
        if( typeof arg2 != 'undefined' ){
            return arg[ arg ]( arg2 );
        }
        return item[ arg ]();
    }
    if( typeof item[ arg ] != 'undefined' ){
        return item[ arg ];
    }
    if( typeof arg[ item ] != 'undefined' ){
        return arg[ item ];
    }
    throw new Error( 'apply() can\'t determine what to do with ' + item + ' and ' + arg );
}
 
function property(){
    var args = Array.prototype.slice.call( arguments );
    var f = function( item ){
        // do NOT use reduce here, because apply will interpret the third argument :(
        var res = item;
        args.forEach( function( arg ){ res = apply( res, arg ) } );
        return res;
    };
    f.name1 = args.join( '_' ); // this improves groupBy() output
    f.equals = function( value ){
        return function( item ){
            return f( item ) == value;
        }
    };
    f.eq = f.equals;
    f.lt = function( value ){
        return function( item ){
            return f( item ) < value;
        }
    };
    f.lessThan = f.lt;
    f.le = function( value ){
        return function( item ){
            return f( item ) <= value;
        }
    };
    f.gt = function( value ){
        return function( item ){
            return f( item ) > value;
        }
    };
    f.endsWith = function( value ){
        return function( item ){
            var x = f( item );
            return x.indexOf( value ) == x.length - value.length;
        }
    };
    f.isEmpty = function(){
        return function( item ){
            var x = f( item );
            return x == '';
        }
    };
    f.isNotEmpty = function(){
        return function( item ){
            var x = f( item );
            return x != '';
        }
    };
    f.isDefined = function(){
        return function( item ){
            var x = f( item );
            return typeof x != 'undefined';
        }
    }
    return f;
}
 
function main() {
    createLabel( OUT_OF_STOCK_LABEL );
    createLabel( HTTP_4XX_LABEL );
 
    /*
    var res = check( 'https://monoqi.com/de/trinkgefaesse/2er-set-becher-rosa/bloomingville/mq000143798-10/p299238.html' );
     
    Logger.log( res );
    return;
    */
     
    var reporting = [];
    var actionsNames = {};
    var checkResults = {};
    var iter = buildSelector().get();
     
    Logger.log( 'Found ' + iter.totalNumEntities() + ' keywords in current campaigns.' );
    var countHasUrl = 0;
    var countUniqueUrls = 0;
    var statusChange = {
        enable : 0,
        pause : 0,
    };

    var labeledAdGroupIds = {};
    labeledAdGroupIds[ OUT_OF_STOCK_LABEL ] =
        iteratorToList( findLabel( OUT_OF_STOCK_LABEL ).adGroups().withCondition( 'AdGroupStatus IN [ ENABLED, PAUSED ]' ).get() )
        .map( property( 'getId' ) )
    ;
    Logger.log( labeledAdGroupIds[ OUT_OF_STOCK_LABEL ].length + ' ad groups labeled as "out of stock" found' );
     
    labeledAdGroupIds[ HTTP_4XX_LABEL ] =
        iteratorToList( findLabel( HTTP_4XX_LABEL ).adGroups().withCondition( 'AdGroupStatus IN [ ENABLED, PAUSED ]' ).get() )
        .map( property( 'getId' ) )
    ;
    Logger.log( labeledAdGroupIds[ HTTP_4XX_LABEL ].length + ' ad groups labeled as "4xx" found' );
     
    while( iter.hasNext() ){
        var entity = iter.next(); // keyword
         
        var url = entity.urls().getFinalUrl();
        if( !url ){
            // skip keywords without url
            continue;
        }
        url = cleanUrl( url );
        countHasUrl++;
 
        if( typeof actionsNames[ url ] == 'undefined' ){
            checkResults[ url ] = check( url );
            var actionName = LOGIC[ checkResults[ url ] ];
            actionsNames[ url ] = actionName;
            countUniqueUrls++;
        }
        var adGroupName = entity.getAdGroup().getName();
        var adGroupId = entity.getAdGroup().getId();
        var actionName = actionsNames[ url ];
        var action = ACTIONS[ actionName ];
         
        if( action.labelConditions && action.labelConditions.length > 0 ){
            var atLeastOneSpecifiedLabelFound =
                action.labelConditions.reduce( function( boolSoFar, label ){
                    return boolSoFar || labeledAdGroupIds[ label ].indexOf( adGroupId ) >= 0;
            }, false );
             
            if( !atLeastOneSpecifiedLabelFound ){
                //Logger.log( 'action condition is not met. No labels found for "' + adGroupName
                // + '" out of [' + action.labelConditions + ']' );
                continue;
            }  
        }
         
        var statusBefore = entity.getAdGroup().isPaused() ? 'pause' : 'enable';
         
        if( action.status ){
            entity.getAdGroup()[ action.status ]();
        }
         
        action[ 'applyLabel' ].forEach( function( label ){
            if( labeledAdGroupIds[ label ].indexOf( adGroupId ) == 0 ){
                entity.getAdGroup().applyLabel( label );
            }
        });
        action[ 'removeLabel' ].forEach( function( label ){
            if( labeledAdGroupIds[ label ].indexOf( adGroupId ) != 0 ){
                entity.getAdGroup().removeLabel( label );
            }
        });
         
        if( action.status && statusBefore != action.status ){
            var row = entity.getCampaign().getName()
                + SEPARATOR + entity.getAdGroup().getName()
                + SEPARATOR + actionName;
            reporting.push( row );
            Logger.log( checkResults[ url ] + ' -> ' + actionName + ' ' + adGroupName + ': ' + url );
            statusChange[ action.status ]++;
        }
    }
    Logger.log( countHasUrl + ' keywords with url found' );
    Logger.log( countUniqueUrls + ' unique urls found' );
    Logger.log( statusChange.enable + ' ad groups enabled' );
    Logger.log( statusChange.pause + ' ad groups paused' );
     
     
    if( reporting.length > 0 ){
        attachment = [ 'Kampagne', 'Anzeigengruppe', 'Status' ].join( SEPARATOR ) + '\n' + reporting.join( '\n' );
        Logger.log( attachment );
         
        if( AdWordsApp.getExecutionInfo().isPreview() ){
            return;
        }
        var emailBody = ''
            + statusChange.enable + ' ad groups enabled' + '\n'
            + statusChange.pause + ' ad groups paused' + '';
         
        TO.forEach( function( recipientEmail ){
            MailApp.sendEmail(
                recipientEmail,
                ACCOUNT_NAME + ' ' + SUBJECT + ' ' + _getDateString(),
                emailBody,
                {
                    attachments: [
                        Utilities.newBlob(
                            attachment,
                            'text/csv',
                            ACCOUNT_NAME + '_' + _getDateString() + '.csv'
                        )
                    ]
                }
            );
        });
    }else{
        Logger.log( 'nothing to report' );
    }
}
 
// format todays date
function _getDateString() {
    return Utilities.formatDate( ( new Date() ), AdWordsApp.currentAccount().getTimeZone(), 'yyyy-MM-dd' );
}
  
function cleanUrl( url ){
    if( WRAPPED_URLS ){
        url = url.substr( url.lastIndexOf( 'http' ) );
        var x = decodeURIComponent( url );
        if( url != x ){
            url = x;
        }
    }
    if( STRIP_QUERY_STRING ){
        if( url.indexOf( '?' ) >= 0 ){
            url = url.split( '?' )[ 0 ];
        }
    }
    if( url.indexOf( '{' ) >= 0 ){
        //Let's remove the value track parameters
        url = url.replace( /\{[0-9a-zA-Z]+\}/g, '' );
    }
    return url;
}
 
function convertToTimeZone( date, timeZone ){
    return new Date( Utilities.formatDate( date, timeZone, 'MMM dd,yyyy HH:mm:ss' ) );
}
 
function computeNow( timeZone ){
    var now = convertToTimeZone( new Date(), timeZone );
    now.setTime( now.getTime() );
    return now;
}
 
function currentItems( items, currentPart, outOf, orderBy ){
    if( typeof orderBy != 'undefined' ){
        items.sort( function( a, b ){
            return apply( a, orderBy ) - apply( b, orderBy );
            /*
            if( typeof orderBy == 'function' ){
                return a[ orderBy ]() - b[ orderBy ]();
            }
            if( typeof orderBy == 'string' ){
                return a[ orderBy ] - b[ orderBy ];
            }
            */
            //return a.getId() - b.getId();
        });
    }
    var countItems = items.length;
   
    var result = items.filter( function( item, index ){
        return index >= Math.ceil( currentPart / outOf * countItems ) && index < ( currentPart + 1 ) / outOf * countItems;
    });
    return result;
}
 
function buildSelector(){
    var campaignSelector = AdWordsApp.campaigns().withCondition( 'CampaignStatus = ENABLED' );
    var campaigns = iteratorToList( campaignSelector.get() );
     
    var campaignParts = CAMPAIGN_NAME_CONTAINS.filter( property( 'length' ).gt( 0 ) );
     
    if( campaignParts.length > 0 ){ // this if is important
        campaigns = campaigns.filter( function( campaign ){
            return campaignParts.reduce( function( resultSoFar, nextNamePartToCheck ){
                return resultSoFar || campaign.getName().indexOf( nextNamePartToCheck ) >= 0;
            }, false );
        });
    }
     
    var now = computeNow( AdWordsApp.currentAccount().getTimeZone() );
    const HOURS_PER_DAY = 24;
    var currentPart = now.getHours();
     
    Logger.log( 'Current part is ' + currentPart + ' out of ' + HOURS_PER_DAY );
     
    var campaigns = currentItems(
        campaigns,
        currentPart,
        HOURS_PER_DAY,
        'getName'
    );
    var names = campaigns.map( property( 'getName' ) );
    Logger.log( 'campaigns for this hour: (' + names.length + ') : \n' + names.join( '\n' ) );
     
    var campaignIds = campaigns.map( property( 'getId' ) );
     
    var selector = AdWordsApp.keywords();
    //selector = selector.withCondition( 'CampaignStatus != DELETED' ).withCondition( 'AdGroupStatus != DELETED' );
    selector = selector.withCondition( 'CampaignId IN [' + campaignIds.join( ',' ) + ']' )
                       .withCondition( 'AdGroupStatus IN [ ENABLED, PAUSED ]' );
    //selector = selector.withCondition( 'AdGroupStatus = ENABLED' );
    return selector;
}