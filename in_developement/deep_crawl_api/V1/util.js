
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
	function log( value ){
		value = JSON.stringify( value, null, '\t' );
		if( typeof Logger !== 'undefined' ){
			var now = new Date( Utilities.formatDate( new Date(), 'Europe/Berlin', 'MMM dd,yyyy HH:mm:ss' ) );
			var now = addLeadingZeros( now.getHours(), 2) + ':' + addLeadingZeros( now.getMinutes(), 2 );
			value = now + ' ' + value;
			Logger.log( value );
		}else{
			document.write( value + '<br>' );
		}
	}
  	function hasProperty( property ){
		return function( item ){ return typeof item[ property ] !== 'undefined' };
	}
	function hasNoProperty( property ){
		return function( item ){ return typeof item[ property ] === 'undefined' };
	}
	function snakeToAdWords( str ){
		var res = snakeToCamel( str );
		return res.charAt( 0 ).toUpperCase() + res.slice( 1 );
	}
	function snakeToCamel( str ){
		var res = str
			.replace( /_+(.)/g, function( x, chr ){
			return chr.toUpperCase();
		});
		return res;
	}
	function camelToSnake( str ){
		return str.replace( /\.?([A-Z])/g, function( x, y ){ return '_' + y.toLowerCase() } ).replace( /^_/, '' );
	}
	return {
		toString		: function(){ return 'my tools class'; },
		property 		: property,
		properties		: properties,
		log				: log,
        concat          : function( a, b ){ return a.concat( b ) },
        hasProperty     : hasProperty,
        hasNoProperty   : hasNoProperty,
		snakeToCamel	: snakeToCamel,
		camelToSnake	: camelToSnake,
	};
})();

function optional( value, message ){
	var error = message ? new Error( message ) : new Error( 'No such value!' );
	var isNull = ( value === undefined || value === null );
	var optional_ = optional;
	return {
		get : 			function()						{ if( isNull ){ throw error; } return value; },
		ifPresent : 	function( consumer )			{ if( !isNull ){ consumer( value ) } },
		peek : 			function( consumer )			{ if( !isNull ){ consumer( value ) } return this },
		map : 			function(){
			var args = Array.prototype.slice.call( arguments );
			// first argument is the method to call
			var method = args.splice( 0, 1 );
			// all other arguments are arguments of the method
			if( isNull ){
				return this;
			}
			if( typeof method == 'function' ){
				return optional_( method.apply( value, args ) );
			}else if( typeof value[ method ] == 'function' ){
				return optional_( value[ method ].apply( value, args ) );
			}else{
				return optional_( value[ method ] );
			}
		},
		call : function(){ 
			var args = Array.prototype.slice.call( arguments );
			// first argument is the method to call
			var method = args.splice( 0, 1 );
			// all other arguments are arguments of the method
			if( !isNull ){
				value[ method ].apply( value, args );
			}
			return this;
		},
		filter : 		function( predicate )			{ return isNull || predicate( value ) ? this : optional_() },
		onlyIf : 		function( method )				{ return isNull || value[ method ]() ? this : optional_() },
		isPresent : 	function()						{ return !isNull },
		hasFailed :		function()						{ return isNull },
		isEmpty :		function()						{ return isNull },
		orElse : 		function( other )				{ return isNull ? other : value },
		orElseGet : 	function( supplier )			{ return isNull ? supplier.get() : value },
		orElseThrow : 	function( exceptionSupplier )	{ if( isNull ) throw exceptionSupplier(); return value; },
		equals : 		function( otherValue )			{ return !isNull && value == otherValue },
		forEach :	 	function( consumer )			{
			if( this.isPresent() ){
				var iterator = this.get();
				while( iterator.hasNext() ){
					consumer( iterator.next() );
				}
			}
		},
		toString : 		function()						{ return isNull ? 'Empty' : 'Optional< ' + value + ' >' },
	};
}