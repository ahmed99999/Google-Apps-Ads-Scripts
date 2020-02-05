
const DOM_IDS = {
    login        : "#id_login-email_or_username",
    password     : "#id_login-password",
    submitLogin  : "#submit-id-login_submit",
    first_page : {
        'Position/Tätigkeit'     : "#id_position",
        'Tätigkeitsart' : "#id_job_type",
        Qualifikation: {
            'junior'    : "#id_qualifications_1",
            'middle'    : "#id_qualifications_2",
            'senior'    : "#id_qualifications_3",
            'n/a'       : "#id_qualifications_4"
        },
        Beschreibung: "#id_description",
        Jobanbieter : 'dd[class="institution-select"] input[type="text"]',
        'Strasse/Hausnummer' : "#id_street_address",
        'Adresse (Zweite Zeile)': '#id_street_address2',
        Zip  : "#id_postal_code",
        Ort : "#id_city",
        Land : "#id_country",
        "ich bin der ansprechpartner": "#id_contact_person_ind_1",
        "ich bin nicht der ansprechpartner" : {
            id      : "#id_contact_person_ind_2",
            input   : "#id_contact_person_name"
        },
        Telefon : {
            phone_country : "#id_phone_country",
            phone_number : "#id_phone_number"   
        },
        Fax: {
            fax_country : "#id_fax_country",
            fax_numbder : "#id_fax_number"
        },
        'E-Mail': "#id_email0_address",
        Website: "#id_url0_link",
        submit : 'input[type="submit"]'
    },
    second_page: {
        Jobbereiche : {
            'Community-Management': "#id_job_sectors_1",
            'Management': "#id_job_sectors_2",
            'Produkt-Management': "#id_job_sectors_3",
            'Sales & Support': "#id_job_sectors_4",
            'Museum & Kunst': "#id_job_sectors_5",
            'Stiftung & Nonprofit': "#id_job_sectors_6",
            'Kulturwirtschaft': "#id_job_sectors_7",
            'Bildung & Öffentlicher Sektor': "#id_job_sectors_8",
            'Musik & Bühne': "#id_job_sectors_9",
            'Werbung': "#id_job_sectors_10",
            'Online & IT': "#id_job_sectors_11",
            'Integrated': "#id_job_sectors_12",
            'Grafik-Design': "#id_job_sectors_13",
            'Marketing': "#id_job_sectors_14",
            'PR & Event': "#id_job_sectors_15",
            'Dialog / DM / CRM': "#id_job_sectors_16",
            'Corporate - CD / CI / CC':"#id_job_sectors_17",
            'Games': "#id_job_sectors_18",
            'Industrie / Produkt': "#id_job_sectors_19",
            'TV & Film': "#id_job_sectors_20",
            'Package-Design': "#id_job_sectors_21",
            'Mobile': "#id_job_sectors_22",
            'Medien & Literatur': "#id_job_sectors_23",
            'Andere': "#id_job_sectors_24"
        },
        Stichworte: "#id_tags",
        Kategorien: {
            'Architektur': "#id_categories_1",
            'Bildende Kunst': "#id_categories_2",
            'Design': "#id_categories_3",
            'Eventbranche': "#id_categories_4",
            'Film & Rundfunk': "#id_categories_5",
            'Fotografie': "#id_categories_6",
            'Games & Interactive': "#id_categories_7",
            'Literatur & Verlage': "#id_categories_8",
            'Mode & Textil': "#id_categories_9",
            'Musik': "#id_categories_10",
            'Tanz & Theater': "#id_categories_11",
            'Werbung & PR': "#id_categories_12",
            'Sonstiges': "#id_categories_13"
        },
        submit : 'input[value="Weiter"]'
    },
    last_page: {
        kulturmanagement : "#id_report_kulturmanagement",
        talent_in_berlin: "#id_report_talent_in_berlin",
        submit : 'input[value="Weiter"]'
    }
};

const DEFAULT_LOGIN = "a.bakhabou@pa.ag";
const DEFAULT_PASSWORD = "test";

const logIn = async ( login, password, page ) => {
    login = login || DEFAULT_LOGIN;
    password = password || DEFAULT_PASSWORD;

    await page.type( DOM_IDS.login , login );
    await page.type( DOM_IDS.password , password );
    await page.click( DOM_IDS.submitLogin );
    return await page;
};

