
    var MERCHANT_ID = '8308173';
    var ADGROUP_ID = '80678452467'

    var CONDITIONS = {
        CAMPAIGN : {
            NAME_CONTAINS: [],
            NAME_DOES_NOT_CONTAIN : [],
            STATUS_IN : [ 'ENABLED'  ],
        },
        AD_GROUP : {
            NAME_CONTAINS:[],
            NAME_DOES_NOT_CONTAIN:[],
            STATUS_IN : [ 'ENABLED' ],
        }
    };

    function toList( iterator ){
        var list = [];
        while( iterator.hasNext() ){
            list.push( iterator.next() );
        }
        return list;
    }

    function surround( prefix, postfix ){
        return function( str ){ return prefix + str + postfix };
    }

    function buildConditions() {
        return []
        .concat( CONDITIONS.CAMPAIGN.NAME_CONTAINS.map( surround(' CampaignName CONTAINS "', '" ')) )
        .concat( CONDITIONS.CAMPAIGN.NAME_DOES_NOT_CONTAIN.map( surround(' CampaignName DOES_NOT_CONTAIN "', '" ')) )
        .concat( CONDITIONS.AD_GROUP.NAME_CONTAINS.map( surround( ' AdGroupName CONTAINS "' ,'" ' )) )
        .concat( CONDITIONS.AD_GROUP.NAME_DOES_NOT_CONTAIN.map( surround(' AdGroupName DOES_NOT_CONTAIN "', '" ')) )
        .concat( CONDITIONS.CAMPAIGN.STATUS_IN.map( surround( ' CampaignStatus IN [ "', '"]' ) ))
        .concat( CONDITIONS.AD_GROUP.STATUS_IN.map( surround( ' AdGroupStatus IN ["' , '"] ' )) );
    }

    function getShoppingAdgroups(){
        var conditions = buildConditions();
        var adGroupSelector = AdsApp.shoppingAdGroups();
        conditions.forEach( function ( condition ){ adGroupSelector = adGroupSelector.withCondition( condition ); });
        return toList( adGroupSelector.get() );
    }

    function getProductsFromReport(){
        var conditions = buildConditions();
        var query = 'SELECT Id, ProductGroup, AdGroupName, CampaignName ' +
                    'FROM PRODUCT_PARTITION_REPORT ';
        query += ( conditions.length > 0 ) ? 'WHERE '+ conditions.join( ' AND ' ) : '';
        return toList( AdWordsApp.report( query ).rows() );
    }

    function group( rows ){
        var list = {};
        return {
            by : function( criteria, attribute ){
                rows.forEach( function ( item ){
                    var key = item[ criteria ];
                    if ( typeof attribute !== 'undefined') key = attribute;
                    list[ key ] = list[ key ] || [];
                    list[ key ].push( item );
                });
                return list;
            }
        }
    }

    function getProductsFromFeed (){
        var query = 'SELECT OfferId, AdGroupId ' +
                    'FROM SHOPPING_PERFORMANCE_REPORT ' +
                    'WHERE MerchantId = "' + MERCHANT_ID + '" ' +
                    'AND Impressions = "0" ';
        return toList( AdWordsApp.report( query ).rows() );
    }

    function getvalueObject( productGroup, fun, level ){
        return {
            level: ( typeof fun === 'function' ) ? level++ : level,
            productGroup: productGroup.getValue(),
            isOtherCase: productGroup.isOtherCase(),
            id: productGroup.getId(),
            next: ( typeof fun === 'function' ) ? fun( productGroup, level ) : null
        };
    }

    function processProductGroup( productGroup, level ){
        var obj = {};
        if( productGroup.children().get().hasNext() ){
            var children = toList( productGroup.children().get() );
            children.forEach( function( child ){
                obj [ child.getValue() ] = getvalueObject( child, processProductGroup, level );
            });
            return obj;
        };
        return null;
    }

    function checkAdgroup( productGroupsPerAdGroup, product ){
        if ( productGroupsPerAdGroup !== null && typeof productGroupsPerAdGroup[ product["productType"] ] !== "undefined" ) return true;
        for (var key in productGroupsPerAdGroup ) {
            var value = checkAdgroup( productGroupsPerAdGroup[ key ].next, product );
            Logger.log( value );
            if ( value === true) return true;            
        }
        return false;
    }

    
    function getReport( report, fields, conditions ){
        if( fields && Array.isArray( fields ) ){
            fields = fields.map( function( str ){ return str.trim() } ).join( ', ' );
        }
        if( conditions && conditions.length > 0 ){
            conditions = ' WHERE ' + conditions.join( ' AND ' );
        }else{
            conditions = '';
        }

        var query = 'SELECT ' + fields + ' FROM ' + report + conditions;
        
        return toList( AdWordsApp.report( query ).rows() );
    }

    function buildRow( headers ){
        return function( row ){
            var res = {};
            headers.forEach( function( header ){
                res[ header ] = row[ header ];
            });
            return res;
        };
    }

    function camelCase(str) { 
        return str.replace(/(?:^\w|[A-Z]|\b\w)/g, function(word, index) 
        { 
            return index == 0 ? word.toLowerCase() : word.toUpperCase(); 
        }).replace(/\s+/g, ''); 
    }

    function parsePath( item ){
        var path = item[ 'ProductGroup' ];
        if( path.charAt( path.length - 1 ) == '/' ){
            // Subdivisions have a slash at the end. remove it
            path = path.substring( 0, path.length - 2 );
        }
        var res = path.split( ' / ' )
            .slice( 1 )
            // .map( function( keyValue ){
            //     var ar = keyValue.split( ' = ' );
            //     Logger.log( ar );
            //     // return keyValue;
            //     var res = {};
            //     res[ ar[ 0 ] ] = ar[ 1 ];
            //     return res;
            // })         
        ;
        return res;
    }
    
    function main() {
	//, Id, AdGroupName, CampaignName
        var headers = 'Id, ProductGroup'.split( ', ' );
        
        var paths = getReport(
            'PRODUCT_PARTITION_REPORT',
            headers,
            buildConditions().concat(
                [
                    'AdGroupId = ' + ADGROUP_ID,
                    'PartitionType = "UNIT"',
                ]
            )
        )
        .map( buildRow( headers ) )
        .map( parsePath )
        ;
        
        var everythingElsePaths = paths.filter( function( path ){
            return path[ path.length - 1 ] == 'item id = *';
        })
        .map( function( ar ){ return ar.slice( 0, ar.length - 1 ) } )
        ;
        
        var elseCases = everythingElsePaths
        .map( function( everythingElsePath ){
            var productIds = paths.filter( function( path ){
                if( path.length != everythingElsePath.length + 1 ){
                    return false;
                }
                if( path[ path.length - 1 ] == 'item id = *' ){
                    return false;
                }
                var elsePath = everythingElsePath.join( ' / ' );
                var otherPath = path.slice( 0, path.length - 1 ).join( ' / ' );
                return elsePath == otherPath;
            })
            .map( function( path ){
                return path[ path.length - 1 ].split( ' = ' )[ 1 ];
            })
            ;
            return {
                elsePath : everythingElsePath,
                productIds : productIds,
            };
        })
        .map( function( product ){
            var paths = product.elsePath;
            var ar = paths.map( function( path ){ return path.split( ' = ' );} );
            var res = ar.map( function( path ){
                var x = {};
                x[ camelCase(path[ 0 ]) ] = path[ 1 ].replace( /\\/g, '').replace(/\"/g, '');
                return x
            });
            product.elsePath = res;
            product.productIds = product.productIds.map( function( id ){ return id.replace(/\\/g,'').replace(/\"/g,'');});
            return product;
        });

        // .forEach( function( x ){ Logger.log( JSON.stringify( x, null, 2 ) ) } );

        // var pageObj = {};
        // var products = [];
        // var index = 1;
        // do {
        //     data = ShoppingContent.Products.list( MERCHANT_ID, pageObj );
        //     pageObj = {
        //         pageToken: data["nextPageToken"]
        //     };
        //     products = products.concat(
        //         data.resources.filter( function( product ){
        //             return product.source === "feed";
        //         }).map( function( product ){
        //             return {
        //                 itemId: product.offerId.toLowerCase(),
        //                 productType: product.productType,
        //                 category: product.googleProductCategory,
        //                 condition: product.condition,
        //                 brand: product.brand,
        //                 channel: product.channel,
        //                 customLabel0: product.customLabel0,
        //                 customLabel1: product.customLabel1,
        //                 customLabel2: product.customLabel2,
        //                 customLabel3: product.customLabel3
        //             };
        //         })
        //     );
        //     index++;
        // } while ( typeof pageObj.pageToken !== 'undefined' && index < 2 );
        elseCases.forEach( function(x){ Logger.log( JSON.stringify( x, null, 2 ) );});

        var expl = 	{
            "itemId": "lig70se-f040-c19",
            "productType": "Karten > Einschulung > Einschulungskarten > Einladungskarten",
            "category": "Kunst & Unterhaltung",
            "condition": "new",
            "brand": "die kartenmacherei",
            "channel": "online",
            "customLabel0": "bilder > türschild > geburt",
            "customLabel1": "Design: Notizblock",
            "customLabel2": "einladung-einschulung-notizblock.html?format=F040&color=C19&quantity=5&r=pla",
            "customLabel3": "Einladung Einschulung \"Notizblock\""
        };

        var productId = '815172098079';

        for (var elseIndex = 0; elseIndex < elseCases.length; elseIndex++) {
            var create = true;
            var paths = elseCases[ elseIndex ].elsePath;
            for (var index = 0; index < paths.length; index++) {
                var key = Object.keys( paths[ index ] )[0];
                if ( expl[ key ] !== paths[ index ][ key ] ) create= false;
            }
            var ids = elseCases[ elseIndex ].productIds;
            for (var index2 = 0; index2 < ids.length; index2++) {
                if ( expl[ 'itemId' ] == ids[index2] ) create= false;
            }

            if( create === true ){
                // var conditions = paths.map( function( path ){
                //     var key = Object.keys( path )[0];
                //     return  key + ' = "' + path[key] + '" '
                // });
                var d = AdsApp.productGroups().withIds([[ADGROUP_ID, productId ]]).get().next().newChild().itemIdBuilder().withValue(expl["itemId"]).build().isSuccessful();

                Logger.log( d );
                break;
            } else{
                Logger.log('do not create here');
            }
        }


        // Logger.log( JSON.stringify( products[0], null, 2 )  );

        // var elseProductGroups = getProductsFromReport().map( function(product){ return parsePath( product)});

        // var siblings = elseProductGroups.filter( function( product ){
        //     var sibling = false;
        //     var headers = product["ProductGroup"];
        //     headers.filter( function( header ){
        //         var key = Object.keys( header )[0];
        //         return ( key !== 'itemId');
        //     }).forEach( function( header ){
        //         var key = Object.keys( header )[0];
        //         if ( header[ key ] === products[0][ key ] ) sibling = true;
        //     });
        //     return sibling;
        // });

        // siblings.forEach( function( product ){
        //     Logger.log( product["ProductGroup"] );
        // });


        // var shoppingAdGroupsList = getShoppingAdgroups();
        // var productGroups = shoppingAdGroupsList.map(function( shoppingProductGroup ){ return shoppingProductGroup.rootProductGroup(); });
        // var shoppingAdGroupsList = toList( AdsApp.shoppingAdGroups().withIds([80678452467]).get() );
        // var productGroups = shoppingAdGroupsList.map(function( shoppingProductGroup ){ return shoppingProductGroup.rootProductGroup(); });

        // var products = getProductsFromFeed();
        // Logger.log( products.length );
        // Logger.log( JSON.stringify( products , null, 2 ) );
        // Logger.log( shoppingAdGroupsList[0].getName() );
        // var level = 1;
        // var elseProductGroups = toList (AdsApp.productGroups().withCondition('Id = "297612067635"').get());
        // var productGroups = elseProductGroups.map( function(pro ) { return processProductGroup( pro, level );});
        // var productGroup = processProductGroup( shoppingAdGroupsList[0].rootProductGroup(), level );
        // Logger.log( JSON.stringify( productGroups, null, 2 ));

        // var elseProductGroups = toList( AdsApp.productGroups().withCondition('Id = "297612067635"').get().next().asItemId().children().get() );

        // var elseProductGroups = toList( AdsApp.productGroups().withCondition('Id = "297612067635"').get() );
        // elseProductGroups.forEach( function ( p ){
        //     Logger.log( p.toString() );
        // });

        // Logger.log( JSON.stringify( , null, 2 ) );
        // var rootProductGroups = {};
        // productGroups.forEach( function ( rootProductGroup ){
        //     rootProductGroups[ rootProductGroup.getCampaign().getName() + '-' + rootProductGroup.getAdGroup().getName() ] = rootProductGroup;
        // });

        // var level = 1;
        // var productGroupsPerAdGroup = {};
        // productGroups.forEach( function( productGroup ){
        //     productGroupsPerAdGroup[ productGroup.getAdGroup().getId() ] = processProductGroup( productGroup, level );
        // });

        // Object.keys( productGroupsPerAdGroup ).forEach( function( key ){
        //     if ( checkAdgroup( productGroupsPerAdGroup[ key ], products[0] ) ) Logger.log( 'adGroup found : ' + key );
        //     else Logger.log( 'adgroup was not found');
        // });

        // var products = toList( AdsApp.productGroups().get() );
        // var p =  products.filter( function( pro ){
        //     // Logger.log( pro.asItemId().getValue() );
        //     if ( pro.asItemId().getValue() === null ) return false;
        //     return ( pro.asItemId().getValue().indexOf('dkm35bb-f520-c37') >= 0) ;
        // });

        // Logger.log( JSON.stringify( productGroupsPerAdGroup , null, 2 ) );


        // elseProductGroups.forEach( function ( elseProductGroup ){
        //     elseProductGroup[ elseProductGroup['AdGroupName'] ] = elseProductGroup['ProductGroup'].split('/')
        //     .filter( function( x ){ return x.indexOf('custom label') >= 0 ;})
        //     .map( function( label ){
        //         var productsGr = label.match( new RegExp('\\\".*\\\"') );
        //         if ( productsGr !== null && productsGr.length > 0 )
        //             return productsGr[0].replace(/\\/g,'').replace(/\"/g,'');
        //         if ( productsGr !== null && productsGr.length <= 0 )
        //             return [];
        //     });
        // });

        // // Logger.log (
        // //     JSON.stringify ( 
        // //         productGroupsPerAdGroup[ elseProductGroups[0]['CampaignName'] +'-'+ elseProductGroups[0]['AdGroupName'] ] , 
        // //         null, 
        // //         2 
        // //     )
        // // );

        // elseProductGroups.forEach( function ( elseProductGroup ){
        //     var adGroupName = elseProductGroup["AdGroupName"];
        //     var campaignName = elseProductGroup["CampaignName"];
        //     var productGroupKey = campaignName + '-' + adGroupName;
        //     var productGroup = productGroupsPerAdGroup [ productGroupKey ];
        //     var typeProduct = 'root';
        //     var nullValues = 'no';
        //     var index = 0;
        //     var productGroupsLength = ( elseProductGroup[ adGroupName ] || [] ).length;
        //     while( index < productGroupsLength ){
        //         var newProductGroupName = elseProductGroup[ adGroupName ][ index ];
        //         if ( (newProductGroupName === null) || (typeof newProductGroupName === 'undefined') ) {
        //             index++; nullValues=null; continue;
        //         }
        //         if ( index !== 0 && productGroup.next === null ) break;
        //         productGroup = ( index === 0 ) ? productGroup[ newProductGroupName ] : productGroup.next[ newProductGroupName ] ;
        //         typeProduct = 'new';
        //         nullValues='no';
        //         index++;
        //     }
        //     if( typeProduct === 'root' || nullValues === null) {
        //         var finalProductGroup = rootProductGroups[ productGroupKey ];
        //     } else {
        //         if ( typeof productGroup === 'undefined' ){
        //             Logger.log('NULL');
        //             Logger.log( JSON.stringify( rootProductGroups[ productGroupKey ], null, 2 ) );
        //             var finalProductGroup = rootProductGroups[ productGroupKey ];
        //         } else {
        //             var finalProductGroup = productGroup["productGroup"];
        //         }
        //     }
        //     // var finalProductGroup = ( typeProduct === 'root') ? rootProductGroups[ productGroupKey ] :
        //     //     ( nullValues === null ) ? rootProductGroups[ productGroupKey ] : productGroup["productGroup"];
        //     Logger.log( typeProduct );
        //     Logger.log( JSON.stringify( finalProductGroup , null, 2 ));
        //     Logger.log ( index );
        //     if ( typeof finalProductGroup === 'undefined' && typeProduct === 'root') {
        //         Logger.log( productGroupKey + ' have no root product Group ' );
        //         return;
        //     }
        //     if ( finalProductGroup.isExcluded() ){
        //         Logger.log( productGroupKey  + ' is exluded' );
        //         return;
        //     }
        //     finalProductGroup.newChild().itemIdBuilder().withValue( elseProductGroup["Id"] ).build().getResult();
        // });
    }

// ---------------------------------------------------- Shopping Content API -------------------------------------------------------------------
    
    // var pageObj = {};
    // var products = [];
    // var index = 1;
    // do {
    //     data = ShoppingContent.Products.list( MERCHANT_ID, pageObj );
    //     pageObj = {
    //         pageToken: data["nextPageToken"]
    //     };
    //     products = products.concat( data.resources.filter( function( product ){ return product.source === "feed"; }) );
    //     index++;
    // } while ( typeof pageObj.pageToken !== 'undefined' && index < 10 );
    // Logger.log( products.length );