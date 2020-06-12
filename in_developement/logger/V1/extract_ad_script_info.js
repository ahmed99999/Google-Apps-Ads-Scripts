

function readScripts(){
	var rows = [].slice.call( document.querySelectorAll( '.particle-table-row' ) )
		.map( x => ({
			account     : document.querySelector( '.name' )    .innerText.replace( /\n/, ' ' ),
			script_name : x.querySelector( 'script-name' )     .innerText.replace( /\n/, ' ' ),
			creator     : x.querySelector( 'script-creator' )  .innerText.replace( /\n/, ' ' ),
			frequency   : x.querySelector( 'script-frequency' ).innerText.replace( /\n/, ' ' ),
			last_edit   : x.querySelector( 'ess-cell[essfield="last_edit_time"]' ).innerText.replace( /\n/, ' ' ),
			status      : x.querySelector( 'script-status' )    .innerText.replace( /\n/, ' ' ),
		}))
	;
	result = result.concat( rows );
}

function forceLazyAccountLoad(){
	document.querySelectorAll( '.base-root' )[0].scroll( 0, 100000 );
}

function clickOnNextAccountLink(){
	var allAccountLinks = [].slice.call( document.querySelectorAll( '.descriptive-name>a.account-cell-link' ) );
	allAccountLinks[ lastIndex++ ].click();
}
function clickOnToolsAndSettings(){
	document.querySelector( 'material-button[aria-label="Tools & settings"]' ).click();
}
function clickOnScripts(){
	document.querySelector( 'a[aria-label="Go to Scripts"]' ).click();
}
function clickOnMasterMcc(){
	document.querySelector( 'mcc-nav>div.mcc-nav-popup-trigger>div.picker-label>div.awsm-breadcrumbs>a' ).click();
}
function clickOnAccounts(){
	
	if( document.querySelector( 'div[aria-label="Overview"]' ) ){
		document.querySelector( '[aria-label="Go to the accounts table"]' ).click();
	}
}
var steps = [
	[ forceLazyAccountLoad,    3000 ],
	[ clickOnNextAccountLink,  5000 ],
	[ clickOnToolsAndSettings, 2000 ],
	[ clickOnScripts,          5000 ],
	[ readScripts,             2000 ],
	[ clickOnMasterMcc,        5000 ],
	[ clickOnAccounts,         5000 ],
];
var ACCOUNT_LIMIT = 120;

var result = [];

var lastIndex = lastIndex || 80;
var step = 0;

function stringify( arr ){
	return arr.map( obj => Object.values( obj ).join( ',' ) ).join( '\n' );
}

function loop(){
	[ func, wait ] = steps[ step ];
	try{
		func();
	}catch( error ){
		console.log( 'final-result: ' + stringify( result ) );
		throw error;
	}
	
	step = ( step + 1 ) % steps.length;
	
	if( step == 0 ){
		console.log( 'result: ' + stringify( result ) );
	}
	
	if( step == 0 && lastIndex > ACCOUNT_LIMIT ){
		console.log( 'stop. lastIndex: ' + lastIndex );
		return;
	}
	setTimeout( loop, wait );
}
loop();