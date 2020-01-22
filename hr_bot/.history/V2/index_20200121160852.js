const electron = require('electron');
const url = require('url');
const path = require('path');
const { app, BrowserWindow } = electron;
let mainWindow;
import 'bootstrap-electron/style.css';

// listen for the app to be ready

app.on( 'ready', function (){
     mainWindow = new BrowserWindow({});
     mainWindow.loadURL( url.format({
         pathname: path.join( __dirname, 'mainWindow.html'),
         protocol: 'file:',
         slashes: true
     }));
});