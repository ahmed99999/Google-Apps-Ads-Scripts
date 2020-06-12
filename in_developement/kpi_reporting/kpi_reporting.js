//SETTINGS
var email = "lynsey.schembri@casumo.com,burak.hun@casumo.com,danelle.azzopardi@casumo.com";
//No space. All metrics available here: https://developers.google.com/adwords/api/docs/appendix/reports/campaign-performance-report
var CampaignMetrics = "Impressions,Cost,Conversions,CostPerConversion,Ctr,Clicks";
var CampaignMainField = "CampaignName";
 //No space. All metrics available here: https://developers.google.com/adwords/api/docs/appendix/reports/campaign-performance-report
var KeywordMetrics = "Ctr,Impressions,Clicks";
var KeywordMainField = "Criteria,Id,KeywordMatchType,AdGroupName,CampaignName";
var tresholdCampaigns = 40; // in percent, without % sign
var tresholdKeywords = 40; // in percent, without % sign
var date1_from = getDateInThePast( 14 );
var date1_to = getDateInThePast( 8 );
var date2_from = getDateInThePast( 7 );
var date2_to = getDateInThePast( 1 );
//END OF SETTINGS


// Number of milliseconds in a day.
var MILLIS_PER_DAY = 1000 * 60 * 60 * 24;

function main(){
	var campaigns = createTable(
		CampaignMainField,
		CampaignMetrics,
		"CAMPAIGN_PERFORMANCE_REPORT",
		"Campaign level KPIs",
		tresholdCampaigns
	);
	var alerts = campaigns[ 0 ] * 1;
	if( alerts > 0 ){
		var table = campaigns[ 1 ];
		var accountId = AdWordsApp.currentAccount().getCustomerId();
		var accountName = AdWordsApp.currentAccount().getName();
		MailApp.sendEmail({
			to: email,
			subject: 'Campaign report for account ' + accountName + ' (' + accountId + ')',
			htmlBody: '<p>Number of alerts: ' + alerts + '</p>' + table
		});
	}
}

