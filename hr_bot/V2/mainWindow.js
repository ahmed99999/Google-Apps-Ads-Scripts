const electron = require('electron');

const validateExelFile = exelFile => {
    return ( evt ) => {
        if ( typeof exelFile === 'undefined' || exelFile.files.length == 0 ) return;
        const { ipcRenderer } = electron;
        const filePath = exelFile.files[0].path;
        ipcRenderer.send( 'file:path', filePath );
    };
};


document.addEventListener('DOMContentLoaded', function() {
    const elems = document.querySelectorAll('select');
    const instances = M.FormSelect.init(elems);
    const form = document.querySelector('#iniatlForm');
    form.addEventListener('submit', startBoot );

    const exelFile = document.querySelector("#exelFile");
    const validateButton = document.querySelector("#validateExel");
    validateButton.addEventListener( 'click', validateExelFile( exelFile ) );
});

const startBoot = ( evt ) => {
    evt.preventDefault();
    console.log( 'electron been submitted' );
};
