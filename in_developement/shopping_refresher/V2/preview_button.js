window.onkeydown = function( event ){
	console.log( event.ctrlKey + ' ' + event.keyCode );
	if( ( event.ctrlKey && event.keyCode == 13 ) || event.keyCode == 119 /* F8 */ ){
		console.log( 'go' );
		var button = document.querySelector( '.preview-button,.stop-preview-button' );
		if( button ){
			button.click();
		}
	}
}

// https://mrcoles.com/bookmarklet/

// javascript:(function()%7Bwindow.onkeydown%20%3D%20function(%20event%20)%7Bconsole.log(%20event.ctrlKey%20%2B%20'%20'%20%2B%20event.keyCode%20)%3Bif(%20(%20event.ctrlKey%20%26%26%20event.keyCode%20%3D%3D%2013%20)%20%7C%7C%20event.keyCode%20%3D%3D%20119%20%2F*%20F8%20*%2F%20)%7Bconsole.log(%20'go'%20)%3Bvar%20button%20%3D%20document.querySelector(%20'.preview-button%2C.stop-preview-button'%20)%3Bif(%20button%20)%7Bbutton.click()%3B%7D%7D%7D%7D)()