const electron = require('electron');
const Browser = require('./browser');
const FileWrapper = require ('./handelfile');

const validateExelFile = exelFile => {
    return ( evt ) => {
        const { ipcRenderer } = electron;
        const filePath = FileWrapper.getFilePath( exelFile );
        ipcRenderer.send( 'file:path', filePath );
    };
};


document.addEventListener('DOMContentLoaded', function() {
    const elems = document.querySelectorAll('select');
    const instances = M.FormSelect.init( elems );
    const form = document.querySelector('#iniatlForm');
    form.addEventListener('submit', startBoot );

    const exelFile = document.querySelector("#exelFile");
    const validateButton = document.querySelector("#validateExel");
    validateButton.addEventListener( 'click', validateExelFile( exelFile ) );
});

const startBoot = ( evt ) => {
    evt.preventDefault();
    const form = evt.target;
    const data = {};
    const inputs = [...form.querySelectorAll('input')];
    inputs.unshift( form.querySelector('select') );
    const excelFile = document.querySelector("#exelFile");

    inputs.forEach( input => {
        if ( input.id == '' || input.type =="file" ) return;
        data [ input.id ] = ( typeof input.options !== "undefined" ) ? input.options[ input.selectedIndex ].value :
            ( input.type == "checkbox" ) ? input.checked : input.value;
    });
    const { platform } = data;
    const filePath = FileWrapper.getFilePath( excelFile );
    const file = FileWrapper.getFile( filePath );
    Browser.openBrowser( platform , data, data["Browser-Fenster anzeigen"], file );
};
