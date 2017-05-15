/*
	JavaScript dynamic dead code elimination tool.
	Niels Groot Obbink
*/

'use strict';


// Import libraries.
require('./native_extentions');

const argument_parser = require('command-line-args'),
      file_system = require('fs'),
      path = require('path'),
      csv_factory = require('./csv.js'),
      jdce = require('./jdce.js');


// Get command line arguments.
let options;

try
{
	options = argument_parser(
	[
		{ name: 'directory', type: String, defaultOption: true },

		{ name: 'index', type: String, alias: 'i' },
		{ name: 'csv', type: Boolean, alias: 'c' },
		{ name: 'csvfile', type: String, alias: 'f' },
		{ name: 'timeout', type: Number, alias: 't' },
		{ name: 'verbose', type: Boolean, alias: 'v' }
	]);
}catch(exception)
{
	console.log(exception.message);
	process.exit(1);
}


if( ! options['directory'] )
{
	console.error('No directory specified.');
	process.exit(2);
}


// Extend our default settings with the command line arguments (if available).
let settings =
{
	index: 'index.html',
	verbose: false,
	csv: false,
	csvfile: 'output.csv',
	timeout: 1000
}.extend(options);


// Add the complete HTML file path to the settings for easy access.
settings.html_path = path.normalize(settings.directory + '/' + settings.index);


// Create a CSV output instance.
let csv = new csv_factory(settings.csvfile, function(data)
{
	// Filter function; preprocess data to uniform output.
	return [
		settings.directory,
		data.js_files || 0,
		data.function_count || 0,
		data.functions_removed || 0,
		data.run_time || 0,
		data.error || ''
	];
});


// Check if directory and HTML file exist.
if( ! file_system.existsSync(settings.directory) )
{
	let error_message = 'Directory ' + settings.directory + ' doesn\'t exist or isn\'t readable';

	if(settings.csv)
	{
		csv.append({error: error_message});
	}
	console.error(error_message);
	process.exit(3);
}

if( ! file_system.existsSync(settings.html_path) )
{
	let error_message = 'File ' + settings.html_path + ' doesn\'t exist or isn\'t readable';

	if(settings.csv)
	{
		csv.append({error: error_message});
	}
	console.error(error_message);
	process.exit(4);
}


try
{
	// Run the JDCE.
	jdce.run({
		directory: settings.directory,
		html_path: settings.html_path,
		timeout: settings.timeout
	}, function(results)
	{
		// If the CSV option was set, output result data to the csv file (see 'csv' above).
		if( settings.csv )
		{
			csv.append(results);
		}

		if(settings.verbose)
		{
			console.log(results);
		}
	});
}catch(error)
{
	console.log(error);
}
