
const DOM_IDS = {
    login : {
        loginURL : 'https://www.rockitdigital.de/account/',
        login:'input[name="email"]',
        password:"#pwlogin",
        submitLogin: 'input[type="submit"][value="Login"]'
    },
    first_page : {
        'Job-Titel / Position': '#q[name="title"]',
        'Beschreibung':"#description",
        'Anstellung': 'select[name="job_type"]',
        'Vertrag': 'select[name="job_contract"]',
        'Kategorie(n) *(maximal 2)':{
            'Administration / Personal':"#job_category_29",
            'Business Analyst':"#job_category_31",
            'Consulting / Beratung':"#job_category_3",
            'CRM':"#job_category_4",
            'Design / Grafik / Konzeption':"#job_category_18",
            'Design Allgemein':"#job_category_47",
            'Grafik Design':"#job_category_44",
            'Konzeption / Kreation':"#job_category_45",
            'Mobile Design':"#job_category_46",
            'Screen Design':"#job_category_43",
            'Web Design':"#job_category_42",
            'Finanzen / Recht':"#job_category_30",
            'Controlling':"#job_category_52",
            'Finanzbuchhaltung / Lohnbuchhaltung':"#job_category_53",
            'Finanzen / Recht Allgemein':"#job_category_55",
            'Jurist':"#job_category_54",
            'Geschäftsführung / Leitung':"#job_category_32",
            'IT / Programmierung / Technik':"#job_category_7",
            'Backend / Programmierung':"#job_category_25",
            'Datenbank / Business Intelligence':"#job_category_21",
            'Frontend / JavaScript':"#job_category_22",
            'IT Allgemein':"#job_category_23",
            'Mobile Development / iOS / Android':"#job_category_24",
            'Systemadministration / Netzwerkadministration':"#job_category_26",
            'Kundenbetreuung / Support':"#job_category_35",
            'Logistik / Einkauf':"#job_category_33",
            'Einkauf':"#job_category_48",
            'Kommissionierer':"#job_category_49",
            'Logistik Allgemein':"#job_category_50",
            'Supply Chain Manager':"#job_category_51",
            'Marketing/ Online Marketing':"#job_category_20",
            'Affiliate Marketing':"#job_category_1",
            'Content Marketing':"#job_category_39",
            'Direktmarketing':"#job_category_38",
            'Display Advertising':"#job_category_5",
            'Email Marketing':"#job_category_6",
            'Kooperationsmarketing / Partnermarketing':"#job_category_37",
            'Marketing Allgemein':"#job_category_40",
            'Mobile Marketing / Mobile Allgemein':"#job_category_8",
            'Online Marketing Allgemein':"#job_category_9",
            'Performance Marketing':"#job_category_12",
            'PR / Presse':"#job_category_10",
            'Social Media Marketing':"#job_category_16",
            'Suchmaschinenmarketing (SEM/ SEA)':"#job_category_14",
            'Suchmaschinenoptimierung (SEO)':"#job_category_15",
            'Produktmanagement':"#job_category_11",
            'Projektmanagement':"#job_category_36",
            'Redaktion / Contentmanagement':"#job_category_34",
            'Sales / Vertrieb':"#job_category_13",
            'Accountmanagement':"#job_category_27",
            'Business Development':"#job_category_2",
            'Keyaccountmanagement':"#job_category_41",
            'Sales / Vertrieb Allgemein':"#job_category_28",
            'Sonstiges':"#job_category_17"
        },
        'plz, ort':"#",
        'untick the box':"#",
        'Berufserfahrung': {
            'Keine'      :"#job_level_1",
            'Erste'      :"#job_level_2",
            'Mehrjährige':"#job_level_3",
            'Langjährige':"#job_level_4"
        },
        'Bewerbung auf folgender Website':"#apply_url",
        'oder Bewerbung per Email'      :"#apply_email",
        'Gewünschtes Eintrittsdatum':{
            'day'   :'select[name="apply_date_day"]',
            'month' :'select[name="apply_date_month"]',
            'year'  :'select[name="apply_date_year"]'
        },
        'Ansprechpartner':"#apply_contact",
        'Unternehmen':"#company",
        'Straße':"#street",
        'PLZ':"#zip",
        'Ort':"#city",
        'Webseite':"#url",
        'Video Link':"#ytvideo",
        'kivaplus':"#kivaplus",
        'submit':'input[type="submit"][value="Zur Vorschau Ihrer Stellenanzeige"]'
    },
    second_page : {
        'submit':'input[type="submit"][value="Weiter"]'
    },
    last_page : {
        'submit':'input[type="submit"][value="Mein Beitrag für eine bessere Welt"]'
    }
};

