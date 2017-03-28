/*
	JavaScript static dead code elimination tool.
	Niels Groot Obbink
*/

'use strict';

require('./native_extentions.js');

const argument_parser = require('command-line-args'),
      csv_factory = require('./csv.js'),
      file_system = require('fs'),
      path = require('path'),
      html_tools = require('./html_tools.js'),
      js_tools = require('./js_tools.js'),
      bindings = require('./javascript-call-graph/bindings'),
      astutil = require('./javascript-call-graph/astutil'),
      pessimistic = require('./javascript-call-graph/pessimistic'),
      semioptimistic = require('./javascript-call-graph/semioptimistic');


// Keep a timer, so we know how long the tool took to run.
let start_time = process.hrtime();

var stats = [];

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
		{ name: 'verbose', type: Boolean, alias: 'v' },
		{ name: 'csv', type: Boolean, alias: 'c' },
		{ name: 'csvfile', type: String, alias: 'f' },
		{ name: 'strategy', type: String, alias: 's' }
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
	verbose: false,
	csv: false,
	csvfile: 'output.csv',
	strategy: 'NONE'	//NONE, ONESHOT, DEMAND
}.extend(options);

// Add the complete HTML file path to the settings for easy access.
settings.html_path = path.normalize(settings.directory + '/' + settings.index);

// Generate function for outputting to the CSV file (if applicable).
let csv = new csv_factory(settings.csv, settings.directory, settings.csvfile);

// Check if directory and HTML file exist.
if( ! file_system.existsSync(settings.directory) )
{
	csv.append(['', '', '', runtime(), 'Directory ' + settings.directory + ' doesn\'t exist or isn\'t readable']);

	console.error('Directory', settings.directory, 'doesn\'t exist or isn\'t readable.');
	process.exit(3);
}

if( ! file_system.existsSync(settings.html_path) )
{
	csv.append(['', '', '', runtime(), 'File ' + settings.html_path + ' doesn\'t exist or isn\'t readable']);

	console.error('File', settings.html_path, 'doesn\'t exist or isn\'t readable.');
	process.exit(4);
}

// Retrieve the HTML source, and extract all JS tags (in the correct order).
let html_source = file_system.readFileSync(settings.html_path).toString();
let js_tags = html_tools.get_ordered_script_tags(html_source);

// Because we work from a parent directory, prepend the working directory.
js_tags.forEach(function(value, index)
{
	js_tags[index] = settings.directory + '/' + value;
});


// Build the call graph.
let ast = astutil.buildAST(js_tags);
bindings.addBindings(ast);

let strategy = settings.strategy == 'ONESHOT' ? pessimistic : semioptimistic;
let cg = strategy.buildCallGraph(ast, settings.strategy == 'NONE');

let functions_called = {};	// file_name: [ {start, end}, ...]

// Retrieve all called functions
cg.edges.iter(function(caller, called)
{
	if(called.type == 'NativeVertex')
	{
		// We don't care about native functions (e.g. Math.floor).
		return;
	};

	let file = called.func.attr.enclosingFile;
	let start = called.func.range[0];
	let end = called.func.range[1];

	// If this file wasn't handled before, add a record.
	if( ! functions_called.hasOwnProperty(file))
	{
		functions_called[file] = [];
	}

	// Don't add duplicates.
	let exists = function(entry)
	{
		return entry.start == start && entry.end == end;
	};

	if( ! functions_called[file].some( exists ) )
	{	
		functions_called[file].push( {start: start, end: end} );
	}
});


let all_functions = [];

// Also retrieve a list of all functions.
js_tags.forEach(function(file)
{
	let source = file_system.readFileSync( file ).toString();

	// Retrieve a list of functions in this file.
	all_functions[file] = js_tools.get_function_list( source );
});



js_tags.forEach(function(file)
{
	let source = file_system.readFileSync(file).toString();

	// Get a list with uncalled functions, based on all functions in this file and the ones called.
	let uncalled_functions = js_tools.get_uncalled_functions( all_functions[file], (functions_called[file] || []) );	// It's possible there were no called functions, in that case use an empty array.

	// Output some info about the uncalled functions we've removed (if the verbose option is on).
	buffer_file_stats(file, all_functions[file].length, uncalled_functions.length, (functions_called[file] || []).length );

	// First, remove any uncalled functions that are nested within other uncalled functions, because removing an outer function also removes the inner function.
	uncalled_functions = js_tools.remove_nested_functions(uncalled_functions);

	// Generate new source code by removing the uncalled functions in this file.
	let new_source = js_tools.remove_uncalled_functions( source, uncalled_functions );

	file_system.writeFileSync(file, new_source);
});

output_stats();



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

	csv.append([js_tags.length, totals[0], totals[2], runtime(), '']);

	console.log('Total');
	console.log('  ', stats.length, 'files');
	console.log('  ', totals[0], 'functions total');
	console.log('  ', totals[1], 'functions called');
	console.log('  ', totals[2], 'functions not called (removed)');
	console.log('   runtime:', (runtime() * 1e-6).toFixed(0), 'milliseconds');
}
