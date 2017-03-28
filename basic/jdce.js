/*
	JavaScript dead code elimination tool.
	Niels Groot Obbink
*/

'use strict';

// Include external libraries.
require('./native_extentions');

const argument_parser = require('command-line-args'),
      file_system = require('fs'),
      path = require('path'),
      file_finder = require('./file_finder'),
      js_tools = require('./js_tools'),
      headless_chromium = require('run-headless-chromium');


// Keep a timer, so we know how long the tool took to run.
let start_time = process.hrtime();

// Function that returns the run time (in nanoseconds) when called.
function runtime()
{
	let end_time = process.hrtime(start_time);
	let time = end_time[0] * 1e9 + end_time[1];

	return time;
}

// Get command line arguments.
let options;

try
{
	options = argument_parser(
	[
		{ name: 'directory', type: String, defaultOption: true },
		{ name: 'index', type: String, alias: 'i' },
		{ name: 'timeout', type: Number, alias: 't' },
		{ name: 'verbose', type: Boolean, alias: 'v' },
		{ name: 'useragent', type: String, alias: 'u' },
		{ name: 'windowsize', type: String, alias: 'w' },
		{ name: 'csv', type: Boolean, alias: 'c' },
		{ name: 'csvfile', type: String, alias: 'f' }
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

// Extend our settings with the command line arguments (if available).
let settings =
{
	index: 'index.html',
	timeout: 5000,
	verbose: false,
	useragent: false,
	windowsize: false,
	csv: false,
	csvfile: 'output.csv'
}.extend(options);

// Add the complete HTML file path to the settings for easy access.
settings.html_path = path.normalize(settings.directory + '/' + settings.index);


// Function for appending data to the csv file.
function append_to_csv(data)
{
	if( settings.csv === false)
	{
		return;
	}

	data.unshift(settings.directory);

	// Runtime in ns -> ms
	data[4] = (data[4] * 1e-6).toFixed(0);

	let line = data.join(',') + '\n';

	file_system.appendFileSync(settings.csvfile, line, function(error)
	{
		console.error('Failed to write to file', settings.csvfile, ':', error);
		process.exit(6);
	});
}



// Check if directory and HTML file exist.
if( ! file_system.existsSync(settings.directory) )
{
	append_to_csv(['', '', '', runtime(), 'Directory ' + settings.directory + ' doesn\'t exist or isn\'t readable']);

	console.error('Directory', settings.directory, 'doesn\'t exist or isn\'t readable.');
	process.exit(3);
}

if( ! file_system.existsSync(settings.html_path) )
{
	append_to_csv(['', '', '', runtime(), 'File ' + settings.html_path + ' doesn\'t exist or isn\'t readable']);

	console.error('File', settings.html_path, 'doesn\'t exist or isn\'t readable.');
	process.exit(4);
}


// Try to find the <head> tag in the HTML document.
// We save the head_index source position, so we can later remove the logger function once we're done with it.
let html_source = file_system.readFileSync(settings.html_path).toString();
let head_index = html_source.toLowerCase().indexOf('<head>');
let logger_tag = '<script>' + js_tools.logger.receiver() + '</script>';

// If we can't find a <head> tag, we can't insert the logger.
if( head_index == -1 )
{
	append_to_csv(['', '', '', runtime(), 'File ' + settings.html_path + ' doesn\'t have a <head> tag, can\'t insert logger function']);

	console.error('File', settings.html_path, 'doesn\'t have a <head> tag, can\'t insert logger function.');
	process.exit(5);
}

// If we found the <head> tag, insert the logger function.
html_source = html_source.insert(head_index + 6, logger_tag);	// indexOf() returns starting position, '<head>' has length 6.
file_system.writeFileSync(settings.html_path, html_source);



// [source_data] will hold the original source code and all function call information.
let source_data = {};
// First, find all .js files in this directory (recursive).
let script_files = file_finder(settings.directory, 'js');

for(let i = 0; i < script_files.length; i++)
{
	// Create a new property (object) for this script.
	let entry = source_data[ script_files[i] ] = {};

	// Save the original source code, so we can modify (i.e. remove uncalled functions) it later.
	entry.source = file_system.readFileSync( script_files[i] ).toString();

	// Retrieve a list of functions in this file.
	entry.functions = js_tools.get_function_list( entry.source );
}


// Now that we've collected the information about the script files, we can modify them by inserting log calls.
for(let file in source_data)
{
	if( source_data.hasOwnProperty(file) )
	{
		let log_call,
		    offset = 0,
		    functions = source_data[file].functions,
		    new_source = source_data[file].source;	// Start with the original source.

		for(let i = 0; i < functions.length; i++)
		{
			let this_function = functions[i];

			// Create a log call for this function.
			log_call = js_tools.logger.sender(file, this_function.start, this_function.end);

			// Insert the log call in the source.
			// Starting character position is function body location (plus one for { character) plus length of all previously inserted log calls.
			new_source = new_source.insert(this_function.body.start + 1 + offset, log_call);

			// Increment the offset with the length of the log call, so the next insertion is at the right place.
			offset += log_call.length;
		}

		file_system.writeFileSync(file, new_source);
	}
}


// Chromium arguments contains at least the HTML file to load.
let chromium_arguments = [settings.html_path];

// Check if we want to set other chromium options.
if( settings.useragent )
{
	chromium_arguments.push('--user-agent=' + settings.useragent);
}

if( settings.windowsize )
{
	chromium_arguments.push('--window-size=' + settings.windowsize);
}


// Spin up a headless Chromium instance.
let chromium_output = '',
    chromium_process = headless_chromium.spawn(chromium_arguments, {});

// Whenever output is available, save it.
chromium_process.stdout.on('data', function(data)
{
	chromium_output += data.toString();
});

// After the timeout, kill the Chromium instance and start processing the output.
setTimeout(function()
{
	chromium_process.kill('SIGINT');

	// Now that we're done with running Chromium, remove the logger receiver function from the <head> tag.
	html_source = html_source.splice(head_index + 6, logger_tag.length, '');	// '<head>'.length is 6, head_index is the start position of the tag.
	file_system.writeFileSync(settings.html_path, html_source);

	// Process the Chromium output by removing any output that is not a log call and saving the formatted function calls.
	let log_calls = [],
	    lines = chromium_output.split('\n');

	lines.forEach(function(line)
	{
		if(line.indexOf(js_tools.logger.name) == 0)
		{
			log_calls.push( js_tools.logger.format(line) );	// {filename, start, end}
		}
	});

	process_log_calls(log_calls);
}, settings.timeout);


// Called after Chromium has ran for [timeout] ms, with an array of all log calls.
function process_log_calls(log_calls)
{
	// Create an object with file name as property and an array of function calls (formatted {start, end}).
	let called_functions = {};

	// Add entries to the called_functions 
	log_calls.forEach(function(log)
	{
		if( ! called_functions.hasOwnProperty( log.file ) )
		{
			called_functions[log.file] = [];
		}

		// Remove duplicate calls (a function can be called twice or more) so we don't do unnecessary work.
		let exists = function(entry)
		{
			return entry.start == log.start && entry.end == log.end;
		};

		if( ! called_functions[log.file].some( exists ) )
		{	
			called_functions[log.file].push( {start: log.start, end: log.end} );
		}
	});

	for(let file in source_data)
	{
		if( source_data.hasOwnProperty(file) )	
		{
			// Get a list with uncalled functions, based on all functions in this file and the ones called.
			let uncalled_functions = js_tools.get_uncalled_functions( source_data[file].functions, (called_functions[file] || []) );	// It's possible there were no called functions, in that case use an empty array.

			// Output some info about the uncalled functions we've removed (if the verbose option is on).
			buffer_file_stats(file, source_data[file].functions.length, uncalled_functions.length, (called_functions[file] || []).length );

			// First, remove any uncalled functions that are nested within other uncalled functions, because removing an outer function also removes the inner function.
			uncalled_functions = js_tools.remove_nested_functions(uncalled_functions);

			// Generate new source code by removing the uncalled functions in this file.
			let new_source = js_tools.remove_uncalled_functions( source_data[file].source, uncalled_functions );

			file_system.writeFileSync(file, new_source);
		}
	}

	output_stats();
}



let stats = [];

function buffer_file_stats(file_name, all, uncalled, called)
{
	stats.push(
	{
		file: file_name,
		all: all,
		called: called,
		uncalled: uncalled
	});

	if(settings.verbose)
	{
		console.log(file_name);
		console.log('  ', all, 'functions total');
		console.log('  ', called, 'functions called');
		console.log('  ', uncalled, 'functions not called (removed)');
	}
}


function output_stats()
{
	let totals = stats.reduce(function(accumulator, value)
	{
		return [
			value.all + accumulator[0],
			value.called + accumulator[1],
			value.uncalled + accumulator[2]
		];
	}, [0, 0, 0]);

	append_to_csv([script_files.length, totals[0], totals[2], runtime(), '']);

	console.log('Total');
	console.log('  ', stats.length, 'files');
	console.log('  ', totals[0], 'functions total');
	console.log('  ', totals[1], 'functions called');
	console.log('  ', totals[2], 'functions not called (removed)');
	console.log('   runtime:', (runtime() * 1e-6).toFixed(0), 'milliseconds');
}
