//SETTINGS
//var EMAILS = "lynsey.schembri@casumo.com,burak.hun@casumo.com,danelle.azzopardi@casumo.com";
var EMAILS = "a.tissen@pa.ag";

var REPORT = 'CAMPAIGN_PERFORMANCE_REPORT';
// comma separated
var ATTRIBUTES = 'CampaignName';
//No space. All metrics available here: https://developers.google.com/adwords/api/docs/appendix/reports/campaign-performance-report
var METRICS = 'SearchImpressionShare,Impressions,Ctr,Clicks,Cost,Conversions,CostPerConversion';

var THRESHOLD = 40; // in percent, without % sign
var DATE_RANGE_1 = { from : 14, to : 8 };
var DATE_RANGE_2 = { from : 7, to : 1 };
// comma separated
var CAMPAIGNS = '';//'"Casumo Brand - All Devices - Mix","Casumo Casino Brand - All Devices - Exact","Casumo Brand - Tablet - Exact","Casumo Brand - Desktop - Exact","Casumo Brand - Mobile - Exact"';

var SUBJECT = 'KPI report';

//END OF SETTINGS

// Number of milliseconds in a day.
var MILLIS_PER_DAY = 1000 * 60 * 60 * 24;
var DELIMITER = '_';

function getReport( report, attributes, metrics, dateRange ){
  
  var campaignPredicate = '';
  if( CAMPAIGNS.length > 0 ){
    campaignPredicate = 'CampaignName IN [' + CAMPAIGNS + '] AND';
  }
  
  var query = 'SELECT ' + attributes + ',' + metrics + 
    ' FROM ' + report + 
    ' WHERE ' + campaignPredicate + ' Impressions > 0 ' +
    ' DURING ' + getDateInThePast( dateRange.from ) + ',' + getDateInThePast( dateRange.to );
  
  Logger.log( query );
  
  var report = AdWordsApp.report( query );
  return report;
}

function parseValue( value ){
  value = value.replace( ',', '' );
  if( value.indexOf( '%' ) > 0 ){
    value = value.substring( 0, value.length - 1 ) / 100;
  }
  return value / 1;
}

function getDataFromReport( report, attributes, metrics, dateRange ){
	var rows = getReport( report, attributes, metrics, dateRange ).rows();
	var map = {};
	while( rows.hasNext() ){
		var row = rows.next();
		var key = attributes.map( function( attr ){ return row[ attr ]; } ).join( DELIMITER );
		map[ key ] = {};
		metrics.forEach( function( metric ){ map[ key ][ metric ] = parseValue( row[ metric ] ); } );
	}
	return map;
}

function trim( str ){
	return str.trim();
}

function main(){
	Logger.log( 'start' );
	
	var attributes = ATTRIBUTES.split( ',').map( trim );
	var metrics = METRICS.split( ',').map( trim );
	
	var data1 = getDataFromReport( REPORT, attributes, metrics, DATE_RANGE_1 );
	var data2 = getDataFromReport( REPORT, attributes, metrics, DATE_RANGE_2 );
	var alerts = computeAlerts( data1, data2, metrics, THRESHOLD );
	
	var dataAccount1 = getDataFromReport( 'ACCOUNT_PERFORMANCE_REPORT', [ 'AccountDescriptiveName' ], metrics, DATE_RANGE_1 );
	var dataAccount2 = getDataFromReport( 'ACCOUNT_PERFORMANCE_REPORT', [ 'AccountDescriptiveName' ], metrics, DATE_RANGE_2 );
	var alertsAccount = computeAlerts( dataAccount1, dataAccount2, metrics, THRESHOLD );
	
	//Logger.log( JSON.stringify( alerts, null, 2 ) );
	
	var html = buildHTMLTable( SUBJECT, attributes, metrics, alerts, alertsAccount );
	
	Logger.log( html );
	
	if( ! AdWordsApp.getExecutionInfo().isPreview() ){
		MailApp.sendEmail({
			to: EMAILS,
			subject: REPORT + ' for account ' + AdWordsApp.currentAccount().getName() + ' (' + AdWordsApp.currentAccount().getCustomerId() + ')',
			htmlBody: '<p>Number of alerts: ' + alerts.filter( function( x ){ return x.outOfBounds } ).length + '</p>' + html
		});
	}else{
		Logger.log( 'don\'t send emails in preview mode' );
	}
	Logger.log( 'end' );
}

function computeLowThreshold( threshold, metric ){
	if( metric == 'CostPerConversion' ){
		return -0.5 * threshold;
	}
	return -1 * threshold;
}

function computeHighThreshold( threshold, metric ){
	if( metric == 'CostPerConversion' ){
		return threshold;
	}
	return 1 * threshold;
}

