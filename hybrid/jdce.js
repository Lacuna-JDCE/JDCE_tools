/*
	JavaScript dynamic dead code elimination tool.
	Niels Groot Obbink
*/

'use strict';


const Graph = require('./graph'),
      GraphTools = require('./graph_tools'),
      file_system = require('fs'),
      path = require('path'),
      webpage_tools = require('./webpage_tools'),
      async_loop = require('./async_retval_loop');



const CONSTRUCTED_EDGE = {name: 'constructed', value: 0x01};


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


function get_algorithm_data(filter)
{
	const folder = 'algorithms';

	let fingerprints = [];
	let id = CONSTRUCTED_EDGE.value;	// first value.

	fingerprints.push(CONSTRUCTED_EDGE);

	let algorithms = [],
	    available_algorithms = get_available_algorithms(folder);

	filter.forEach(function(name)
	{
		if( available_algorithms.indexOf( name ) != -1 )
		{
			let require_name = './' + path.join(folder, name);
			let algorithm = require(require_name);
			let instance = new algorithm();

			id *= 2;	// Flip the next higher bit (0001 -> 0010 -> 0100 -> 1000, etc.).
			fingerprints.push({name: name, value: id});

			algorithms.push( instance.run );
		}
	});

	return { functions: algorithms, fingerprints: fingerprints };
}


function remove_uncalled_functions(nodes)
{
	nodes.forEach(function(node)
	{
		let func = node.get_data();

		remove_uncalled_function(func);
	});
}


function remove_uncalled_function(func)
{
	console.log('remove function', func.script_name, '@', func.data.start, '-', func.data.end);
}


module.exports =
{
	run: function(settings, callback)
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

		// Create a graph with each function as a node, plus the base caller node.
		// The default 
		let nodes = GraphTools.build_function_graph(scripts, CONSTRUCTED_EDGE.value);

		// The number of functions is the number of nodes in the graph, minus one for the base caller node.
		stats.function_count = nodes.length - 1;

		// Get a list of readily prepared algorithm functions (but only those in the settings.algorithm list) and their fingerprints.
		let algorithms = get_algorithm_data(settings.algorithm);

		// Build the correct settings object for the algorithms.
		let algorithm_settings =
		{
			directory: path.join('../', settings.directory),
			html_path: path.join('../', settings.html_path),
			scripts: scripts,
			nodes: nodes,
			base_node: GraphTools.get_base_caller_node(nodes),
			fingerprints: algorithms.fingerprints
		};

		// Run each algorithm in turn, letting it edit the graph (mark edges).
		async_loop(algorithms.functions, algorithm_settings, function()
		{
			// Once we're done with all the algorithms, remove any edge that was constructed.
			if(!settings.noremove)
			{
				nodes = GraphTools.remove_constructed_edges(nodes, CONSTRUCTED_EDGE.value);
			}

			let disconnected_nodes = GraphTools.get_disconnected_nodes(nodes);

			// Do the actual work: remove all nodes that are disconnected (= functions without incoming edges = uncalled functions).
			remove_uncalled_functions(disconnected_nodes);

			// The number of removed functions equals the number of nodes without any incoming edges (a disconnected node).
			// The base caller node is never disconnected, so don't subtract from this.
			stats.functions_removed = disconnected_nodes.length;

			return_results();
		});


		function return_results()
		{
			// Calculate run time and save it in the stats object.
			let end_time = process.hrtime(start_time);
			stats.run_time = ((end_time[0] * 1e9 + end_time[1]) * 1e-6).toFixed(0);

			// Return the graph image too.
			stats.graph = GraphTools.output_function_graph(nodes, algorithms.fingerprints);

			// Return statistics to caller.
			callback( stats );
		}
	}
};
