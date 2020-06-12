
function deleteRemarketingAudience(){
	// SETTINGS
	
	var accountId                = 775035;
	var webPropertyId            = 'UA-775035-32';
	var audienceNamesToBeDeleted = [ 'Alle Nutzer SHOP', 'yyy' ];
	var deleteAudiences          = false; // shall we really delete aucidences?
	
	// END OF SETTINGS
	
	var audiencesToBeDeleted = Analytics
		.Management
		.RemarketingAudience
		.list( accountId, webPropertyId )
		.items
		.filter(
			function( item ){
				return audienceNamesToBeDeleted.indexOf( item.name ) >= 0;
			}
		)
	;
	
	// print the audiences from analytics which are about to be deleted
	Logger.log(
		JSON.stringify(
			audiencesToBeDeleted
				.map(
					function( item ){
						return 'found audience: ' + item.name;
					}
				),
			null,
			2
		)
	);
	Logger.log(
		'Found '
		+ audiencesToBeDeleted.length
		+ ' from '
		+ audienceNamesToBeDeleted.length
		+ ' audiences in Analytics'
	);
	
	// shall we really delete aucidences?
	if( deleteAudiences ){
		audiencesToBeDeleted.forEach(
			function( audienceToBeDeleted ){
				Analytics
					.Management
					.RemarketingAudience
					.remove( accountId, webPropertyId, audienceToBeDeleted.id )
				;
				Logger.log( audienceToBeDeleted.name + ' deleted ' );
			}
		);
	}
}
