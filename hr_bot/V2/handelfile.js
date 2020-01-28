
const xlsx = require('node-xlsx').default;

const KEYS_ROW = 1;

const mapToJobOffer = ( keys ) => {
    return ( dataRow ) => {
        const jobOffer = {};
        keys.forEach( ( key, index ) => {
            jobOffer[key] = ( typeof dataRow[ index ] == "undefined" ) ? "" : dataRow[ index ] ;
        });
        return jobOffer;
    };
};

const mapToTab = ( tab, index ) => {
    if ( index == 1 ) return;
    const data = tab['data'];
    const keys = data[ KEYS_ROW ];
    data.splice( 0, 2 );
    const jobOffers = data.map( mapToJobOffer( keys ) );
    // console.log( jobOffers );
    return jobOffers;
};

const getFile = filePath => {
    const workSheetsFromFile = xlsx.parse( filePath );
    return workSheetsFromFile.map( mapToTab );
};

const getFilePath = exelFile => { 
    if ( typeof exelFile === 'undefined' || exelFile.files.length == 0 ) return;
    const filePath = exelFile.files[0].path;
    return filePath;
};

module.exports.getFile = getFile;
module.exports.getFilePath = getFilePath;