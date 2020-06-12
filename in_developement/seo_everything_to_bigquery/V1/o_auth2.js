function getService() {
  // Create a new service with the given name. The name will be used when
  // persisting the authorized token, so ensure it is unique within the
  // scope of the property store.
  return OAuth2.createService( 'searchconsole' )

      // Set the endpoint URLs, which are the same for all Google services.
      .setAuthorizationBaseUrl( 'https://accounts.google.com/o/oauth2/auth' )
      .setTokenUrl( 'https://accounts.google.com/o/oauth2/token' )
      

      // Set the client ID and secret, from the Google Developers Console.
      .setClientId( CLIENT_ID )
      .setClientSecret( CLIENT_SECRET )

      // Set the name of the callback function in the script referenced
      // above that should be invoked to complete the OAuth flow.
      .setCallbackFunction( 'authCallback' )

      // Set the property store where authorized tokens should be persisted.
      .setPropertyStore( PropertiesService.getUserProperties() )

      // Set the scopes to request (space-separated for Google services).
      // this is Search Console read only scope for write access is:
      // https://www.googleapis.com/auth/webmasters
      .setScope( 'https://www.googleapis.com/auth/webmasters' )

      // Below are Google-specific OAuth2 parameters.

      // Sets the login hint, which will prevent the account chooser screen
      // from being shown to users logged in with multiple accounts.
      .setParam( 'login_hint', Session.getActiveUser().getEmail() )
      
      // Requests offline access.
      .setParam( 'access_type', 'offline' )

      // Forces the approval prompt every time. This is useful for testing,
      // but not desirable in a production application.
      .setParam( 'approval_prompt', 'force' );
}

function authCallback( request ){
  var searchConsoleService = getService();
  var isAuthorized = searchConsoleService.handleCallback( request );
  if( isAuthorized ){
    return HtmlService.createHtmlOutput( 'Success! You can close this tab.' );
  } else {
    return HtmlService.createHtmlOutput( 'Denied. You can close this tab' );
  }
}

// Modified from http://ctrlq.org/code/20068-blogger-api-with-google-apps-script
