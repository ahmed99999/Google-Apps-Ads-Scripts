
var MAX_ALLOWED_DURATION_IN_SECONDS = 15 * 60; // 15 minutes
var EXPECTED_DURATION_PER_CAMPAIGN_IN_SECONDS = 5;
// POSSIBLE_DIVISORS must be divisors of 24, must contain 24 and be in ascending order
var POSSIBLE_DIVISORS = [ 1, 2, 3, 4, 6, 8, 12, 24 ];

var _ = (function(){
	// Polyfills
	Object.values = Object.values || ( function( obj ){
		return Object.keys( obj ).map( function( key ){
			return obj[key]
		})
	});
	String.trim = function( value ){
		return value.trim();
	};
	function properties(){
		var args = Array.prototype.slice.call( arguments );
		var f = function( item ){
			return args.map( function( arg ){
				apply( item, arg );
			});
		};
		f.name1 = args.join( '_' ); // this improves groupBy() output
		return f;
	}
	function apply( item, arg ){
		if( typeof arg == 'function' ){
			return arg( item );
		}
		if( typeof item[ arg ] == 'function' ){
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
	function clone( obj ){
		if ( obj === null || typeof( obj ) !== 'object' || 'isActiveClone' in obj ){
			return obj;
		}

		var temp;
		if ( obj instanceof Date ){
			temp = new obj.constructor(); //or new Date( obj );
		} else {
			temp = obj.constructor();
		}

		for ( var key in obj ){
			if ( Object.prototype.hasOwnProperty.call( obj, key ) ){
				obj[ 'isActiveClone' ] = null;
				temp[ key ] = clone( obj[ key ] );
				delete obj[ 'isActiveClone' ];
			}
		}
		return temp;
	}
	function partition( arr ){
		var clone1 = this.clone;
		return {
			clone : clone1,
			by: function( keyName ){
				var res = {};

				for ( var i = 0; i < arr.length; i++ ){
					var obj = this.clone( arr[ i ] );
					var key;
					if ( typeof keyName == 'function' ){
						key = keyName( obj );
					} else {
						key = obj[ keyName ];
					}

					// init
					res[ key ] = ( res[ key ] || [] );
					if( typeof keyName != 'function' ){
						delete obj[ keyName ];
					}
					res[ key ].push( obj );
				}
				return res;
			}
		};
	}
	function iteratorToList( iter ){
		var list = [];
		while( iter.hasNext() ){
			list.push( iter.next() );
		}
		return list;
	}
	function not( predicate ){
		return function( item ){
			return ! predicate( item );
		}
	}
	function snakeToCamel( str ){
		var res = str
			.replace( /_+(.)/g, function( x, chr ){
			return chr.toUpperCase();
		});
		return res.charAt( 0 ).toUpperCase() + res.slice( 1 );
	}
	function camelToSnake( str ){
		return str.replace( /\.?([A-Z])/g, function( x, y ){ return '_' + y.toLowerCase() } ).replace( /^_/, '' );
	}
	function hash( value ){
		value = value + '';
		var hash = 0;
		if ( value.length == 0 ) return hash;
		for( i = 0; i < value.length; i++ ){
			var char1 = value.charCodeAt( i );
			hash = ( ( hash << 5 ) - hash ) + char1;
			hash = hash & hash; // Convert to 32bit integer
		}
		return Math.abs( hash );
	}
	function equals( value ){
		return function( x ){ return x == value };
	}
	function modulo( value ){
		return function( x ){ return x % value };
	}
	function listToMap( list, keySelector, valueSelector ){
		var map = {};
		
		if( ! valueSelector ){
			valueSelector = function( x ){ return x };
		}
		
		list.forEach( function( item, index ){
			map[ keySelector( item, index ) ] = valueSelector( item, index );
		});
		return map;
	}
	return {
		toString		: function(){ return 'my tools class'; },
		property 		: property,
		properties		: properties,
		partition		: partition,
		clone			: clone,
		iteratorToList	: iteratorToList,
		not				: not,
		snakeToCamel	: snakeToCamel,
		camelToSnake	: camelToSnake,
		hash			: hash,
		equals			: equals,
		modulo			: modulo,
		listToMap		: listToMap,
	};
})();

function computeNumParts( countAllCampaigns ){
	return POSSIBLE_DIVISORS.filter( function( divisor ){
		if( divisor == 24 ){
			return true; // 24 is always allowed
		}
		var res = ( countAllCampaigns <= MAX_ALLOWED_DURATION_IN_SECONDS / EXPECTED_DURATION_PER_CAMPAIGN_IN_SECONDS * divisor );
		return res;
	})[ 0 ];
}

function computeCurrentCampaignIds(){
    var query = 'SELECT CampaignId FROM CAMPAIGN_PERFORMANCE_REPORT WHERE CampaignStatus IN [ "ENABLED", "PAUSED" ]';
	
	var allCampaignIds = _.iteratorToList( AdWordsApp.report( query ).rows() )
		.map( _.property( 'CampaignId' ) )
	;
	var numParts = computeNumParts( allCampaignIds.length );
	var currentPart = ( new Date().getHours() ) % numParts;
	
	var currentCampaignIds = allCampaignIds
		.filter( _.property( _.hash, _.modulo( numParts ), _.equals( currentPart ) ) )
	;
	return [ currentCampaignIds, currentPart, numParts ];
}