function computeAlerts( data1, data2, metrics, threshold ){
	var alerts = [];
	var data1Keys = Object.keys( data1 );
	Object.keys( data2 ).filter( function( key ){ return data1Keys.indexOf( key ) >= 0 } ).forEach( function( key ){
		var alert = {
			key : key,
			outOfBounds : false,
		};
		metrics.forEach( function( metric ){
			var metricValueDateRange1 = data1[ key ][ metric ];
			var metricValueDateRange2 = data2[ key ][ metric ];
			
			var diff = ( metricValueDateRange2 / metricValueDateRange1 - 1 ) * 100;
			var thresholdLow = computeLowThreshold( threshold, metric );
			var thresholdHigh = computeHighThreshold( threshold, metric );
			
			var diff2 = diff;
			if( metricValueDateRange1 == 0 || isNaN( diff ) ){
				diff = '-';
				diff2 = 1;
			}
			alert[ metric ] = {
				threshold : diff2 < 0 ? thresholdLow : thresholdHigh,
				value1 : metricValueDateRange1,
				value2 : metricValueDateRange2,
				diff : diff,
				isTooHigh : diff2 > thresholdHigh,
				isTooLow : diff2 < thresholdLow,
				outOfBounds : diff2 > thresholdHigh || diff2 < thresholdLow,
			};
			if( alert[ metric ].outOfBounds ){
				alert.outOfBounds = true;
			}
			//Logger.log( key + ' - ' + metric + ': ' + metricValueDateRange1 + ' -> ' + metricValueDateRange2 );
		});
		alerts.push( alert );
	});
	return alerts;
}

function computeStyle( metric, isTooHigh, isTooLow ){
	if( metric == 'CostPerConversion' ){
		if( isTooHigh ){
		return 'background-color:red;color:white';
		}
		if( isTooLow ){
		return 'background-color:green;color:white';
		}
		return 'background-color:transparent;color:black';
	}
	if( isTooHigh ){
		return 'background-color:green;color:white';
	}
	if( isTooLow ){
		return 'background-color:red;color:white';
	}
	return 'background-color:transparent;color:black';
}

function computeMetricCells( metrics, alert ){
	var thisRow = '';
	metrics.forEach( function( metric ){
		var style = computeStyle( metric, alert[ metric ].isTooHigh, alert[ metric ].isTooLow );
		thisRow += '<td style=\'color:#999999\'>' +
			( Math.floor( alert[ metric ].value2 * 100 ) / 100 ) +
			'</td><td style=\'color:#999999\'>' +
			( Math.floor( alert[ metric ].value1 * 100 ) / 100 ) +
			'</td><td style=\'' +
			style +
			'\'>' +
			( alert[ metric ].diff == '-' ? alert[ metric ].diff : Math.round( alert[ metric ].diff ) + '%' ) +
			'</td>'
		;
	});
	return thisRow;
}

function buildHTMLTable( subject, attributes, metrics, alerts, alertsAccount ){
	if( ! alerts.length || ! alertsAccount.length ){
		return '<h3>' + subject + '</h3><p>Not enough data available for a KPI report.</p>';
	}
	var table = '<h3>' + subject + '</h3><table border=1 cellpadding=5 style=\'border-collapse: collapse;\'><tr>';
	attributes.forEach( function( attr ){ table += '<th rowspan=2>' + attr + '</th>'; });
	metrics.forEach( function( metric ){ table += '<th colspan=3>' + metric + '</th>'; });
	table += '</tr><tr>';
	metrics.forEach( function( metric ){ table += '<th style=\'color:#999999\'>Last W</th><th style=\'color:#999999\'>Prior W</th><th>Diff.</th>'; });
	table += '</tr>';
	
	alerts.forEach( function( alert ){
		var thisRow = '<tr>';
		alert.key.split( DELIMITER ).forEach( function( attr ){
			thisRow += '<td>' + attr + '</td>';
		});
		thisRow += computeMetricCells( metrics, alert );
		thisRow += '</tr>';
		table += thisRow;
	});
	
	alertsAccount.forEach( function( alert ){
		var thisRow = '<tr style="font-weight:800;background-color:#eeeeee;";><td colspan="' + attributes.length + '">Account-Total</td>';
		thisRow += computeMetricCells( metrics, alert );
		thisRow += '</tr>';
		table += thisRow;
	});

	return table + '</table>';
}

function getDateInThePast( numDays ){
	var date = new Date();
	var myDate = new Date( date.getTime() - numDays * MILLIS_PER_DAY );
	return '' + myDate.getFullYear() + ( '0' + ( myDate.getMonth() + 1 ) ).slice( -2 ) + ( '0' + myDate.getDate() ).slice( -2 );
}