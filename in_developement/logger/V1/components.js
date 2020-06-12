// trigger permissions dialog: BigQuery.Jobs.insert(
var baseUrl = 'https://storage.googleapis.com/adwords-scripts-144712.appspot.com/';
var components = [
	'Logger.js',
	'email.js',
];

var nonce = new Date().getTime(); // circumvent cache
var urls = components.map( function( component ){ return baseUrl + component + '?v=' + nonce } )
;
for( index in urls ){
	eval( UrlFetchApp.fetch( urls[ index ] ).getContentText() );
}


/*

if( !this.SCRIPT_NAME ){
	SCRIPT_NAME = '';
}
// trigger Authorization:
// BigQuery.Jobs.insert(
// MailApp.sendEmail(
var nonce = new Date().getTime(); // circumvent cache
var url = 'https://storage.googleapis.com/adwords-scripts-144712.appspot.com/components.js' + '?v=' + nonce;
eval( UrlFetchApp.fetch( url ).getContentText() );



function onlyUnique( value, index, self ){
	return self.indexOf( value ) === index;
}
const ocids = [].slice.call( document.querySelectorAll( 'a[href*="ocid="]' ) ).map( x => x.href.match( /ocid=(\d+)\&/ )[1] ).filter( onlyUnique );
ocids.join( '\n' )

*/
