CREATE FUNCTION omx_2019.crUpperBound(	confidence FLOAT64,	clicks FLOAT64,	conv FLOAT64, inheritedClicks FLOAT64, accountCr FLOAT64 )
RETURNS FLOAT64
LANGUAGE js AS """
// -----------------------------------
//	Beta-Distribution

function LogGamma( Z ){
	var S = 1
		+ 76.18009173 / Z
		- 86.50532033 / ( Z + 1 )
		+ 24.01409822 / ( Z + 2 )
		- 1.231739516/ ( Z + 3 )
		+ .00120858003 / ( Z + 4 )
		- .00000536382 / ( Z + 5 )
	;
	var LG = ( Z - .5 ) * Math.log( Z + 4.5 ) - ( Z + 4.5 ) + Math.log( S * 2.50662827465 );
	return LG;
}

function Betinc( X, A, B ){
	var A0 = 0;
	var B0 = 1;
	var A1 = 1;
	var B1 = 1;
	var M9 = 0;
	var A2 = 0;
	var C9;
	while( Math.abs( ( A1 - A2 ) / A1 ) > .00001 ){
		A2 = A1;
		C9 = -( A + M9 ) * ( A + B + M9 ) * X / ( A + 2 * M9 ) / ( A + 2 * M9 + 1 );
		A0 = A1 + C9 * A0;
		B0 = B1 + C9 * B0;
		M9 = M9 + 1;
		C9 = M9 * ( B - M9 ) * X / ( A + 2 * M9 - 1 ) / ( A + 2 * M9 );
		A1 = A0 + C9 * A1;
		B1 = B0 + C9 * B1;
		A0 = A0 / B1;
		B0 = B0 / B1;
		A1 = A1 / B1;
		B1 = 1;
	}
	return A1 / A;
}

function betaDist( cr, clicks, conv ){
	var Z = cr;
	var A = conv + 1;
	var B = clicks - conv + 1;
	if( A <= 0 ){
		throw new Error( 'alpha must be positive' );
	}else if( B <= 0 ){
		throw new Error( 'beta must be positive' );
	}else if ( Z <= 0 ){
		Betacdf = 0;
	}else if( Z >= 1 ){
		Betacdf = 1;
	}else{
		S = A + B;
		BT = Math.exp( LogGamma( S ) - LogGamma( B ) - LogGamma( A ) + A * Math.log( Z ) + B * Math.log( 1 - Z ) );
		if( Z < ( A + 1 ) / ( S + 2 ) ){
			Betacdf = BT * Betinc( Z, A, B );
		}else{
			Betacdf = 1 - BT * Betinc( 1 - Z, B, A );
		}
	}
	Betacdf = Betacdf + .000005;
    return Betacdf;
}

function search( alpha, clicks, conv, min, max, eta ){
	//Logger.log( '[' + min + ',' + max + ']' );
	var x = min + ( max - min ) / 2;
	var value = betaDist( x, clicks / 1, conv / 1 );
	if( Math.abs( alpha - value ) < eta ){
		return x;
	}
	if( value > alpha ){
		return search( alpha, clicks, conv, min, x, eta );
	}
	if( value < alpha ){
		return search( alpha, clicks, conv, x, max, eta );
	}
	throw new Error( 'should not happen. Alpha: ' + alpha 
		+ ', value: ' + value 
		+ ', eta: ' + eta 
		+ ', min: ' + min 
		+ ', max: ' + max 
		+ ', clicks: ' 
		+ clicks 
		+ ', conv: ' + conv
		+ ', x: ' + x
	);
}

function crUpperBound( confidence, clicks, conv, inheritedClicks, accountCr ){
	inheritedClicks = Math.max( ( inheritedClicks || 0 ) - clicks, 0 );
	clicks = clicks + inheritedClicks;
	conv = conv + inheritedClicks * ( accountCr || 0 );
	if( conv > clicks ){
		Logger.log( 'WARNING: conv > clicks. clicks: ' + clicks + ', conv: ' + conv );
		Logger.log( 'Adjust conv to clicks.' );
		conv = clicks;
	}
	var ETA = .0001; // a small constant
	var alpha = 1 - confidence;
	var upperBound = Math.max(
		conv / clicks,
		search( 1 - alpha / 2, clicks, conv, 0, 1, ETA )
	);
	return Math.floor( upperBound * 1000 ) / 1000; // + '%';
}

return crUpperBound( confidence, clicks, conv, inheritedClicks, accountCr );

""";