const firstPage = async ( file, page ) => {
    await page.type ( DOM_IDS['first_page']['Position/Tätigkeit'], file[ 'Position/Tätigkeit'.toLowerCase() ] ); 
    await page.type ( DOM_IDS['first_page']['Tätigkeitsart'], file[ 'Tätigkeitsart'.toLowerCase() ] ); 
    await page.click( DOM_IDS['first_page']['Qualifikation']['junior'] );
    await page.type ( DOM_IDS['first_page']['Beschreibung'], file[ 'Beschreibung'.toLowerCase() ] ); 
    await page.type ( DOM_IDS['first_page']['Jobanbieter'], file[ 'Jobanbieter'.toLowerCase() ] );

    await page.type ( DOM_IDS['first_page']['Strasse/Hausnummer'], file[ 'Strasse/Hausnummer'.toLowerCase() ] );
    await page.type ( DOM_IDS['first_page']['Zip'], file[ 'Zip'.toLowerCase() ].toString() );
    await page.type ( DOM_IDS['first_page']['Ort'], file[ 'Ort'.toLowerCase() ] );
    await page.type ( DOM_IDS['first_page']['Land'], file[ 'Land'.toLowerCase() ] );
    
    if ( file["ich bin der ansprechpartner".toLowerCase()].trim() !== "" )
        await page.click ( DOM_IDS['first_page']["ich bin der ansprechpartner"] );
    if ( file["ich bin nicht der ansprechpartner".toLowerCase()].trim() !== "" ){
        await page.click ( DOM_IDS['first_page']['ich bin nicht der ansprechpartner']['id'] );
        await page.type ( DOM_IDS['first_page']['ich bin nicht der ansprechpartner']['input'], file["ich bin nicht der ansprechpartner".toLowerCase()] );
    }
    await page.type ( DOM_IDS['first_page']['Telefon']['phone_number'], file[ 'Telefon'.toLowerCase() ].toString().replace(/^(49)/, '') );
    await page.type ( DOM_IDS['first_page']['Fax']['fax_numbder'], file[ 'Fax'.toLowerCase() ].toString().replace(/^(49)/, '') );

    await page.type ( DOM_IDS['first_page']['Website'], file[ 'Website'.toLowerCase() ] ); 

    await page.click( DOM_IDS.first_page.submit );
};

const secondPage = async ( file, page ) => {
    await page.goto ( page.url() );
    const Jobbereiches = file['Jobbereiche'.toLowerCase()].split(',').map( job => job.toLowerCase().trim() );
    const jobCategories = file['Kategorien'.toLowerCase()].split(',').map( jobOffer => jobOffer.toLowerCase().trim() );

    for ( let index = 0; index < Object.keys( DOM_IDS['second_page']['Jobbereiche'] ).length; index++) {
        let key = Object.keys( DOM_IDS['second_page']['Jobbereiche'] )[ index ];
        if ( Jobbereiches.includes( key.toLowerCase() ) ){
            await page.click( DOM_IDS['second_page']['Jobbereiche'][ key ] );
        }
    }
    await page.type ( DOM_IDS['second_page']['Stichworte'], file['Stichworte'.toLowerCase()]);
    Object.keys( DOM_IDS['second_page']['Kategorien']).forEach( async key =>{
        if ( jobCategories.includes( key.toLowerCase() ) )
            await page.click ( DOM_IDS['second_page']['Kategorien'][key] );
    });
    await page.click( DOM_IDS['second_page']['submit'] );
};

const lastPage = async ( page ) => {
    await page.goto ( page.url() );
    await page.click( DOM_IDS['last_page']['kulturmanagement'] );
    await page.click( DOM_IDS['last_page']['talent_in_berlin'] );
    // await page.click( DOM_IDS['last_page']['submit'] );
};

const fillTheForm = async ( exelFileData, page, url ) => {

    exelFileData.forEach( async function( file ){
        await page.goto( url );
        await firstPage( file, page );
        await secondPage( file, page );
        await lastPage( page );
    });
};

module.exports.logIn = logIn;
module.exports.fillTheForm = fillTheForm;