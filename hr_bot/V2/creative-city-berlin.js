
const DOM_IDS = {
    login   : "#id_login-email_or_username",
    password: "#id_login-password",
    submitLogin : "#submit-id-login_submit",
    position :"#id_position",

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

const fillTheForm = ( exelFileData ) => {
    const dataKeys = Object.keys( exelFileData );
    if ( 
        dataKeys.length === 0 || 
        dataKeys.reduce( (result, key ) => Object.keys( DOM_IDS ).indexOf( key ) >= 0 && result , true )
    ) throw new Error( 'check the Excel File please' );

};

module.exports.logIn = logIn;
module.exports.fillTheForm = fillTheForm;