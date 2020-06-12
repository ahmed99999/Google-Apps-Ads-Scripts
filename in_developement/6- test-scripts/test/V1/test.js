var config = {"CUSTOMER_ID":"103-624-6249","LOCAL_CUSTOMER_ID":"103-624-6249","settings":"{}"};

var config = JSON.parse( dataJSON.settings );
for( key in config ){
	this[ key ] = config[ key ];
}

function main(){
    // Logger.log( 'start' );
    // Logger.log('local customer id : ' + dataJSON.LOCAL_CUSTOMER_ID);
    MccApp.accounts().withLimit(1).executeInParallel( 'processAccount', 'finalProcessing' );
}

function processAccount( ){
    Logger.log( 'processAccount is running' );
}

function finalProcessing( results ){
    Logger.log( 'finalProcessing is running' );
}