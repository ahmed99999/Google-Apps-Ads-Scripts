
function getChildProductGroups() {
    var root = AdsApp.shoppingCampaigns().get(); //|| { next : function(){ return;} });
    return root.next().ads().get();
}

function main() {
    // var childProductGroups = getChildProductGroups();
    // var everythingElseProductGroupFound = false;
    var products = ShoppingContent.Products.list('7844276');
    if ( products.resources ) {
        for (var i = 0; i < products.resources.length; i++) {
            Logger.log( products.resources[i] );
        }
    }
    // while ( childProductGroups.hasNext() ) {
    //     Logger.log( 'indsie Loop' );
    //     var childProductGroup = childProductGroups.next().getType();
    //     if ( childProductGroup.isOtherCase() ) {
    //         Logger.log("'Everything else' product group found. Type of the " +
    //                 "product group is %s and bid is %s.",
    //                 childProductGroup.getDimension(),
    //                 childProductGroup.getMaxCpc());
    //         everythingElseProductGroupFound = true;
    //         break;
    //     }
    //     Logger.log( childProductGroup );
    // }

    // if (!everythingElseProductGroupFound) {
    //     Logger.log("No 'Everything else' product group found under root " +
    //              "product group.");
    // }
    // var options = {
    //     'muteHttpExceptions': true
    // };
    // var response = UrlFetchApp.fetch("https://www.googleapis.com/content/v2/7844276/products/", options);
    // Logger.log(response.getContentText());
}

function main () {
    var url = 'https://e1-api.aws.kambicdn.com/offering/v2018/kambi/event/live/open.json';
    var options = {
        'method' :'GET',
        'muteHttpExceptions' :true
    };
    var response = UrlFetchApp.fetch( url, options );
    var data = response.getContentText();
    // Logger.log( data );

    var events = JSON.parse( data );
    var liveEvents = events['liveEvents'];
    // JSON.stringify( liveEvents, null, 2 )
    Logger.log( JSON.stringify( liveEvents[ 0 ], null, 2 ) );
}

var data = 	{
    "event": {
      "id": 1005221288,
      "name": "Balga FC - Perth AFC",
      "englishName": "Balga FC - Perth AFC",
      "homeName": "Balga FC",
      "awayName": "Perth AFC",
      "start": "2019-01-04T16:11:44Z",
      "group": "Australia",
      "groupId": 2000117693,
      "path": [
        {
          "id": 1000093184,
          "name": "Futsal",
          "englishName": "Futsal",
          "termKey": "futsal"
        },
        {
          "id": 2000117693,
          "name": "Australia",
          "englishName": "Australia",
          "termKey": "australia"
        }
      ],
      "nonLiveBoCount": 0,
      "liveBoCount": 42,
      "sport": "FUTSAL",
      "tags": [
        "OPEN_FOR_LIVE",
        "MATCH"
      ],
      "state": "STARTED"
    },
    "liveData": {
      "eventId": 1005221288,
      "matchClock": {
        "minute": 0,
        "second": 2,
        "minutesLeftInPeriod": 24,
        "secondsLeftInMinute": 58,
        "period": "1st half",
        "running": false,
        "disabled": true
      },
      "score": {
        "home": "1",
        "away": "0",
        "who": "UNKNOWN"
      },
      "liveStatistics": []
    },
    "mainBetOffer": {
      "id": 2150476350,
      "suspended": true,
      "criterion": {
        "id": 1001105883,
        "label": "Full Time",
        "englishLabel": "Full Time",
        "order": [
          0
        ]
      },
      "betOfferType": {
        "id": 2,
        "name": "Match",
        "englishName": "Match"
      },
      "eventId": 1005221288,
      "outcomes": [
        {
          "id": 2533642812,
          "label": "1",
          "englishLabel": "1",
          "odds": 1850,
          "type": "OT_ONE",
          "betOfferId": 2150476350,
          "changedDate": "2019-01-04T16:11:57Z",
          "oddsFractional": "17/20",
          "oddsAmerican": "-118",
          "status": "OPEN",
          "cashOutStatus": "ENABLED"
        },
        {
          "id": 2533642814,
          "label": "X",
          "englishLabel": "X",
          "odds": 4100,
          "type": "OT_CROSS",
          "betOfferId": 2150476350,
          "changedDate": "2019-01-04T16:11:57Z",
          "oddsFractional": "3/1",
          "oddsAmerican": "310",
          "status": "OPEN",
          "cashOutStatus": "ENABLED"
        },
        {
          "id": 2533642815,
          "label": "2",
          "englishLabel": "2",
          "odds": 3400,
          "type": "OT_TWO",
          "betOfferId": 2150476350,
          "changedDate": "2019-01-04T16:11:57Z",
          "oddsFractional": "12/5",
          "oddsAmerican": "240",
          "status": "OPEN",
          "cashOutStatus": "ENABLED"
        }
      ],
      "tags": [
        "OFFERED_LIVE",
        "PBA_DISABLED",
        "MAIN"
      ],
      "cashOutStatus": "SUSPENDED"
    }
};