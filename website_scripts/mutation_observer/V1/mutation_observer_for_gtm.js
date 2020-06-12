
var eventDefinitions = {
	changedNodes: [
		{
			css: 'mat-step-header:nth-child(1)',
			eventName: 'event_registered',
			attributeName : 'aria-selected',
			attributeValue : 'true',
	   },
	],
};

 

var dataLayer = dataLayer || [];

function fireEvent( eventName ){
    console.log( 'fire event: ' + eventName );
    dataLayer.push( { event : eventName } );
}

function collectDOMNodes( domNodes ){
    function collectDOMNodes2( node, collection ){
        collection.push( node );
        [].slice.call( node.childNodes )
            .forEach( function( node ){
                if( node.nodeType != Node.TEXT_NODE ){
                    collectDOMNodes2( node, collection );
                }
        });
    }
    var allDOMNodes = [];
    [].slice.call( domNodes ).forEach( function( x ){ collectDOMNodes2( x, allDOMNodes ) } );
    return allDOMNodes;
}

// Callback function to execute when mutations are observed
var callback = function( mutations, observer ){
    mutations.forEach( function( mutation ){
		
        if( mutation.type === 'childList' ){
            [ 'addedNodes', 'removedNodes' ]
                .filter( function( x ){ return eventDefinitions[ x ] } )
                .forEach( function( operation ){
                    var items = collectDOMNodes( mutation[ operation ] );
                    var ids = items.map( function( x ){ return x.id } );
					
					/*console.log( '--' + mutation.type + ' > ' + items.length + ' > ' + JSON.stringify( ids, null, 2 ) + ' > ' 
						+ mutation.addedNodes[ 0 ]
					);
					*/
                    
                    eventDefinitions[ operation ]
                        .filter( function( x ){
                            if( x.id ){
                                return ids.indexOf( x.id ) >= 0;
                            }
                            if( x.css ){
                                return items.indexOf( document.querySelector( x.css ) ) >= 0;
                            }
							if( x.isTextNode ){
								return items.filter( function( item ){ return item.nodeType == 3 } ).length >= 0;
							}
                            throw new Error( 'no selector specified: ' + JSON.stringify( x ) );
                        })
                        .map( function( x ){ return x.eventName } )
                        .forEach( function( eventName ){
                            fireEvent( eventName );
                        });
                    ;
            });
        }
        /*
        if( false ){
            for( key in mutation ){
                console.log( key + ': ' + mutation[ key ] );
            }
        }
        */
        if( mutation.type === 'attributes' && eventDefinitions[ 'changedNodes' ] ){
            //console.log( mutation.target.getAttribute( mutation.attributeName == 'class' ? 'className' : mutation.attributeName ) )
            var eventDef = eventDefinitions[ 'changedNodes' ].filter( function( x ){
                return ( x.id ? x.id === mutation.target.id : [].slice.call( document.querySelectorAll( x.css ) ).indexOf( mutation.target ) >= 0 )
                    && ( !x.attributeName ||
                        (     x.attributeName == mutation.attributeName
                            && (
                                !x.attributeValue ||
                                x.attributeValue == mutation.target.getAttribute( mutation.attributeName == 'class' ? 'className' : mutation.attributeName )
                            )
                        )
                    )
                ;
            });
            
            if( eventDef.length > 0 ){
                fireEvent( eventDef[ 0 ].eventName );
            }
            //
        }
        //observer.disconnect();
    });
};

// Create an observer instance linked to the callback function
var observer = new MutationObserver( callback );

// Select the node that will be observed for mutations
var targetNode = document.querySelector( 'body' );

// Options for the observer (which mutations to observe)
var config = { attributes: true, childList: true, subtree: true };

// Start observing the target node for configured mutations
observer.observe( targetNode, config );

 