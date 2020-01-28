
const puppeteer = require('puppeteer');
const creativeCityBerlin = require('./creative-city-berlin');

const openBrowser = async ( url, data, headLess, file ) => {
    const browser = await puppeteer.launch({
        headless: !headLess
    });

    const page = await browser.newPage();
    await page.setViewport({
        width: 1600, 
        height: 1000
    });
    await page.goto( url );

    const title = await page.title();
    await creativeCityBerlin.logIn( data['login'], data['password'], page );
    console.log( file );
};

module.exports.openBrowser = openBrowser;