function createTable(
	mainField,
	metrics,
	SQLtable,
	subject,
	treshold ){
	
	var alerts = 0;
	metricsArray=metrics.split(",");
	metricsArray.pop();
	var fields=mainField.split(",");
	var table="<h3>"+subject+"</h3><table border=1 cellpadding=5 style='border-collapse: collapse;'><tr>";
	for(var i=0;i<fields.length;i++){
		table+="<th rowspan=2>"+fields[i]+"</th>";
	}
	for(var i=0;i<metricsArray.length;i++){
		table+="<th colspan=3>"+metricsArray[i]+"</th>";
	}
	table+="</tr><tr>";
	for(var i=0;i<fields.length;i++){
		//table+="<th></th>";
	}
	for(var i=0;i<metricsArray.length;i++){
	table+="<th style='color:#999999'>Last W</th><th style='color:#999999'>Prior W</th><th>Diff.</th>";
	}
	table+="</tr>";

	var report2 = AdWordsApp.report( 'SELECT ' + mainField + ',' + metrics + ' FROM ' + SQLtable + ' WHERE CampaignName IN ["Casumo Brand - All Devices - Mix","Casumo Casino Brand - All Devices - Exact","Casumo Brand - Tablet - Exact","Casumo Brand - Desktop - Exact","Casumo Brand - Mobile - Exact"] AND Impressions>0 DURING ' + date2_from + ',' + date2_to );
	var rows2 = report2.rows();
	var clicks1 = 0;
	var impr1 = 0;
	var clicks2 = 0;
	var impr2 = 0;
	var conv1 = 0;
	var conv2 = 0;
	var pa_ctr1 = 0;
	var pa_ctr2 = 0;
	var pa_clicks1 = 0;
	var pa_clicks2 = 0;
	
	while( rows2.hasNext() ){
		var row2 = rows2.next();
		if( SQLtable == "CAMPAIGN_PERFORMANCE_REPORT" ){
			var where = "CampaignName='" + row2[ 'CampaignName' ] + "'";
		}
		if( SQLtable == "KEYWORDS_PERFORMANCE_REPORT" ){
			var where = "Id='" + row2[ 'Id' ] + "'";
		}
		var query = 'SELECT ' + mainField + ',' + metrics + ' FROM ' + SQLtable + ' WHERE ' + where + ' DURING ' + date1_from + ',' + date1_to;
		Logger.log( query );
		var report1 = AdWordsApp.report( query );
	//  Logger.log(report1)
		var rows1 = report1.rows();
		while( rows1.hasNext() ){
			var row1 = rows1.next();
			Logger.log( row1 );
			//   Logger.log("Clicks = "+row1['Clicks']+"/ "+row2['Clicks'])
			clicks1 += parseInt( row1[ 'Cost' ].replace( ",","" ) );
			impr1 += parseInt( row1[ 'Impressions' ].replace(",",""));
			clicks2 += parseInt( row2[ 'Cost' ].replace(",",""));
			impr2 += parseInt( row2[ 'Impressions' ].replace( ',','' ) );
			conv1 += parseInt( row1[ 'Conversions' ].replace( ',','' ) );
			conv2 += parseInt( row2[ 'Conversions' ].replace( ',','' ) );	
			pa_clicks1 += parseInt( row1[ 'Clicks' ].replace( ',','' ) );
			pa_clicks2 += parseInt( row2[ 'Clicks' ].replace( ',','' ) );
			//  Logger.log(clicks1+' '+clicks2+' '+impr1+' '+impr2)
			var thisRow = '<tr>';
			var fields = mainField.split( ',' );
			for( var i = 0; i < fields.length; i++ ){
				thisRow += '<td>' + row1[ fields[ i ] ] + '</td>';
			}
			for( var i = 0; i < metricsArray.length; i++ ){
				var metric = metricsArray[ i ];
				var showRow = 0;
				var m1 = parseFloat( row1[ metric ].replace( '%', '' ).replace( ',','' ))
				var m2 = parseFloat( row2[ metric ].replace( '%', '' ).replace( ',','' ))
				var diff = ( ( m2 ) * 1 / ( m1 ) * 1 - 1 ) * 100;
				
				if( metric == 'CostPerConversion' ){
					if( diff <= ( -0.5 * treshold ) ){
						alerts++;
						showRow += 1;
						var style = 'background-color:green;color:white';
					} else if( diff >= treshold ){
						alerts++;
						showRow += 1;
						var style = 'background-color:red;color:white';
					} else {
						var style='background-color:transparent;color:black';
					}
				}else{
					if( diff <= ( -1 * treshold ) ){
						alerts++;
						showRow += 1;
						var style = 'background-color:red;color:white';
					} else if( diff >= treshold ){
						alerts++;
						showRow += 1;
						var style = 'background-color:green;color:white';
					} else {
						var style = 'background-color:transparent;color:black';
					}
				}
				if( isNaN( diff ) ){
					diff = '-';
				}
				thisRow += "<td style='color:#999999'>" + m2 + "</td><td style='color:#999999'>" + m1 + "</td><td style='" + style + "'>" + Math.round( diff ) + "%</td>";
			}
			thisRow += '</tr>';
			// if(showRow>0){
				table += thisRow;
			//  }
		}
	}
	//Summary Row
	var ctr1 = (clicks1/conv1)
	var ctr2 = (clicks2/conv2) 
	var pa_ctr1 = (pa_clicks1/impr1)
	var pa_ctr2 = (pa_clicks2/impr2)
	
	var thisRow = "<tr style='font-weight:800;'><td>Total</td>";
	
	
	function buildRow( value1, value2, threshold ){
		var diff = ( value2 * 1 / value1 - 1 ) * 100;
		var style = 'background-color:transparent;color:black';
		
		if( diff <= ( -1 * threshold ) ){
			alerts++;
			style = 'background-color:red;color:white';
		} else if( diff >= threshold ){
			alerts++;
			style = 'background-color:green;color:white';
		}
		if( isNaN( diff ) ){
			diff = "-";
		}
		return "<td style='color:#999999'>" + value2.toFixed( 2 ) + "</td><td style='color:#999999'>" + value1.toFixed( 2 ) + "</td><td style='" + style + "'>" + Math.round( diff ) + "%</td>";
	}
	
	thisRow += buildRow( impr1, impr2, threshold );
	thisRow += buildRow( clicks1, clicks2, threshold );
	thisRow += buildRow( conv1, conv2, threshold );
	thisRow += buildRow( ctr1, ctr2, threshold / 2 );
	thisRow += buildRow( pa_ctr1, pa_ctr2, threshold / 2 );
	
	thisRow += '</tr>';
	table += thisRow;
	table += '</table>';
	if( alerts == 0 ){
		table = '';
	}
	return [ alerts, table ];
}

function getDateInThePast( numDays ){
	var date = new Date();
	var myDate = new Date( date.getTime() - numDays * MILLIS_PER_DAY );
	return '' + myDate.getFullYear() + ( '0' + ( myDate.getMonth() + 1 ) ).slice( -2 ) + ( '0' + myDate.getDate() ).slice( -2 );
}