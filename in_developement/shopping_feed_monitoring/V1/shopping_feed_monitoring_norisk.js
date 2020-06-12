/**
 *   Merchant Center Dashboard for MCC
 *   Version: 1.1.1
 *   @author: Christopher Gutknecht
 *   norisk GmbH
 *   [email protected]
 *
 *   Demo-Spreadsheet to copy: https://docs.google.com/spreadsheets/d/1SD-1xOeRxk5BRkGc-6WdFy2JQOMrC6ZqZguVoHoH-kQ/edit?usp=sharing
 *   Detailed Blog post soon here: https://www.noriskshop.de/category/adwords-scripts/ 
 *   updates 1.1.1: skips accounts with no feeds @TODO: generic skip account rule 
 *
 *
 * THIS SOFTWARE IS PROVIDED BY norisk GMBH ''AS IS'' AND ANY
 * EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL norisk GMBH BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */
// Reference https://developers.google.com/shopping-content/v2/reference/v2/
function main(){
	var agencyAccountId = '111562067'; // If you have multiple merchant center accounts, enter your TOPLEVEL account ID here
	var SPREADSHEET_ID = '181FY9WEpmSqy52Z6KVb7mbJX2nnOs9A7YBBs0x_JjAI'; //'1lfgADUChpat314FvtILzc3WJ34O6th9b7LPZEVE3VKs'; // The spreadsheet ID is part of the spreadsheet URL, ie docs.google.com/spreadsheets/d/ SPREADSHEET-ID /edit
	var SHEETNAMES = [ 'feeds', 'errors', 'warnings', 'dataQualityIssues' ]; // Name your spreadsheets tabs accordingly
	var SCRIPT_NAME = 'MerchantCenterDashboard';
	// 1. Write to Feed Sheet
	var accountArray = [];
	accountArray = getAccountArray( agencyAccountId );
	Logger.log( accountArray );
	
	var feedArray = getFeedArray( accountArray );
	var feedColumnHeaders = [
		[ 'Account Name', 'Country', 'Filename', 'Items Total', 'Items Valid', 'Item Errors', 'Status', 'Last Update', 'Feed Schedule' ]
	];
	var errorColumnHeaders = [
		[ 'Account Name', 'Feed Id', 'Error Message', 'Error Code', 'Nr Errors', 'Error Examples' ]
	];
	var warningColumnHeaders = [
		[ 'Account Name', 'Feed Id', 'Warning Message', 'Warning Code', 'Nr Warnings', 'Warning Examples' ]
	];
	var dataQualityIssueHeaders = [
		[ 'Account Name', 'Issue Severity', 'Nr Issues', 'Issue Type', 'LastChecked', 'Data Quality Issue Examples' ]
	];
	var ss = SpreadsheetApp.openById( SPREADSHEET_ID );
	printDataToSheet( SHEETNAMES[ 0 ], feedColumnHeaders, feedArray, 4 );
	// 2.Write to Error Sheet
	var feedErrorArray = getFeedErrorArray( accountArray );
	printDataToSheet( SHEETNAMES[ 1 ], errorColumnHeaders, feedErrorArray, 5 );
	// 3.Write to Warning Sheet
	var feedWarningArray = getFeedWarningArray( accountArray );
	printDataToSheet( SHEETNAMES[ 2 ], warningColumnHeaders, feedWarningArray, 5 );
	// 4.Write to Data Quality Issue Sheet
	var feedDataQualityArray = getFeedDataQualityArray( agencyAccountId, accountArray );
	printDataToSheet( SHEETNAMES[ 3 ], dataQualityIssueHeaders, feedDataQualityArray, 3 );
	////////////////////////////////////
	////////////////////////////////////
	//// Function Definitions
	////////////////////////////////////
	////////////////////////////////////
	/**
	 * Returns a list of GMC accounts for a given client center ID.
	 * @param {String} a client center/agency account ID.
	 * @return {Array} A twodimensional array of account names and IDs.
	 */
	function getAccountArray( agencyAccountId ){
		var accounts = ShoppingContent.Accounts.list( agencyAccountId );
		for( i = 0; i < accounts.resources.length; i++ ){
			var accountData = [ accounts.resources[ i ].name, accounts.resources[ i ].id ];
			accountArray.push( accountData );
		}
		return accountArray;
	}
	/**
	 * Return a list of feeds for given account array.
	 * @param {Array} a twodimensional list of account names and IDs.
	 * @return {Array} A twodimensioal array of feeds and related information.
	 */
	function getFeedArray( accountArray ){
		var feedArray = [];
		for( i = 0; i < accountArray.length; i++ ){
			var datafeeds = ShoppingContent.Datafeeds.list( accountArray[ i ][ 1 ] );
			// Checks if there are any datafeeds in account, if not continue with next account.
			if( !datafeeds.resources ){
				continue;
			}
			for( j = 0; j < datafeeds.resources.length; j++ ){
				//Logger.log( 'datafeeds.resources: ' + datafeeds.resources[ j ] );
				
				var targets =  datafeeds.resources[ j ].targets || [{
					country  : datafeeds.resources[ j ].targetCountry,
					language : datafeeds.resources[ j ].targetLanguage,
				}];
				for( c = 0; c < targets.length; c++ ){
					var target = targets[ c ];
					var singlefeedInfo = [
						accountArray[ i ][ 0 ],
						datafeeds.resources[ j ].targetCountry || target[ 'country' ],
						datafeeds.resources[ j ].fileName
					];
					try{
						var dataFeedsStatuses = ShoppingContent
							.Datafeedstatuses
							.get(
								accountArray[ i ][ 1 ],
								datafeeds.resources[ j ].id,
								target
						);
						//Logger.log( 'dataFeedsStatuses: ' + dataFeedsStatuses );
						singlefeedInfo.push(
							dataFeedsStatuses.itemsTotal,
							dataFeedsStatuses.itemsValid,
							dataFeedsStatuses.itemsTotal - dataFeedsStatuses.itemsValid,
							dataFeedsStatuses.processingStatus,
							dataFeedsStatuses.lastUploadDate ? dataFeedsStatuses.lastUploadDate.slice( 0, 10 ) : 'none'
						);
					}catch( error ){
						
						Logger.log( 'error: ' + error );
						Logger.log( 'merchant-center-id: ' + accountArray[ i ][ 1 ] );
						Logger.log( 'datafeed-id: ' + datafeeds.resources[ j ].id );
						
						singlefeedInfo.push(
							'error', //.itemsTotal,
							'error', //.itemsValid,
							'error', //.itemsTotal - .itemsValid,
							error.message, //.processingStatus,
							'error' //.lastUploadDate.slice( 0, 10 )
						);
						// ignore
					}
					singlefeedInfo.push(
						// check if scheduling exists
						datafeeds.resources[ j ].fetchSchedule ?
							datafeeds.resources[ j ].fetchSchedule.hour + ' Uhr' : 'not scheduled'
					);
					feedArray.push( singlefeedInfo );
				}
			}
		}
		return feedArray;
	}
	/**
	 * Prints the respective data array to the specified sheet.
	 * @param SHEETNNAME {String} the name of the sheet or tab.
	 * @param COLUMNHEADERS {Array} a list of columns names.
	 * @param dataArray {Array} a client center/agency account ID.
	 * @param sortColumn {Int} the column index to sort by.
	 * @return void.
	 */
	function printDataToSheet( SHEETNAME, COLUMNHEADERS, dataArray, sortColumn ){
		var sheet = ss.getSheetByName( SHEETNAME );
		sheet.getRange( 'a2:i1000' ).clearContent();
		sheet.getRange( 2, 1, 1, COLUMNHEADERS[ 0 ].length ).setValues( COLUMNHEADERS );
		if( dataArray.length > 0 ){
			var dataRange = sheet.getRange( 3, 1, dataArray.length, dataArray[ 0 ].length );
			dataRange.setValues( dataArray );
			var sortRange = sheet.getRange( 'A:I' );
			sortRange.sort({
				column: sortColumn,
				ascending: false
			});
			Logger.log( SHEETNAME + ' list successfully printed to ' + SHEETNAME + ' sheet.' );
		}else{
			Logger.log( 'Nothing to print to ' + SHEETNAME + '. No ' + SHEETNAME + ' found.' );
		}
	}
	/**
	 * @param {Array} a twodimensional list of account names and IDs.
	 * @return {Array} A twodimensional array of feed errors and related information.
	 */
	function getFeedErrorArray( accountArray ){
		var feedErrorArray = [];
		for( i = 0; i < accountArray.length; i++ ){ // 1. START Iterate through all GMC accounts > return resources array
			var dataFeedsStatuses = ShoppingContent.Datafeedstatuses.list( accountArray[ i ][ 1 ] );
			if( !dataFeedsStatuses.resources ){
				continue;
			}
			for( j = 0; j < dataFeedsStatuses.resources.length; j++ ){ // 2. START Resource Iterator: Iterate through all resources aka feeds   
				if( dataFeedsStatuses.resources[ j ].errors ){ // 3. Check if errors exist
					for( k = 0; k < dataFeedsStatuses.resources[ j ].errors.length; k++) { // 3.a) START Error Iterator: Iterate through all errors
						var singleFeedInfo = [];
						singleFeedInfo.push(
							accountArray[ i ][ 0 ],
							dataFeedsStatuses.resources[ j ].datafeedId,
							dataFeedsStatuses.resources[ j ].errors[ k ].message.substring( 0, 100 ).replace(
								'Insufficient product identifiers',
								'Insuff Product Ident'
							).replace(',', '\,'),
							dataFeedsStatuses.resources[ j ].errors[ k ].code.replace( ',', '\,' ),
							dataFeedsStatuses.resources[ j ].errors[ k ].count
						);
						var errorExampleMax = dataFeedsStatuses.resources[ j ].errors[ k ].examples.length > 3 ? 3 : dataFeedsStatuses.resources[ j ].errors[ k ].examples.length;
						var exampleConcatString = '';
						for( m = 0; m < errorExampleMax; m++ ){ // 3.a.1 START Concatenate error examples
							var singleExampleValue = dataFeedsStatuses.resources[ j ].errors[ k ].examples[ m ].value ? dataFeedsStatuses.resources[ j ].errors[ k ].examples[ m ].value : 'noValue';
							var singleExampleSuffix = m < errorExampleMax - 1 ? '\n' : '';
							var singleExampleString = dataFeedsStatuses.resources[ j ].errors[ k ].examples[ m ].itemId + ' : ' + singleExampleValue.substring( 0, 15 ).replace( ',', '\,' ) + singleExampleSuffix;
							exampleConcatString += singleExampleString;
						} // 3.a.1 END Concatenate error examples
						singleFeedInfo.push( exampleConcatString );
						feedErrorArray.push( singleFeedInfo );
					} // 3.a) END Error Iterator
				} else { // 3.b)) No Error Default Value
					var singleFeedInfo = [];
					singleFeedInfo.push(
						accountArray[ i ][ 0 ],
						dataFeedsStatuses.resources[ j ].datafeedId,
						'no errors',
						'-',
						0,
						'no examples'
					);
					feedErrorArray.push( singleFeedInfo );
				} // 3. END Error Iter
			} // 2. END Resource Iter 
		} // 1. END Account Iter
		return feedErrorArray;
	}
	/**
	 * @param {Array} a twodimensional list of account names and IDs.
	 * @return {Array} A twodimensional array of feed warnings and related information.
	 */
	function getFeedWarningArray( accountArray ){
		var feedWarningArray = [];
		for( i = 0; i < accountArray.length; i++ ){ // 1. START Iterate through all GMC accounts > return resources array
			var dataFeedsStatuses = ShoppingContent.Datafeedstatuses.list( accountArray[ i ][ 1 ] );
			if( !dataFeedsStatuses.resources ){
				continue;
			}
			for( j = 0; j < dataFeedsStatuses.resources.length; j++ ){ // 2. START Resource Iterator: Iterate through all resources aka feeds   
				if( dataFeedsStatuses.resources[ j ].warnings ){ // 3. Check if warnings exist
					for( k = 0; k < dataFeedsStatuses.resources[ j ].warnings.length; k++ ){ // 3.a) START warning Iterator: Iterate through all warnings
						var singleFeedInfo = [];
						singleFeedInfo.push(
							accountArray[ i ][ 0 ], dataFeedsStatuses.resources[ j ].datafeedId,
							dataFeedsStatuses.resources[ j ].warnings[ k ].message.substring( 0, 100 ).replace( ',', '\,' ),
							dataFeedsStatuses.resources[ j ].warnings[ k ].code.replace( ',', '\,' ),
							dataFeedsStatuses.resources[ j ].warnings[ k ].count
						);
						var warningExampleMax = dataFeedsStatuses.resources[ j ].warnings[ k ].examples.length > 3 ? 3 : dataFeedsStatuses.resources[ j ].warnings[ k ].examples.length;
						var exampleConcatString = '';
						for( m = 0; m < warningExampleMax; m++ ){ // 3.a.1 START Concatenate warning examples
							var singleExampleValue = dataFeedsStatuses.resources[ j ].warnings[ k ].examples[m].value ? dataFeedsStatuses.resources[ j ].warnings[ k ].examples[ m ].value : 'noValue';
							var singleExampleSuffix = m < warningExampleMax - 1 ? '\n' : '';
							var singleExampleString = dataFeedsStatuses.resources[ j ].warnings[ k ].examples[ m ].itemId + ': ' + singleExampleValue.substring( 0, 10 ).replace( ',', '\,' ) + singleExampleSuffix;
							exampleConcatString += singleExampleString;
						} // 3.a.1 END Concatenate warning examples
						singleFeedInfo.push( exampleConcatString );
						feedWarningArray.push( singleFeedInfo );
					} // 3.a) END warning Iterator
				} else { // 3.b)) No warning Default Value
					var singleFeedInfo = [];
					singleFeedInfo.push( accountArray[ i ][ 0 ], dataFeedsStatuses.resources[ j ].datafeedId, 'no warnings', '-', 0, 'no examples' );
					feedWarningArray.push( singleFeedInfo );
				} // 3. END warning Iter
			} // 2. END Resource Iter 
		} // 1. END Account Iter
		return feedWarningArray;
	}
	/**
	 * @param {string} the account ID of the multi-client merchant center
	 * @return {Array} A twodimensional array of feed data quality issues and related information.
	 */
	function getFeedDataQualityArray( agencyAccountId, accountArray ){
		var feedDataQualityArray = [];
		var accountstatuses = ShoppingContent.Accountstatuses.list( agencyAccountId );
		var accountList = acctArraytToObjArray( accountArray );
		for( j = 0; j < accountstatuses.resources.length; j++ ){ // 1. START Resource Iterator: Iterate through all resources aka issues
			if( accountstatuses.resources[ j ].dataQualityIssues && accountstatuses.resources[ j ].dataQualityIssues.length > 0 ){ // 3. Check if issues exist
				for( k = 0; k < accountstatuses.resources[ j ].dataQualityIssues.length; k++ ){ // 3.a) START issues Iterator: Iterate through all issues
					var singleIssueInfo = [];
					singleIssueInfo.push(
						accountList[ accountstatuses.resources[ j ].accountId ],
						accountstatuses.resources[ j ].dataQualityIssues[ k ].severity,
						accountstatuses.resources[ j ].dataQualityIssues[ k ].numItems,
						accountstatuses.resources[ j ].dataQualityIssues[ k ].id,
						accountstatuses.resources[ j ].dataQualityIssues[ k ].lastChecked
					);
					var issueExampleMax = accountstatuses.resources[ j ].dataQualityIssues[ k ].exampleItems.length > 3 ? 3 : accountstatuses.resources[ j ].dataQualityIssues[ k ].exampleItems.length;
					var exampleConcatString = '';
					for( m = 0; m < issueExampleMax; m++ ){ // 3.a.1 START Concatenate issue examples
						var singleExampleValue = accountstatuses.resources[ j ].dataQualityIssues[ k ].exampleItems[ m ].submittedValue ? accountstatuses.resources[ j ].dataQualityIssues[ k ].exampleItems[ m ].submittedValue : 'noValue';
						var singleExampleSuffix = m < issueExampleMax - 1 ? '\n' : '';
						var singleExampleString = accountstatuses.resources[ j ].dataQualityIssues[ k ].exampleItems[ m ].itemId + ': ' + singleExampleValue.substring( 0, 10 ).replace( ',', '\,' ) + singleExampleSuffix;
						exampleConcatString += singleExampleString.replace( 'online:de:DE:', '' ).replace( 'online:de:AT:', '' );
					} // 3.a.1 END Concatenate issue examples
					singleIssueInfo.push( exampleConcatString );
					feedDataQualityArray.push( singleIssueInfo );
				} // 3.a) END issue Iterator
			}else{ // 3.b)) No issue Default Value
				var singleIssueInfo = [];
				singleIssueInfo.push(
					accountList[ accountstatuses.resources[ j ].accountId ],
					'none',
					'none',
					'--',
					'--',
					'no examples'
				);
				feedDataQualityArray.push( singleIssueInfo );
			} // 3. END issue Iter
		} // 1. END issue Iter 
		return feedDataQualityArray;
	}

	function acctArraytToObjArray( accountArray ){
		var accountObjectList = {};
		for( var i = 0; i < accountArray.length; ++i )
			accountObjectList[ accountArray[ i ][ 1 ] ] = accountArray[ i ][ 0 ];
		return accountObjectList;
	}
}