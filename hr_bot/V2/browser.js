
const puppeteer = require('puppeteer');
const creativeCityBerlin = require('./creative-city-berlin');

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
        await page.goto( url );
    }

    if ( data['platform'].toLowerCase().includes( 'creative' ) )
        await creativeCityBerlin.fillTheForm( file['Creative City'], page );
};

module.exports.openBrowser = openBrowser;