/*
	Example algorithm adapter.

	This example algorithm does nothing. If it did, it'd be nice if this text would explain what it did.
*/

/*
	'Graph' contains definitions for graphs (node, edge, etc.).
	'GraphTools' contains useful functions for navigating and editing the graph.
*/
const Graph = require('../graph'),
      GraphTools = require('../graph_tools');



module.exports = function()
{
	/*
		This is our main function that'll get called when it's our turn to analyse the code.
		There are two parameters: [settings] contains an object with the scripts to be analyzed, and [callback], the function we'll call when we're done.
		The exact format of the [settings] object can be found below.
	*/
	this.run = function(settings, callback)
	{
		// First, run whatever tool this adapter is for, on the data we have (see the [settings] object.
		// This should give us a list (whatever data structure is available) of functions that are reachable from which function.
		// Place any code required in a folder with the name of the adapter (so in our case in 'algorithms/example/) and include from there.
		/*
			let result = RunSomeTool(settings.scripts);
		*/



		// Now that we have the information we need, we can start marking the graph.
		// We can retrieve nodes based on the file name (relative to the [settings.html_path]) and start/end location, e.g.
		/*
			let node_one = GraphTools.find_node({file: 'foo.js', start: 0, end: 42}, nodes),		// Retrieve the node representing the function in file 'foo.js', from pos 0 to 42.
				node_two = GraphTools.find_node({file: 'bar.js', start: 123, end: 492}, nodes);		// Retrieve another node.
		*/
		// Any function in the HTML file itself (i.e. inline) has 'null' as file name:
		/*
			let node_inline = GraphTools.find_node({file: null, start: 20, end: 40}, nodes);
		*/
		// To mark an edge, simply run the mark function from GraphTools.
		// Provide the caller node, the node that it calls, and our fingerprint (found in [settings.fingerprint]).
		/*
			GraphTools.mark( node_one, node_two, settings.fingerprint );
		*/
		// Don't forget that any function called from the global scope should be marked too. The caller node for those calls is [settings.base_node].
		/*
			GraphTools.mark( settings.base_node, node_one, setings.fingerprint );
		*/
		// The code above would mark the function at foo.js@0:42 called (from global scope), and the function at bar.js@123:492 called from the function at foo.j@0:42.
		// i.e. {global} -> foo.js@0:42 -> bar.js@123:492



		// When we're completely done, call the callback function to return.
		callback();
	};
};





/*
	This is an example settings object, passed to the 'run' method of each adapter. The values are examples.



	settings:
	{
		directory: '../path/to/folder/',				// The directory of the webpage we're analyzing
		html_path: '../path/to/folder/index.html',		// The HTML file

		scripts: [script_data, script_data, ...],		// An array of scripts in the HTML file. They are ordered based on load order. See below for contents.

		base_node: Node,								// The base caller node. It represents calls to nodes (functions) from the global scope.
		nodes: [Node, Node, ...],						// A list of nodes in the graph.
		fingerprint: {name: 'example', value: 8}		// The fingerprint for this algorithm. Use it when marking edges.
	}


	script_data:
	{
		type: 'script',						// 'script' for included .js file, 'inline' for JS inside the HTML document.
		source: '...',						// Plain text source of this script.
		file: 'foo.js',						// The location of the script, relative to the HTML file.
		functions: [func, func, func],		// An array of functions within this file. See below for contents.
		location: null,						// If type is 'inline', the offset of the code in the HTML document ({start, end}).
	}


	func:
	{
		type: 'declaration',				// 'declaration' for a function declaration, 'expression' for a function expression.
		name: 'foo',						// Function name, if 'type' is 'declaration'.
		start: 0,							// Start location (character position) of the function within the source.
		end: 0,								// End location (character position) of the function within the source.
		body:
		{
			start: 0,						// Start location (character position) of the function body.
			end: 0							// End location (character position) of the function body.
		}
	}
*/