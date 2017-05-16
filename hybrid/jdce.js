/*
	JavaScript dynamic dead code elimination tool.
	Niels Groot Obbink
*/

'use strict';


const Graph = require('./graph'),
      GraphTools = require('./graphtools'),
      file_system = require('fs'),
      path = require('path'),
      webpage_tools = require('./webpage_tools'),
      async_loop = require('./async_retval_loop');




function get_available_algorithms(folder)
{
	let available_instances = [],
	    files = file_system.readdirSync(folder);

	for(let i = 0; i < files.length; i++)
	{
		let file = files[i],
		    split = file.split('.');

		if(split.pop() == 'js')
		{
			available_instances.push( split.join('.') );
		}
	}

	return available_instances;
}


function get_algorithms(filter)
{
	const folder = 'algorithms';

	let algorithms = [],
	    available_algorithms = get_available_algorithms(folder);

	filter.forEach(function(name)
	{
		if( available_algorithms.indexOf( name ) != -1 )
		{
			let require_name = './' + path.join(folder, name);
			let algorithm = require(require_name);
			let instance = new algorithm();

			algorithms.push( instance.run );
		}
	});

	return algorithms;
}


module.exports =
{
	run: function(settings, callback)	// FIXME REMOVEME settings: html_path, directory, algorithm.
	{
		// Keep a timer, so we know how long the tool took to run.
		let start_time = process.hrtime();

		// Save statistics, so we can return them to our caller later.
		let stats = 
		{
			js_files: 0,
			function_count: 0,
			functions_removed: 0,
			run_time: 0
		};


		// Retrieve all scripts in this page (ordered based on execution order).
		let scripts = webpage_tools.get_scripts( settings.html_path, settings.directory );
		// Create a graph with each function as a node. Returns a list of nodes.
		let nodes = GraphTools.build_function_graph(scripts);


		// Get a list of readily prepared algorithm functions (but only those in the settings.algorithm list).
		let algorithms = get_algorithms(settings.algorithm);
		// Build the correct settings object for the algorithms.
		let algorithm_settings =
		{
			directory: path.join('../', settings.directory),
			html_path: path.join('../', settings.html_path),
			scripts: scripts,
			nodes: nodes
		};

		// Run each algorithm in turn, letting it edit the graph (mark edges).
		async_loop(algorithms, algorithm_settings, function(result_nodes)
		{
			return_results();
		});	


		function return_results()
		{
			// Calculate run time and save it in the stats object.
			let end_time = process.hrtime(start_time);
			stats.run_time = ((end_time[0] * 1e9 + end_time[1]) * 1e-6).toFixed(0);

			// Return the graph image too.
			stats.graph = GraphTools.output_function_graph(nodes);

			// Return statistics to caller.
			callback( stats );
		}
	}
};
