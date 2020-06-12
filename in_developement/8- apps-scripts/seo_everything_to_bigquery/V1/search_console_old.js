
function getGSCSearchAnalytics( site ){
	var service = getService();
	if( service.hasAccess() ){
		if( !site || site == '' ){
			Logger.log( 'Please, choose site and rerun script.' );
			return null;
		}
		
		var apiURL = 'https://www.googleapis.com/webmasters/v3/sites/' + URLDecode( site ) + '/searchAnalytics/query?fields=rows&alt=json';
		var startDate 	= '2018-06-01';
		var endDate 	= '2018-10-30';
		
		var headers = {
			Authorization : 'Bearer ' + service.getAccessToken(),
		};
		
		var payload = {
			startDate 	: startDate,
			endDate 	: endDate,
			dimensions 	: [ 'query', 'page', 'device' ],
			rowLimit 	: '25000',
		};
		
		var options = {
			headers		: headers,
			contentType	:'application/json',
			method		: 'post',
			payload		: JSON.stringify( payload ),
			muteHttpExceptions	: true,
		};
		
		try {
			var response = UrlFetchApp.fetch( apiURL, options );
		}catch( e ){
			Logger.log( e );
		}
		Logger.log( response );
		
		var result = JSON.parse( response.getContentText() );
		
		if( result.error ){
			Logger.log( result.error.errors[ 0 ].message );
			return null;
		}
		
		var row = [];
		for( var i in result.rows ){
			row.push([
				result.rows[ i ].keys[ 0 ],
				result.rows[ i ].keys[ 1 ],
				result.rows[ i ].keys[ 2 ],
				result.rows[ i ].clicks,
				result.rows[ i ].impressions,
				result.rows[ i ].ctr,
				result.rows[ i ].position,
			]);
		}
		
		Logger.log( JSON.stringify( row, null, 2 ) );
		// s_searchAnalytics.getRange(2,1,row.length,7).setValues(row);
		//     var formulas = []
		//    for(var k=7;k<row.length+7;k++){
		//      formulas.push(["=ROUND(G"+k+";1)"])
		//    }
		//    s_searchAnalytics.getRange(2,8,formulas.length,1).setFormulas(formulas); // for round of average position values
	} else {
		var authorizationUrl = service.getAuthorizationUrl();
		Logger.log('Open the following URL and re-run the script: %s', authorizationUrl);
	}
}

//---------------------------------------------------------------------------------------------------------------------------------------------

function getCrawlErrorsDetails(){
  var service = getService();
  if (service.hasAccess()) {
    s_crawlSampleByUrl.getRange(2,1,7000,3).clear();
    
    var site = site_name;
    var category = s_crawlSamples.getRange(2, 2).getValue();
    var platform = s_crawlSamples.getRange(2, 3).getValue();
    var errorUrls = s_crawlSamples.getRange(7,1,1000,1).getValues();
    var row = [];
    
    for (var i=0;i<errorUrls.length;i++){
      if (errorUrls[i]!=''){
        var URL = errorUrls[i].toString();
        
        var apiURL = 'https://www.googleapis.com/webmasters/v3/sites/' + URLDecode(site) + '/urlCrawlErrorsSamples/' + URLDecode(URL) + '?category=' + category + '&platform=' + platform;
    
        var headers = {"Authorization": "Bearer " + getService().getAccessToken()};
    
        var options = {
          "headers": headers,
          "contentType":'application/json',
          "method" : "get",
      "muteHttpExceptions": true
        };
    
        try {
          var response = UrlFetchApp.fetch(apiURL, options);
        } 
        catch (e) {
          Logger.log(e);
        }
        //Logger.log(response)
        
        var result = JSON.parse(response.getContentText());
        
        if (result.error){
          row.push([
              errorUrls[i],
              result.error.errors[0].reason
            ]);
        }
        
        else if(result.urlDetails){
          var linkedFromUrls = result.urlDetails.linkedFromUrls;
        
          for (var j in linkedFromUrls){
            row.push([
              result.pageUrl,
              linkedFromUrls[j]
            ]);
          }
        }
        else {
          row.push([
              errorUrls[i],
              'No Linked From Urls'
            ]);
        }
        Utilities.sleep(80)  // OAuth library requirement for requests frequency
      }
      else {break;}
    }
    
    if(row[0]!=''){
      s_crawlSampleByUrl.getRange(2,1,row.length,2).setValues(row);
    }
    
  } else {
    var authorizationUrl = service.getAuthorizationUrl();
    Logger.log('Open the following URL and re-run the script: %s', authorizationUrl);
  }
}

//---------------------------------------------------------------------------------------------------------------------------------------------

