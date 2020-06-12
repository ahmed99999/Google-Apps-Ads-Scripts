
var DIVIDER = '|<>_';

function findFolder( folderName ){
	var folders = DriveApp.getFolders();
	
	while( folders.hasNext() ){
		var folder = folders.next();
		
		if( folder.getName() == foderName ){
			return folder;
		}
	}
	return null;
}


function uploadToCloudStorage( bucketName, accessToken, blob ){
  var options = {
    headers		: { Authorization : 'Bearer ' + accessToken, },
    contentType	  : 'application/json',
    method		  : 'post',
   // contentLength : 12345,
  //  payload		  : {
  //    data        : Utilities.newBlob( 'Hire me!', 'text/plain', 'resume.txt' ),
  //  },
    uploadType    : 'resumable',
    muteHttpExceptions	: MUTE_HTTP_EXCEPTIONS,
  };
  
  // POST ----------------------------------------
  try {
    var response = UrlFetchApp.fetch( 'https://www.googleapis.com/upload/storage/v1/b/'
                                     + bucketName
                                     + '/o?uploadType=resumable'
                                     + '&name=myObject'
                                  //   + '&project=biddy-io'
                                     ,
                                     options
                                    );
    
    Logger.log( 'url-acquire response-code: ' + response.getResponseCode() );
    Logger.log( 'url-acquire response-text: ' + response.getContentText() );
    var headers = response.getHeaders();
    var resumableSessionURI = headers[ 'Location' ];
    
    Logger.log( 'resumableSessionURI: ' + resumableSessionURI );
    
    // PUT ----------------------------------------
    var options = {
      headers		     : { Authorization : 'Bearer ' + accessToken, },
      contentType	     : 'application/json',
      method		     : 'put',
      contentLength      : 536403613,
      payload		     : {
        data             : blob, // Utilities.newBlob( 'Hire me!', 'text/plain', 'resume.txt' ),
      },
      //uploadType         : 'resumable',
      muteHttpExceptions : MUTE_HTTP_EXCEPTIONS,
    };
    Logger.log( 'call the resumableSessionURI' );
    var response = UrlFetchApp.fetch( resumableSessionURI, options );
    Logger.log( 'response-code: ' + response.getResponseCode() );
    Logger.log( 'response-text: ' + response.getContentText() );
    var headers = response.getHeaders();
    Logger.log( 'response-location-header: ' + JSON.stringify( headers, null, 2 ) );
    
    //var result = JSON.parse( response.getContentText() );
   // Logger.log( response.getContentText() );
    
  }catch( e ){
    
    Logger.log( '-> ' + e );
    
  }
  
}


function searchFile( folderId ){

  var folder = DriveApp.getFolderById( folderId );
  var files = folder.getFiles();
  Logger.log( 'folder-name: ' + folder.getName() );
  var blob = null;
  
  while( files.hasNext() ){
    var file = files.next();
   
    var fileName = file.getName();
    
    if( file.getSize() > 400000000 ){
     continue; 
    }
    
    Logger.log( '>' + fileName + ' [' + file.getSize() + ']' + ', file-id: ' + file.getId() + ', url: ' +  file.getDownloadUrl() );
    
    break;
   // var data = blob.getDataAsString();
  }  
  return file;
}

function test2( folderId ){
  var bucketName = 'seo_server_logs';  
  var accessToken = 'ya29.GltPBvuhB8tUsb8O9lN5PvrZpJ91ZiLBv2LmKoasEpQ1ryJbgOoD_1A0IfLyXRmYiyCBHWBbqUc3TsPVQK6V9QMKWeJdM22EC1IVIoE5ahyY6Mqk4RytfP-9Ajxu';
  
  
  var file = searchFile( folderId );
  var url = file.getDownloadUrl();
  
    var options = {
      headers		     : {
        Authorization : 'Bearer ' + accessToken,
      },
     // contentType	     : 'application/json',
      method		     : 'get',
      muteHttpExceptions : MUTE_HTTP_EXCEPTIONS,
    };
  var fileId = '12soM7xpykotOYVbvrk_PEohB_uRwqpdO';
  var url = 'https://drive.google.com/a/peakace.de/uc?confirm=AJtx&export=download&id=' + fileId;
  
  var response = UrlFetchApp.fetch( url, options );
  var text = response.getContentText();
  
  Logger.log( 'url: ' + url );
  /*
  text = text.split( '<body' )[1];
  text = text.split( 'Download anyway' )[0];
  text = text.substring( text.length - 300 );
  Logger.log( 'text: ' + text );
  */
  var text = text.split( 'confirm=' );
  
  if( text.length == 1 ){
    Logger.log( 'no confirm found' );
    return;
  }
  
  var code = text[1].split( '&' )[0];
  
  Logger.log( 'found: ' + code );
  
  //return; // ----------
  var url = 'https://drive.google.com/a/peakace.de/uc?confirm=' + code + '&export=download&id=' + fileId;
  
  Logger.log( url );
  
  var response = UrlFetchApp.fetch( url, options );
  var blob = response.getBlob();
  
  Logger.log( 'response-code: ' + response.getResponseCode() );
  //Logger.log( 'response: ' + JSON.stringify( response.getContentText(), null, 2 ) );
  
  var text = response.getContentText();
  
  Logger.log( text );
  
  
  return;
  
  uploadToCloudStorage( bucketName, accessToken, blob );
  
  return;
  
  var x = Drive.Files.list();
  var id = x.items[0].id;
  Logger.log( 'id: ' + id );
  
    var options = {
      headers		     : { Authorization : 'Bearer ' + accessToken, },
     // contentType	     : 'application/json',
      method		     : 'get',
      muteHttpExceptions : MUTE_HTTP_EXCEPTIONS,
    };
  
  var fileId = '13Lgod5VhF3QiaAcDyiRFvd2iqlQRHKFs';
  var url = 'https://drive.google.com/a/peakace.de/uc?export=download&confirm=oTsF&id=' + fileId;
  
    var response = UrlFetchApp.fetch( url, options );
    Logger.log( 'response-code: ' + response.getResponseCode() );
  
  
  
  Logger.log( JSON.stringify( response.getContentText(), null, 2 ) );
             
             return;
  
  var url = file.downloadUrl;
  
    var response = UrlFetchApp.fetch( url, options );
    Logger.log( 'response-code: ' + response.getResponseCode() );
  
  return;
  
  var file = searchFile( folderId );
    blob = file.getBlob();
  
  
  if( ! blob ){
    Logger.log( 'Blob is undefined.' );
    return;
  }
  
  var x = blob.isGoogleType();
  
  Logger.log( 'x: ' + x );
  
  Logger.log( 'got the blob' );
  
  uploadToCloudStorage(
    bucketName,
    accessToken,
    blob
  );
  
  
  
  return;
  
  
  	//var folder = DriveApp.getRootFolder()
    //Logger.log( 'root-folder: ' + folder.getName() );
  
  
}

