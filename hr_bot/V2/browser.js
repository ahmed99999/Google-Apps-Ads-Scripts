
const puppeteer = require('puppeteer');
const creativeCityBerlin = require('./creative-city-berlin');
const rockItDigital = require( './rockitdegital' );

const openBrowser = async ( url, data, headLess, file, alert ) => {
    creativeCityBerlin.validateExcelFile( file['Creative City'], alert );
    rockItDigital.validateExcelFile( file['RockITdigital'], alert);

    const browser = await puppeteer.launch({
        headless: !headLess
    });

    const page = await browser.newPage();
    await page.setViewport({
        width: 1600, 
        height: 800
    });
    await page.goto( url );


    if ( data['platform'].toLowerCase().includes( 'creative' ) ){
        await creativeCityBerlin.logIn( data['login'], data['password'], page );
        await creativeCityBerlin.fillTheForm( file['Creative City'], page, url );
    }

    if ( data['platform'].toLowerCase().includes( 'rockitdigital' ) ){
        await rockItDigital.logIn( data['login'], data['password'], page );
        await rockItDigital.fillTheForm( file['RockITdigital'], page, url );
    }

};

module.exports.openBrowser = openBrowser;