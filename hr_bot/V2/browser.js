
const puppeteer = require('puppeteer');
const creativeCityBerlin = require('./creative-city-berlin');
// const rockItDigital = require( './rockitdegital' );

const openBrowser = async ( url, data, headLess, file ) => {
    const browser = await puppeteer.launch({
        headless: !headLess
    });

    const page = await browser.newPage();
    await page.setViewport({
        width: 800, 
        height: 800
    });
    await page.goto( url );

    const title = await page.title();
    if ( title.includes( title ) ){
        await creativeCityBerlin.logIn( data['login'], data['password'], page );
    }

    if ( data['platform'].toLowerCase().includes( 'creative' ) )
        await creativeCityBerlin.fillTheForm( file['Creative City'], page, url );

    // if ( data['platform'].toLowerCase().includes( 'rockitdigital' ) ){}
};

module.exports.openBrowser = openBrowser;