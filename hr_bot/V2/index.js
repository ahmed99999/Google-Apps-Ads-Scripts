const electron = require('electron');
const url = require('url');
const path = require('path');
const { app, BrowserWindow } = electron;
let mainWindow;

// listen for the app to be ready

app.on( 'ready', function (){
     mainWindow = new BrowserWindow({
        webPreferences: {
            nodeIntegration: true
        },
        width: 800,
        height: 900
     });
     mainWindow.loadURL( url.format({
         pathname: path.join( __dirname, 'mainWindow.html'),
         protocol: 'file:',
         slashes: true
     }));
});