const DEFAULT_LOGIN = "a.bakhabou@pa.ag";
const DEFAULT_PASSWORD = "test01test";

const logIn = async ( login, password, page ) => {

    await page.goto( DOM_IDS['login']['loginURL'] );
    const loginButton = await page.$( DOM_IDS['login']['submitLogin'] );
    if ( loginButton == null || typeof loginButton == 'undefined' ) return await page;

    login = login || DEFAULT_LOGIN;
    password = password || DEFAULT_PASSWORD;

    await page.type( DOM_IDS.login.login , login );
    await page.type( DOM_IDS.login.password , password );
    await page.click( DOM_IDS.login.submitLogin );
    return await page;
};

const firstPage = async ( file, page ) => {
    // const frames = await page.frames();
    // frames.forEach( async ( myframe ) => {
    //     const pa = await myframe.content();
    //     console.log( pa );
    //     // const paragraph = await pa.$( '#tinymce' );
    //     // await myframe.goto ( myframe );
    //     // const children = await myframe.childFrames();
    //     // if ( children.length > 0 ){
    //     //     console.log( children[0] );
    //     //     // await children[0].setContent(`<html><head><style id="mceDefaultStyles" type="text/css">.mce-content-body div.mce-resizehandle {position: absolute;border: 1px solid black;background: #FFF;width: 5px;height: 5px;z-index: 10000}.mce-content-body .mce-resizehandle:hover {background: #000}.mce-content-body img[data-mce-selected], hr[data-mce-selected] {outline: 1px solid black;resize: none}.mce-content-body .mce-clonedresizable {position: absolute;outline: 1px dashed black;opacity: .5;filter: alpha(opacity=50);z-index: 10000}
    //     //     // </style><meta http-equiv="Content-Type" content="text/html; charset=UTF-8"><link type="text/css" rel="stylesheet" href="https://www.rockitdigital.de/tinymce/skins/lightgray/content.min.css"><link type="text/css" rel="stylesheet" href="https://www.rockitdigital.de/editor.css"></head><body id="tinymce" class="mce-content-body " onload="window.parent.tinymce.get('description').fire('load');" contenteditable="true" spellcheck="false"><p>${file[ 'Beschreibung'.toLowerCase() ]}</p></body></html>`);
    //     //     const content = await children[0].title();
    //     //     console.log( content );
    //     // }
    //     // const paragraph = await myframe.$('p');
    //     // if ( paragraph == null ) return;
    //     // myframe.type( '', 'framer' );
    // });
    // return;
    // frame.parentNode.removeChild( frame );
    const content = "'" + file[ 'Beschreibung'.toLowerCase() ].toString() + "'";

    await page.addScriptTag({
        content: `const frame = document.querySelector( '#description_ifr' );
        const papa = frame.contentWindow.document.querySelector('#tinymce > p');
        console.log( papa );
        papa.innerText = "${content}";`
    });
    // return;
    await page.type( DOM_IDS['first_page']['Job-Titel / Position'], file['Job-Titel / Position'.toLowerCase()]);
    // await page.type ( DOM_IDS['first_page']['Beschreibung'], file[ 'Beschreibung'.toLowerCase() ]);
    await page.type( DOM_IDS['first_page']['Anstellung'], file[ 'Anstellung'.toLowerCase() ]);
    await page.type ( DOM_IDS['first_page']['Vertrag'], file[ 'Vertrag'.toLowerCase() ]);
    
    const kategories = file['Kategorie(n) *(maximal 2)'.toLowerCase()].split(',').map( cat => cat.trim() );
    for (let index = 0; index < kategories.length; index++) {
        console.log( kategories[ index ] );
        await page.click( DOM_IDS['first_page']['Kategorie(n) *(maximal 2)'][ kategories[ index ] ]);
    }
    const jobLevels = file['Berufserfahrung'.toLowerCase() ].split(',').map( level => level.trim() );
    for (let index = 0; index < jobLevels.length; index++) {
        await page.click( DOM_IDS['first_page']['Berufserfahrung'][ jobLevels[ index ] ]);
    }
    await page.type ( DOM_IDS['first_page']['Bewerbung auf folgender Website'], file['Bewerbung auf folgender Website'.toLowerCase() ]);
    await page.type ( DOM_IDS['first_page']['oder Bewerbung per Email'], file['oder Bewerbung per Email'.toLowerCase() ]);
    if( file['Gewünschtes Eintrittsdatum'.toLowerCase()].trim() !== 'sofort' ){
        console.log( file['Gewünschtes Eintrittsdatum'.toLowerCase()] );
    }
    await page.type ( DOM_IDS['first_page']['Ansprechpartner'], file[ 'Ansprechpartner'.toLowerCase() ]);
    await page.type ( DOM_IDS['first_page']['Unternehmen'], file[ 'Unternehmen'.toLowerCase() ]);
    await page.type ( DOM_IDS['first_page']['Straße'], file[ 'Straße'.toLowerCase() ]);
    const plzOrt = file['PLZ, Ort'.toLowerCase()].split(',').map( adr => adr.toString().trim() );
    await page.type ( DOM_IDS['first_page']['PLZ'], plzOrt[0] );
    await page.type ( DOM_IDS['first_page']['Ort'], plzOrt[1] );
    await page.type ( DOM_IDS['first_page']['Webseite'], file[ 'Webseite'.toLowerCase() ]);
    await page.type ( DOM_IDS['first_page']['Video Link'], file['Video Link'.toLowerCase() ]);
    await page.click( DOM_IDS['first_page']['kivaplus']);
    // await page.click( DOM_IDS['first_page']['submit'] );

};

