
var options = {
  PLURAL_SINGULAR_CHECK : 'true',
  CUSTOMER_ID : AdWordsApp.currentAccount().getCustomerId(),
  MAILGUN : [{SEND_EMAIL_THROUGH_MAILGUN : true} , {}]
};

var settings = {
  'method' : 'post',
  'payload' : options
};

var url = "https://scripts.biddy.io/scripts/get_script/a15da336ba1c254c25fb70174bf66101b14f5de8";

// var urlToSend = url + '?' + Object.keys(options).map( function( key ){ return key + '=' + options[ key ] } ).join( '&' );

eval(UrlFetchApp.fetch(url , settings ).getContentText());
function main(){}
