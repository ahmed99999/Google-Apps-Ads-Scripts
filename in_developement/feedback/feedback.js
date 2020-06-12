/**
 * Responds to any HTTP request.
 *
 * @param {!express:Request} req HTTP request context.
 * @param {!express:Response} res HTTP response context.
 */

const {BigQuery} = require('@google-cloud/bigquery');

function formatTime( date ){
	function pad( x, size ){
		x = x + '';
		while( x.length < size ){
			x = '0' + x;
		}
		return x;
	}
	var res = ''
		+ pad( date.getFullYear(), 4 ) + '-'
		+ pad( ( date.getMonth() + 1 ), 2 ) + '-'
		+ pad( date.getDate(), 2 ) + ' '
		+ pad( date.getHours(), 2 ) + ':'
		+ pad( date.getMinutes(), 2 ) + ':'
		+ pad( date.getSeconds(), 2 )
	;
	return res;
}

function toString( obj ){
  	if( typeof obj == 'string' ){
      	return obj;
    }
  	var res = [];
	for( key in obj ){
		res.push( 'obj[ ' + key + ' ]: ' + obj[ key ] );
	}
  	return res.join( '\n' );
}

exports.saveFeedback = ( req, res ) => {
	
	var script_name  = req.body.script_name  || req.query.script_name  || '';
	var account_name = req.body.account_name || req.query.account_name || '';
	var account_id   = req.body.account_id   || req.query.account_id   || '';
	
	if( !req.body.sentiment ){
		res.status( 200 ).send(
			`
			<html>
			<head>
				<title>Feedback</title>
				<meat charset="UTF-8">
				<style>
					option{
						font-size: 20px;
					}
				</style>
			</head>
			<body>
			<form action="script_checker" method="post">
				<table>
					<tbody>
						<tr>
							<td>Script Name</td>
							<td>
								<textarea name="script_name">${script_name}</textarea>
							</td>
						</tr>
						<tr>
							<td>Account Name</td>
							<td>
								<textarea name="account_name">${account_name}</textarea>
							</td>
						</tr>
						<tr>
							<td>Account Id</td>
							<td>
								<textarea name="account_id">${account_id}</textarea>
							</td>
						</tr>
						<tr>
							<td>Do you like the script?</td>
							<td>
								<select name="sentiment" size="3">
									<option value="don't like" value="don't like">👎</option>
									<option selected value="it's ok" alt="it's ok">👌</option>
									<option value="like" alt="like">👍</option>
								</select>
							</td>
						</tr>
						<tr>
							<td>Leave your comment</td>
							<td>
								<textarea name="comment"></textarea>
							</td>
						</tr>
						<tr>
							<td>&nbsp;</td>
							<td>
								<input type="submit">
							</td>
						</tr>
					</tbody>
				</table>
			</form>
			</body>
			</html>`
		);
	}else{
		/*
		var param = 'body-plain';
		console.log( 'req.body: ' + toString( req.body ) );
		console.log( 'req.body[ ' + param + ' ]: ' + toString( req.body[ param ] ) );
		
		const message = req.body[ param ] || 'no message';
		console.log( 'message: ' + JSON.stringify( message, null, 2 ) );
		*/
		try{
			const now = new Date( new Date().toLocaleString( 'en-US', { timeZone: 'Europe/Berlin' } ) );
			console.log( 'time: ' + now.toLocaleString() );
			new BigQuery()
				.dataset( 'scripts' )
				.table( 'feedback' )
				.insert(
					{
						script_name  : script_name,
						account_name : account_name,
						account_id   : account_id,
						sentiment    : req.body.sentiment,
						comment      : req.body.comment,
						time         : formatTime( now ),
					}
				)
			;
			res.status( 200 ).send( 'feedback saved' );
		}catch( error ){
			console.log( 'error: ' + error );
			console.log( 'path: ' + error.path );
			res.status( 500 ).send( 'bigquery error' );
		}
	}
};