const secondPage = async ( page ) => {
    await page.goto ( page.url() );
    await page.click( DOM_IDS['second_page']['submit']);
};

const lastPage = async ( page ) => {
    await page.goto ( page.url() );
    await page.click( DOM_IDS['last_page']['submit']);
};

const getestedFileKeys = ( file , keys ) => {
    fileKeys = Object.keys( file );
    fileKeys.forEach( key => { 
        keys.push( key );
        if ( typeof file[ key ] !== 'string' )
            getestedFileKeys( file[ key ], keys );
    });
    return keys;
};

const validateExcelFile = ( file, alert ) => {
    domKeys = getestedFileKeys( DOM_IDS, [] ).map( f => f.toLowerCase() );
    fileKeys = Object.keys( file[0] );

    for (let index = 0; index < fileKeys.length; index++) {
        const file = fileKeys[index];
        if ( !domKeys.includes( file.trim() ) ){
            alert( 'something is wrong with ExcelFile data, Not matching to the webiste. Please check it again' );
            return false;
        }
    }
    return true;
};

const notEmptyFile = file => {
    if ( 
        file['Job-Titel / Position'.toLowerCase()] == '' ||
        file['Beschreibung'.toLowerCase()] == ''   
        ) return false;

    return true;
};

const fillTheForm = async ( exelFileData, page, url ) => {

    exelFileData = exelFileData.filter( notEmptyFile );

    for ( let index = 0; index < exelFileData.length ; index++){
        const file = exelFileData[index];
        await page.goto( url );

        await firstPage( file, page );
        // await secondPage( file, page );
        // await lastPage( page );
    }
};

module.exports.logIn = logIn;
module.exports.fillTheForm = fillTheForm;
module.exports.validateExcelFile = validateExcelFile;