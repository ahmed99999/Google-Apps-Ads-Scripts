
const xlsx = require('node-xlsx').default;
const creativeCityBerlin = require('./creative-city-berlin');
const rockItDigital = require('./rockitdegital');

const KEYS_ROW = 1;

const mapToJobOffer = ( keys ) => {
    return ( dataRow ) => {
        const jobOffer = {};
        keys.forEach( ( key, index ) => {
            jobOffer[ key.toLowerCase().trim() ] = ( typeof dataRow[ index ] == "undefined" ) ? "" : dataRow[ index ] ;
        });
        return jobOffer;
    };
};


const mapToTab = ( tabs ) => {
    return ( tab, index ) => {
        if ( index == 1 ) return;
        const data = tab['data'];
        const keys = data[ KEYS_ROW ];
        data.splice( 0, 2 );
        tabs [ tab['name'] ] = data.map( mapToJobOffer( keys ) );
    };
};


const getFile = filePath => {
    const tabs = {};
    const workSheetsFromFile = xlsx.parse( filePath );
    workSheetsFromFile.forEach( mapToTab( tabs ) );
    return tabs;
};

const getFilePath = exelFile => { 
    if ( typeof exelFile === 'undefined' || exelFile.files.length == 0 ) return;
    const filePath = exelFile.files[0].path;
    return filePath;
};

const validateExcelFile = (file, toast ) => {
    creativeCityBerlin.validateExcelFile( file['Creative City'], toast );
    rockItDigital.validateExcelFile( file['RockITdigital'], toast );
};

module.exports.getFile = getFile;
module.exports.getFilePath = getFilePath;
module.exports.validateExcelFile = validateExcelFile;