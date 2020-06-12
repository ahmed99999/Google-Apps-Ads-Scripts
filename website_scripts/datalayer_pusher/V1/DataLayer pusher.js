<script>

//Settings

//Preis-Selektoren
var PRICE_CSS_SELECTORS = [
	'#ihr-warenkorb > main > form > div:nth-child(13) > div.grid.large--one-half.small--one-whole.right > div > div:nth-child(1) > div:nth-child(2) > h1',
	'#productPrice'
];

//Product-Id 

var PRODUCT_ID_BEFORE = 'data-id';
var PRODUCT_ID_AFTER = '';

//PageType BodyClass Name

var home = "template-index";
var productSite = "template-product";
var categorySite = "template-collection";
var cartSite = "template-cart";
var purchaseSite = "";

function escapeRegExp( str ){
  return str.replace( /[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&' );
}

function searchOnWebsite2( before, after, text ){
	text = text || document.documentElement.outerHTML;
	after = after || '';
	var regex = new RegExp( escapeRegExp( before ) + '["\'\\s:=]*([\\d\\w\\-]*)["\'\\s]*' + escapeRegExp( after ) , 'g' );
	
	var match;
	var res = [];
	
	while( match = regex.exec( text ) ){
		res.push( match[ 1 ] );
	}
	res = res.filter( function( item, index, inputArray ){
		return inputArray.indexOf( item ) == index && item != '';
    });
	return res;
}


/*
 Maitre-Philippe
 [].slice.call(document.querySelectorAll('.cart-row')).map( x => x.getAttribute('data-id') )

 Gartenmöbel
 [].slice.call(document.querySelectorAll( '#buybox > p:nth-child(14) > span')).map( function( x ){ return x.nextSibling.nodeValue.trim() } )

 Palmenmann
 [].slice.call(document.querySelectorAll( '.content--sku')).map( function( x ){ return x.innerHTML.replace('Artikel-Nr.: ','').trim() } )

*/

function parsePrice( str ){
	var res = 0;
	var lip = str.lastIndexOf('.');
	var lic = str.lastIndexOf(',');
	if( lip >= 0 || lic >= 0 ){
		var decimalPointIndex = Math.max( lip, lic );
		
		res = str.substring( 0, decimalPointIndex )
			.replace( '.', '' )
			.replace( ',', '' ) + 
			'.' + // decimalPoint
			str.substring( decimalPointIndex + 1 );
	}
	
	return res / 1;
}

function searchPrice(){
	
	var findPriceRegex = /\d+[,\.]\d+([,\.]\d+)?/;

	
	var priceFound = PRICE_CSS_SELECTORS
		.map( function( css ){ return document.querySelector( css ) } )
		.reduce( function( a, b ){ return a || b } );

	if( priceFound ){
		priceFound = findPriceRegex.exec( priceFound.innerHTML );
		if( priceFound && priceFound.length > 0 ){
			return parsePrice( priceFound[0] );
		}
	}
}

var pageTypes = {
	'home' : [ home, 'ctl_index', 'ctl-index' ],
	'category' : [ categorySite, 'ctl_listing', 'ctl-listing' ],
	'product' : [ productSite, 'ctl_detail', 'ctl-detail' ],
	'cart' : [ cartSite, 'ctl_checkout', 'ctl-checkout' ],
	'purchase' : [ purchaseSite ]
}

function searchPageType(){
	var res = 'other';
	var clazz = document.body.className + '';
	for( var pageType in pageTypes ){
		var found = pageTypes[ pageType ]
			.filter( function( str ){ return clazz.indexOf( str ) >= 0 } )
			.length > 0;
		if( found ){
			res = pageType;
			break;
		}
	}
	return res;
}



dataLayer.push({
	'google_tag_params': {
		'ecomm_prodid': searchOnWebsite2( PRODUCT_ID_BEFORE, PRODUCT_ID_AFTER ),
		'ecomm_pagetype': searchPageType(),
		'ecomm_totalvalue': searchPrice()
	}
});


</script>


