
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
    }

};

const DEFAULT_LOGIN = "a.bakhabou@pa.ag";
const DEFAULT_PASSWORD = "test";

const logIn = async ( login, password, page ) => {
    login = login || DEFAULT_LOGIN;
    password = password || DEFAULT_PASSWORD;

    await page.type( DOM_IDS.login , login);
    await page.type( DOM_IDS.password , password);
    await page.click( DOM_IDS.submitLogin );
    return await page;
};

const fillTheForm = async ( exelFileData, page ) => {
 
    await page.type ( DOM_IDS['first_page']['Position/Tätigkeit'], exelFileData[0][ 'Position/Tätigkeit'.toLowerCase() ] ); 
    await page.type ( DOM_IDS['first_page']['Tätigkeitsart'], exelFileData[0][ 'Tätigkeitsart'.toLowerCase() ] ); 
    await page.click ( DOM_IDS['first_page']['Qualifikation']['junior'] );
    await page.type ( DOM_IDS['first_page']['Beschreibung'], exelFileData[0][ 'Beschreibung'.toLowerCase() ] ); 
    await page.type ( DOM_IDS['first_page']['Jobanbieter'], exelFileData[0][ 'Jobanbieter'.toLowerCase() ] );
    await page.waitFor(3000);
    await page.select( '#id_offering_institution', '' );

    // await page.type ( DOM_IDS['first_page']['Zip'], exelFileData[0][ 'Zip'.toLowerCase() ] );
    // await page.type ( DOM_IDS['first_page']['Ort'], exelFileData[0][ 'Ort'.toLowerCase() ] );
    await page.type ( DOM_IDS['first_page']['Land'], exelFileData[0][ 'Land'.toLowerCase() ] );
    await page.type ( DOM_IDS['first_page']['Website'], exelFileData[0][ 'Website'.toLowerCase() ] ); 

    // exelFileData.forEach( file =>{

        // Object.keys( DOM_IDS['first_page'] ).forEach( async key => {
        //     if ( key == 'submit' || typeof key !== 'string' ) return;
        //     const key2 = key.toLowerCase().trim();
        //     await page.type( DOM_IDS['first_page'][ key ], file[ key2 ] );
        //     // console.log( file[ key2 ] );
        //     // console.log( DOM_IDS.first_page[ key ] );
        // });
    // });
            // try {
            //     if ( key2 == 'Qualifikation'.toLowerCase().trim() ){
            //         await page.type( DOM_IDS.first_page['Qualifikation']['junior'], file[ key2 ] );
            //         return;
            //     }
            //     if ( key2 == 'ich bin der ansprechpartner'.toLowerCase().trim() ){
            //         if ( file[ key2 ].trim() !== "" )
            //             await page.click( DOM_IDS.first_page['ich bin der ansprechpartner']);
            //         return;
            //     }
            //     if ( key2 == 'ich bin nicht der ansprechpartner'.toLowerCase().trim() ){
            //         if ( file[ key2 ].trim() !== "" ){
            //             await page.click( DOM_IDS.first_page['ich bin nicht der ansprechpartner']['id']);
            //             await page.type( DOM_IDS.first_page['ich bin nicht der ansprechpartner']['input'], file[ key2 ] );
            //         }
            //         return;
            //     }
            //     if ( key2 == 'Telefon'.toLowerCase().trim() ){
            //         if ( file[ key2 ].trim() !== "" )
            //             await page.type( DOM_IDS.first_page['Telefon']['phone_number'], file[ key2 ]);
            //         return;
            //     }
            //     if ( key2 == 'Fax'.toLowerCase().trim() ){
            //         if ( file[ key2 ].trim() !== "" )
            //             await page.type( DOM_IDS.first_page['Fax']['fax_numbder'], file[ key2 ]);
            //         return;
            //     }
            //     await page.type( DOM_IDS.first_page[key2] , file[ key2 ]);
            // } catch (error) {
            //     console.log( error );
            //     console.log( file[ key2 ] );
            // }
       
    // await page.click( DOM_IDS.first_page.submit );
};

module.exports.logIn = logIn;
module.exports.fillTheForm = fillTheForm;