function checkLinks(){
  var donors = s_crawlSampleByUrl.getRange(2,2,1000,1).getValues(); // API gives only up to 1000 examples
  var acceptors = s_crawlSampleByUrl.getRange(2,1,1000,1).getValues();
  
  for (var i=0;i<1000;i++){
    if (donors[i]!=''){
      if (donors[i]!='notFound' || donors[i]!='No Linked From Urls'){
        try
        {
          var donor = donors[i].toString();
          var acceptor = acceptors[i].toString();
          
          var response = UrlFetchApp.fetch(donor);
          var responseCode = response.getResponseCode();
          
          var text = response.getContentText();
          if (text.indexOf(acceptor)+1)                              //if there is link in donor's source code
            {s_crawlSampleByUrl.getRange(i+2,3).setValue("Yes");}
          else if (text.indexOf(URLDecode(acceptor))+1)              //if link is encoded
            {s_crawlSampleByUrl.getRange(i+2,3).setValue("Yes");}
          else if (text.indexOf(base64_encode(acceptor))+1)          //if link is base64 encoded (often for forums)
            {s_crawlSampleByUrl.getRange(i+2,3).setValue("Yes");}
          else
            {s_crawlSampleByUrl.getRange(i+2,3).setValue("No");}
        }
        catch(e)
        {
          s_crawlSampleByUrl.getRange(i+2,3).setValue("Error");      //if site is not available
        }
      }
    } else{break;}
  }
  
}

//---------------------------------------------------------------------------------------------------------------------------------------------

function markAsFixed(){
  var service = getService();
  if (service.hasAccess()) {
    var site = site_name;
    var category = s_crawlSamples.getRange(2, 2).getValue();
    var platform = s_crawlSamples.getRange(2, 3).getValue();
    var fixUrls = s_crawlSamples.getRange(7,1,1000,5).getValues(); // there could be max 1000 examples from API
     
    var row = [];
    for (var i=0;i<fixUrls.length;i++){
      if (fixUrls[i][0]!=''){
        if (fixUrls[i][4]=='Yes'){
        
          var apiURL = 'https://www.googleapis.com/webmasters/v3/sites/' + URLDecode(site) + '/urlCrawlErrorsSamples/' + fixUrls[i][0] + '?category=' + category + '&platform=' + platform;
      
          var headers = {"Authorization": "Bearer " + getService().getAccessToken()};
      
          var options = {
            "headers": headers,
            "contentType":'application/json',
            "method" : "DELETE",
            "muteHttpExceptions": true
          };
      
          try {
            var response = UrlFetchApp.fetch(apiURL, options);
          } 
          catch (e) {
            Logger.log(e);
            Browser.msgBox('"Mark as fixed" eror for ' + fixUrls[i][0]);
          }
          Logger.log(response);
          s_crawlSamples.getRange(i+7,5).setValue('Deleted');
          Utilities.sleep(80)  // OAuth library requirement for requests frequency
        }
      }
      else {break;}
    }
    
  } else {
    var authorizationUrl = service.getAuthorizationUrl();
    Logger.log('Open the following URL and re-run the script: %s', authorizationUrl);
  }
}

//---------------------------------------------------------------------------------------------------------------------------------------------
// for URL encoding to utf-8
function URLDecode(URL){  
  URL = URL.replace(/{/g,'%7B');
  URL = URL.replace(/}/g,'%7D');
  URL = URL.replace(/:/g,'%3A');
  URL = URL.replace(/\//g,'%2F');
  URL = URL.replace(/\?/g,'%3F');
  URL = URL.replace(/\&/g,'%26');
  return URL;
}

//---------------------------------------------------------------------------------------------------------------------------------------------

function base64_encode(data) {
  var b64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
  var o1, o2, o3, h1, h2, h3, h4, bits, i = 0,
    ac = 0,
    enc = '',
    tmp_arr = [];
  if (!data) {
    return data;
  }
  do { // pack three octets into four hexets
    o1 = data.charCodeAt(i++);
    o2 = data.charCodeAt(i++);
    o3 = data.charCodeAt(i++);
    bits = o1 << 16 | o2 << 8 | o3;
    h1 = bits >> 18 & 0x3f;
    h2 = bits >> 12 & 0x3f;
    h3 = bits >> 6 & 0x3f;
    h4 = bits & 0x3f;
    // use hexets to index into b64, and append result to encoded string
    tmp_arr[ac++] = b64.charAt(h1) + b64.charAt(h2) + b64.charAt(h3) + b64.charAt(h4);
  } while (i < data.length);
  enc = tmp_arr.join('');
  var r = data.length % 3;
  return (r ? enc.slice(0, r - 3) : enc) + '==='.slice(r || 3);
}

//---------------------------------------------------------------------------------------------------------------------------------------------