function test(){
	var fileId = '1I3yh4WrhbD05I-phhxYVT2Bj-FZ55WmL';
	
  
  
	var file = Drive.Files.get(fileId);
	var fileName = file.getName();
	if( fileName.substring( fileName.length - 4 ).toLowerCase() == '.zip' ){
		var blob = file.getBlob();
		Logger.log( 'file-size: ' + file.getSize() );
	
		//var files = Utilities.unzip( blob );
	}

	// var root = DriveApp.getRootFolder();
	// tree( root, '' );
}

function tree( folder, tab ){
	var tab2 = '  ';
	var files = folder.getFiles();
	Logger.log( tab + folder.getName() );
	
	while( files.hasNext() ){
		var file = files.next();
		var fileName = file.getName();
		Logger.log( tab + tab2 + '>' + fileName );
	}
	var folders = folder.getFolders();
	
	while( folders.hasNext() ){
		var folder = folders.next();
		tree( folder, tab + tab2 );
	}
}

function serverLogsIntoBigquery( folderName ){
	
	var folder = findFolder( folderName );
	
	if( ! folder ){
		Logger.log( 'folder ' + folderName + ' not found.' );
		return;
	}
	
	var matrix = [];

	var files = folder.getFiles();
	while( files.hasNext() ){
		var file = files.next();
		var fileName = file.getName();

		var data = file.getBlob().getDataAsString();
		
		// parseCsv( data, ' ' );
		
		data.split( '\n' )
			.map( function( row ){
				var res1 = row.split( '"' )
					.map( function( part, index ){
						if( index % 2 == 1 ){
							return part.replace( /\s/g, DIVIDER )
						}
						return part;
					}
				).join( '"' );
				return res1;
			})
			.map( function( row ){
				return row.split( ' ' ).map( function( part ){ return part.split( DIVIDER ).join( ' ' ) } );
			})
			.filter( function( row ){
				return row.length >= 11;
			})
			.map( function( row ){
				if( row[ 5 ].substring( 0, 1 ) == '"' ){
					row[ 5 ] = row[ 5 ].substring( 1 ); 
				}
				if( row[ 5 ].substring( row[ 5 ].length - 1 ) == '"' ){
				row[ 5 ] = row[ 5 ].substring( 0, row[ 5 ].length - 1 ); 
				}
				if( row[ 9 ].substring( 0, 1 ) == '"' ){
					row[ 9 ] = row[ 9 ].substring( 1 ); 
				}
				if( row[ 9 ].substring( row[ 9 ].length - 1 ) == '"' ){
					row[ 9 ] = row[ 9 ].substring( 0, row[ 9 ].length - 1 ); 
				}
				if( row[ 10 ].substring( 0, 1 ) == '"' ){
					row[ 10 ] = row[ 10 ].substring( 1 ); 
				}
				if( row[ 10 ].substring( row[ 10 ].length - 1 ) == '"' ){
					row[ 10 ] = row[ 10 ].substring( 0, row[ 10 ].length - 1 );
				}
				var x = row[ 5 ].split( ' ' );
				
				return 
				/*[{
					ip : row[ 0 ],
					datetime : row[ 3 ].substring( 1 ) + ' ' + row[ 4 ].substring( 0, row[ 4 ].length - 1 ),
					request_type : x[ 0 ],
					resource : x[ 1 ],
					protocol : x[ 2 ],
					http_code : row[ 6 ],
					some_number : row[ 7 ],
					client : row[ 9 ],
					domain : row[ 10 ],
				},*/
				[
					row[ 0 ],
					row[ 3 ].substring( 1 ) + ' ' + row[ 4 ].substring( 0, row[ 4 ].length - 1 ),
					x[ 0 ],
					x[ 1 ],
					x[ 2 ],
					row[ 6 ],
					row[ 7 ],
					row[ 9 ],
					row[ 10 ],
				];
			})
			.forEach( function( row ){
				matrix.push( row );
			})
		;
	}
	
	var jobIds = loadIntoBigquery( toCsvChunks( matrix ), BIGQUERY_TABLE_NAME_LOGS );
	Logger.log( '' + JSON.stringify( matrix[ 0 ], null, 2 ) );
}