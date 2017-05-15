/*
	JavaScript dynamic dead code elimination tool.
	Niels Groot Obbink
*/

'use strict';


let Graph = require('./graph'),
    GraphTools = require('./graphtools'),
    file_system = require('fs'),
    webpage_tools = require('./webpage_tools');


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








		return_results();

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
