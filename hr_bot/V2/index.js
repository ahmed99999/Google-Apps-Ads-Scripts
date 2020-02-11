const electron = require('electron');
const url = require('url');
const path = require('path');
const FileWrapper = require ('./handelfile');
const Toaster = require('electron-toaster');
const toaster = new Toaster();

const { app, BrowserWindow, ipcMain } = electron;
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
     toaster.init( mainWindow );
});

// ctach file:path

ipcMain.on( 'file:path', ( evt, filePath ) => {
    const file = FileWrapper.getFile( filePath );
    FileWrapper.validateExcelFile( file, toaster );
});