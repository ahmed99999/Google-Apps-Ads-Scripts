
var SETTINGS = {
	// description = determines whether the script should create geo targets
	CREATE_GEOTARGETS : true,
	// description = sheet url to read settings for the script from
	SETTINGS_SHEET_URL : undefined,
	// description = 'Email addresses to send emails to'
	EMAILS : [],
};

// END OF SETTINGS

Script_Name, Script_Version, setting_name, setting_type, ...



var SETTINGS = [
	{
		is_list : false,
		type : 'bool', // 'bool', 'string', 'email', 'timezone', 'url', 'int' or 'float', 'account_id'
		possible_values : [ true, false ], // #optional
		name : 'CREATE_GEOTARGETS' // string
		default_value : true, // bool, string, int or float
		description : 'determines whether the script should create geo targets', // string
		// value : true, // from user-interface
	},
	{
		is_list : false,
		type : 'url', // 'bool', 'string', 'email', 'timezone', 'url', 'int' or 'float'
		name : 'SETTINGS_SHEET_URL' // string
		description : 'sheet url to read settings for the script from', // string
	},
];

var SETTINGS = {
	// determines whether the script should create geo targets
	// possible values: true, false
	// default-value: true
	CREATE_GEOTARGETS : true,
}